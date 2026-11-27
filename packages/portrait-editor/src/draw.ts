import { sourceSize, type PortraitSource } from "./source.ts";
import type { PhotoOffset } from "./types.ts";

// 预览和导出共用同一套 object-contain + 缩放 + 位移，保证两边构图一致。
export function drawPortrait(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  portrait: PortraitSource,
  photoScale: number,
  photoOffset: PhotoOffset,
) {
  const { width: naturalWidth, height: naturalHeight } = sourceSize(portrait);
  const fitScale = Math.min(canvasWidth / naturalWidth, canvasHeight / naturalHeight);
  const width = naturalWidth * fitScale * photoScale;
  const height = naturalHeight * fitScale * photoScale;
  context.drawImage(
    portrait,
    (canvasWidth - width) / 2 + (photoOffset.x / 100) * canvasWidth,
    (canvasHeight - height) / 2 + (photoOffset.y / 100) * canvasHeight,
    width,
    height,
  );
}
