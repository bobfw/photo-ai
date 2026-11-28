import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { submitWeddingEdit, submitWeddingPose } from "#agents/wedding";
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
  clientToken: clientTokenSchema,
  series: z.string().min(1, "请选择系列").max(64, "系列不存在"),
  pose: z.number().int().min(1, "姿态不存在").max(POSE_COUNT, "姿态不存在"),
  // 老客户端不带 outfit 时沿用系列默认服装
  outfit: z.string().trim().min(1, "请填写服装").max(200, "服装描述请控制在 200 字以内").optional(),
  faces: z.array(uploadKeySchema).length(2, "双人婚纱照需要上传两张照片"),
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

const regenerateInput = z.object({
  code: codeSchema,
  clientToken: clientTokenSchema,
  imageId: z.number().int().positive(),
  faces: z.array(uploadKeySchema).length(2, "双人婚纱照需要上传两张照片"),
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
  .handler(async ({ data }): Promise<{ taskId: number }> => {
    const series = findPoseSeries(data.series);
    if (!series) throw new Error("系列不存在");
    const outfit = data.outfit ?? series.outfit;
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const faces = await signUploadUrls(voucher.id, data.faces);

    const { created, task } = await createGenerationTask({
      voucherId: voucher.id,
      clientToken: data.clientToken,
      kind: "generate",
      series: data.series,
      poseIndex: data.pose,
      ratio: GENERATION_RATIO,
    });
    if (!created) return { taskId: task.id };

    await startGenerationTask(
      task,
      () => reserveGenerationQuota(voucher.id),
      async () => {
        await recordGeneration(voucher.id, "generate", data.series, data.pose, GENERATION_RATIO);
        return submitWeddingPose(
          [faces[0], faces[1]],
          poseImageUrl(data.series, data.pose),
          outfit,
          GENERATION_SIZE,
          aspectPrompt(GENERATION_RATIO),
          data.request,
          data.clientToken,
        );
      },
    );
    return { taskId: task.id };
  });

export const editGeneratedImage = createServerFn({ method: "POST" })
  .validator((data) => editInput.parse(data))
  .handler(async ({ data }): Promise<{ taskId: number }> => {
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    const ratio = findImageRatio(row.ratio);
    if (!ratio) throw new Error("比例不存在");

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
        submitWeddingEdit(
          source,
          data.instruction,
          GENERATION_SIZE,
          aspectPrompt(ratio.value),
          data.clientToken,
        ),
    );
    return { taskId: task.id };
  });

export const regenerateWedding = createServerFn({ method: "POST" })
  .validator((data) => regenerateInput.parse(data))
  .handler(async ({ data }): Promise<{ taskId: number }> => {
    const voucher = await loadVoucher(data.code, VOUCHER_TYPE);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    const row = await loadImageRow(voucher.id, data.imageId);
    const series = findPoseSeries(row.series);
    if (!series) throw new Error("系列不存在");
    const ratio = findImageRatio(row.ratio);
    if (!ratio) throw new Error("比例不存在");
    const faces = await signUploadUrls(voucher.id, data.faces);

    const { created, task } = await createGenerationTask({
      voucherId: voucher.id,
      clientToken: data.clientToken,
      kind: "regenerate",
      imageId: row.id,
      series: row.series,
      poseIndex: row.poseIndex,
      ratio: row.ratio,
    });
    if (!created) return { taskId: task.id };

    await startGenerationTask(
      task,
      () => reserveEditQuota(row, voucher.maxEdits),
      async () => {
        await recordGeneration(voucher.id, "regenerate", row.series, row.poseIndex, row.ratio);
        return submitWeddingPose(
          [faces[0], faces[1]],
          poseImageUrl(row.series, row.poseIndex),
          series.outfit,
          GENERATION_SIZE,
          aspectPrompt(ratio.value),
          "",
          data.clientToken,
        );
      },
    );
    return { taskId: task.id };
  });
