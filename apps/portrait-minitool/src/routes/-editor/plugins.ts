import type { PortraitEditorPlugin } from "@photo-ai/portrait-editor/react";

import { BackgroundPanel } from "./background-panel.tsx";
import { BeautyPanel } from "./beauty-panel.tsx";
import { ExportPanel } from "./export-panel.tsx";

export function createEditorPlugins(isCutout: boolean): PortraitEditorPlugin[] {
  return [
    { id: "beauty", label: "美颜", panel: BeautyPanel },
    ...(isCutout ? [{ id: "background", label: "背景", panel: BackgroundPanel }] : []),
    { id: "export", label: "导出", panel: ExportPanel },
  ];
}
