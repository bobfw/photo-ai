import { buildPortrait, NEUTRAL_ADJUSTMENTS } from "@photo-ai/portrait-editor";
import { ImagePreview, usePortraitEditor } from "@photo-ai/portrait-editor/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CHECKERBOARD } from "#lib/checkerboard";

const MINITOOL_URL =
  "https://www.xiaohongshu.com/s/poster?bgimg=https%3A%2F%2Fsns-redskillhub-s1.xhscdn.com%2Fred_app_image%2F1040g4m83282qg6blmq2g5o59kfk0bneru6v3eq0%3Fsign%3Dd000dad148b828e6bc86259a9a98490c%26t%3D6ceaeda5&deeplink=xhsdiscover%3A%2F%2FminiTool%2F6b0950feebbfa50015ccbd47%3Fsource%3Dh5%26page_key%3D28%26xhsMpScreenMode%3Dfull";

interface PreviewState {
  isTransparent: boolean;
  url: string;
}

interface ExportPanelProperties {
  // 文件名不含扩展名；成片和透明背景图都在此基础上生成
  filename: string;
  // 婚纱照需要把贴纸画进成片；形象照没有
  drawExtras?: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void | Promise<void>;
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

export function ExportPanel({ drawExtras, filename }: ExportPanelProperties) {
  const { isBusy, renderCanvas, setBusy, stateRef } = usePortraitEditor();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PreviewState>();
  const previewUrlReference = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlReference.current) URL.revokeObjectURL(previewUrlReference.current);
    };
  }, []);

  async function composeCanvas() {
    const source = stateRef.current.source;
    if (!source) throw new Error("还没有人像");
    const canvas = renderCanvas({
      width: source.naturalWidth,
      portraitEdge: Math.max(source.naturalWidth, source.naturalHeight),
    });
    if (drawExtras) {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("无法生成图片");
      await drawExtras(context, canvas.width, canvas.height);
    }
    return canvas;
  }

  function isTransparent() {
    const state = stateRef.current;
    return state.backgroundImage === undefined && state.background === "transparent";
  }

  async function handlePreview() {
    setError("");
    setBusy(true, "正在生成预览…");
    await waitForPaint();

    try {
      const blob = await canvasToBlob(await composeCanvas());
      if (previewUrlReference.current) URL.revokeObjectURL(previewUrlReference.current);
      const url = URL.createObjectURL(blob);
      previewUrlReference.current = url;
      setPreview({ isTransparent: isTransparent(), url });
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "预览失败，请重试");
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
      downloadBlob(await canvasToBlob(await composeCanvas()), `${filename}.png`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "导出失败，请重试");
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
      downloadBlob(await canvasToBlob(canvas), `${filename}-透明背景.png`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "导出失败，请重试");
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
          {isExporting ? "生成中…" : "保存"}
        </button>
      </div>
      <p className="text-muted-foreground mt-2 mb-0 text-[11px] leading-[1.6]">
        保存后会得到一张高清图片，看到的背景和效果都会一起保存。想存进手机相册：点「预览」，长按图片选择保存。
      </p>
      <button
        className="border-border text-foreground mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full border bg-transparent px-5 text-[13px] font-medium transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
        disabled={isBusy || isExporting}
        onClick={() => {
          void handleSaveOriginal();
        }}
        type="button"
      >
        保存透明背景图
      </button>
      <p className="text-muted-foreground mt-2 mb-0 text-[11px] leading-[1.6]">
        透明背景图可以继续在小红书「
        <a
          className="text-primary font-medium underline underline-offset-2"
          href={MINITOOL_URL}
          rel="noreferrer"
          target="_blank"
        >
          人像出片棚
        </a>
        」小工具里换背景、修图。
      </p>
      {error ? (
        <p className="text-destructive mt-2 mb-0 text-xs leading-5" role="alert">
          {error}
        </p>
      ) : undefined}

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
