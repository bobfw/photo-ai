import {
  BackgroundOptionsProvider,
  BackgroundPanel,
  BeautyPanel,
  PortraitEditor,
  PortraitEditorProvider,
  type PortraitEditorPlugin,
} from "@photo-ai/portrait-editor/react";
import { useMemo, useState } from "react";

import { ExportPanel } from "#components/export-panel";
import { SourceSync } from "#components/source-sync";
import { CHECKERBOARD } from "#lib/checkerboard";

import { PORTRAIT_EDITOR_RATIOS } from "../../../-internal/services/styles.ts";
import { createPortraitEditorState } from "./state.ts";

interface PortraitPhotoEditorProperties {
  source: HTMLImageElement;
  styleTitle: string;
  onError: (error: unknown) => void;
}

export function PortraitPhotoEditor({
  onError,
  source,
  styleTitle,
}: PortraitPhotoEditorProperties) {
  const [initialState] = useState(() => createPortraitEditorState(source));
  const plugins = useMemo<PortraitEditorPlugin[]>(
    () => [
      { id: "beauty", label: "美颜", panel: BeautyPanel },
      { id: "background", label: "背景", panel: BackgroundPanel },
      {
        id: "export",
        label: "导出",
        panel: () => <ExportPanel filename={`形象照-${styleTitle}`} />,
      },
    ],
    [styleTitle],
  );

  return (
    <PortraitEditorProvider
      initialState={initialState}
      onError={onError}
      previewEdge={960}
      processingLabel="正在处理人像…"
    >
      <BackgroundOptionsProvider
        checkerboard={CHECKERBOARD}
        hasAlpha
        ratios={PORTRAIT_EDITOR_RATIOS}
      >
        <SourceSync source={source} />
        <PortraitEditor
          checkerboard={CHECKERBOARD}
          defaultPluginId="background"
          interactive
          plugins={plugins}
        />
      </BackgroundOptionsProvider>
    </PortraitEditorProvider>
  );
}
