import { sourceSize, type PortraitSource } from "./source.ts";

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

// 模型把人物画在白底上再抠图，边缘像素的 RGB 混进了白色，叠到深色背景上就是一圈浅灰描边。
// 用附近不透明像素的颜色替换边缘半透明像素的颜色，轮廓和羽化保持不变。
export function cleanCutout(source: PortraitSource) {
  const { width, height } = sourceSize(source);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.drawImage(source, 0, 0);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  decontaminateEdges(image.data, canvas.width, canvas.height);
  context.putImageData(image, 0, 0);
  return canvas;
}

// 只清理透明边界向内一圈的半透明像素，不碰主体内部；颜色取自相邻的不透明像素。
export function decontaminateEdges(data: Uint8ClampedArray, width: number, height: number) {
  const stride = width * 4;
  const edge = Math.min(width, height);
  const bandDepth = Math.max(8, Math.min(48, Math.round(edge * 0.02)));
  const sourceDepth = Math.max(12, Math.min(72, Math.round(edge * 0.03)));

  const depths = new Uint8Array(width * height);
  const band: number[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const index = pixel * 4;
      if (data[index + 3] === 0) continue;
      const isBoundary =
        (x > 0 && data[index - 1] === 0) ||
        (x + 1 < width && data[index + 7] === 0) ||
        (y > 0 && data[index - stride + 3] === 0) ||
        (y + 1 < height && data[index + stride + 3] === 0);
      if (!isBoundary) continue;
      depths[pixel] = 1;
      band.push(pixel);
    }
  }

  let head = 0;
  while (head < band.length) {
    const pixel = band[head];
    head += 1;
    const depth = depths[pixel];
    if (depth >= bandDepth) continue;

    const x = pixel % width;
    const y = (pixel - x) / width;
    const nextDepth = depth + 1;
    if (x > 0) visit(pixel - 1, nextDepth);
    if (x + 1 < width) visit(pixel + 1, nextDepth);
    if (y > 0) visit(pixel - width, nextDepth);
    if (y + 1 < height) visit(pixel + width, nextDepth);
  }

  function visit(pixel: number, depth: number) {
    if (depths[pixel] !== 0 || data[pixel * 4 + 3] === 0) return;
    depths[pixel] = depth;
    band.push(pixel);
  }

  for (const pixel of band) {
    const index = pixel * 4;
    const alpha = data[index + 3];
    if (alpha === 0 || alpha === 255) continue;

    const x = pixel % width;
    const y = (pixel - x) / width;
    let red = 0;
    let green = 0;
    let blue = 0;
    let count = 0;
    for (const [dx, dy] of DIRECTIONS) {
      const color = findOpaqueColor(data, width, height, x, y, dx, dy, sourceDepth);
      if (!color) continue;
      red += color[0];
      green += color[1];
      blue += color[2];
      count += 1;
    }
    if (count === 0) continue;
    data[index] = red / count;
    data[index + 1] = green / count;
    data[index + 2] = blue / count;
  }
}

function findOpaqueColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
  maxSteps: number,
) {
  for (let step = 1; step <= maxSteps; step += 1) {
    const px = x + dx * step;
    const py = y + dy * step;
    if (px < 0 || px >= width || py < 0 || py >= height) return;
    const index = (py * width + px) * 4;
    // 穿出空白就不再取色，避免串到旁边的人物身上
    if (data[index + 3] === 0) return;
    if (data[index + 3] < 250) continue;
    return [data[index], data[index + 1], data[index + 2]] as const;
  }
}
