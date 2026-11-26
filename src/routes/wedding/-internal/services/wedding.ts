import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { editWeddingPose, generateWeddingPose } from "#agents/wedding";
import { database } from "#services/database";
import { isStoredImage } from "#services/images";
import { generatedImages, generationRecords, vouchers } from "#services/schema";

import { findImageRatio, findPoseSeries, POSE_COUNT, poseImageUrl } from "./poses.ts";

/* oxlint-disable typescript/only-throw-error -- TanStack Router 的 redirect 必须 throw */

const VOUCHER_TYPE = "wedding";
const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
// Ark 一次修改最长约 2 分钟；锁超过 3 分钟视为请求已中断，允许重试。
const EDIT_LOCK_MS = 3 * 60 * 1000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// 分辨率档位写死在后台，前端只选姿态；生成统一 2:3，3:4 只在换背景导出时选择
const GENERATION_SIZE = "2K";
const GENERATION_RATIO = "2:3";

// Ark 使用档位时由模型决定像素，宽高比要在 prompt 里用自然语言写明
function aspectPrompt(ratio: string) {
  return `${ratio} 竖幅`;
}

const codeSchema = z.string().min(1, "凭证格式不正确").max(64, "凭证格式不正确");

const imageDataUrlSchema = z
  .string()
  .regex(/^data:image\/(?:jpeg|jpg|png|webp);base64,/, "照片格式不支持，请上传 JPG、PNG 或 WebP")
  .max(MAX_IMAGE_BYTES * 1.4, "照片太大了，请压缩后重试");

const voucherInput = z.object({ code: codeSchema });

const generateInput = z.object({
  code: codeSchema,
  series: z.string().min(1, "请选择系列").max(64, "系列不存在"),
  pose: z.number().int().min(1, "姿态不存在").max(POSE_COUNT, "姿态不存在"),
  // 老客户端不带 outfit 时沿用系列默认服装
  outfit: z.string().trim().min(1, "请填写服装").max(200, "服装描述请控制在 200 字以内").optional(),
  faces: z.array(imageDataUrlSchema).length(2, "双人婚纱照需要上传两张照片"),
  request: z.string().trim().max(200, "补充要求请控制在 200 字以内").default(""),
});

const editInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  // 当前选中的版本（同源代理 URL），前端切换历史版本时只改本地状态
  url: z.string().min(1).max(4096),
  instruction: z.string().trim().min(1, "请描述想怎么修改").max(500, "修改描述请控制在 500 字以内"),
});

const regenerateInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  faces: z.array(imageDataUrlSchema).length(2, "双人婚纱照需要上传两张照片"),
});

interface ImageVersion {
  url: string;
  // Ark 原始地址；老数据没有
  sourceUrl?: string;
  createdAt: number;
}

export interface PublicImage {
  id: number;
  // 当前版本地址：新数据是 Ark 原图，老数据可能是 R2 key；前端经 proxy.yumus.cn 展示和合成
  url: string;
  // Ark 原始地址，老数据没有
  sourceUrl?: string;
  versions: ImageVersion[];
  series: string;
  pose: number;
  ratio: string;
  remainingEdits: number;
  createdAt: number;
  expiresAt: number;
}

async function loadVoucher(code: string) {
  const rows = await database.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  const voucher = rows.at(0);
  return voucher?.type === VOUCHER_TYPE ? voucher : undefined;
}

function assertTermsAccepted(voucher: typeof vouchers.$inferSelect) {
  if (typeof voucher.termsAcceptedAt !== "number") throw new Error("请先同意用户协议");
}

function requestMetadata() {
  const request = getRequest();
  return {
    ip:
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
      "",
    country: request.headers.get("cf-ipcountry") ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

async function recordGeneration(
  voucherId: number,
  kind: "generate" | "regenerate",
  series: string,
  poseIndex: number,
  ratio: string,
) {
  await database.insert(generationRecords).values({
    voucherId,
    kind,
    series,
    poseIndex,
    ratio,
    ...requestMetadata(),
    createdAt: Date.now(),
  });
}

// 老客户端用 /media 代理地址标记版本，保留兼容；新客户端直接传原图地址。
function imageProxyUrl(source: string) {
  return `/media/${btoa(source).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")}`;
}

function readVersions(value: string) {
  return JSON.parse(value) as ImageVersion[];
}

function isVersionUrl(url: string, sourceUrl: string | null | undefined, publicUrl: string) {
  return url === publicUrl || sourceUrl === publicUrl || imageProxyUrl(url) === publicUrl;
}

// 前端传当前选中的版本地址；确认它属于这张图。
function resolveVersionUrl(row: typeof generatedImages.$inferSelect, publicUrl: string) {
  if (isVersionUrl(row.imageUrl, row.sourceUrl, publicUrl)) return row.imageUrl;

  const version = readVersions(row.versions).find((item) =>
    isVersionUrl(item.url, item.sourceUrl, publicUrl),
  );
  if (!version) throw new Error("版本不存在");
  if (version.createdAt + IMAGE_TTL_MS <= Date.now()) throw new Error("这个版本已过期");
  return version.url;
}

// 修改/重新生成前把旧图记进历史；老数据没有 versions，顺手补上当前图。
function appendVersion(
  row: typeof generatedImages.$inferSelect,
  version: ImageVersion,
): ImageVersion[] {
  const versions = readVersions(row.versions);
  if (versions.every((item) => item.url !== row.imageUrl)) {
    versions.push({ url: row.imageUrl, createdAt: row.createdAt });
  }
  versions.push(version);
  return versions;
}

function toPublicImage(row: typeof generatedImages.$inferSelect, maxEdits: number): PublicImage {
  const now = Date.now();
  return {
    id: row.id,
    // 生成图直接用 Ark 原图地址；老数据没有 sourceUrl 时回退到存的值
    url: row.sourceUrl ?? row.imageUrl,
    sourceUrl: row.sourceUrl ?? undefined,
    versions: readVersions(row.versions)
      .filter((version) => version.createdAt + IMAGE_TTL_MS > now)
      .map((version) => ({
        url: version.sourceUrl ?? version.url,
        sourceUrl: version.sourceUrl,
        createdAt: version.createdAt,
      })),
    series: row.series,
    pose: row.poseIndex,
    ratio: row.ratio,
    remainingEdits: Math.max(0, maxEdits - row.editCount),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

// 生成结果固定是 PNG：新图从 Ark 读，老数据在 R2；服务端读取不受 CORS 限制。
async function loadImageDataUrl(source: string) {
  if (isStoredImage(source)) {
    const object = await env.BUCKET.get(source);
    if (!object) throw new Error("当前图片已过期");
    return `data:image/png;base64,${Buffer.from(await object.arrayBuffer()).toString("base64")}`;
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`读取当前图片失败（${response.status}）`);
  return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}

async function loadPoseImage(series: string, pose: number) {
  const response = await fetch(poseImageUrl(series, pose));
  if (!response.ok) throw new Error(`读取姿态图失败（${response.status}）`);
  return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}

async function loadImageRow(voucherId: number, imageId: number) {
  const rows = await database
    .select()
    .from(generatedImages)
    .where(and(eq(generatedImages.id, imageId), eq(generatedImages.voucherId, voucherId)))
    .limit(1);
  const row = rows.at(0);
  if (!row) throw new Error("照片不存在");
  if (row.expiresAt <= Date.now()) throw new Error("照片已过期");
  return row;
}

export const getVoucherState = createServerFn({ method: "POST" })
  .validator((data) => voucherInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code);
    if (!voucher) return;

    const notExpired = gt(generatedImages.expiresAt, Date.now());
    const rows = await database
      .select()
      .from(generatedImages)
      .where(and(eq(generatedImages.voucherId, voucher.id), notExpired))
      .orderBy(generatedImages.createdAt);

    return {
      totalImages: voucher.totalImages,
      generatedCount: voucher.generatedCount,
      remaining: Math.max(0, voucher.totalImages - voucher.generatedCount),
      termsAccepted: typeof voucher.termsAcceptedAt === "number",
      images: rows.map((row) => toPublicImage(row, voucher.maxEdits)),
    };
  });

// /wedding 下各路由的 loader 共用：凭证无效或未同意协议时统一跳回凭证页。
export async function loadWeddingState(code: string | undefined) {
  if (!code) {
    throw redirect({ to: "/wedding/voucher" });
  }
  if (!z.uuid().safeParse(code).success) {
    throw redirect({ to: "/wedding/voucher", search: { error: "invalid" } });
  }
  const state = await getVoucherState({ data: { code } });
  if (!state) {
    throw redirect({ to: "/wedding/voucher", search: { error: "invalid" } });
  }
  if (!state.termsAccepted) {
    throw redirect({ to: "/wedding/voucher", search: { code, error: "consent" } });
  }
  return { code, state };
}

export const acceptVoucherTerms = createServerFn({ method: "POST" })
  .validator((data) => voucherInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code);
    if (!voucher) throw new Error("凭证无效");
    // 保留第一次同意的记录，不覆盖
    if (typeof voucher.termsAcceptedAt === "number") return;
    const metadata = requestMetadata();

    await database
      .update(vouchers)
      .set({
        termsAcceptedAt: Date.now(),
        termsAcceptedIp: metadata.ip,
        termsAcceptedCountry: metadata.country,
        termsAcceptedUserAgent: metadata.userAgent,
      })
      .where(eq(vouchers.id, voucher.id));
  });

export const generatePoseImage = createServerFn({ method: "POST" })
  .validator((data) => generateInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const series = findPoseSeries(data.series);
    if (!series) throw new Error("系列不存在");
    const outfit = data.outfit ?? series.outfit;
    const voucher = await loadVoucher(data.code);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);

    // 先原子占用一个额度，失败再退还。
    const reserved = await database.run(sql`
      UPDATE vouchers
      SET generated_count = generated_count + 1
      WHERE id = ${voucher.id} AND generated_count < total_images
    `);
    if (reserved.meta.changes === 0) throw new Error("这个凭证的照片额度已经用完");

    try {
      await recordGeneration(voucher.id, "generate", data.series, data.pose, GENERATION_RATIO);

      const [bride, groom] = data.faces;
      const poseImage = await loadPoseImage(data.series, data.pose);
      const image = await generateWeddingPose(
        [bride, groom],
        poseImage,
        outfit,
        GENERATION_SIZE,
        aspectPrompt(GENERATION_RATIO),
        data.request,
      );

      const createdAt = Date.now();
      const inserted = await database
        .insert(generatedImages)
        .values({
          voucherId: voucher.id,
          imageUrl: image,
          sourceUrl: image,
          poseIndex: data.pose,
          series: data.series,
          ratio: GENERATION_RATIO,
          versions: JSON.stringify([{ url: image, sourceUrl: image, createdAt }]),
          createdAt,
          expiresAt: createdAt + IMAGE_TTL_MS,
        })
        .returning();
      const row = inserted.at(0);
      if (!row) throw new Error("保存照片失败");
      return toPublicImage(row, voucher.maxEdits);
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
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    const ratio = findImageRatio(row.ratio);
    if (!ratio) throw new Error("比例不存在");

    // 先原子占用一次修改次数，失败再退还；生成中的同一张图拒绝重复提交。
    const now = Date.now();
    const reserved = await database.run(sql`
      UPDATE generated_images
      SET edit_count = edit_count + 1, edit_started_at = ${now}
      WHERE id = ${row.id}
        AND edit_count < ${voucher.maxEdits}
        AND (edit_started_at IS NULL OR edit_started_at < ${now - EDIT_LOCK_MS})
    `);
    if (reserved.meta.changes === 0) {
      if (row.editCount >= voucher.maxEdits) {
        throw new Error(`每张照片最多修改 ${voucher.maxEdits} 次`);
      }
      throw new Error("这张照片正在修改中，请稍后再试");
    }

    try {
      const photo = await loadImageDataUrl(resolveVersionUrl(row, data.url));
      const image = await editWeddingPose(
        photo,
        data.instruction,
        GENERATION_SIZE,
        aspectPrompt(ratio.value),
      );

      const createdAt = Date.now();
      const expiresAt = createdAt + IMAGE_TTL_MS;
      const versions = appendVersion(row, {
        url: image,
        sourceUrl: image,
        createdAt,
      });
      await database
        .update(generatedImages)
        .set({
          imageUrl: image,
          sourceUrl: image,
          expiresAt,
          versions: JSON.stringify(versions),
          editStartedAt: sql`NULL`,
        })
        .where(eq(generatedImages.id, row.id));

      return toPublicImage(
        {
          ...row,
          imageUrl: image,
          sourceUrl: image,
          versions: JSON.stringify(versions),
          editCount: row.editCount + 1,
          expiresAt,
        },
        voucher.maxEdits,
      );
    } catch (error) {
      await database.run(sql`
        UPDATE generated_images
        SET edit_count = edit_count - 1, edit_started_at = NULL
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
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    const series = findPoseSeries(row.series);
    if (!series) throw new Error("系列不存在");
    const ratio = findImageRatio(row.ratio);
    if (!ratio) throw new Error("比例不存在");

    // 重新生成和提示词修改共用每张图的修改次数，先原子占用，失败再退还。
    const now = Date.now();
    const reserved = await database.run(sql`
      UPDATE generated_images
      SET edit_count = edit_count + 1, edit_started_at = ${now}
      WHERE id = ${row.id}
        AND edit_count < ${voucher.maxEdits}
        AND (edit_started_at IS NULL OR edit_started_at < ${now - EDIT_LOCK_MS})
    `);
    if (reserved.meta.changes === 0) {
      if (row.editCount >= voucher.maxEdits) {
        throw new Error(`每张照片最多修改 ${voucher.maxEdits} 次`);
      }
      throw new Error("这张照片正在修改中，请稍后再试");
    }

    try {
      await recordGeneration(voucher.id, "regenerate", row.series, row.poseIndex, row.ratio);

      const [bride, groom] = data.faces;
      const poseImage = await loadPoseImage(row.series, row.poseIndex);
      const image = await generateWeddingPose(
        [bride, groom],
        poseImage,
        series.outfit,
        GENERATION_SIZE,
        aspectPrompt(ratio.value),
      );

      const createdAt = Date.now();
      const expiresAt = createdAt + IMAGE_TTL_MS;
      const versions = appendVersion(row, {
        url: image,
        sourceUrl: image,
        createdAt,
      });
      await database
        .update(generatedImages)
        .set({
          imageUrl: image,
          sourceUrl: image,
          expiresAt,
          versions: JSON.stringify(versions),
          editStartedAt: sql`NULL`,
        })
        .where(eq(generatedImages.id, row.id));

      return toPublicImage(
        {
          ...row,
          imageUrl: image,
          sourceUrl: image,
          versions: JSON.stringify(versions),
          editCount: row.editCount + 1,
          expiresAt,
        },
        voucher.maxEdits,
      );
    } catch (error) {
      await database.run(sql`
        UPDATE generated_images
        SET edit_count = edit_count - 1, edit_started_at = NULL
        WHERE id = ${row.id} AND edit_count > 0
      `);
      throw error;
    }
  });
