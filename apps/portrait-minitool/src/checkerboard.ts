import type { CSSProperties } from "react";

export const CHECKERBOARD: CSSProperties = {
  backgroundColor: "#f5f5f5",
  backgroundImage:
    "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0",
  backgroundSize: "12px 12px",
};

export const STAGE_CHECKERBOARD: CSSProperties = {
  backgroundColor: "#000000",
  backgroundImage:
    "linear-gradient(45deg, #1c1c1e 25%, transparent 25%), linear-gradient(-45deg, #1c1c1e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1c1c1e 75%), linear-gradient(-45deg, transparent 75%, #1c1c1e 75%)",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
  backgroundSize: "16px 16px",
};
