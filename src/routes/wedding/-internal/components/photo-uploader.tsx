import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

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
        <div className="border-border/70 relative overflow-hidden rounded-2xl border">
          <img alt={`${label}预览`} className="aspect-square w-full object-cover" src={value} />
          <div className="absolute inset-x-2 bottom-2 flex gap-2">
            <button
              className="bg-background/90 text-foreground active:bg-background ease-out-strong h-11 flex-1 rounded-xl text-xs font-medium shadow-sm backdrop-blur transition duration-150 active:scale-95"
              onClick={() => inputReference.current?.click()}
              type="button"
            >
              更换
            </button>
            <button
              aria-label={`移除${label}`}
              className="bg-background/90 text-foreground active:bg-background ease-out-strong flex h-11 w-11 items-center justify-center rounded-xl shadow-sm backdrop-blur transition duration-150 active:scale-95"
              onClick={() => {
                onChange("");
              }}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          className="border-border/70 bg-card/60 hover:bg-card active:bg-secondary ease-out-strong flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl border px-3 transition duration-150 active:scale-[0.98]"
          onClick={() => inputReference.current?.click()}
          type="button"
        >
          <ImagePlus className="text-muted-foreground size-6" strokeWidth={1.5} />
          <span className="text-sm font-medium">点击上传</span>
          <span className="text-muted-foreground text-xs">正脸 · 清晰</span>
        </button>
      )}

      <p className="text-muted-foreground text-center text-xs">{label}</p>
      {error ? <p className="text-destructive text-center text-xs">{error}</p> : undefined}
    </div>
  );
}
