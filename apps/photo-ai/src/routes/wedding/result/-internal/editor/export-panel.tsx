import { buildPortrait, drawStickers, NEUTRAL_ADJUSTMENTS } from "@photo-ai/portrait-editor";
import { ImagePreview, usePortraitEditor, useStickers } from "@photo-ai/portrait-editor/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CHECKERBOARD } from "../../../-internal/components/checkerboard.ts";
import { useWeddingEditor } from "./context.tsx";

interface PreviewState {
  isTransparent: boolean;
  url: string;
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 40);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("无法生成图片"));
    }, "image/png");
  });
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "导出失败，请重试";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function ExportPanel() {
  const { isBusy, renderCanvas, setBusy, stateRef } = usePortraitEditor();
  const { stickers } = useStickers();
  const { pose, seriesTitle } = useWeddingEditor();
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<PreviewState>();
  const previewUrlReference = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlReference.current) URL.revokeObjectURL(previewUrlReference.current);
    };
  }, []);

  function isTransparent() {
    const state = stateRef.current;
    return state.backgroundImage === undefined && state.background === "transparent";
  }

  async function composeWithStickers() {
    const source = stateRef.current.source;
    if (!source) throw new Error("还没有人像");

    const canvas = renderCanvas({
      width: source.naturalWidth,
      portraitEdge: Math.max(source.naturalWidth, source.naturalHeight),
    });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法生成图片");

    await drawStickers(context, canvas.width, canvas.height, stickers);
    return canvas;
  }

  async function handlePreview() {
    setError("");
    setBusy(true, "正在生成预览…");
    await waitForPaint();

    try {
      const canvas = await composeWithStickers();
      const blob = await canvasToBlob(canvas);
      if (previewUrlReference.current) URL.revokeObjectURL(previewUrlReference.current);
      const url = URL.createObjectURL(blob);
      previewUrlReference.current = url;
      setPreview({ isTransparent: isTransparent(), url });
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setError("");
    setIsExporting(true);
    setBusy(true, "正在生成成片…");
    await waitForPaint();

    try {
      const canvas = await composeWithStickers();
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, `婚纱照-${seriesTitle}-姿态${pose}.png`);
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setIsExporting(false);
      setBusy(false);
    }
  }

  async function handleSaveOriginal() {
    setError("");
    setIsExporting(true);
    setBusy(true, "正在保存原图…");
    await waitForPaint();

    try {
      const state = stateRef.current;
      const source = state.source;
      if (!source) throw new Error("还没有人像");
      const canvas = buildPortrait(
        { ...state, adjustments: NEUTRAL_ADJUSTMENTS },
        Math.max(source.naturalWidth, source.naturalHeight),
      );
      downloadBlob(await canvasToBlob(canvas), `婚纱照-${seriesTitle}-姿态${pose}-透明底.png`);
    } catch (error) {
      setError(messageOf(error));
    } finally {
      setIsExporting(false);
      setBusy(false);
    }
  }

  function closePreview() {
    if (previewUrlReference.current) {
      URL.revokeObjectURL(previewUrlReference.current);
      previewUrlReference.current = "";
    }
    setPreview(undefined);
  }

  return (
    <>
      <p className="m-0 text-sm font-semibold">成片</p>
      <div className="mt-3.5 flex">
        <button
          className="bg-muted text-foreground inline-flex min-h-12 flex-1 items-center justify-center rounded-full px-5 text-[13px] font-medium transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
          disabled={isBusy || isExporting}
          onClick={() => {
            void handlePreview();
          }}
          type="button"
        >
          预览
        </button>
        <button
          className="bg-primary text-primary-foreground ml-2 inline-flex min-h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-semibold transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
          disabled={isBusy || isExporting}
          onClick={() => {
            void handleSave();
          }}
          type="button"
        >
          {isExporting ? "生成中…" : "保存成片"}
        </button>
      </div>
      <button
        className="border-border text-foreground mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full border bg-transparent px-5 text-[13px] font-medium transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
        disabled={isBusy || isExporting}
        onClick={() => {
          void handleSaveOriginal();
        }}
        type="button"
      >
        保存透明底原图
      </button>
      {error ? (
        <p className="text-destructive mt-2 mb-0 text-xs leading-5" role="alert">
          {error}
        </p>
      ) : undefined}
      <p className="text-muted-foreground mt-3.5 mb-0 text-[11px] leading-[1.6]">
        无损 PNG；背景、投影和贴纸都会画进成片。
      </p>

      {preview
        ? createPortal(
            <ImagePreview
              checkerboard={CHECKERBOARD}
              isTransparent={preview.isTransparent}
              onClose={closePreview}
              src={preview.url}
            />,
            document.body,
          )
        : undefined}
    </>
  );
}
