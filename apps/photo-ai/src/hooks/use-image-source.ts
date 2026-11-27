import { useEffect, useState } from "react";

import { loadImage } from "#lib/load-image";

interface SourceState {
  image: HTMLImageElement | undefined;
  isLoading: boolean;
  error: string;
}

// 切换版本时保留上一张，等新图解码完再交给编辑器，避免编辑状态被卸载。
export function useImageSource(sourceUrl: string) {
  const [state, setState] = useState<SourceState>({ image: undefined, isLoading: true, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setState((current) => ({ ...current, isLoading: true, error: "" }));

    void loadImage(sourceUrl)
      .then((image) => {
        if (isCancelled) return;
        setState({ image, isLoading: false, error: "" });
      })
      .catch(() => {
        if (isCancelled) return;
        setState((current) => ({
          image: current.image,
          isLoading: false,
          error: "照片加载失败，请重试",
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [sourceUrl, attempt]);

  return {
    ...state,
    retry: () => {
      setAttempt((count) => count + 1);
    },
  };
}
