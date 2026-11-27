import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { waitUntil } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { editWeddingPose, generateWeddingPose } from "#agents/wedding";
import { database } from "#services/database";
import { generatedImages } from "#services/schema";
import {
  appendVersion,
  assertTermsAccepted,
  loadImageDataUrl,
  loadImageRow,
  loadVoucher,
  recordGeneration,
  resolveVersionUrl,
  toPublicImage,
} from "#services/voucher-store";
import {
  EDIT_LOCK_MS,
  IMAGE_TTL_MS,
  codeSchema,
  imageDataUrlSchema,
  type PublicImage,
} from "#services/voucher-types";
import { getVoucherState } from "#services/vouchers";

import { findImageRatio, findPoseSeries, POSE_COUNT, poseImageUrl } from "./poses.ts";

/* oxlint-disable typescript/only-throw-error -- TanStack Router 的 redirect 必须 throw */

const VOUCHER_TYPE = "wedding";

// 分辨率档位写死在后台，前端只选姿态；生成统一 2:3，3:4 只在换背景导出时选择
const GENERATION_SIZE = "2K";
const GENERATION_RATIO = "2:3";

// Ark 使用档位时由模型决定像素，宽高比要在 prompt 里用自然语言写明
function aspectPrompt(ratio: string) {
  return `${ratio} 竖幅`;
}

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

// /wedding 下各路由的 loader 共用：凭证无效或未同意协议时统一跳回凭证页。
export async function loadWeddingState(code: string | undefined) {
  if (!code) {
    throw redirect({ to: "/wedding/voucher" });
  }
  if (!z.uuid().safeParse(code).success) {
    throw redirect({ to: "/wedding/voucher", search: { error: "invalid" } });
  }
  const state = await getVoucherState({ data: { code, type: VOUCHER_TYPE } });
  if (!state) {
    throw redirect({ to: "/wedding/voucher", search: { error: "invalid" } });
  }
  if (!state.termsAccepted) {
    throw redirect({ to: "/wedding/voucher", search: { code, error: "consent" } });
  }
  return { code, state };
}

export const generatePoseImage = createServerFn({ method: "POST" })
  .validator((data) => generateInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const series = findPoseSeries(data.series);
    if (!series) throw new Error("系列不存在");
    const outfit = data.outfit ?? series.outfit;
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);

    // 客户端断开后 TanStack 会放弃等待 server fn；注册到 waitUntil，让生成和落库跑完。
    // shortcut: waitUntil 在断开后只多给约 30 秒；Ark 更慢时需要改用 Queues 或 Durable Object。
    const work = (async () => {
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
    })();
    waitUntil(work);
    return work;
  });

async function loadPoseImage(series: string, pose: number) {
  const response = await fetch(poseImageUrl(series, pose));
  if (!response.ok) throw new Error(`读取姿态图失败（${response.status}）`);
  return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}

export const editGeneratedImage = createServerFn({ method: "POST" })
  .validator((data) => editInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    const ratio = findImageRatio(row.ratio);
    if (!ratio) throw new Error("比例不存在");

    // 客户端断开后 TanStack 会放弃等待 server fn；注册到 waitUntil，让生成和落库跑完。
    const work = (async () => {
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
    })();
    waitUntil(work);
    return work;
  });

export const regenerateWedding = createServerFn({ method: "POST" })
  .validator((data) => regenerateInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    const series = findPoseSeries(row.series);
    if (!series) throw new Error("系列不存在");
    const ratio = findImageRatio(row.ratio);
    if (!ratio) throw new Error("比例不存在");

    // 客户端断开后 TanStack 会放弃等待 server fn；注册到 waitUntil，让生成和落库跑完。
    const work = (async () => {
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
    })();
    waitUntil(work);
    return work;
  });
