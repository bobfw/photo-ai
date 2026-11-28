import { eq, sql } from "drizzle-orm";

import { pollPhotoTask } from "#agents/generate-photo";

import { database } from "./database.ts";
import { generatedImages, generationTasks, vouchers } from "./schema.ts";
import { appendVersion, loadImageRow, toPublicImage } from "./voucher-store.ts";
import { EDIT_LOCK_MS, IMAGE_TTL_MS, type PublicImage } from "./voucher-types.ts";

type GenerationTaskRow = typeof generationTasks.$inferSelect;
type GenerationKind = "generate" | "edit" | "regenerate";

const MIN_ADVANCE_MS = 5000;

export type GenerationTaskState =
  | { status: "running" }
  | { status: "completed"; image: PublicImage }
  | { status: "failed"; error: string };

// client_token 唯一：同一个请求重复提交时返回原任务，不会重复扣额度或重复调用模型。
export async function createGenerationTask(input: {
  voucherId: number;
  clientToken: string;
  kind: GenerationKind;
  imageId?: number;
  series: string;
  poseIndex: number;
  ratio: string;
}) {
  const now = Date.now();
  const inserted = await database
    .insert(generationTasks)
    .values({ ...input, status: "running", createdAt: now, updatedAt: now })
    .onConflictDoNothing()
    .returning();
  const task = inserted.at(0);
  if (task) return { created: true, task };

  const rows = await database
    .select()
    .from(generationTasks)
    .where(eq(generationTasks.clientToken, input.clientToken))
    .limit(1);
  const existing = rows.at(0);
  if (!existing || existing.voucherId !== input.voucherId) {
    throw new Error("生成请求已失效，请重试");
  }
  return { created: false, task: existing };
}

async function refundTask(task: GenerationTaskRow) {
  if (task.kind === "generate") {
    await database.run(sql`
      UPDATE vouchers
      SET generated_count = generated_count - 1
      WHERE id = ${task.voucherId} AND generated_count > 0
    `);
    return;
  }
  if (task.imageId === null) return;
  await database.run(sql`
    UPDATE generated_images
    SET edit_count = edit_count - 1, edit_started_at = NULL
    WHERE id = ${task.imageId} AND edit_count > 0
  `);
}

// 先占用额度再提交；任一步失败都退还额度并删掉任务，让同一个 clientToken 可以重试。
export async function startGenerationTask(
  task: GenerationTaskRow,
  reserve: () => Promise<void>,
  submit: () => Promise<string>,
) {
  try {
    await reserve();
  } catch (error) {
    await database.delete(generationTasks).where(eq(generationTasks.id, task.id));
    throw error;
  }

  let providerTaskId: string;
  try {
    providerTaskId = await submit();
  } catch (error) {
    await refundTask(task);
    await database.delete(generationTasks).where(eq(generationTasks.id, task.id));
    throw error;
  }

  await database
    .update(generationTasks)
    .set({ providerTaskId, updatedAt: Date.now() })
    .where(eq(generationTasks.id, task.id));
}

export async function reserveGenerationQuota(voucherId: number) {
  const reserved = await database.run(sql`
    UPDATE vouchers
    SET generated_count = generated_count + 1
    WHERE id = ${voucherId} AND generated_count < total_images
  `);
  if (reserved.meta.changes === 0) throw new Error("这个凭证的照片额度已经用完");
}

export async function reserveEditQuota(row: typeof generatedImages.$inferSelect, maxEdits: number) {
  const now = Date.now();
  const reserved = await database.run(sql`
    UPDATE generated_images
    SET edit_count = edit_count + 1, edit_started_at = ${now}
    WHERE id = ${row.id}
      AND edit_count < ${maxEdits}
      AND (edit_started_at IS NULL OR edit_started_at < ${now - EDIT_LOCK_MS})
  `);
  if (reserved.meta.changes > 0) return;

  if (row.editCount >= maxEdits) throw new Error(`每张照片最多修改 ${maxEdits} 次`);
  throw new Error("这张照片正在修改中，请稍后再试");
}

export async function failTask(task: GenerationTaskRow, error: string) {
  const failed = await database.run(sql`
    UPDATE generation_tasks
    SET status = 'failed', error = ${error}, updated_at = ${Date.now()}
    WHERE id = ${task.id} AND status = 'running'
  `);
  if (failed.meta.changes === 0) return;
  await refundTask(task);
}

// 轮询可能并发落库：新图用 taskId 唯一约束兜底，修改图靠 appendVersion 去重。
export async function completeTask(
  task: GenerationTaskRow,
  voucher: typeof vouchers.$inferSelect,
  url: string,
): Promise<PublicImage> {
  const now = Date.now();
  // 从任务提交时间保守计时：结果 URL 在生成后 24 小时失效，恢复旧任务不能按“现在 + 24h”算。
  const createdAt = task.createdAt;
  const expiresAt = createdAt + IMAGE_TTL_MS;

  if (task.imageId === null) {
    const inserted = await database
      .insert(generatedImages)
      .values({
        voucherId: task.voucherId,
        taskId: task.id,
        imageUrl: url,
        sourceUrl: url,
        poseIndex: task.poseIndex,
        series: task.series,
        ratio: task.ratio,
        versions: JSON.stringify([{ url, sourceUrl: url, createdAt }]),
        createdAt,
        expiresAt,
      })
      .onConflictDoNothing()
      .returning();
    const existingRows = await database
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.taskId, task.id))
      .limit(1);
    const row = inserted.at(0) ?? existingRows.at(0);
    if (!row) throw new Error("保存照片失败");

    await database
      .update(generationTasks)
      .set({ status: "completed", imageId: row.id, updatedAt: now })
      .where(eq(generationTasks.id, task.id));
    return toPublicImage(row, voucher.maxEdits);
  }

  const row = await loadImageRow(task.voucherId, task.imageId);
  const versions = appendVersion(row, { url, sourceUrl: url, createdAt });
  await database
    .update(generatedImages)
    .set({
      imageUrl: url,
      sourceUrl: url,
      expiresAt,
      versions: JSON.stringify(versions),
      editStartedAt: sql`NULL`,
    })
    .where(eq(generatedImages.id, row.id));

  await database
    .update(generationTasks)
    .set({ status: "completed", imageId: row.id, updatedAt: now })
    .where(eq(generationTasks.id, task.id));

  return toPublicImage(
    { ...row, imageUrl: url, sourceUrl: url, expiresAt, versions: JSON.stringify(versions) },
    voucher.maxEdits,
  );
}

// 轮询和页面加载恢复共用：任务完成/失败时幂等落库。
export async function advanceGenerationTask(
  task: GenerationTaskRow,
  voucher: typeof vouchers.$inferSelect,
): Promise<GenerationTaskState> {
  if (task.status === "completed" && task.imageId !== null) {
    const row = await loadImageRow(task.voucherId, task.imageId);
    return { status: "completed", image: toPublicImage(row, voucher.maxEdits) };
  }
  if (task.status === "failed") {
    return { status: "failed", error: task.error ?? "生成失败，请重试" };
  }
  if (!task.providerTaskId) {
    // 提交阶段的短暂窗口；长时间没有 task_id 说明创建请求已中断。
    if (Date.now() - task.createdAt < 60_000) return { status: "running" };
    const error = "生成任务提交失败，请重试";
    await failTask(task, error);
    return { status: "failed", error };
  }

  // 同一任务 5 秒内最多推进一次；客户端 10 秒轮询，页面加载恢复也不会重复打 MediaKit。
  const now = Date.now();
  const claimed = await database.run(sql`
    UPDATE generation_tasks
    SET updated_at = ${now}
    WHERE id = ${task.id} AND status = 'running' AND updated_at <= ${now - MIN_ADVANCE_MS}
  `);
  if (claimed.meta.changes === 0) return { status: "running" };

  const provider = await pollPhotoTask(task.providerTaskId);
  if (provider.status === "running") return { status: "running" };
  if (provider.status === "failed") {
    await failTask(task, provider.error);
    return { status: "failed", error: provider.error };
  }
  return { status: "completed", image: await completeTask(task, voucher, provider.url) };
}
