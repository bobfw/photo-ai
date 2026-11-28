import { getGenerationTask } from "#services/generation-task";
import type { VoucherType } from "#services/voucher-types";

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

// 轮询自己后端的任务接口；接口幂等，刷新/重复请求不会重复生成。
// shortcut: 页面加载只推进 24 小时内的任务；更久的、或用户再也不回来的，需要回调/Queue 兜底。
export async function waitForGeneration(code: string, type: VoucherType, taskId: number) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const task = await getGenerationTask({ data: { code, type, taskId } });
    if (task.status === "completed") return task.image;
    if (task.status === "failed") throw new Error(task.error);
    if (Date.now() > deadline) throw new Error("生成超时，请稍后重试");
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
