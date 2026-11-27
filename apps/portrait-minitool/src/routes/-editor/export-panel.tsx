/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

import { ImagePreview, usePortraitEditor } from "@photo-ai/portrait-editor/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CHECKERBOARD } from "../../checkerboard.ts";
import { ResultModal } from "../../components/result-modal.tsx";
import { EXPORT_EDGE, EXPORT_WIDTH } from "../../constants.ts";
import { usePortraitSession } from "../../portrait-session.tsx";
import { getIsCutout } from "./session.ts";

interface PreviewState {
  isTransparent: boolean;
  url: string;
}

interface ResultState extends PreviewState {
  blob: Blob;
}

export function ExportPanel() {
  const { stateRef, isBusy, setBusy, renderImage, reportError } = usePortraitEditor();
  const { getSession } = usePortraitSession();
  const session = getSession();
  const isCutout = session ? getIsCutout(session) : false;
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<PreviewState>();
  const [result, setResult] = useState<ResultState>();
  const previewUrlReference = useRef("");
  const resultUrlReference = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlReference.current) URL.revokeObjectURL(previewUrlReference.current);
      if (resultUrlReference.current) URL.revokeObjectURL(resultUrlReference.current);
    };
  }, []);

  function portraitEdge() {
    if (isCutout) return EXPORT_EDGE;
    const ratio = stateRef.current.ratio;
    const longEdge = Math.ceil(EXPORT_WIDTH / Math.min(ratio, 1));
    return Math.min(3200, Math.max(EXPORT_EDGE, longEdge));
  }

  async function handlePreview() {
    setBusy(true, "正在生成预览…");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 40);
    });

    try {
      const { blob, isTransparent } = await renderImage({
        width: EXPORT_WIDTH,
        portraitEdge: portraitEdge(),
      });
      if (previewUrlReference.current) URL.revokeObjectURL(previewUrlReference.current);
      const url = URL.createObjectURL(blob);
      previewUrlReference.current = url;
      setPreview({ isTransparent, url });
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    setBusy(true, "正在生成成片…");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 40);
    });

    try {
      const { blob, isTransparent } = await renderImage({
        width: EXPORT_WIDTH,
        portraitEdge: portraitEdge(),
      });
      if (resultUrlReference.current) URL.revokeObjectURL(resultUrlReference.current);
      const url = URL.createObjectURL(blob);
      resultUrlReference.current = url;
      setResult({ blob, isTransparent, url });
    } catch (error) {
      reportError(error);
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

  function closeResult() {
    if (resultUrlReference.current) {
      URL.revokeObjectURL(resultUrlReference.current);
      resultUrlReference.current = "";
    }
    setResult(undefined);
  }

  return (
    <>
      <p className="m-0 text-sm font-semibold">成片</p>
      <div className="mt-3.5 flex">
        <button
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-muted px-5 text-[13px] font-medium text-ink transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
          disabled={isBusy || isExporting}
          onClick={() => {
            void handlePreview();
          }}
          type="button"
        >
          预览
        </button>
        <button
          className="ml-2 min-h-12 flex-1 rounded-full bg-brand-strong px-6 text-sm font-semibold text-inverse transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
          disabled={isBusy || isExporting}
          onClick={() => {
            void handleExport();
          }}
          type="button"
        >
          {isExporting ? "生成中…" : "生成成片"}
        </button>
      </div>
      <p className="mb-0 mt-3.5 text-[11px] leading-[1.6] text-faint">
        照片只在本机处理，不会上传。
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
      {result
        ? createPortal(
            <ResultModal
              blob={result.blob}
              isTransparent={result.isTransparent}
              onClose={closeResult}
              src={result.url}
            />,
            document.body,
          )
        : undefined}
    </>
  );
}
