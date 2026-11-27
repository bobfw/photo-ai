import { useEffect, useState, type ComponentProps } from "react";

const MAX_RETRIES = 2;

interface RetryImageProperties extends Omit<ComponentProps<"img">, "src" | "onError"> {
  src: string;
  // 自动重试都失败后调用一次
  onFinalError?: () => void;
}

// 网慢/断网时浏览器会按 URL 缓存失败或半截的图片；失败后换 query 重试，绕过坏缓存。
export function RetryImage({ src, onFinalError, ...properties }: RetryImageProperties) {
  const [retries, setRetries] = useState(0);

  // 换图、切换版本后从头开始
  useEffect(() => {
    setRetries(0);
  }, [src]);

  return (
    <img
      {...properties}
      // 签名 URL 自带 query，再加参数会坏签名，只能原样重试
      src={retries === 0 || src.includes("?") ? src : `${src}?retry=${retries}`}
      onError={() => {
        if (retries < MAX_RETRIES) {
          setRetries(retries + 1);
        } else {
          onFinalError?.();
        }
      }}
    />
  );
}
