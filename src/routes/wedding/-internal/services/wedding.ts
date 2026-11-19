import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { editWeddingImage, generateWeddingImage } from "#agents/wedding";
import { database } from "#services/database";
import { generatedImages, vouchers } from "#services/schema";
import { getImage } from "#services/storage";

import { findReference } from "./references.ts";

const VOUCHER_TYPE = "wedding";
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EDITS = 5;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const codeSchema = z.string().min(1, "凭证格式不正确").max(64, "凭证格式不正确");

const faceSchema = z
  .string()
  .regex(/^data:image\/(?:jpeg|jpg|png|webp);base64,/, "照片格式不支持，请上传 JPG、PNG 或 WebP")
  .max(MAX_IMAGE_BYTES * 1.4, "照片太大了，请压缩后重试");

const voucherInput = z.object({ code: codeSchema });

const bodySizeSchema = z.object({
  height: z.number().min(100, "身高请填写 100–250 cm").max(250, "身高请填写 100–250 cm").optional(),
  weight: z.number().min(30, "体重请填写 30–200 kg").max(200, "体重请填写 30–200 kg").optional(),
});

const generateInput = z.object({
  code: codeSchema,
  reference: z.string().min(1, "请选择参考图").max(200, "参考图地址不正确"),
  faces: z.array(faceSchema).length(2, "双人婚纱照需要上传两张照片"),
  bodySizes: z.array(bodySizeSchema).length(2, "双人婚纱照需要两个人的身高体重"),
});

const editInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  instruction: z.string().trim().min(1, "请描述想怎么修改").max(500, "修改描述请控制在 500 字以内"),
});

export interface PublicImage {
  id: number;
  url: string;
  referenceKey: string;
  editCount: number;
  remainingEdits: number;
  createdAt: number;
  expiresAt: number;
}

async function loadVoucher(code: string) {
  const rows = await database.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  const voucher = rows.at(0);
  return voucher?.type === VOUCHER_TYPE ? voucher : undefined;
}

// ponytail: 每次访问时全表扫描过期记录；量大了再换成定时任务。
async function cleanupExpiredImages() {
  await database.delete(generatedImages).where(lt(generatedImages.expiresAt, Date.now()));
}

function toPublicImage(row: typeof generatedImages.$inferSelect): PublicImage {
  return {
    id: row.id,
    url: row.imageUrl,
    referenceKey: row.referenceKey,
    editCount: row.editCount,
    remainingEdits: Math.max(0, MAX_EDITS - row.editCount),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
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
    const referenceImage = findReference(data.reference);
    if (!referenceImage) throw new Error("参考图不存在");

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
      const reference = await loadAsDataUrl(referenceImage.key);
      const imageUrl = await generateWeddingImage({
        faces: data.faces,
        reference,
        bodySizes: data.bodySizes,
      });

      const createdAt = Date.now();
      const inserted = await database
        .insert(generatedImages)
        .values({
          voucherId: voucher.id,
          imageUrl,
          faceKeys: "[]",
          referenceKey: data.reference,
          mode: "couple",
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

    // 先原子占用一次修改次数，失败再退还。
    const reserved = await database.run(sql`
      UPDATE generated_images
      SET edit_count = edit_count + 1
      WHERE id = ${row.id} AND edit_count < ${MAX_EDITS}
    `);
    if (reserved.meta.changes === 0) throw new Error(`每张照片最多修改 ${MAX_EDITS} 次`);

    try {
      const imageUrl = await editWeddingImage({
        photo: row.imageUrl,
        instruction: data.instruction,
      });

      await database
        .update(generatedImages)
        .set({ imageUrl })
        .where(eq(generatedImages.id, row.id));

      return toPublicImage({
        ...row,
        imageUrl,
        editCount: row.editCount + 1,
      });
    } catch (error) {
      await database.run(sql`
        UPDATE generated_images
        SET edit_count = edit_count - 1
        WHERE id = ${row.id} AND edit_count > 0
      `);
      throw error;
    }
  });
