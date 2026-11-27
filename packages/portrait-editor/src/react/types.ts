import type { ComponentType, RefObject } from "react";

import type { PortraitAdjustments } from "../beauty.ts";
import type { EditorState } from "../pipeline.ts";

export interface PortraitEditorPlugin {
  id: string;
  label: string;
  panel: ComponentType;
  renderStage?: ComponentType;
}

export interface PortraitEditorContextValue {
  state: EditorState;
  stateRef: RefObject<EditorState>;
  preview: HTMLCanvasElement | undefined;
  isBusy: boolean;
  busyText: string;
  update: (patch: Partial<EditorState>) => void;
  updateAdjustments: (patch: Partial<PortraitAdjustments>) => void;
  resetComposition: () => void;
  commitScale: () => void;
  setBusy: (isBusy: boolean, text?: string) => void;
  reportError: (error: unknown) => void;
  renderImage: (options: {
    width: number;
    portraitEdge: number;
  }) => Promise<{ blob: Blob; isTransparent: boolean }>;
}
