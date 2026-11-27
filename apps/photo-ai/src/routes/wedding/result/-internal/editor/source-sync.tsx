import { usePortraitEditor } from "@photo-ai/portrait-editor/react";
import { useEffect } from "react";

// 历史版本或改写换图时，把新图同步进已经挂载的编辑器，保留背景和贴纸。
export function SourceSync({ source }: { source: HTMLImageElement }) {
  const { stateRef, update } = usePortraitEditor();

  useEffect(() => {
    if (stateRef.current.source !== source) {
      update({ source, scale: 1, offset: { x: 0, y: 0 } });
    }
  }, [source, stateRef, update]);

  return <></>;
}
