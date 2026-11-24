import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "#lib/utils";

import { fileToDataUrl } from "../photo-uploader.tsx";
import { BACKGROUNDS, CHECKERBOARD } from "./constants.ts";

interface BackgroundControlsProperties {
  background: string;
  backgroundImage: string;
  grainIntensity: number;
  isGrainDisabled: boolean;
  isLightDisabled: boolean;
  isShadowDisabled: boolean;
  isTextureDisabled: boolean;
  lightIntensity: number;
  onColorChange: (color: string) => void;
  onError: (message: string) => void;
  onGrainIntensityChange: (intensity: number) => void;
  onImageChange: (image: string) => void;
  onImageRemove: () => void;
  onLightIntensityChange: (intensity: number) => void;
  onShadowIntensityChange: (intensity: number) => void;
  onTextureIntensityChange: (intensity: number) => void;
  shadowIntensity: number;
  textureIntensity: number;
}

export function BackgroundControls({
  background,
  backgroundImage,
  grainIntensity,
  isGrainDisabled,
  isLightDisabled,
  isShadowDisabled,
  isTextureDisabled,
  lightIntensity,
  onColorChange,
  onError,
  onGrainIntensityChange,
  onImageChange,
  onImageRemove,
  onLightIntensityChange,
  onShadowIntensityChange,
  onTextureIntensityChange,
  shadowIntensity,
  textureIntensity,
}: BackgroundControlsProperties) {
  const backgroundInput = useRef<HTMLInputElement>(null);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);

  async function handleBackgroundFile(file: File | undefined) {
    if (!file) return;
    onError("");
    setIsBackgroundProcessing(true);
    try {
      onImageChange(await fileToDataUrl(file));
    } catch {
      onError("读取背景图失败，请重试");
    } finally {
      setIsBackgroundProcessing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className={cn("flex items-center gap-2", isLightDisabled && "opacity-50")}>
        <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
          光影 {Math.round(lightIntensity * 100)}%
        </span>
        <input
          aria-label="背景光影强度"
          className="accent-primary h-11 min-w-0 flex-1"
          disabled={isLightDisabled}
          max={100}
          min={0}
          onChange={(event) => {
            onLightIntensityChange(Number(event.target.value) / 100);
          }}
          step={1}
          type="range"
          value={Math.round(lightIntensity * 100)}
        />
      </div>
      <div className={cn("flex items-center gap-2", isGrainDisabled && "opacity-50")}>
        <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
          颗粒 {Math.round(grainIntensity * 100)}%
        </span>
        <input
          aria-label="背景颗粒强度"
          className="accent-primary h-11 min-w-0 flex-1"
          disabled={isGrainDisabled}
          max={100}
          min={0}
          onChange={(event) => {
            onGrainIntensityChange(Number(event.target.value) / 100);
          }}
          step={1}
          type="range"
          value={Math.round(grainIntensity * 100)}
        />
      </div>
      <div className={cn("flex items-center gap-2", isTextureDisabled && "opacity-50")}>
        <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
          纹理 {Math.round(textureIntensity * 100)}%
        </span>
        <input
          aria-label="背景纹理强度"
          className="accent-primary h-11 min-w-0 flex-1"
          disabled={isTextureDisabled}
          max={100}
          min={0}
          onChange={(event) => {
            onTextureIntensityChange(Number(event.target.value) / 100);
          }}
          step={1}
          type="range"
          value={Math.round(textureIntensity * 100)}
        />
      </div>
      <div className={cn("flex items-center gap-2", isShadowDisabled && "opacity-50")}>
        <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
          投影 {Math.round(shadowIntensity * 100)}%
        </span>
        <input
          aria-label="人物投影强度"
          className="accent-primary h-11 min-w-0 flex-1"
          disabled={isShadowDisabled}
          max={100}
          min={0}
          onChange={(event) => {
            onShadowIntensityChange(Number(event.target.value) / 100);
          }}
          step={1}
          type="range"
          value={Math.round(shadowIntensity * 100)}
        />
      </div>
      <p className="text-muted-foreground text-[11px] leading-4">
        颗粒/纹理仅纯色背景，0 关闭；投影让脚下更落地。
      </p>

      <div className="flex flex-wrap gap-1">
        {BACKGROUNDS.map((item) => (
          <button
            aria-label={`背景：${item.label}`}
            aria-pressed={backgroundImage === "" && background === item.value}
            className="flex size-11 items-center justify-center rounded-full"
            key={item.value}
            onClick={() => {
              onColorChange(item.value);
            }}
            type="button"
          >
            <span
              aria-hidden
              className={cn(
                "size-7 rounded-full border shadow-sm",
                backgroundImage === "" &&
                  background === item.value &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-popover",
              )}
              style={item.value === "transparent" ? CHECKERBOARD : { backgroundColor: item.value }}
            />
          </button>
        ))}
        <label className="relative flex size-11 cursor-pointer items-center justify-center rounded-full">
          <input
            aria-label="自定义背景颜色"
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(event) => {
              onColorChange(event.target.value);
            }}
            type="color"
            value={background === "transparent" ? "#f6f0e7" : background}
          />
          <span
            aria-hidden
            className="pointer-events-none size-7 rounded-full border shadow-sm"
            style={{
              background: "conic-gradient(#f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)",
            }}
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleBackgroundFile(file);
          }}
          ref={backgroundInput}
          type="file"
        />
        {backgroundImage === "" ? undefined : (
          <img alt="" className="h-10 w-14 rounded-md border object-cover" src={backgroundImage} />
        )}
        <button
          className="ease-out-strong flex h-11 items-center rounded-lg transition duration-150 active:scale-[0.98] disabled:opacity-50"
          disabled={isBackgroundProcessing}
          onClick={() => backgroundInput.current?.click()}
          type="button"
        >
          <span className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium">
            {isBackgroundProcessing ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            {backgroundActionLabel(isBackgroundProcessing, backgroundImage !== "")}
          </span>
        </button>
        {backgroundImage === "" ? undefined : (
          <button
            className="ease-out-strong flex h-11 items-center rounded-lg transition duration-150 active:scale-[0.98]"
            onClick={onImageRemove}
            type="button"
          >
            <span className="text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
              移除
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function backgroundActionLabel(isProcessing: boolean, hasImage: boolean) {
  if (isProcessing) return "处理中…";
  return hasImage ? "更换背景图" : "自定义背景图";
}
