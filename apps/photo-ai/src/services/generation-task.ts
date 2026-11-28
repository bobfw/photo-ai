import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { database } from "./database.ts";
import { advanceGenerationTask, type GenerationTaskState } from "./generation.ts";
import { generationTasks } from "./schema.ts";
import { loadVoucher } from "./voucher-store.ts";
import { codeSchema, voucherTypeSchema } from "./voucher-types.ts";

const taskInput = z.object({
  code: codeSchema,
  type: voucherTypeSchema,
  taskId: z.number().int().positive(),
});

// 前端轮询：任务未完成时查询 MediaKit，完成/失败时把结果幂等落库。
export const getGenerationTask = createServerFn({ method: "POST" })
  .validator((data) => taskInput.parse(data))
  .handler(async ({ data }): Promise<GenerationTaskState> => {
    const voucher = await loadVoucher(data.code, data.type);
    if (!voucher) throw new Error("凭证无效");

    const rows = await database
      .select()
      .from(generationTasks)
      .where(and(eq(generationTasks.id, data.taskId), eq(generationTasks.voucherId, voucher.id)))
      .limit(1);
    const task = rows.at(0);
    if (!task) throw new Error("生成任务不存在");

    return advanceGenerationTask(task, voucher);
  });
