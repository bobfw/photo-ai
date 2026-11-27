import {
  adjustPortraitPixels,
  decontaminateEdges,
  drawPortrait,
  paintPaperGrain,
  paintPaperTexture,
  paintStudioLight,
  type PhotoOffset,
  type PortraitAdjustments,
} from "@photo-ai/portrait-editor";

export interface EditorState {
  source: HTMLImageElement | undefined;
  adjustments: PortraitAdjustments;
  background: string;
  backgroundImage: HTMLImageElement | undefined;
  light: number;
  grain: number;
  texture: number;
  ratio: number;
  scale: number;
  offset: PhotoOffset;
  cleanEdges: boolean;
  dof: number;
}

export const PREVIEW_EDGE = 960;
export const EXPORT_EDGE = 1600;
export const EXPORT_WIDTH = 1400;

export function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        reject(new Error("图片读取失败"));
        return;
      }
      resolve(image);
    });
    image.addEventListener("error", () => {
      reject(new Error("图片读取失败"));
    });
    image.src = source;
  });
}

const TRANSPARENCY_SCAN_EDGE = 256;

// 背景只对已经抠好的透明底人像有意义，缩图扫 alpha 判断，避免把普通照片当抠图。
export function hasTransparentPixels(image: HTMLImageElement) {
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  if (longest === 0) return false;

  const scale = Math.min(1, TRANSPARENCY_SCAN_EDGE / longest);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return false;

  try {
    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 250) return true;
    }
  } catch {
    return false;
  }
  return false;
}

// 预览和导出都重跑同一条管线；预览用较小尺寸保证拖动流畅，导出用大尺寸保证成片。
export function buildPortrait(state: EditorState, maxEdge: number) {
  if (!state.source) throw new Error("还没有选择人像");

  const sourceCanvas = drawSource(state.source, maxEdge);
  const context = sourceCanvas.getContext("2d");
  if (!context) throw new Error("无法处理图片");

  const image = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  adjustPortraitPixels(image.data, sourceCanvas.width, sourceCanvas.height, state.adjustments);
  // 白底抠图会在边缘残留浅色描边；放在美颜之后，避免美白再把边缘染白。
  if (state.cleanEdges) {
    decontaminateEdges(image.data, sourceCanvas.width, sourceCanvas.height);
  }
  context.putImageData(image, 0, 0);
  return sourceCanvas;
}

// 预览每帧只重画背景和人物；美颜结果由 buildPortrait 缓存。
export function drawComposition(
  context: CanvasRenderingContext2D,
  state: EditorState,
  portrait: HTMLCanvasElement,
  width: number,
  height: number,
) {
  if (state.backgroundImage) {
    drawBackgroundImage(context, width, height, state.backgroundImage, state.dof);
  } else if (state.background !== "transparent") {
    paintStudioLight(context, width, height, state.background, state.light);
    paintPaperTexture(context, width, height, state.texture);
    paintPaperGrain(context, width, height, state.grain);
  }

  drawPortrait(context, width, height, portrait, state.scale, state.offset);
}

export function compose(
  state: EditorState,
  portrait: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法生成图片");
  drawComposition(context, state, portrait, canvas.width, canvas.height);
  return canvas;
}

function drawSource(image: HTMLImageElement, maxEdge: number) {
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(1, maxEdge / longest);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法处理图片");
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

const DOF_BLUR_RATIO = 0.025;
const DOF_OVERSCAN = 0.06;

interface DofCacheEntry {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dof: number;
}

// 拖动人像时背景不变，缓存模糊结果，避免每帧重跑 blur。
const dofCache = new WeakMap<HTMLImageElement, DofCacheEntry>();

function drawBackgroundImage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  dof: number,
) {
  if (dof <= 0) {
    drawCover(context, width, height, image, 0);
    return;
  }

  const cached = dofCache.get(image);
  if (cached?.width === width && cached.height === height && cached.dof === dof) {
    context.drawImage(cached.canvas, 0, 0);
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const cacheContext = canvas.getContext("2d");
  if (!cacheContext) {
    drawCover(context, width, height, image, dof);
    return;
  }

  cacheContext.filter = `blur(${width * DOF_BLUR_RATIO * dof}px)`;
  drawCover(cacheContext, width, height, image, dof);
  cacheContext.filter = "none";
  dofCache.set(image, { canvas, width, height, dof });
  context.drawImage(canvas, 0, 0);
}

function drawCover(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  dof: number,
) {
  const scale =
    Math.max(width / image.naturalWidth, height / image.naturalHeight) * (1 + DOF_OVERSCAN * dof);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}
