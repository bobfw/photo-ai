import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { database } from "./database.ts";
import { advanceGenerationTask, type GenerationTaskState } from "./generation.ts";
import { generationTasks } from "./schema.ts";
import { acceptTerms, loadAnyVoucher, loadPublicImages, loadVoucher } from "./voucher-store.ts";
import { IMAGE_TTL_MS, codeSchema } from "./voucher-types.ts";

const stateInput = z.object({ code: codeSchema, type: z.string().min(1).max(32) });
const acceptInput = z.object({
  code: codeSchema,
  type: z.string().min(1, "缺少凭证类型").max(32, "凭证类型不正确"),
});

// 页面加载时推进最近仍在跑的任务；用户刷新/重开页面后结果不会永远停在 running。
// MediaKit 任务可查 30 天，但结果 URL 和本站图片都只保留 24 小时，更久再恢复只会得到坏链。
const RECENT_TASK_MS = IMAGE_TTL_MS;
const MAX_ADVANCE_PER_LOAD = 3;

export const getVoucherState = createServerFn({ method: "POST" })
  .validator((data) => stateInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code, data.type);
    if (!voucher) return;

    const cutoff = Date.now() - RECENT_TASK_MS;
    const running = await database
      .select()
      .from(generationTasks)
      .where(
        and(
          eq(generationTasks.voucherId, voucher.id),
          eq(generationTasks.status, "running"),
          gt(generationTasks.createdAt, cutoff),
        ),
      )
      .orderBy(desc(generationTasks.createdAt))
      .limit(MAX_ADVANCE_PER_LOAD);

    const activeTasks: (typeof generationTasks.$inferSelect)[] = [];
    for (const task of running) {
      let state: GenerationTaskState;
      try {
        state = await advanceGenerationTask(task, voucher);
      } catch {
        state = { status: "running" };
      }
      if (state.status === "running") activeTasks.push(task);
    }

    // 失败任务会退还额度，重新读一次保证 remaining 是最新的
    const current = (await loadVoucher(data.code, data.type)) ?? voucher;
    return {
      totalImages: current.totalImages,
      generatedCount: current.generatedCount,
      remaining: Math.max(0, current.totalImages - current.generatedCount),
      termsAccepted: typeof current.termsAcceptedAt === "number",
      images: await loadPublicImages(voucher.id, current.maxEdits),
      activeTasks: activeTasks.map((task) => ({
        id: task.id,
        kind: task.kind,
        imageId: task.imageId,
        series: task.series,
        pose: task.poseIndex,
      })),
    };
  });

export const acceptVoucherTerms = createServerFn({ method: "POST" })
  .validator((data) => acceptInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadAnyVoucher(data.code);
    if (!voucher) throw new Error("凭证无效");
    if (voucher.type !== data.type) {
      throw new Error("这个凭证不属于当前服务，请从首页选择对应的入口");
    }
    await acceptTerms(voucher);
  });
