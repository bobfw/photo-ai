import { useEffect, useRef, useState } from "react";

import { waitForGeneration } from "#lib/wait-for-generation";
import type { PublicImage, VoucherType } from "#services/voucher-types";

// 刷新/重开页面后，接着轮询服务端还在跑的任务。
export function useResumeGeneration(
  code: string,
  type: VoucherType,
  taskId: number | undefined,
  onImage: (image: PublicImage) => void,
) {
  const [isResuming, setIsResuming] = useState(taskId !== undefined);
  const [error, setError] = useState("");
  // 任务 id 从 1 开始，0 表示还没有启动过
  const startedTaskId = useRef(0);
  const onImageRef = useRef(onImage);

  useEffect(() => {
    onImageRef.current = onImage;
  }, [onImage]);

  useEffect(() => {
    if (taskId === undefined || startedTaskId.current === taskId) return;
    startedTaskId.current = taskId;
    let cancelled = false;
    setIsResuming(true);
    setError("");
    void waitForGeneration(code, type, taskId)
      .then((image) => {
        if (!cancelled) onImageRef.current(image);
      })
      .catch((error: unknown) => {
        if (!cancelled) setError(error instanceof Error ? error.message : "生成失败，请重试");
      })
      .finally(() => {
        if (!cancelled) setIsResuming(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, code, type]);

  return { error, isResuming };
}
