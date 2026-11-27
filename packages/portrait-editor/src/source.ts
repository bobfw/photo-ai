export type PortraitSource = HTMLImageElement | HTMLCanvasElement;

export interface SourceSize {
  width: number;
  height: number;
}

// 图片用 natural 尺寸，canvas 用绘制尺寸，两者都作为同源可绘制对象参与合成。
export function sourceSize(source: PortraitSource): SourceSize {
  if ("naturalWidth" in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}
