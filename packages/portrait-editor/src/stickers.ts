export interface StickerPreset {
  key: string;
  label: string;
  src: string;
  // 宽度占画布宽度的比例
  width: number;
}

export interface Sticker {
  id: number;
  src: string;
  label: string;
  // 宽度占画布宽度的比例
  size: number;
  initialSize: number;
  // 中心点，占画布宽高的百分比
  x: number;
  y: number;
}

export const STICKER_MIN_SIZE = 0.05;
export const STICKER_MAX_SIZE = 0.55;

function loadStickerImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    // 贴纸在 CDN 上，canvas 导出需要 CORS
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        reject(new Error("贴纸读取失败"));
        return;
      }
      resolve(image);
    });
    image.addEventListener("error", () => {
      reject(new Error("贴纸读取失败"));
    });
    image.src = source;
  });
}

export async function drawStickers(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stickers: readonly Sticker[],
) {
  if (stickers.length === 0) return;

  const images = await Promise.all(stickers.map((sticker) => loadStickerImage(sticker.src)));
  for (const [index, sticker] of stickers.entries()) {
    const image = images[index];
    const stickerWidth = sticker.size * width;
    const stickerHeight = stickerWidth * (image.naturalHeight / image.naturalWidth);
    context.drawImage(
      image,
      (sticker.x / 100) * width - stickerWidth / 2,
      (sticker.y / 100) * height - stickerHeight / 2,
      stickerWidth,
      stickerHeight,
    );
  }
}
