import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, Loader2, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { z } from "zod";

import "yet-another-react-lightbox/styles.css";
import "./-internal/lightbox.css";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";

import { CenteredMessage } from "../-internal/components/centered-message.tsx";
import { RetryImage } from "../-internal/components/retry-image.tsx";
import { useWeddingPhotos } from "../-internal/components/wedding-photos.tsx";
import { findPoseSeries, IMAGE_RATIOS, type ImageRatio } from "../-internal/services/poses.ts";
import {
  editGeneratedImage,
  loadWeddingState,
  regenerateWedding,
} from "../-internal/services/wedding.ts";
import { BackgroundControls } from "./-internal/editor/background-controls.tsx";
import { composeImage } from "./-internal/editor/compose-image.ts";
import {
  PHOTO_MAX_SCALE,
  PHOTO_MIN_SCALE,
  proxyImageUrl,
  STICKER_MAX_SIZE,
  STICKER_MIN_SIZE,
  STICKERS,
  type StickerPreset,
} from "./-internal/editor/constants.ts";
import { EditorStage } from "./-internal/editor/editor-stage.tsx";
import type { Sticker } from "./-internal/editor/types.ts";
import { useCleanCutout } from "./-internal/editor/use-clean-cutout.ts";
import { usePersonFootprint } from "./-internal/editor/use-person-footprint.ts";
import { usePhotoGesture } from "./-internal/editor/use-photo-gesture.ts";

/* oxlint-disable typescript/only-throw-error -- TanStack Router 的 redirect 必须 throw */

export const Route = createFileRoute("/wedding/result/$id")({
  validateSearch: z.object({ code: z.string().optional() }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ params, deps: { code } }) => {
    const { code: validCode, state } = await loadWeddingState(code);
    const imageId = z.coerce.number().int().positive().safeParse(params.id);
    const image = imageId.success
      ? state.images.find((item) => item.id === imageId.data)
      : undefined;
    if (!image) {
      throw redirect({ to: "/wedding", search: { code: validCode } });
    }
    return { code: validCode, image };
  },
  pendingComponent: () => <CenteredMessage>正在读取照片…</CenteredMessage>,
  component: ResultPage,
});

function ResultPage() {
  const { code, image: initialImage } = Route.useLoaderData();
  const navigate = useNavigate();
  const { faces, hasPhotos } = useWeddingPhotos();
  const [image, setImage] = useState(initialImage);
  const seriesTitle = findPoseSeries(image.series)?.title ?? image.series;
  const stageReference = useRef<HTMLDivElement>(null);
  const nextStickerId = useRef(1);
  // 展示和 canvas 都走 CORS 代理；Ark 没有 CORS 头，canvas 无法直接导出
  const rawImageSource = proxyImageUrl(image.sourceUrl ?? image.url);
  const imageSource = useCleanCutout(rawImageSource);
  const [background, setBackground] = useState("transparent");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [dofIntensity, setDofIntensity] = useState(0.35);
  const [lightIntensity, setLightIntensity] = useState(0.7);
  const [grainIntensity, setGrainIntensity] = useState(0.35);
  const [shadowIntensity, setShadowIntensity] = useState(0.35);
  const [textureIntensity, setTextureIntensity] = useState(0);
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
  } = usePhotoGesture(rawImageSource, stageReference);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  // 手动"重新获取"时换 key 重挂载，让 RetryImage 重新开始自动重试
  const [imageAttempt, setImageAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId);
  const isSolidBackground = backgroundImage === "" && background !== "transparent";
  const hasBackground = isSolidBackground || backgroundImage !== "";
  const isColorEffectDisabled = !isSolidBackground;
  const isDofDisabled = backgroundImage === "";
  const isShadowDisabled = !hasBackground;
  const isStudioBackdropVisible =
    isSolidBackground && (lightIntensity > 0 || grainIntensity > 0 || textureIntensity > 0);
  const footprint = usePersonFootprint(hasBackground ? imageSource : undefined);
  const isContactShadowVisible = hasBackground && shadowIntensity > 0 && footprint !== undefined;

  useEffect(() => {
    setImageAttempt(0);
    setImageFailed(false);
  }, [rawImageSource]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const editMutation = useMutation({
    mutationFn: (text: string) =>
      editGeneratedImage({ data: { code, imageId: image.id, url: image.url, instruction: text } }),
    onSuccess: (updated) => {
      setInstruction("");
      setImage(updated);
      setIsModifyOpen(false);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateWedding({ data: { code, imageId: image.id, faces } }),
    onSuccess: (updated) => {
      setImage(updated);
      setIsModifyOpen(false);
    },
  });

  const isModifying = editMutation.isPending || regenerateMutation.isPending;
  const editDisabled = isModifying || image.remainingEdits === 0 || instruction.trim() === "";
  const regenerateDisabled = isModifying || !hasPhotos || image.remainingEdits === 0;
  const modifyError = editMutation.error ?? regenerateMutation.error;
  const modifyHint = modifyHintText(hasPhotos, image.remainingEdits);

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
      imageUrl: imageSource,
      background,
      backgroundImage,
      dofIntensity,
      grainIntensity,
      lightIntensity,
      shadowIntensity,
      stageRatio,
      photoScale,
      photoOffset,
      stickers,
      textureIntensity,
    });
  }

  function goBack() {
    void navigate({ to: "/wedding", search: { code }, replace: true });
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

  // 透明底原图就是当前版本本身，不走合成
  async function saveOriginal() {
    setError("");
    try {
      const response = await fetch(imageSource);
      if (!response.ok) throw new Error("原图已过期");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.download = `婚纱照-${seriesTitle}-姿态${image.pose}-透明底.png`;
      link.href = url;
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      setError("保存原图失败，请重试");
    }
  }

  return (
    <main className="bg-background flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-1 px-2 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <Button
          aria-label="返回"
          className="size-11"
          onClick={goBack}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base leading-tight font-semibold">
          {seriesTitle} · 姿态 {image.pose}
        </h1>
        <button
          aria-label="预览"
          className="border-border bg-background text-foreground hover:bg-muted ease-out-strong flex size-11 shrink-0 items-center justify-center rounded-full border transition duration-150 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPreviewLoading}
          onClick={() => {
            void openPreview();
          }}
          type="button"
        >
          {isPreviewLoading ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <Eye aria-hidden className="size-3.5" />
          )}
        </button>
        <div className="border-border bg-background flex shrink-0 items-center overflow-hidden rounded-full border">
          <button
            aria-label="保存原始透明底图片"
            className="text-foreground hover:bg-muted ease-out-strong flex h-11 items-center px-3 text-xs font-semibold transition duration-150"
            onClick={() => {
              void saveOriginal();
            }}
            type="button"
          >
            保存原图
          </button>
          <button
            aria-label="保存成片，含背景和贴纸"
            className="bg-primary text-primary-foreground hover:bg-primary/90 ease-out-strong border-border flex h-11 items-center border-l px-3 text-xs font-semibold transition duration-150"
            onClick={() => {
              void save();
            }}
            type="button"
          >
            保存成片
          </button>
        </div>
      </header>

      <div className="mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto">
        <div className="bg-background sticky top-0 z-20 px-4 pt-1 pb-1.5">
          {/* 固定顶部的图最多占半屏，给下面的控件留出空间 */}
          <div
            className="relative mx-auto w-full"
            style={{ maxWidth: `min(20rem, calc(50dvh * ${stageRatio}))` }}
          >
            <EditorStage
              background={background}
              backgroundImage={backgroundImage}
              dofIntensity={dofIntensity}
              footprint={footprint}
              grainIntensity={grainIntensity}
              imageUrl={imageSource}
              isContactShadowVisible={isContactShadowVisible}
              isStudioBackdropVisible={isStudioBackdropVisible}
              key={imageAttempt}
              lightIntensity={lightIntensity}
              onFinalError={() => {
                setImageFailed(true);
              }}
              onPhotoPointerDown={handleStagePointerDown}
              onPhotoPointerMove={handlePhotoPointerMove}
              onPhotoPointerUp={handlePhotoPointerUp}
              onStickerPointerDown={handleStickerPointerDown}
              photoOffset={photoOffset}
              photoScale={photoScale}
              selectedStickerId={selectedStickerId}
              shadowIntensity={shadowIntensity}
              stageRatio={stageRatio}
              stageReference={stageReference}
              stickers={stickers}
              textureIntensity={textureIntensity}
            />
            {imageFailed ? (
              <button
                aria-label="重新获取这张婚纱照"
                className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/50"
                onClick={() => {
                  setImageFailed(false);
                  setImageAttempt((count) => count + 1);
                }}
                type="button"
              >
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
                  重新获取
                </span>
              </button>
            ) : undefined}
            {isModifying ? (
              <div
                aria-live="polite"
                className="bg-background/70 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl backdrop-blur-sm"
                role="status"
              >
                <Loader2
                  aria-hidden
                  className="text-primary size-7 animate-spin motion-reduce:animate-none"
                />
                <p className="text-xs font-medium">
                  正在{editMutation.isPending ? "修改" : "重新生成"}，请勿刷新页面
                </p>
              </div>
            ) : undefined}
          </div>
        </div>

        <div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {error ? (
            <p className="text-destructive text-center text-xs" role="alert">
              {error}
            </p>
          ) : undefined}

          <Button
            className="h-12 w-full justify-between px-4"
            onClick={() => {
              setIsModifyOpen(true);
            }}
            type="button"
            variant="outline"
          >
            <span className="flex items-center gap-2">
              <Pencil aria-hidden />
              不满意？写提示词微调
            </span>
            <span className="text-muted-foreground text-xs font-normal tabular-nums">
              还可修改 {image.remainingEdits} 次
            </span>
          </Button>

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
              : "双指缩放、拖动照片调整位置；预览后可长按保存到相册。"}
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
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          isSelected ? "border-primary bg-primary/5 text-primary" : "border-border",
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
              dofIntensity={dofIntensity}
              grainIntensity={grainIntensity}
              isDofDisabled={isDofDisabled}
              isGrainDisabled={isColorEffectDisabled}
              isLightDisabled={isColorEffectDisabled}
              isShadowDisabled={isShadowDisabled}
              isTextureDisabled={isColorEffectDisabled}
              lightIntensity={lightIntensity}
              onColorChange={handleColorChange}
              onDofIntensityChange={setDofIntensity}
              onError={setError}
              onGrainIntensityChange={setGrainIntensity}
              onImageChange={setBackgroundImage}
              onImageRemove={() => {
                setBackgroundImage("");
              }}
              onLightIntensityChange={setLightIntensity}
              onShadowIntensityChange={setShadowIntensity}
              onTextureIntensityChange={setTextureIntensity}
              shadowIntensity={shadowIntensity}
              textureIntensity={textureIntensity}
            />
          </section>

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

          {image.versions.length > 1 ? (
            <div>
              <p className="text-muted-foreground text-xs">
                历史版本 · 点选后主图切换，可继续修改或换背景
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {image.versions.map((version, index) => {
                  const isCurrent = version.url === image.url;
                  return (
                    <button
                      aria-label={`切换到第 ${index + 1} 版`}
                      aria-pressed={isCurrent}
                      className={cn(
                        "border-border relative w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border",
                        isCurrent && "inset-ring-primary inset-ring-2",
                      )}
                      disabled={isModifying}
                      key={version.url}
                      onClick={() => {
                        setImage({
                          ...image,
                          url: version.url,
                          sourceUrl: version.sourceUrl,
                        });
                      }}
                      type="button"
                    >
                      <RetryImage
                        alt={`第 ${index + 1} 版`}
                        className="w-full"
                        src={version.sourceUrl ? proxyImageUrl(version.sourceUrl) : version.url}
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                        {isCurrent ? "当前" : `第${index + 1}版`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : undefined}
        </div>
      </div>

      <Dialog
        disablePointerDismissal={isModifying}
        onOpenChange={(open) => {
          setIsModifyOpen(open);
          // 请求还在跑时保留状态，否则关掉弹窗后按钮会重新可点，重复扣次数
          if (open || isModifying) {
            return;
          }

          editMutation.reset();
          regenerateMutation.reset();
        }}
        open={isModifyOpen}
      >
        <DialogContent>
          <DialogTitle>修改这张婚纱照</DialogTitle>
          <DialogClose
            render={
              <Button
                aria-label="关闭"
                className="absolute top-2 right-2 size-11"
                size="icon-lg"
                type="button"
                variant="ghost"
              />
            }
          >
            <X aria-hidden />
          </DialogClose>
          <DialogDescription>微调细节用提示词；如果人不像，请直接重新生成。</DialogDescription>
          {isModifying ? (
            <div
              aria-live="polite"
              className="bg-secondary/60 flex items-start gap-2 rounded-xl p-3 text-[13px] leading-5"
              role="status"
            >
              <Loader2
                aria-hidden
                className="text-primary mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none"
              />
              <span>
                {editMutation.isPending ? "正在修改这张图…" : "正在重新生成…"}
                <span className="text-muted-foreground block">
                  预计 20 秒–2 分钟，请勿刷新页面。
                </span>
              </span>
            </div>
          ) : undefined}
          <div className="space-y-2">
            <p className="text-sm font-medium">调整细节（写提示词）</p>
            <textarea
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isModifying || image.remainingEdits === 0}
              maxLength={500}
              onChange={(event) => {
                setInstruction(event.target.value);
              }}
              placeholder="例如：领结改小一点、裙摆再自然一些"
              value={instruction}
            />
            <Button
              className="h-11 w-full"
              disabled={editDisabled}
              onClick={() => {
                editMutation.mutate(instruction.trim());
              }}
              type="button"
            >
              {editMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  修改中…
                </span>
              ) : (
                "修改这张图"
              )}
            </Button>
          </div>
          <div className="border-border/60 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">完全不满意，重新生成</p>
            <Button
              className="h-11 w-full"
              disabled={regenerateDisabled}
              onClick={() => {
                regenerateMutation.mutate();
              }}
              type="button"
              variant="outline"
            >
              {regenerateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  重新生成中…
                </span>
              ) : (
                "重新生成"
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">{modifyHint}</p>
          {modifyError ? (
            <p className="text-destructive text-[13px] leading-5" role="alert">
              {modifyError.message}
            </p>
          ) : undefined}
        </DialogContent>
      </Dialog>

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
    </main>
  );
}

function modifyHintText(hasPhotos: boolean, remainingEdits: number) {
  if (remainingEdits === 0) return "修改次数已用完。";
  if (hasPhotos) {
    return `还可修改 ${remainingEdits} 次，修改和重新生成共用次数；人不像请直接重新生成。`;
  }
  return `还可修改 ${remainingEdits} 次；重新生成需要先返回上传两张照片。`;
}
