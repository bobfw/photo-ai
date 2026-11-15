import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { isString } from "es-toolkit";
import { z } from "zod";

import { editWeddingImage, generateWeddingImage } from "#agents/wedding";
import { database } from "#services/database";
import { generatedImages, vouchers } from "#services/schema";
import { deleteImage, extensionFor, getImage, publicImageUrl, putImage } from "#services/storage";

import { findWeddingScene } from "./scenes.ts";

const VOUCHER_TYPE = "wedding";
const WEDDING_MODEL = "bytedance-seed/seedream-5-5";
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EDITS = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const codeSchema = z.string().min(1, "凭证格式不正确").max(64, "凭证格式不正确");

const faceSchema = z
  .string()
  .regex(/^data:image\/(?:jpeg|jpg|png|webp);base64,/, "照片格式不支持，请上传 JPG、PNG 或 WebP")
  .max(MAX_IMAGE_BYTES * 1.4, "照片太大了，请压缩后重试");

const voucherInput = z.object({ code: codeSchema });

const generateInput = z.discriminatedUnion("mode", [
  z.object({
    code: codeSchema,
    mode: z.literal("single"),
    sceneId: z.string().min(1, "请选择拍摄场景"),
    faces: z.array(faceSchema).length(1, "请上传一张照片"),
  }),
  z.object({
    code: codeSchema,
    mode: z.literal("couple"),
    sceneId: z.string().min(1, "请选择拍摄场景"),
    faces: z.array(faceSchema).length(2, "双人婚纱照需要上传两张照片"),
  }),
]);

const editInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  instruction: z.string().trim().min(1, "请描述想怎么修改").max(500, "修改描述请控制在 500 字以内"),
});

type Mode = "single" | "couple";

export interface PublicImage {
  id: number;
  url: string;
  mode: Mode;
  sceneId: string;
  editCount: number;
  remainingEdits: number;
  createdAt: number;
  expiresAt: number;
}

function storageKey(voucherId: number, rest: string) {
  return `wedding/${voucherId}/${rest}`;
}

async function loadVoucher(code: string) {
  const rows = await database.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  const voucher = rows.at(0);
  return voucher?.type === VOUCHER_TYPE ? voucher : undefined;
}

function parseFaceKeys(json: string): string[] {
  try {
    const keys: unknown = JSON.parse(json);
    return Array.isArray(keys) ? keys.filter((key) => isString(key)) : [];
  } catch {
    return [];
  }
}

// ponytail: 每次访问时全表扫描过期记录；量大了再换成定时任务。
async function cleanupExpiredImages() {
  const now = Date.now();
  const expired = await database
    .select()
    .from(generatedImages)
    .where(lt(generatedImages.expiresAt, now));
  if (expired.length === 0) return;

  await Promise.all(
    expired.map((row) =>
      Promise.all([
        deleteImage(row.storageKey),
        ...parseFaceKeys(row.faceKeys).map((key) => deleteImage(key)),
      ]),
    ),
  );
  await database.delete(generatedImages).where(lt(generatedImages.expiresAt, now));
}

function toPublicImage(row: typeof generatedImages.$inferSelect): PublicImage {
  return {
    id: row.id,
    url: publicImageUrl(row.storageKey),
    mode: row.mode === "couple" ? "couple" : "single",
    sceneId: row.sceneId,
    editCount: row.editCount,
    remainingEdits: Math.max(0, MAX_EDITS - row.editCount),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

function decodeDataUrl(face: string) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/.exec(face);
  if (!match) throw new Error("照片格式不支持，请上传 JPG、PNG 或 WebP");

  const data = Buffer.from(match[2], "base64");
  if (data.byteLength > MAX_IMAGE_BYTES) throw new Error("照片太大了，请压缩后重试");

  return { data, contentType: match[1] === "image/jpg" ? "image/jpeg" : match[1] };
}

async function loadAsDataUrl(key: string) {
  const { data, contentType } = await getImage(key);
  return `data:${contentType};base64,${Buffer.from(data).toString("base64")}`;
}

export const getVoucherState = createServerFn({ method: "POST" })
  .validator((data) => voucherInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code);
    if (!voucher) return;

    await cleanupExpiredImages();

    const notExpired = gt(generatedImages.expiresAt, Date.now());
    const rows = await database
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.voucherId, voucher.id), notExpired))
      .orderBy(desc(generatedImages.createdAt));

    return {
      totalImages: voucher.totalImages,
      generatedCount: voucher.generatedCount,
      remaining: Math.max(0, voucher.totalImages - voucher.generatedCount),
      images: rows.map((row) => toPublicImage(row)),
    };
  });

export const generateWedding = createServerFn({ method: "POST" })
  .validator((data) => generateInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const scene = findWeddingScene(data.sceneId);
    if (!scene) throw new Error("请选择拍摄场景");

    const voucher = await loadVoucher(data.code);
    if (!voucher) throw new Error("凭证无效");
    await cleanupExpiredImages();

    // 先原子占用一个额度，失败再退还。
    const reserved = await database.run(sql`
      UPDATE vouchers
      SET generated_count = generated_count + 1
      WHERE id = ${voucher.id} AND generated_count < total_images
    `);
    if (reserved.meta.changes === 0) throw new Error("这个凭证的照片额度已经用完");

    const faceKeys: string[] = [];
    let outputKey: string | undefined;

    try {
      for (const face of data.faces) {
        const { data: bytes, contentType } = decodeDataUrl(face);
        const key = storageKey(
          voucher.id,
          `refs/${crypto.randomUUID()}.${extensionFor(contentType)}`,
        );
        await putImage(key, bytes, contentType);
        faceKeys.push(key);
      }

      const image = await generateWeddingImage({
        mode: data.mode,
        faces: data.faces,
        scene: {
          description: scene.description,
          brideAttire: scene.brideAttire,
          groomAttire: scene.groomAttire,
        },
        model: WEDDING_MODEL,
        apiKey: env.OPENROUTER_API_KEY,
      });

      outputKey = storageKey(voucher.id, `${crypto.randomUUID()}.${extensionFor(image.mediaType)}`);
      await putImage(outputKey, image.data, image.mediaType);

      const createdAt = Date.now();
      const inserted = await database
        .insert(generatedImages)
        .values({
          voucherId: voucher.id,
          storageKey: outputKey,
          faceKeys: JSON.stringify(faceKeys),
          sceneId: scene.id,
          mode: data.mode,
          editCount: 0,
          createdAt,
          expiresAt: createdAt + IMAGE_TTL_MS,
        })
        .returning();
      const row = inserted.at(0);
      if (!row) throw new Error("保存照片失败");

      return toPublicImage(row);
    } catch (error) {
      await database.run(sql`
        UPDATE vouchers
        SET generated_count = generated_count - 1
        WHERE id = ${voucher.id} AND generated_count > 0
      `);
      await Promise.all([
        ...faceKeys.map((key) => deleteImage(key)),
        ...(outputKey ? [deleteImage(outputKey)] : []),
      ]);
      throw error;
    }
  });

export const editGeneratedImage = createServerFn({ method: "POST" })
  .validator((data) => editInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const voucher = await loadVoucher(data.code);
    if (!voucher) throw new Error("凭证无效");

    const rows = await database
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.id, data.imageId), eq(generatedImages.voucherId, voucher.id)))
      .limit(1);
    const row = rows.at(0);
    if (!row) throw new Error("照片不存在");
    if (row.expiresAt <= Date.now()) throw new Error("照片已过期");
    if (row.editCount >= MAX_EDITS) throw new Error(`每张照片最多修改 ${MAX_EDITS} 次`);

    const scene = findWeddingScene(row.sceneId);
    if (!scene) throw new Error("照片场景不存在");

    // 先原子占用一次修改次数，失败再退还。
    const reserved = await database.run(sql`
      UPDATE generated_images
      SET edit_count = edit_count + 1
      WHERE id = ${row.id} AND edit_count < ${MAX_EDITS}
    `);
    if (reserved.meta.changes === 0) throw new Error(`每张照片最多修改 ${MAX_EDITS} 次`);

    let outputKey: string | undefined;

    try {
      const photo = await loadAsDataUrl(row.storageKey);
      const faces = await Promise.all(parseFaceKeys(row.faceKeys).map((key) => loadAsDataUrl(key)));

      const image = await editWeddingImage({
        photo,
        faces,
        scene: {
          description: scene.description,
          brideAttire: scene.brideAttire,
          groomAttire: scene.groomAttire,
        },
        instruction: data.instruction,
        model: WEDDING_MODEL,
        apiKey: env.OPENROUTER_API_KEY,
      });

      outputKey = storageKey(voucher.id, `${crypto.randomUUID()}.${extensionFor(image.mediaType)}`);
      await putImage(outputKey, image.data, image.mediaType);
      await database
        .update(generatedImages)
        .set({ storageKey: outputKey })
        .where(eq(generatedImages.id, row.id));
      await deleteImage(row.storageKey);

      return toPublicImage({
        ...row,
        storageKey: outputKey,
        editCount: row.editCount + 1,
      });
    } catch (error) {
      await database.run(sql`
        UPDATE generated_images
        SET edit_count = edit_count - 1
        WHERE id = ${row.id} AND edit_count > 0
      `);
      if (outputKey) await deleteImage(outputKey);
      throw error;
    }
  });
