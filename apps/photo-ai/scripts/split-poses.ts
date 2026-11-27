// 把 test-img/ 里的姿势系列拼图逐一切成单张小图，并去掉每格左上角的编号：
// node scripts/split-poses.ts
// 原图是带灰色分隔线的 5×4 拼图，列宽并不相等（第一列更宽），所以按分隔线
// 的实际位置切，并往线内缩几像素，避免把分隔线带进小图。
// 输出 test-img/wedding/poses/<系列>/01.png … 20.png（本地文件，上传 CDN）。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateSync, inflateSync } from "node:zlib";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const INPUT_DIRECTORY = path.join(ROOT, "test-img");
const OUTPUT_DIRECTORY = path.join(ROOT, "test-img/wedding/poses");
const SERIES = [
  { key: "jing-dian-hun-sha", file: "韩式造型.png" },
  { key: "qing-fa-shi", file: "轻法式.png" },
  { key: "xi-jia-feng", file: "现代喜嫁风.png" },
  { key: "qi-pao", file: "新中式-旗袍.png" },
  { key: "xiu-he", file: "新中式-秀禾.png" },
  { key: "xiu-he-qing-song", file: "新中式-秀禾-轻松风.png" },
];
const COLUMNS = 5;
const ROWS = 4;
const PNG_SIGNATURE = "89504e470d0a1a0a";
// 分隔线约 600–700，白底约 762；按 60% 的覆盖度筛出横向分隔线
const GRID_LUMINANCE = 755;
const GRID_COVERAGE = 0.6;
const CELL_INSET = 2;
// 列分隔线在不同系列里位置/深浅不一，改为在每行里找姿势之间的留白。
// 目标的相对位置来自这几张系列图：第一列明显更宽。
const COLUMN_TARGETS = [0.214, 0.411, 0.61, 0.81];
const GUTTER_INK_LIMIT = 6;
const GUTTER_MIN_WIDTH = 4;
const GUTTER_SEARCH = 80;
// 灰色分隔线会把一段留白切成两段；间隔小于这个值时合并成同一段
const GAP_MERGE = 8;
// 分隔线有时正好落在裁切边缘，按整列/整行的覆盖率再清理一次
const EDGE_LINE_MARGIN = 32;
const EDGE_LINE_COVERAGE = 0.8;
const EDGE_LINE_MIN = 560;
const EDGE_LINE_MAX = 755;

interface Raster {
  width: number;
  height: number;
  // 8 位 RGB，每像素 3 字节
  pixels: Buffer;
}

interface PngChunks {
  width: number;
  height: number;
  isDone: boolean;
  data: Buffer[];
}

function readChunk(chunks: PngChunks, type: string, chunk: Buffer) {
  switch (type) {
    case "IHDR": {
      chunks.width = chunk.readUInt32BE(0);
      chunks.height = chunk.readUInt32BE(4);
      if (chunk[8] !== 8 || chunk[9] !== 2 || chunk[12] !== 0) {
        throw new Error("只支持 8 位 RGB、非隔行 PNG");
      }
      break;
    }
    case "IDAT": {
      chunks.data.push(chunk);
      break;
    }
    case "IEND": {
      chunks.isDone = true;
      break;
    }
  }
}

function decodePng(file: string): Raster {
  const buffer = readFileSync(file);
  if (buffer.toString("hex", 0, 8) !== PNG_SIGNATURE) throw new Error(`${file} 不是 PNG`);

  const chunks: PngChunks = { width: 0, height: 0, isDone: false, data: [] };
  for (let offset = 8; !chunks.isDone && offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    readChunk(chunks, type, buffer.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }

  const raw = inflateSync(Buffer.concat(chunks.data));
  const stride = chunks.width * 3;
  const pixels = Buffer.alloc(chunks.height * stride);
  for (let y = 0; y < chunks.height; y++) {
    const filter = raw[y * (stride + 1)];
    const source = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= 3 ? pixels[y * stride + x - 3] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= 3 ? pixels[(y - 1) * stride + x - 3] : 0;
      pixels[y * stride + x] = (source[x] + unfilter(filter, left, up, upLeft)) & 255;
    }
  }
  return { width: chunks.width, height: chunks.height, pixels };
}

function unfilter(filter: number, left: number, up: number, upLeft: number) {
  switch (filter) {
    case 0: {
      return 0;
    }
    case 1: {
      return left;
    }
    case 2: {
      return up;
    }
    case 3: {
      return (left + up) >> 1;
    }
    case 4: {
      return paeth(left, up, upLeft);
    }
    default: {
      throw new Error(`不支持的 PNG 过滤器：${filter}`);
    }
  }
}

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  return upDistance <= upLeftDistance ? up : upLeft;
}

function encodePng({ width, height, pixels }: Raster): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;

  return Buffer.concat([
    Buffer.from(PNG_SIGNATURE, "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(data.length, 0);
  header.write(type, 4, "ascii");
  const body = Buffer.concat([header.subarray(4), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([header, data, crc]);
}

// 编号是左上角一个约 24×24 的灰色圆（里面是白色数字），找到这团色块后刷白。
// 阈值 200 能把编号和背景、细线稿分开；色块尺寸再兜一层，避免误伤线稿。
function removeBadge(pixels: Buffer, width: number, height: number) {
  const scanWidth = Math.min(120, width);
  const scanHeight = Math.min(80, height);
  const visited = new Uint8Array(width * height);
  let badge: { x0: number; y0: number; x1: number; y1: number } | undefined;

  for (let y = 0; badge === undefined && y < scanHeight; y++) {
    for (let x = 0; badge === undefined && x < scanWidth; x++) {
      const start = y * width + x;
      if (visited[start] === 1 || !isInk(pixels, start)) continue;

      const stack = [start];
      visited[start] = 1;
      let count = 0;
      let x0 = x;
      let y0 = y;
      let x1 = x;
      let y1 = y;

      for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
        const px = index % width;
        const py = (index - px) / width;
        count++;
        x0 = Math.min(x0, px);
        y0 = Math.min(y0, py);
        x1 = Math.max(x1, px);
        y1 = Math.max(y1, py);

        for (const neighbor of [index - 1, index + 1, index - width, index + width]) {
          if (neighbor < 0 || neighbor >= visited.length || visited[neighbor] === 1) continue;
          const nx = neighbor % width;
          const ny = (neighbor - nx) / width;
          // 左右邻居不能跨行
          if (Math.abs(ny - py) + Math.abs(nx - px) !== 1 || !isInk(pixels, neighbor)) continue;
          visited[neighbor] = 1;
          stack.push(neighbor);
        }
      }

      const badgeWidth = x1 - x0 + 1;
      const badgeHeight = y1 - y0 + 1;
      if (
        count > 200 &&
        badgeWidth >= 18 &&
        badgeWidth <= 34 &&
        badgeHeight >= 18 &&
        badgeHeight <= 34
      ) {
        badge = { x0, y0, x1, y1 };
      }
    }
  }

  if (!badge) throw new Error("没有找到编号");

  // 往外扩 4 像素，把抗锯齿边缘一起刷掉。
  for (let y = Math.max(0, badge.y0 - 4); y <= Math.min(height - 1, badge.y1 + 4); y++) {
    for (let x = Math.max(0, badge.x0 - 4); x <= Math.min(width - 1, badge.x1 + 4); x++) {
      const offset = (y * width + x) * 3;
      pixels[offset] = 255;
      pixels[offset + 1] = 255;
      pixels[offset + 2] = 255;
    }
  }
}

function isInk(pixels: Buffer, index: number) {
  const offset = index * 3;
  return pixels[offset] + pixels[offset + 1] + pixels[offset + 2] < 600;
}

function isEdgeLine(pixels: Buffer, index: number) {
  const offset = index * 3;
  const sum = pixels[offset] + pixels[offset + 1] + pixels[offset + 2];
  return sum >= EDGE_LINE_MIN && sum <= EDGE_LINE_MAX;
}

function whiten(pixels: Buffer, offset: number) {
  pixels[offset] = 255;
  pixels[offset + 1] = 255;
  pixels[offset + 2] = 255;
}

// 只扫裁切边缘附近；整列/整行都接近浅灰才算分隔线，避免误伤线稿。
function removeEdgeLines(pixels: Buffer, width: number, height: number) {
  const columns: number[] = [];
  for (let x = 0; x < width; x++) {
    if (x >= EDGE_LINE_MARGIN && x < width - EDGE_LINE_MARGIN) continue;
    let count = 0;
    for (let y = 0; y < height; y++) {
      if (isEdgeLine(pixels, y * width + x)) count++;
    }
    if (count >= height * EDGE_LINE_COVERAGE) columns.push(x);
  }

  const rows: number[] = [];
  for (let y = 0; y < height; y++) {
    if (y >= EDGE_LINE_MARGIN && y < height - EDGE_LINE_MARGIN) continue;
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (isEdgeLine(pixels, y * width + x)) count++;
    }
    if (count >= width * EDGE_LINE_COVERAGE) rows.push(y);
  }

  for (const x of columns) {
    for (let xx = Math.max(0, x - 2); xx <= Math.min(width - 1, x + 2); xx++) {
      for (let y = 0; y < height; y++) {
        whiten(pixels, (y * width + xx) * 3);
      }
    }
  }

  for (const y of rows) {
    for (let yy = Math.max(0, y - 2); yy <= Math.min(height - 1, y + 2); yy++) {
      for (let x = 0; x < width; x++) {
        whiten(pixels, (yy * width + x) * 3);
      }
    }
  }
}

function isGrid(pixels: Buffer, index: number) {
  const offset = index * 3;
  return pixels[offset] + pixels[offset + 1] + pixels[offset + 2] < GRID_LUMINANCE;
}

function rowLineCounts({ pixels, width, height }: Raster) {
  const counts = Array.from({ length: height }, () => 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isGrid(pixels, y * width + x)) counts[y] += 1;
    }
  }
  return counts;
}

function runs(counts: number[], isMatch: (count: number) => boolean, minimumLength = 1) {
  const ranges: { start: number; end: number }[] = [];
  let start: number | undefined;
  for (let index = 0; index <= counts.length; index++) {
    const isActive = index < counts.length && isMatch(counts[index]);
    if (isActive) {
      start ??= index;
    } else if (start !== undefined) {
      if (index - start >= minimumLength) ranges.push({ start, end: index - 1 });
      start = undefined;
    }
  }
  return ranges;
}

function findLines(counts: number[], minimum: number) {
  return runs(counts, (count) => count >= minimum);
}

function mergeRuns(ranges: { start: number; end: number }[], maximumGap: number) {
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous !== undefined && range.start - previous.end - 1 <= maximumGap) {
      previous.end = range.end;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

// 每行单独找 4 段低墨量的留白，取离预期位置最近的那段；分隔线落在留白里，
// 切图时按留白边界裁掉，就不会带进小图。
function findGutters({ pixels, width }: Raster, y0: number, y1: number) {
  const counts = Array.from({ length: width }, () => 0);
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      if (isInk(pixels, y * width + x)) counts[x] += 1;
    }
  }
  const gaps = mergeRuns(
    runs(counts, (count) => count < GUTTER_INK_LIMIT, GUTTER_MIN_WIDTH),
    GAP_MERGE,
  );
  return COLUMN_TARGETS.map((target) => {
    const expected = target * width;
    let best: { start: number; end: number; distance: number } | undefined;
    for (const gap of gaps) {
      const distance = Math.abs((gap.start + gap.end) / 2 - expected);
      if (distance <= GUTTER_SEARCH && (best === undefined || distance < best.distance)) {
        best = { start: gap.start, end: gap.end, distance };
      }
    }
    if (best === undefined) {
      throw new Error(`第 ${y0 + 1}–${y1} 行找不到竖向分隔留白`);
    }
    return best;
  });
}

function columnRangesFromGutters(width: number, gutters: { start: number; end: number }[]) {
  const ranges: [number, number][] = [];
  let start = 0;
  for (const gutter of gutters) {
    ranges.push([start, gutter.start]);
    start = gutter.end + 1;
  }
  ranges.push([start, width]);
  return ranges;
}

// 两条线之间是一行；两头各留 CELL_INSET 像素，避开线的抗锯齿边。
function cellRanges(size: number, lines: { start: number; end: number }[]) {
  const ranges: [number, number][] = [];
  let start = 0;
  for (const line of lines) {
    const end = line.start - CELL_INSET;
    if (end > start) ranges.push([start, end]);
    start = line.end + CELL_INSET;
  }
  if (start < size) ranges.push([start, size]);
  return ranges;
}

function splitSeries(file: string, outputDirectory: string) {
  const sheet = decodePng(file);
  const rowLines = findLines(rowLineCounts(sheet), Math.round(sheet.width * GRID_COVERAGE));
  const rowBounds = cellRanges(sheet.height, rowLines);
  if (rowLines.length !== ROWS - 1 || rowBounds.length !== ROWS) {
    throw new Error(`横向分隔线不对：${rowLines.length} 条，切出 ${rowBounds.length} 行`);
  }

  mkdirSync(outputDirectory, { recursive: true });

  for (const [rowIndex, [y0, y1]] of rowBounds.entries()) {
    const columnBounds = columnRangesFromGutters(sheet.width, findGutters(sheet, y0, y1));
    if (columnBounds.length !== COLUMNS) {
      throw new Error(`第 ${rowIndex + 1} 行切出 ${columnBounds.length} 列，应为 ${COLUMNS} 列`);
    }
    for (const [columnIndex, [x0, x1]] of columnBounds.entries()) {
      const pose = rowIndex * COLUMNS + columnIndex + 1;
      const width = x1 - x0;
      const height = y1 - y0;
      const pixels = Buffer.alloc(width * height * 3);

      for (let y = 0; y < height; y++) {
        sheet.pixels.copy(
          pixels,
          y * width * 3,
          ((y0 + y) * sheet.width + x0) * 3,
          ((y0 + y) * sheet.width + x1) * 3,
        );
      }

      removeBadge(pixels, width, height);
      removeEdgeLines(pixels, width, height);
      const output = path.join(outputDirectory, `${String(pose).padStart(2, "0")}.png`);
      writeFileSync(output, encodePng({ width, height, pixels }));
    }
  }
}

for (const series of SERIES) {
  const outputDirectory = path.join(OUTPUT_DIRECTORY, series.key);
  splitSeries(path.join(INPUT_DIRECTORY, series.file), outputDirectory);
  console.log(`${series.file} → ${path.relative(ROOT, outputDirectory)}`);
}

console.log(`已生成 ${SERIES.length} 个系列，共 ${SERIES.length * COLUMNS * ROWS} 张姿势图。`);
