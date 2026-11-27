import type { CSSProperties } from "react";

// 透明底图片的棋盘格底纹，上传页缩略图和结果页共用。
export const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #e9e6e1 25%, transparent 25%), linear-gradient(-45deg, #e9e6e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9e6e1 75%), linear-gradient(-45deg, transparent 75%, #e9e6e1 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};
