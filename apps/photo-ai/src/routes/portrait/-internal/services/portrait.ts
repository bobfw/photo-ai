import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { waitUntil } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { editPortrait, generatePortrait } from "#agents/portrait";
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

import { findPortraitComposition, findPortraitPose, findPortraitStyle } from "./styles.ts";

/* oxlint-disable typescript/only-throw-error -- TanStack Router 的 redirect 必须 throw */

const VOUCHER_TYPE = "portrait";
// 形象照生成统一 3:4；1:1 只在换背景导出时选择
const GENERATION_SIZE = "2K";
const GENERATION_RATIO = "3:4";
// 复用婚纱照的图片/记录表结构；形象照没有姿态，固定记 1
const POSE_INDEX = 1;

// Ark 使用档位时由模型决定像素，宽高比要在 prompt 里用自然语言写明
function aspectPrompt(ratio: string) {
  return `${ratio} 竖幅`;
}

const generateInput = z.object({
  code: codeSchema,
  style: z.string().min(1, "请选择风格").max(64, "风格不存在"),
  pose: z.string().min(1, "请选择姿势").max(64, "姿势不存在"),
  composition: z.string().min(1, "请选择构图").max(64, "构图不存在"),
  faces: z.array(imageDataUrlSchema).min(1, "请至少上传一张照片").max(3, "最多上传三张照片"),
  request: z.string().trim().max(200, "补充要求请控制在 200 字以内").default(""),
});

const editInput = z.object({
  code: codeSchema,
  imageId: z.number().int().positive(),
  // 当前选中的版本（同源代理 URL），前端切换历史版本时只改本地状态
  url: z.string().min(1).max(4096),
  instruction: z.string().trim().min(1, "请描述想怎么修改").max(500, "修改描述请控制在 500 字以内"),
});

// /portrait 下各路由的 loader 共用：凭证无效或未同意协议时统一跳回凭证页。
export async function loadPortraitState(code: string | undefined) {
  if (!code) {
    throw redirect({ to: "/portrait/voucher" });
  }
  if (!z.uuid().safeParse(code).success) {
    throw redirect({ to: "/portrait/voucher", search: { error: "invalid" } });
  }
  const state = await getVoucherState({ data: { code, type: VOUCHER_TYPE } });
  if (!state) {
    throw redirect({ to: "/portrait/voucher", search: { error: "invalid" } });
  }
  if (!state.termsAccepted) {
    throw redirect({ to: "/portrait/voucher", search: { code, error: "consent" } });
  }
  return { code, state };
}

export const generatePortraitImage = createServerFn({ method: "POST" })
  .validator((data) => generateInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const style = findPortraitStyle(data.style);
    if (!style) throw new Error("风格不存在");
    const pose = findPortraitPose(data.pose);
    if (!pose) throw new Error("姿势不存在");
    const composition = findPortraitComposition(data.composition);
    if (!composition) throw new Error("构图不存在");
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
        await recordGeneration(voucher.id, "generate", data.style, POSE_INDEX, GENERATION_RATIO);

        const image = await generatePortrait(
          data.faces,
          {
            attire: style.attire,
            mood: style.mood,
            pose: pose.prompt,
            composition: composition.prompt,
          },
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
            poseIndex: POSE_INDEX,
            series: data.style,
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

export const editPortraitImage = createServerFn({ method: "POST" })
  .validator((data) => editInput.parse(data))
  .handler(async ({ data }): Promise<PublicImage> => {
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    if (row.ratio !== GENERATION_RATIO) throw new Error("比例不存在");

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
        const image = await editPortrait(
          photo,
          data.instruction,
          GENERATION_SIZE,
          aspectPrompt(row.ratio),
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
