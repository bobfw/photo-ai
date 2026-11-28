import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { submitPortrait, submitPortraitEdit } from "#agents/portrait";
import {
  createGenerationTask,
  reserveEditQuota,
  reserveGenerationQuota,
  startGenerationTask,
} from "#services/generation";
import { signUploadUrls } from "#services/upload-store";
import {
  assertTermsAccepted,
  loadImageRow,
  loadVoucher,
  recordGeneration,
  resolveVersionUrl,
} from "#services/voucher-store";
import { clientTokenSchema, codeSchema, uploadKeySchema } from "#services/voucher-types";
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
  clientToken: clientTokenSchema,
  style: z.string().min(1, "请选择风格").max(64, "风格不存在"),
  pose: z.string().min(1, "请选择姿势").max(64, "姿势不存在"),
  composition: z.string().min(1, "请选择构图").max(64, "构图不存在"),
  faces: z.array(uploadKeySchema).min(1, "请至少上传一张照片").max(3, "最多上传三张照片"),
  request: z.string().trim().max(200, "补充要求请控制在 200 字以内").default(""),
});

const editInput = z.object({
  code: codeSchema,
  clientToken: clientTokenSchema,
  imageId: z.number().int().positive(),
  // 当前选中的版本（Ark 原始地址），前端切换历史版本时只改本地状态
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
  .handler(async ({ data }): Promise<{ taskId: number }> => {
    const style = findPortraitStyle(data.style);
    if (!style) throw new Error("风格不存在");
    const pose = findPortraitPose(data.pose);
    if (!pose) throw new Error("姿势不存在");
    const composition = findPortraitComposition(data.composition);
    if (!composition) throw new Error("构图不存在");
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const faces = await signUploadUrls(voucher.id, data.faces);

    const { created, task } = await createGenerationTask({
      voucherId: voucher.id,
      clientToken: data.clientToken,
      kind: "generate",
      series: data.style,
      poseIndex: POSE_INDEX,
      ratio: GENERATION_RATIO,
    });
    if (!created) return { taskId: task.id };

    await startGenerationTask(
      task,
      () => reserveGenerationQuota(voucher.id),
      async () => {
        await recordGeneration(voucher.id, "generate", data.style, POSE_INDEX, GENERATION_RATIO);
        return submitPortrait(
          faces,
          {
            attire: style.attire,
            mood: style.mood,
            pose: pose.prompt,
            composition: composition.prompt,
          },
          GENERATION_SIZE,
          aspectPrompt(GENERATION_RATIO),
          data.request,
          data.clientToken,
        );
      },
    );
    return { taskId: task.id };
  });

export const editPortraitImage = createServerFn({ method: "POST" })
  .validator((data) => editInput.parse(data))
  .handler(async ({ data }): Promise<{ taskId: number }> => {
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    if (row.ratio !== GENERATION_RATIO) throw new Error("比例不存在");

    const source = resolveVersionUrl(row, data.url);

    const { created, task } = await createGenerationTask({
      voucherId: voucher.id,
      clientToken: data.clientToken,
      kind: "edit",
      imageId: row.id,
      series: row.series,
      poseIndex: row.poseIndex,
      ratio: row.ratio,
    });
    if (!created) return { taskId: task.id };

    await startGenerationTask(
      task,
      () => reserveEditQuota(row, voucher.maxEdits),
      () =>
        submitPortraitEdit(
          source,
          data.instruction,
          GENERATION_SIZE,
          aspectPrompt(row.ratio),
          data.clientToken,
        ),
    );
    return { taskId: task.id };
  });
