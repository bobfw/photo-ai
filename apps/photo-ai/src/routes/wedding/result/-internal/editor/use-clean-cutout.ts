import { cleanCutout } from "@photo-ai/portrait-editor";
import { useEffect, useState } from "react";

import { loadImage } from "./load-image.ts";

// 预览、合成导出和保存原图都改用去掉白边的图片，保证三者一致。
export function useCleanCutout(source: string) {
  const [cleanedUrl, setCleanedUrl] = useState(source);

  useEffect(() => {
    let isCancelled = false;
    let objectUrl: string | undefined;
    setCleanedUrl(source);

    void loadImage(source)
      .then(cleanCutout)
      .then(
        (canvas) =>
          new Promise<Blob | undefined>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob ?? undefined);
            }, "image/png");
          }),
      )
      .then((blob) => {
        if (isCancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setCleanedUrl(objectUrl);
      })
      .catch(() => {
        // 处理失败时继续用原图，不阻塞编辑
      });

    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  return cleanedUrl;
}
