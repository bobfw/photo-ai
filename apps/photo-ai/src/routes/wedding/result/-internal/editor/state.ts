import { DEFAULT_ADJUSTMENTS, type EditorState } from "@photo-ai/portrait-editor";

import type { ImageRatio } from "../../../-internal/services/poses.ts";

export function createWeddingEditorState(source: HTMLImageElement, ratio: ImageRatio): EditorState {
  return {
    source,
    adjustments: DEFAULT_ADJUSTMENTS,
    background: "transparent",
    backgroundImage: undefined,
    light: 0.7,
    grain: 0.35,
    texture: 0,
    ratio: ratio === "3:4" ? 3 / 4 : 2 / 3,
    scale: 1,
    offset: { x: 0, y: 0 },
    cleanEdges: true,
    dof: 0.35,
    shadow: 0.35,
  };
}
