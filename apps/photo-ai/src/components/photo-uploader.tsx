import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import type { PhotoValue } from "#lib/upload-photo";

const MAX_EDGE = 2048;

async function fileToPng(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法读取这张照片");

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) throw new Error("无法读取这张照片");
    return blob;
  } finally {
    bitmap.close();
  }
}

interface PhotoUploaderProperties {
  label: string;
  value: PhotoValue | undefined;
  upload: (file: Blob) => Promise<string>;
  onChange: (value?: PhotoValue) => void;
}

export function PhotoUploader({ label, value, upload, onChange }: PhotoUploaderProperties) {
  const inputReference = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setIsProcessing(true);
    let previewUrl = "";
    try {
      const blob = await fileToPng(file);
      // 预览只用本地 Blob，七牛地址只在服务端签给 MediaKit
      previewUrl = URL.createObjectURL(blob);
      const key = await upload(blob);
      if (value) URL.revokeObjectURL(value.previewUrl);
      onChange({ key, previewUrl });
      previewUrl = "";
    } catch (error) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setError(error instanceof Error ? error.message : "读取照片失败");
    } finally {
      setIsProcessing(false);
    }
  }

  function remove() {
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange();
  }

  return (
    <div className="space-y-2">
      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleFile(file);
        }}
        ref={inputReference}
        type="file"
      />

      {value ? (
        <div className="border-border relative overflow-hidden rounded-xl border">
          <img
            alt={`${label}预览`}
            className="aspect-square w-full object-cover"
            src={value.previewUrl}
          />
          <div className="absolute inset-x-2 bottom-2 flex gap-2">
            <button
              className="bg-background/60 text-foreground active:bg-background/90 ease-out-strong h-11 flex-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md transition duration-150 active:scale-95 disabled:opacity-60"
              disabled={isProcessing}
              onClick={() => inputReference.current?.click()}
              type="button"
            >
              {isProcessing ? "上传中…" : "更换"}
            </button>
            <button
              aria-label={`移除${label}`}
              className="bg-background/60 text-foreground active:bg-background/90 ease-out-strong flex h-11 w-11 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition duration-150 active:scale-95 disabled:opacity-60"
              disabled={isProcessing}
              onClick={remove}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          aria-busy={isProcessing}
          className="border-primary/30 bg-primary/5 hover:bg-primary/10 active:bg-primary/10 ease-out-strong flex aspect-square w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed px-3 transition duration-150 active:scale-[0.98] disabled:pointer-events-none"
          disabled={isProcessing}
          onClick={() => inputReference.current?.click()}
          type="button"
        >
          <span className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-full">
            {isProcessing ? (
              <Loader2 className="size-6 animate-spin" strokeWidth={1.8} />
            ) : (
              <ImagePlus className="size-6" strokeWidth={1.8} />
            )}
          </span>
          <span className="text-sm font-semibold">{isProcessing ? "正在上传" : "点击上传"}</span>
          <span className="text-muted-foreground text-xs">
            {isProcessing ? "请稍候" : "清晰 · 单人"}
          </span>
        </button>
      )}

      <p className="text-muted-foreground text-center text-xs font-medium">{label}</p>
      {error ? (
        <p className="text-destructive text-center text-xs" role="alert">
          {error}
        </p>
      ) : undefined}
    </div>
  );
}
