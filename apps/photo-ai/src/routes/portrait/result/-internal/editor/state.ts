import { DEFAULT_ADJUSTMENTS, type EditorState } from "@photo-ai/portrait-editor";

export function createPortraitEditorState(source: HTMLImageElement): EditorState {
  return {
    source,
    adjustments: DEFAULT_ADJUSTMENTS,
    background: "#d9d9d7",
    backgroundImage: undefined,
    light: 0.7,
    grain: 0.35,
    texture: 0,
    ratio: 3 / 4,
    scale: 1,
    offset: { x: 0, y: 0 },
    cleanEdges: true,
    dof: 0.35,
    shadow: 0.35,
  };
}
