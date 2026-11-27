import {
  BackgroundOptionsProvider,
  PortraitEditor,
  PortraitEditorProvider,
  StickerProvider,
} from "@photo-ai/portrait-editor/react";
import { useState } from "react";

import { SourceSync } from "#components/source-sync";
import { CHECKERBOARD } from "#lib/checkerboard";

import { IMAGE_RATIOS, type ImageRatio } from "../../../-internal/services/poses.ts";
import { STICKERS } from "./constants.ts";
import { WeddingEditorProvider } from "./context.tsx";
import { WEDDING_EDITOR_PLUGINS } from "./plugins.ts";
import { createWeddingEditorState } from "./state.ts";

const RATIOS = IMAGE_RATIOS.map((item) => ({
  label: item.value,
  value: item.value === "3:4" ? 3 / 4 : 2 / 3,
  hint: item.hint,
}));

interface WeddingEditorProperties {
  source: HTMLImageElement;
  ratio: ImageRatio;
  seriesTitle: string;
  pose: number;
  onError: (error: unknown) => void;
}

export function WeddingEditor({
  onError,
  pose,
  ratio,
  seriesTitle,
  source,
}: WeddingEditorProperties) {
  const [initialState] = useState(() => createWeddingEditorState(source, ratio));

  return (
    <PortraitEditorProvider
      initialState={initialState}
      onError={onError}
      previewEdge={960}
      processingLabel="正在处理人像…"
    >
      <WeddingEditorProvider pose={pose} seriesTitle={seriesTitle}>
        <BackgroundOptionsProvider checkerboard={CHECKERBOARD} hasAlpha ratios={RATIOS}>
          <StickerProvider presets={STICKERS}>
            <SourceSync source={source} />
            <PortraitEditor
              checkerboard={CHECKERBOARD}
              defaultPluginId="background"
              interactive
              plugins={WEDDING_EDITOR_PLUGINS}
            />
          </StickerProvider>
        </BackgroundOptionsProvider>
      </WeddingEditorProvider>
    </PortraitEditorProvider>
  );
}
