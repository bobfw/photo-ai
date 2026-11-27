import { drawStickers } from "@photo-ai/portrait-editor";
import { useStickers } from "@photo-ai/portrait-editor/react";

import { ExportPanel as SharedExportPanel } from "#components/export-panel";

import { useWeddingEditor } from "./context.tsx";

export function ExportPanel() {
  const { stickers } = useStickers();
  const { pose, seriesTitle } = useWeddingEditor();

  return (
    <SharedExportPanel
      drawExtras={(context, width, height) => drawStickers(context, width, height, stickers)}
      filename={`婚纱照-${seriesTitle}-姿态${pose}`}
    />
  );
}
