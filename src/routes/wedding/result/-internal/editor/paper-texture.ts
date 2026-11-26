const GRAIN_TILE_SIZE = 256;
const GRAIN_RANGE = 28;
const GRAIN_MAX_ALPHA = 0.6;

const TEXTURE_TILE_SIZE = 512;
const TEXTURE_REFERENCE_WIDTH = 864;
const TEXTURE_MAX_ALPHA = 0.8;
const TEXTURE_OCTAVES = [
  { grid: 6, amplitude: 8 },
  { grid: 18, amplitude: 4 },
] as const;

const grainCache: { tile?: HTMLCanvasElement } = {};
const textureCache: { tile?: HTMLCanvasElement } = {};

// 细颗粒：1px 三角分布噪声，soft-light 只改亮度不改色相。
export function paintPaperGrain(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
) {
  if (intensity <= 0) return;

  const tile = getGrainTile();
  if (!tile) return;

  paintSoftLightPattern(context, tile, width, height, GRAIN_MAX_ALPHA * intensity, 1);
}

// 哑光纹理：低频值噪声，只做极轻的纸张不匀；默认关闭。
export function paintPaperTexture(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
) {
  if (intensity <= 0) return;

  const tile = getTextureTile();
  if (!tile) return;

  const scale = width / TEXTURE_REFERENCE_WIDTH;
  paintSoftLightPattern(context, tile, width, height, TEXTURE_MAX_ALPHA * intensity, scale);
}

function paintSoftLightPattern(
  context: CanvasRenderingContext2D,
  tile: HTMLCanvasElement,
  width: number,
  height: number,
  alpha: number,
  scale: number,
) {
  const pattern = context.createPattern(tile, "repeat");
  if (!pattern) return;

  context.save();
  context.globalCompositeOperation = "soft-light";
  // 不支持 soft-light 时跳过，避免变成一层灰色蒙版。
  if ((context.globalCompositeOperation as string) !== "soft-light") {
    context.restore();
    return;
  }

  context.globalAlpha = alpha;
  if (scale !== 1) context.scale(scale, scale);
  context.fillStyle = pattern;
  context.fillRect(0, 0, width / scale, height / scale);
  context.restore();
}

function getGrainTile() {
  if (grainCache.tile) return grainCache.tile;

  const canvas = document.createElement("canvas");
  canvas.width = GRAIN_TILE_SIZE;
  canvas.height = GRAIN_TILE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;

  const image = context.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
  const data = image.data;
  let seed = 1;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  for (let index = 0; index < data.length; index += 4) {
    // 两个均匀随机相加得到三角分布，避免纯均匀噪声的“死板”颗粒。
    const value = Math.round(128 + (random() + random() - 1) * GRAIN_RANGE);
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  context.putImageData(image, 0, 0);
  grainCache.tile = canvas;
  return canvas;
}

function getTextureTile() {
  if (textureCache.tile) return textureCache.tile;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_TILE_SIZE;
  canvas.height = TEXTURE_TILE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;

  let seed = 1;
  const random = () => {
    seed = (seed * 16_807) % 2_147_483_647;
    return seed / 2_147_483_647;
  };
  const grids = TEXTURE_OCTAVES.map(({ grid, amplitude }) => {
    const values = new Float32Array(grid * grid);
    for (let index = 0; index < values.length; index += 1) {
      values[index] = random();
    }
    return { grid, amplitude, values };
  });

  const image = context.createImageData(TEXTURE_TILE_SIZE, TEXTURE_TILE_SIZE);
  const data = image.data;
  for (let y = 0; y < TEXTURE_TILE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_TILE_SIZE; x += 1) {
      const index = (y * TEXTURE_TILE_SIZE + x) * 4;
      let offset = 0;
      for (const { grid, amplitude, values } of grids) {
        const value = sampleTileable(values, grid, x / TEXTURE_TILE_SIZE, y / TEXTURE_TILE_SIZE);
        offset += (value - 0.5) * 2 * amplitude;
      }
      const value = Math.max(0, Math.min(255, Math.round(128 + offset)));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  textureCache.tile = canvas;
  return canvas;
}

function sampleTileable(values: Float32Array, grid: number, u: number, v: number) {
  const gx = u * grid;
  const gy = v * grid;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = (x0 + 1) % grid;
  const y1 = (y0 + 1) % grid;
  const tx = smoothstep(gx - x0);
  const ty = smoothstep(gy - y0);
  const top = values[y0 * grid + x0] * (1 - tx) + values[y0 * grid + x1] * tx;
  const bottom = values[y1 * grid + x0] * (1 - tx) + values[y1 * grid + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}
