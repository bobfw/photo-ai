import { useRef, useState } from "react";

import { Button } from "#ui/button";

const MAX_EDGE = 2048;

async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法读取这张照片");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.92);
}

interface PhotoUploaderProperties {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function PhotoUploader({ label, value, onChange }: PhotoUploaderProperties) {
  const inputReference = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      onChange(await fileToDataUrl(file));
    } catch (error) {
      setError(error instanceof Error ? error.message : "读取照片失败");
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
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
        <div className="space-y-2">
          <img
            alt={`${label}预览`}
            className="aspect-[3/4] w-full rounded-lg object-cover"
            src={value}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => inputReference.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              更换
            </Button>
            <Button
              onClick={() => {
                onChange("");
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              移除
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="border-border bg-muted/30 hover:bg-muted/60 flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 text-center transition-colors"
          onClick={() => inputReference.current?.click()}
          type="button"
        >
          <span className="text-3xl">＋</span>
          <span className="text-sm">点击上传照片</span>
          <span className="text-muted-foreground text-xs">正脸、光线均匀、无遮挡</span>
        </button>
      )}

      {error ? <p className="text-destructive text-xs">{error}</p> : undefined}
    </div>
  );
}
