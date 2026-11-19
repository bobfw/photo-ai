import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { editWeddingImage, generateWeddingImage } from "#agents/wedding";
import { database } from "#services/database";
import { generatedImageVersions, generatedImages, vouchers } from "#services/schema";
import { getImage } from "#services/storage";

import { findReference } from "./references.ts";

const VOUCHER_TYPE = "wedding";
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EDITS = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const codeSchema = z.string().min(1, "凭证格式不正确").max(64, "凭证格式不正确");

const imageDataUrlSchema = z
  .string()
  .regex(/^data:image\/(?:jpeg|jpg|png|webp);base64,/, "照片格式不支持，请上传 JPG、PNG 或 WebP")
  .max(MAX_IMAGE_BYTES * 1.4, "照片太大了，请压缩后重试");

const voucherInput = z.object({ code: codeSchema });

const referenceInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("curated"),
    key: z.string().min(1, "请选择参考图").max(200, "参考图地址不正确"),
  }),
  z.object({
    kind: z.literal("custom"),
    dataUrl: imageDataUrlSchema,
  }),
]);

const bodySizeSchema = z.object({
  height: z.number().min(100, "身高请填写 100–250 cm").max(250, "身高请填写 100–250 cm").optional(),
  weight: z.number().min(30, "体重请填写 30–200 kg").max(200, "体重请填写 30–200 kg").optional(),
});

const generateInput = z.object({
  code: codeSchema,
  reference: referenceInput,
  faces: z.array(imageDataUrlSchema).length(2, "双人婚纱照需要上传两张照片"),
  bodySizes: z.array(bodySizeSchema).length(2, "双人婚纱照需要两个人的身高体重"),
  retouch: z.enum(["natural", "refined", "retouched"]),
});

const editInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  versionId: z.number().int().nonnegative(),
  instruction: z.string().trim().min(1, "请描述想怎么修改").max(500, "修改描述请控制在 500 字以内"),
  retouch: z.enum(["natural", "refined", "retouched"]),
});

const regenerateInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  faces: z.array(imageDataUrlSchema).length(2, "双人婚纱照需要上传两张照片"),
  bodySizes: z.array(bodySizeSchema).length(2, "双人婚纱照需要两个人的身高体重"),
  retouch: z.enum(["natural", "refined", "retouched"]),
});

export interface PublicImageVersion {
  id: number;
  url: string;
  instruction?: string;
  createdAt: number;
}

export interface PublicImage {
  id: number;
  url: string;
  referenceKey: string;
  editCount: number;
  remainingEdits: number;
  createdAt: number;
  expiresAt: number;
  versions: PublicImageVersion[];
}

async function loadVoucher(code: string) {
  const rows = await database.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  const voucher = rows.at(0);
  return voucher?.type === VOUCHER_TYPE ? voucher : undefined;
}

// ponytail: 每次访问时全表扫描过期记录；量大了再换成定时任务。
async function cleanupExpiredImages() {
  const expired = await database
    .select({ id: generatedImages.id })
    .from(generatedImages)
    .where(lt(generatedImages.expiresAt, Date.now()));
  if (expired.length === 0) return;

  const ids = expired.map((row) => row.id);
  await database.delete(generatedImageVersions).where(inArray(generatedImageVersions.imageId, ids));
  await database.delete(generatedImages).where(inArray(generatedImages.id, ids));
}

function toPublicVersion(row: typeof generatedImageVersions.$inferSelect): PublicImageVersion {
  return {
    id: row.id,
    url: row.imageUrl,
    instruction: row.instruction ?? undefined,
    createdAt: row.createdAt,
  };
}

function toPublicImage(
  row: typeof generatedImages.$inferSelect,
  versions: PublicImageVersion[],
): PublicImage {
  return {
    id: row.id,
    url: row.imageUrl,
    referenceKey: row.referenceKey,
    editCount: row.editCount,
    remainingEdits: Math.max(0, MAX_EDITS - row.editCount),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    versions:
      versions.length > 0 ? versions : [{ id: 0, url: row.imageUrl, createdAt: row.createdAt }],
  };
}

async function loadVersions(imageId: number) {
  const rows = await database
    .select()
    .from(generatedImageVersions)
    .where(eq(generatedImageVersions.imageId, imageId))
    .orderBy(generatedImageVersions.createdAt, generatedImageVersions.id);
  return rows.map((row) => toPublicVersion(row));
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
      .orderBy(generatedImages.createdAt);

    const imageIds = rows.map((row) => row.id);
    const versionRows =
      imageIds.length === 0
        ? []
        : await database
            .select()
            .from(generatedImageVersions)
            .where(inArray(generatedImageVersions.imageId, imageIds))
            .orderBy(generatedImageVersions.createdAt, generatedImageVersions.id);
    const versionsByImage = new Map<number, PublicImageVersion[]>();
    for (const versionRow of versionRows) {
      const versions = versionsByImage.get(versionRow.imageId) ?? [];
      versions.push(toPublicVersion(versionRow));
      versionsByImage.set(versionRow.imageId, versions);
    }

    return {
      totalImages: voucher.totalImages,
      generatedCount: voucher.generatedCount,
      remaining: Math.max(0, voucher.totalImages - voucher.generatedCount),
      images: rows.map((row) => toPublicImage(row, versionsByImage.get(row.id) ?? [])),
    };
  });

export const generateWedding = createServerFn({ method: "POST" })
  .validator((data) => generateInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    if (data.reference.kind === "curated" && !findReference(data.reference.key)) {
      throw new Error("参考图不存在");
    }

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

    try {
      const reference =
        data.reference.kind === "custom"
          ? data.reference.dataUrl
          : await loadAsDataUrl(data.reference.key);
      const imageUrl = await generateWeddingImage({
        faces: data.faces,
        reference,
        bodySizes: data.bodySizes,
        retouch: data.retouch,
      });

      const createdAt = Date.now();
      const inserted = await database
        .insert(generatedImages)
        .values({
          voucherId: voucher.id,
          imageUrl,
          faceKeys: "[]",
          referenceKey: data.reference.kind === "custom" ? "custom" : data.reference.key,
          mode: "couple",
          editCount: 0,
          createdAt,
          expiresAt: createdAt + IMAGE_TTL_MS,
        })
        .returning();
      const row = inserted.at(0);
      if (!row) throw new Error("保存照片失败");

      const insertedVersion = await database
        .insert(generatedImageVersions)
        .values({
          imageId: row.id,
          imageUrl,
          createdAt,
        })
        .returning();
      const version = insertedVersion.at(0);
      if (!version) throw new Error("保存照片失败");

      return toPublicImage(row, [toPublicVersion(version)]);
    } catch (error) {
      await database.run(sql`
        UPDATE vouchers
        SET generated_count = generated_count - 1
        WHERE id = ${voucher.id} AND generated_count > 0
      `);
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

    let sourceUrl = row.imageUrl;
    if (data.versionId !== 0) {
      const versionRows = await database
        .select()
        .from(generatedImageVersions)
        .where(
          and(
            eq(generatedImageVersions.id, data.versionId),
            eq(generatedImageVersions.imageId, row.id),
          ),
        )
        .limit(1);
      const version = versionRows.at(0);
      if (!version) throw new Error("版本不存在");
      sourceUrl = version.imageUrl;
    }

    // 先原子占用一次修改次数，失败再退还。
    const reserved = await database.run(sql`
      UPDATE generated_images
      SET edit_count = edit_count + 1
      WHERE id = ${row.id} AND edit_count < ${MAX_EDITS}
    `);
    if (reserved.meta.changes === 0) throw new Error(`每张照片最多修改 ${MAX_EDITS} 次`);

    try {
      const imageUrl = await editWeddingImage({
        photo: sourceUrl,
        instruction: data.instruction,
        retouch: data.retouch,
      });

      const createdAt = Date.now();
      await database.batch([
        database.insert(generatedImageVersions).values({
          imageId: row.id,
          imageUrl,
          instruction: data.instruction,
          createdAt,
        }),
        database.update(generatedImages).set({ imageUrl }).where(eq(generatedImages.id, row.id)),
      ]);

      const versions = await loadVersions(row.id);
      return toPublicImage(
        {
          ...row,
          imageUrl,
          editCount: row.editCount + 1,
        },
        versions,
      );
    } catch (error) {
      await database.run(sql`
        UPDATE generated_images
        SET edit_count = edit_count - 1
        WHERE id = ${row.id} AND edit_count > 0
      `);
      throw error;
    }
  });

export const regenerateWedding = createServerFn({ method: "POST" })
  .validator((data) => regenerateInput.parse(data))
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
    if (row.referenceKey === "custom") throw new Error("自定义造型不支持重新生成");
    if (!findReference(row.referenceKey)) throw new Error("参考图不存在");

    await cleanupExpiredImages();

    // 重新生成消耗一次照片额度，失败再退还。
    const reserved = await database.run(sql`
      UPDATE vouchers
      SET generated_count = generated_count + 1
      WHERE id = ${voucher.id} AND generated_count < total_images
    `);
    if (reserved.meta.changes === 0) throw new Error("这个凭证的照片额度已经用完");

    try {
      const reference = await loadAsDataUrl(row.referenceKey);
      const imageUrl = await generateWeddingImage({
        faces: data.faces,
        reference,
        bodySizes: data.bodySizes,
        retouch: data.retouch,
      });

      const createdAt = Date.now();
      await database.batch([
        database.insert(generatedImageVersions).values({
          imageId: row.id,
          imageUrl,
          createdAt,
        }),
        database.update(generatedImages).set({ imageUrl }).where(eq(generatedImages.id, row.id)),
      ]);

      const versions = await loadVersions(row.id);
      return toPublicImage({ ...row, imageUrl }, versions);
    } catch (error) {
      await database.run(sql`
        UPDATE vouchers
        SET generated_count = generated_count - 1
        WHERE id = ${voucher.id} AND generated_count > 0
      `);
      throw error;
    }
  });
