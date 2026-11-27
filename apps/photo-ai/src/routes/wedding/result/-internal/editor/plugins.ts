import {
  BackgroundPanel,
  BeautyPanel,
  stickerPlugin,
  type PortraitEditorPlugin,
} from "@photo-ai/portrait-editor/react";

import { ExportPanel } from "./export-panel.tsx";

export const WEDDING_EDITOR_PLUGINS: PortraitEditorPlugin[] = [
  { id: "beauty", label: "美颜", panel: BeautyPanel },
  { id: "background", label: "背景", panel: BackgroundPanel },
  stickerPlugin,
  { id: "export", label: "导出", panel: ExportPanel },
];
