import { clamp01, clampIndex } from "./pixels.ts";

export interface PortraitAdjustments {
  // 以下均为 0..1
  smooth: number;
  whiten: number;
  // 以下均为 -1..1
  brightness: number;
  saturation: number;
  warmth: number;
}

const SKIN_CB = 108;
const SKIN_CR = 151;
const SKIN_CB_RADIUS = 24;
const SKIN_CR_RADIUS = 26;
// 参考 face-beautifier (MIT) 的频率分离：压平肤色低频，保留高频纹理和边缘。
const TEXTURE_RETENTION = 0.28;
const EDGE_LOW = 7;
const EDGE_HIGH = 29;

// 无模型的人像调整：肤色检测后磨皮/提亮，再叠加全局明暗、饱和与色温。
// 只改 RGB，不碰 alpha，避免破坏已经抠好的边缘。
export function adjustPortraitPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: PortraitAdjustments,
) {
  const smooth = clamp01(adjustments.smooth);
  const whiten = clamp01(adjustments.whiten);

  if (smooth > 0 || whiten > 0) {
    const skin = buildSkinMask(data, width, height);

    if (smooth > 0) {
      const radius = Math.max(1, Math.round(Math.min(width, height) * 0.004 * smooth));
      const blurred = blurRgb(data, width, height, radius);
      for (const [index, value] of skin.entries()) {
        const mix = (value / 255) * smooth;
        if (mix <= 0) continue;

        const offset = index * 4;
        const detailRed = data[offset] - blurred[offset];
        const detailGreen = data[offset + 1] - blurred[offset + 1];
        const detailBlue = data[offset + 2] - blurred[offset + 2];
        const detailLuma = Math.abs(0.299 * detailRed + 0.587 * detailGreen + 0.114 * detailBlue);
        const edge = smoothstep(detailLuma, EDGE_LOW, EDGE_HIGH);
        const smoothKeep = 1 - mix;
        const textureKeep = smoothKeep + (1 - smoothKeep) * TEXTURE_RETENTION;
        const keep = textureKeep + (1 - textureKeep) * edge;

        data[offset] = blurred[offset] + detailRed * keep;
        data[offset + 1] = blurred[offset + 1] + detailGreen * keep;
        data[offset + 2] = blurred[offset + 2] + detailBlue * keep;
      }
    }

    if (whiten > 0) {
      for (const [index, value] of skin.entries()) {
        const amount = (value / 255) * whiten * 0.28;
        if (amount <= 0) continue;
        const offset = index * 4;
        data[offset] += (255 - data[offset]) * amount;
        data[offset + 1] += (255 - data[offset + 1]) * amount;
        data[offset + 2] += (255 - data[offset + 2]) * amount;
      }
    }
  }

  applyTone(data, adjustments);
}

function buildSkinMask(data: Uint8ClampedArray, width: number, height: number) {
  const mask = new Uint8ClampedArray(width * height);

  for (let index = 0; index < mask.length; index += 1) {
    const offset = index * 4;
    const alpha = data[offset + 3];
    if (alpha === 0) continue;

    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const blueChroma = 128 - 0.168736 * red - 0.331264 * green + 0.5 * blue;
    const redChroma = 128 + 0.5 * red - 0.418688 * green - 0.081312 * blue;
    const blueDistance = (blueChroma - SKIN_CB) / SKIN_CB_RADIUS;
    const redDistance = (redChroma - SKIN_CR) / SKIN_CR_RADIUS;
    const distance = blueDistance * blueDistance + redDistance * redDistance;
    if (distance >= 1) continue;

    const luminanceWeight = clamp01((luminance - 30) / 30) * clamp01((248 - luminance) / 30);
    mask[index] = Math.round(255 * (1 - distance) * luminanceWeight * (alpha / 255));
  }

  return mask;
}

function blurRgb(source: Uint8ClampedArray, width: number, height: number, radius: number) {
  const horizontal = new Uint8ClampedArray(source.length);
  const diameter = radius * 2 + 1;

  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let channel = 0; channel < 3; channel += 1) {
      let sum = 0;
      for (let x = -radius; x <= radius; x += 1) {
        sum += source[(row + clampIndex(x, width)) * 4 + channel];
      }
      for (let x = 0; x < width; x += 1) {
        horizontal[(row + x) * 4 + channel] = Math.round(sum / diameter);
        sum -= source[(row + clampIndex(x - radius, width)) * 4 + channel];
        sum += source[(row + clampIndex(x + radius + 1, width)) * 4 + channel];
      }
    }
  }

  const result = new Uint8ClampedArray(source.length);
  for (let x = 0; x < width; x += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      let sum = 0;
      for (let y = -radius; y <= radius; y += 1) {
        sum += horizontal[(clampIndex(y, height) * width + x) * 4 + channel];
      }
      for (let y = 0; y < height; y += 1) {
        result[(y * width + x) * 4 + channel] = Math.round(sum / diameter);
        sum -= horizontal[(clampIndex(y - radius, height) * width + x) * 4 + channel];
        sum += horizontal[(clampIndex(y + radius + 1, height) * width + x) * 4 + channel];
      }
    }
  }

  return result;
}

function smoothstep(value: number, low: number, high: number) {
  const normalized = clamp01((value - low) / (high - low));
  return normalized * normalized * (3 - 2 * normalized);
}

function applyTone(data: Uint8ClampedArray, adjustments: PortraitAdjustments) {
  const brightness = adjustments.brightness * 60;
  const saturation = 1 + adjustments.saturation;
  const warmth = adjustments.warmth * 24;
  if (brightness === 0 && saturation === 1 && warmth === 0) return;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;

    let red = data[index] + brightness + warmth;
    let green = data[index + 1] + brightness;
    let blue = data[index + 2] + brightness - warmth;

    if (saturation !== 1) {
      const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
      red = gray + (red - gray) * saturation;
      green = gray + (green - gray) * saturation;
      blue = gray + (blue - gray) * saturation;
    }

    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
  }
}
