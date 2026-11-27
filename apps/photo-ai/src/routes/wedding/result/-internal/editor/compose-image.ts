import { measurePersonFootprint, paintContactShadow } from "./contact-shadow.ts";
import { loadImage } from "./load-image.ts";
import { paintPaperGrain, paintPaperTexture } from "./paper-texture.ts";
import { paintStudioLight } from "./studio-light.ts";
import type { PhotoOffset, Sticker } from "./types.ts";

interface ComposeImageOptions {
  imageUrl: string;
  background: string;
  backgroundImage: string;
  dofIntensity: number;
  grainIntensity: number;
  lightIntensity: number;
  shadowIntensity: number;
  stageRatio: number;
  photoScale: number;
  photoOffset: PhotoOffset;
  stickers: Sticker[];
  textureIntensity: number;
}

// 背景色、光影、纸质感、背景图（含景深）、投影和贴纸都只在前端合成，预览和导出的就是最终 PNG。
export async function composeImage({
  imageUrl,
  background,
  backgroundImage,
  dofIntensity,
  grainIntensity,
  lightIntensity,
  shadowIntensity,
  stageRatio,
  photoScale,
  photoOffset,
  stickers,
  textureIntensity,
}: ComposeImageOptions) {
  const source = await loadImage(imageUrl);
  const backgroundSource = backgroundImage === "" ? undefined : await loadImage(backgroundImage);

  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth;
  canvas.height = Math.round(source.naturalWidth / stageRatio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法导出图片");

  if (backgroundSource) {
    // 和预览的 object-cover 一致：等比放大后居中裁切填满。
    // 有景深时额外放大一点，避免 blur 把边缘糊出透明/黑边。
    const blurPx = canvas.width * 0.025 * dofIntensity;
    const scale =
      Math.max(
        canvas.width / backgroundSource.naturalWidth,
        canvas.height / backgroundSource.naturalHeight,
      ) *
      (1 + 0.06 * dofIntensity);
    const width = backgroundSource.naturalWidth * scale;
    const height = backgroundSource.naturalHeight * scale;
    context.save();
    if (blurPx > 0) context.filter = `blur(${blurPx}px)`;
    context.drawImage(
      backgroundSource,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height,
    );
    context.restore();
  } else if (background !== "transparent") {
    paintStudioLight(context, canvas.width, canvas.height, background, lightIntensity);
    paintPaperTexture(context, canvas.width, canvas.height, textureIntensity);
    paintPaperGrain(context, canvas.width, canvas.height, grainIntensity);
  }

  const hasBackground = backgroundSource !== undefined || background !== "transparent";
  if (hasBackground && shadowIntensity > 0) {
    const footprint = measurePersonFootprint(source);
    if (footprint) {
      paintContactShadow(
        context,
        canvas.width,
        canvas.height,
        footprint,
        photoScale,
        photoOffset,
        shadowIntensity,
      );
    }
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
