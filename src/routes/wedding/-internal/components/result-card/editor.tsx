import { Download, Eye, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";
import "../lightbox.css";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { DrawerTitle } from "#ui/drawer";

import { IMAGE_RATIOS, type ImageRatio } from "../../services/poses.ts";
import type { PublicImage } from "../../services/wedding.ts";
import { BackgroundControls } from "./background-controls.tsx";
import { composeImage } from "./compose-image.ts";
import {
  PHOTO_MAX_SCALE,
  PHOTO_MIN_SCALE,
  STICKER_MAX_SIZE,
  STICKER_MIN_SIZE,
  STICKERS,
  type StickerPreset,
} from "./constants.ts";
import { EditorStage } from "./editor-stage.tsx";
import type { Sticker } from "./types.ts";
import { usePhotoGesture } from "./use-photo-gesture.ts";

export function Editor({ image, seriesTitle }: { image: PublicImage; seriesTitle: string }) {
  const stageReference = useRef<HTMLDivElement>(null);
  const nextStickerId = useRef(1);
  const [background, setBackground] = useState("transparent");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [lightIntensity, setLightIntensity] = useState(0.7);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<number>();
  const [outputRatio, setOutputRatio] = useState<ImageRatio>(image.ratio === "3:4" ? "3:4" : "2:3");
  const stageRatio = outputRatio === "3:4" ? 3 / 4 : 2 / 3;
  const ratioHint = (outputRatio === "3:4" ? IMAGE_RATIOS[1] : IMAGE_RATIOS[0]).hint;
  const {
    photoScale,
    photoOffset,
    setPhotoScale,
    resetPhoto,
    handlePhotoPointerDown,
    handlePhotoPointerMove,
    handlePhotoPointerUp,
  } = usePhotoGesture(image.url, stageReference);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId);
  const isStudioLightDisabled = backgroundImage !== "" || background === "transparent";
  const isStudioLightVisible = !isStudioLightDisabled && lightIntensity > 0;

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function addSticker(item: StickerPreset) {
    // 错开位置，避免连续添加时叠在一起选不中
    const offset = (stickers.length % 3) * 8;
    const sticker = {
      id: nextStickerId.current++,
      src: item.src,
      label: item.label,
      x: 50 + offset,
      y: 45 + offset,
      size: item.width,
      initialSize: item.width,
    };
    setStickers((current) => [...current, sticker]);
    setSelectedStickerId(sticker.id);
  }

  function resizeSelectedSticker(size: number) {
    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === selectedStickerId ? { ...sticker, size: size / 100 } : sticker,
      ),
    );
  }

  function removeSelectedSticker() {
    setStickers((current) => current.filter((sticker) => sticker.id !== selectedStickerId));
    setSelectedStickerId(undefined);
  }

  function resetSelectedSticker() {
    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === selectedStickerId ? { ...sticker, size: sticker.initialSize } : sticker,
      ),
    );
  }

  function handleStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    setSelectedStickerId(undefined);
    handlePhotoPointerDown(event);
  }

  function handleStickerPointerDown(event: PointerEvent<HTMLButtonElement>, id: number) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedStickerId(id);

    const stage = stageReference.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();

    function move(moveEvent: globalThis.PointerEvent) {
      const x = Math.min(96, Math.max(4, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(96, Math.max(4, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      setStickers((current) =>
        current.map((sticker) => (sticker.id === id ? { ...sticker, x, y } : sticker)),
      );
    }

    function stop() {
      globalThis.removeEventListener("pointermove", move);
      globalThis.removeEventListener("pointerup", stop);
      globalThis.removeEventListener("pointercancel", stop);
    }

    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", stop);
    globalThis.addEventListener("pointercancel", stop);
  }

  function handleColorChange(color: string) {
    setBackground(color);
    setBackgroundImage("");
  }

  function renderComposedImage() {
    return composeImage({
      imageUrl: image.url,
      background,
      backgroundImage,
      lightIntensity,
      stageRatio,
      photoScale,
      photoOffset,
      stickers,
    });
  }

  async function openPreview() {
    setError("");
    setIsPreviewLoading(true);
    try {
      setPreviewUrl(URL.createObjectURL(await renderComposedImage()));
    } catch {
      setError("预览失败，请重试");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function save() {
    setError("");
    try {
      const url = URL.createObjectURL(await renderComposedImage());
      const link = document.createElement("a");
      link.download = `婚纱照-${seriesTitle}-姿态${image.pose}.png`;
      link.href = url;
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      setError("导出失败，请重试");
    }
  }

  return (
    <>
      <DrawerTitle className="sr-only">编辑婚纱照</DrawerTitle>
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2 pb-3">
        <div className="flex min-w-0 items-center gap-0.5">
          <Button
            className="h-11 px-3"
            disabled={isPreviewLoading}
            onClick={() => {
              void openPreview();
            }}
            type="button"
            variant="ghost"
          >
            {isPreviewLoading ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Eye className="size-4" />
            )}
            {isPreviewLoading ? "预览中…" : "预览"}
          </Button>
          <span className="text-muted-foreground text-[11px] leading-3 whitespace-nowrap">
            预览时长按可保存相册
          </span>
        </div>
        <button
          aria-label="保存图片"
          className="ease-out-strong flex h-11 items-center rounded-lg transition duration-150 active:scale-[0.98]"
          onClick={() => {
            void save();
          }}
          type="button"
        >
          <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium">
            <Download className="size-3.5" />
            保存
          </span>
        </button>
      </div>
      {error ? (
        <p className="text-destructive px-4 pb-2 text-center text-xs" role="alert">
          {error}
        </p>
      ) : undefined}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <EditorStage
          background={background}
          backgroundImage={backgroundImage}
          imageUrl={image.url}
          isStudioLightVisible={isStudioLightVisible}
          lightIntensity={lightIntensity}
          onPhotoPointerDown={handleStagePointerDown}
          onPhotoPointerMove={handlePhotoPointerMove}
          onPhotoPointerUp={handlePhotoPointerUp}
          onStickerPointerDown={handleStickerPointerDown}
          photoOffset={photoOffset}
          photoScale={photoScale}
          selectedStickerId={selectedStickerId}
          stageRatio={stageRatio}
          stageReference={stageReference}
          stickers={stickers}
        />

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
            {selectedSticker
              ? `贴纸 ${Math.round(selectedSticker.size * 100)}%`
              : `大小 ${Math.round(photoScale * 100)}%`}
          </span>
          <input
            aria-label={selectedSticker ? "贴纸大小" : "照片大小"}
            className="accent-primary h-11 min-w-0 flex-1"
            max={(selectedSticker ? STICKER_MAX_SIZE : PHOTO_MAX_SCALE) * 100}
            min={(selectedSticker ? STICKER_MIN_SIZE : PHOTO_MIN_SCALE) * 100}
            onChange={(event) => {
              if (selectedSticker) {
                resizeSelectedSticker(Number(event.target.value));
              } else {
                setPhotoScale(Number(event.target.value) / 100);
              }
            }}
            step={1}
            type="range"
            value={Math.round((selectedSticker ? selectedSticker.size : photoScale) * 100)}
          />
          <button
            className="ease-out-strong flex h-11 shrink-0 items-center rounded-lg transition duration-150 active:scale-[0.98]"
            onClick={() => {
              if (selectedSticker) {
                resetSelectedSticker();
              } else {
                resetPhoto();
              }
            }}
            type="button"
          >
            <span className="text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium">
              <RotateCcw className="size-3.5" />
              复位
            </span>
          </button>
          {selectedSticker ? (
            <button
              className="ease-out-strong flex h-11 shrink-0 items-center rounded-lg transition duration-150 active:scale-[0.98]"
              onClick={removeSelectedSticker}
              type="button"
            >
              <span className="text-destructive inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium">
                <Trash2 className="size-3.5" />
                删除
              </span>
            </button>
          ) : undefined}
        </div>

        <p className="text-muted-foreground text-xs">
          {selectedSticker
            ? "拖动贴纸移动位置；用滑杆调大小，点删除移除。"
            : "双指缩放、拖动照片调整位置。"}
        </p>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-xs">比例</span>
            <div className="flex shrink-0 gap-1.5">
              {IMAGE_RATIOS.map((item) => {
                const isSelected = outputRatio === item.value;
                return (
                  <button
                    aria-pressed={isSelected}
                    className="ease-out-strong flex h-11 items-center rounded-lg transition duration-150 active:scale-[0.98]"
                    key={item.value}
                    onClick={() => {
                      setOutputRatio(item.value);
                    }}
                    type="button"
                  >
                    <span
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium",
                        isSelected ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      {item.value}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground min-w-0 text-[11px] leading-4">{ratioHint}</p>
          </div>

          <BackgroundControls
            background={background}
            backgroundImage={backgroundImage}
            isLightDisabled={isStudioLightDisabled}
            lightIntensity={lightIntensity}
            onColorChange={handleColorChange}
            onError={setError}
            onImageChange={setBackgroundImage}
            onImageRemove={() => {
              setBackgroundImage("");
            }}
            onLightIntensityChange={setLightIntensity}
          />
        </section>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground shrink-0 text-xs">贴纸</span>
            <div className="flex gap-2">
              {STICKERS.map((item) => (
                <button
                  aria-label={`添加贴纸 ${item.label}`}
                  className="ease-out-strong flex size-11 items-center justify-center rounded-lg transition duration-150 active:scale-95"
                  key={item.key}
                  onClick={() => {
                    addSticker(item);
                  }}
                  type="button"
                >
                  <span className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-[#9E2A2B] p-1">
                    <img
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      crossOrigin="anonymous"
                      src={item.src}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Lightbox
        className="wedding-preview-lightbox"
        close={() => {
          setPreviewUrl("");
        }}
        labels={{ Close: "关闭", Lightbox: "预览婚纱照", "Zoom in": "放大", "Zoom out": "缩小" }}
        open={previewUrl !== ""}
        plugins={[Zoom]}
        render={{
          buttonNext: () => <></>,
          buttonPrev: () => <></>,
          controls: () => (
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex justify-center px-6">
              <p className="rounded-full bg-black/60 px-3 py-1.5 text-center text-xs leading-5 text-white/80">
                双指缩放查看细节 · 长按图片保存到相册
              </p>
            </div>
          ),
        }}
        slides={previewUrl === "" ? [] : [{ src: previewUrl }]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      />
    </>
  );
}
