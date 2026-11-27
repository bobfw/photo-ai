import { StickerPanel } from "./sticker-panel.tsx";
import { StickerStage } from "./sticker-stage.tsx";
import type { PortraitEditorPlugin } from "./types.ts";

export const stickerPlugin: PortraitEditorPlugin = {
  id: "stickers",
  label: "贴纸",
  panel: StickerPanel,
  renderStage: StickerStage,
};
