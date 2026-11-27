import { sourceSize, type PortraitSource } from "./source.ts";
import type { PersonFootprint, PhotoOffset } from "./types.ts";

const ALPHA_THRESHOLD = 24;
const MAX_MEASURE_SIZE = 512;

export function measurePersonFootprint(image: PortraitSource): PersonFootprint | undefined {
  const { width: naturalWidth, height: naturalHeight } = sourceSize(image);
  if (naturalWidth <= 0 || naturalHeight <= 0) return undefined;

  const scale = Math.min(1, MAX_MEASURE_SIZE / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return undefined;

  let data: Uint8ClampedArray;
  try {
    context.drawImage(image, 0, 0, width, height);
    data = context.getImageData(0, 0, width, height).data;
  } catch {
    return undefined;
  }

  // 普通不透明照片没有抠图边缘，画地面阴影会变成一整条，直接跳过。
  let hasTransparency = false;
  for (let index = 3; index < data.length; index += 64) {
    if (data[index] < 250) {
      hasTransparency = true;
      break;
    }
  }
  if (!hasTransparency) return undefined;

  // 从最底部往上找第一个不透明像素，再取底部一小段的高度范围作为“落脚点”。
  const bottom = findBottomRow(data, width, height);
  if (bottom < 0) return undefined;

  const band = Math.max(3, Math.round(height * 0.04));
  let minX = width;
  let maxX = -1;
  for (let y = Math.max(0, bottom - band); y <= bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!(data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD)) {
        continue;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  if (maxX < minX) return undefined;

  return {
    naturalWidth,
    naturalHeight,
    centerX: (minX + maxX + 1) / 2 / width,
    bottomY: (bottom + 1) / height,
    width: (maxX - minX + 1) / width,
  };
}

function findBottomRow(data: Uint8ClampedArray, width: number, height: number) {
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) return y;
    }
  }
  return -1;
}

export function paintContactShadow(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  footprint: PersonFootprint,
  photoScale: number,
  photoOffset: PhotoOffset,
  intensity: number,
) {
  if (intensity <= 0) return;

  const fitScale = Math.min(
    canvasWidth / footprint.naturalWidth,
    canvasHeight / footprint.naturalHeight,
  );
  const width = footprint.naturalWidth * fitScale * photoScale;
  const height = footprint.naturalHeight * fitScale * photoScale;
  const left = (canvasWidth - width) / 2 + (photoOffset.x / 100) * canvasWidth;
  const top = (canvasHeight - height) / 2 + (photoOffset.y / 100) * canvasHeight;
  const radius = Math.max(8, footprint.width * width * 0.9);

  context.save();
  context.translate(left + footprint.centerX * width, top + footprint.bottomY * height);
  context.scale(1, 0.22);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, `rgba(0,0,0,${0.4 * intensity})`);
  gradient.addColorStop(0.55, `rgba(0,0,0,${0.22 * intensity})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
