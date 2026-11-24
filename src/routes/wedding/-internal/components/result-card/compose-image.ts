import { paintStudioLight } from "./studio-light.ts";
import type { PhotoOffset, Sticker } from "./types.ts";

interface ComposeImageOptions {
  imageUrl: string;
  background: string;
  backgroundImage: string;
  lightIntensity: number;
  stageRatio: number;
  photoScale: number;
  photoOffset: PhotoOffset;
  stickers: Sticker[];
}

// 背景色、光影、背景图和贴纸都只在前端合成，预览和导出的就是最终 PNG。
export async function composeImage({
  imageUrl,
  background,
  backgroundImage,
  lightIntensity,
  stageRatio,
  photoScale,
  photoOffset,
  stickers,
}: ComposeImageOptions) {
  const source = await loadImage(imageUrl);
  const backgroundSource = backgroundImage === "" ? undefined : await loadImage(backgroundImage);

  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth;
  canvas.height = Math.round(source.naturalWidth / stageRatio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法导出图片");

  if (backgroundSource) {
    // 和预览的 object-cover 一致：等比放大后居中裁切填满
    const scale = Math.max(
      canvas.width / backgroundSource.naturalWidth,
      canvas.height / backgroundSource.naturalHeight,
    );
    const width = backgroundSource.naturalWidth * scale;
    const height = backgroundSource.naturalHeight * scale;
    context.drawImage(
      backgroundSource,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height,
    );
  } else if (background !== "transparent") {
    paintStudioLight(context, canvas.width, canvas.height, background, lightIntensity);
  }

  // 和预览的 object-contain 一致：先等比放进画布，再叠加缩放和位移
  const fitScale = Math.min(
    canvas.width / source.naturalWidth,
    canvas.height / source.naturalHeight,
  );
  const width = source.naturalWidth * fitScale * photoScale;
  const height = source.naturalHeight * fitScale * photoScale;
  context.drawImage(
    source,
    (canvas.width - width) / 2 + (photoOffset.x / 100) * canvas.width,
    (canvas.height - height) / 2 + (photoOffset.y / 100) * canvas.height,
    width,
    height,
  );

  const stickerImages = await Promise.all(stickers.map((sticker) => loadImage(sticker.src)));
  for (const [index, sticker] of stickers.entries()) {
    const stickerImage = stickerImages[index];
    const width = sticker.size * canvas.width;
    const height = width * (stickerImage.naturalHeight / stickerImage.naturalWidth);
    context.drawImage(
      stickerImage,
      (sticker.x / 100) * canvas.width - width / 2,
      (sticker.y / 100) * canvas.height - height / 2,
      width,
      height,
    );
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("无法导出图片");
  return blob;
}

async function loadImage(source: string) {
  for (let attempt = 0; ; attempt += 1) {
    const image = new Image();
    // 贴纸从 CDN 取，导出 canvas 需要跨域许可；成图走同源 /media 代理
    image.crossOrigin = "anonymous";
    // 数据 URL 不能加 query；网络图片失败重试时换缓存键，绕过浏览器缓存的坏响应
    image.src = attempt === 0 || source.startsWith("data:") ? source : `${source}?retry=${attempt}`;
    try {
      await image.decode();
      return image;
    } catch (error) {
      if (attempt >= 2) throw error;
    }
  }
}
