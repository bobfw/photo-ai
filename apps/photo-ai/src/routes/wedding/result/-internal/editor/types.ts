export interface Sticker {
  id: number;
  src: string;
  label: string;
  // 宽度占画布宽度的比例
  size: number;
  initialSize: number;
  x: number;
  y: number;
}
