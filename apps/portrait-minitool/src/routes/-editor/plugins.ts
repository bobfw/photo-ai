import {
  BackgroundPanel,
  BeautyPanel,
  type PortraitEditorPlugin,
} from "@photo-ai/portrait-editor/react";

import { ExportPanel } from "./export-panel.tsx";

export function createEditorPlugins(isCutout: boolean): PortraitEditorPlugin[] {
  return [
    { id: "beauty", label: "美颜", panel: BeautyPanel },
    ...(isCutout ? [{ id: "background", label: "背景", panel: BackgroundPanel }] : []),
    { id: "export", label: "导出", panel: ExportPanel },
  ];
}
