import { useMutation } from "@tanstack/react-query";
import {
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Palette,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";
import "./lightbox.css";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "#ui/drawer";

import {
  findPoseSeries,
  IMAGE_RATIOS,
  stickerImageUrl,
  type ImageRatio,
} from "../services/poses.ts";
import { editGeneratedImage, regenerateWedding, type PublicImage } from "../services/wedding.ts";
import { fileToDataUrl } from "./photo-uploader.tsx";

// 婚纱摄影棚常用的背景纸颜色：红色系 + 中性/流行色
const BACKGROUNDS = [
  { value: "transparent", label: "透明" },
  { value: "#B4232A", label: "中国红" },
  { value: "#C0392B", label: "朱砂红" },
  { value: "#CC3300", label: "宫墙红" },
  { value: "#800020", label: "酒红" },
  { value: "#BC121A", label: "石榴红" },
  { value: "#E02A1A", label: "夕阳红" },
  { value: "#F4EDE2", label: "奶油白" },
  { value: "#E3CDAA", label: "香槟金" },
  { value: "#EBCFCB", label: "雾粉" },
  { value: "#AFC2CB", label: "雾霾蓝" },
  { value: "#D9D9D7", label: "浅灰" },
] as const;

const STICKERS = [
  {
    key: "xi-jia-landscape",
    label: "喜嫁 · 横版",
    src: stickerImageUrl("xi-jia-landscape.png"),
    width: 0.36,
  },
  {
    key: "xi-jia-vertical",
    label: "喜嫁 · 竖版",
    src: stickerImageUrl("xi-jia-vertical.png"),
    width: 0.18,
  },
  {
    key: "wu-jia-you-xi",
    label: "吾家有喜",
    src: stickerImageUrl("wu-jia-you-xi.png"),
    width: 0.34,
  },
] as const;

const PHOTO_MIN_SCALE = 0.5;
const PHOTO_MAX_SCALE = 3;
const STICKER_MIN_SIZE = 0.05;
const STICKER_MAX_SIZE = 0.55;

const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #e9e6e1 25%, transparent 25%), linear-gradient(-45deg, #e9e6e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e9e6e1 75%), linear-gradient(-45deg, transparent 75%, #e9e6e1 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

interface Sticker {
  id: number;
  src: string;
  label: string;
  // 宽度占画布宽度的比例
  size: number;
  initialSize: number;
  x: number;
  y: number;
}

interface PhotoGesture {
  offsetX: number;
  offsetY: number;
  scale: number;
  distance: number;
  x: number;
  y: number;
}

export function ResultCard({
  code,
  image,
  faces,
  hasPhotos,
  onImageChange,
}: {
  code: string;
  image: PublicImage;
  faces: string[];
  hasPhotos: boolean;
  onImageChange: (image: PublicImage) => void;
}) {
  const seriesTitle = findPoseSeries(image.series)?.title ?? image.series;
  const aspectRatio = image.ratio === "3:4" ? "3 / 4" : "2 / 3";
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  const editMutation = useMutation({
    mutationFn: (text: string) =>
      editGeneratedImage({ data: { code, imageId: image.id, url: image.url, instruction: text } }),
    onSuccess: (updated) => {
      setInstruction("");
      setIsModifyOpen(false);
      onImageChange(updated);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateWedding({ data: { code, imageId: image.id, faces } }),
    onSuccess: (updated) => {
      setIsModifyOpen(false);
      onImageChange(updated);
    },
  });

  const isModifying = editMutation.isPending || regenerateMutation.isPending;
  const editDisabled = isModifying || image.remainingEdits === 0 || instruction.trim() === "";
  const regenerateDisabled = isModifying || !hasPhotos || image.remainingEdits === 0;
  const modifyError = editMutation.error ?? regenerateMutation.error;
  const editHint =
    image.remainingEdits === 0
      ? "修改次数已用完。"
      : `还可修改 ${image.remainingEdits} 次，修改和重新生成共用次数；人不像请直接重新生成。`;

  return (
    <div>
      <div className="relative">
        <Drawer showSwipeHandle swipeDirection="down">
          <DrawerTrigger
            render={
              <button
                aria-label={`编辑${seriesTitle}姿态 ${image.pose} 的婚纱照`}
                className="ease-out-strong border-border relative block w-full cursor-pointer overflow-hidden rounded-2xl border transition duration-150 active:scale-[0.99]"
                style={CHECKERBOARD}
                type="button"
              />
            }
          >
            <img
              alt={`${seriesTitle}姿态 ${image.pose} 的婚纱照`}
              className="w-full object-contain"
              crossOrigin="anonymous"
              decoding="async"
              src={image.url}
              style={{ aspectRatio }}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end px-3 pb-3 text-xs font-medium text-white">
              <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
                <Palette aria-hidden className="size-3.5" />
                换背景 · 贴纸 · 保存
              </span>
            </span>
          </DrawerTrigger>
          <DrawerContent
            style={
              {
                "--drawer-content-max-height": "90dvh",
                "--drawer-height": "90dvh",
              } as CSSProperties
            }
          >
            <Editor image={image} seriesTitle={seriesTitle} />
          </DrawerContent>
        </Drawer>
        <button
          aria-label="修改这张婚纱照"
          className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition after:absolute after:-inset-2 after:content-[''] active:scale-95"
          onClick={() => {
            setIsModifyOpen(true);
          }}
          type="button"
        >
          <Pencil aria-hidden className="size-3.5" />
          修改
        </button>
        {isModifying ? (
          <div
            aria-live="polite"
            className="bg-background/70 absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm"
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
            <p className="text-muted-foreground text-xs">{editHint}</p>
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
            <p className="text-muted-foreground text-xs">
              {regenerateHint(hasPhotos, image.remainingEdits)}
            </p>
          </div>
          {modifyError ? (
            <p className="text-destructive text-[13px] leading-5" role="alert">
              {modifyError.message}
            </p>
          ) : undefined}
        </DialogContent>
      </Dialog>

      <p className="text-muted-foreground mt-1.5 text-center text-xs">
        {seriesTitle} · 姿态 {image.pose}
      </p>
      {image.versions.length > 1 ? (
        <div className="mt-3">
          <p className="text-muted-foreground text-center text-xs">
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
                  key={version.url}
                  onClick={() => {
                    onImageChange({ ...image, url: version.url });
                  }}
                  style={CHECKERBOARD}
                  type="button"
                >
                  <img alt={`第 ${index + 1} 版`} className="w-full" src={version.url} />
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
  );
}

function Editor({ image, seriesTitle }: { image: PublicImage; seriesTitle: string }) {
  const stageReference = useRef<HTMLDivElement>(null);
  const backgroundInput = useRef<HTMLInputElement>(null);
  const nextStickerId = useRef(1);
  const photoPointers = useRef(new Map<number, { x: number; y: number }>());
  const photoGesture = useRef<PhotoGesture>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    distance: 0,
    x: 0,
    y: 0,
  });
  const [background, setBackground] = useState("transparent");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<number>();
  const [outputRatio, setOutputRatio] = useState<ImageRatio>(image.ratio === "3:4" ? "3:4" : "2:3");
  const stageRatio = outputRatio === "3:4" ? 3 / 4 : 2 / 3;
  const ratioHint = (outputRatio === "3:4" ? IMAGE_RATIOS[1] : IMAGE_RATIOS[0]).hint;
  const [photoScale, setPhotoScale] = useState(1);
  const [photoOffset, setPhotoOffset] = useState({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setPhotoScale(1);
    setPhotoOffset({ x: 0, y: 0 });
  }, [image.url]);

  function addSticker(item: (typeof STICKERS)[number]) {
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

  function resetPhoto() {
    setPhotoScale(1);
    setPhotoOffset({ x: 0, y: 0 });
  }

  function resetSelectedSticker() {
    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === selectedStickerId ? { ...sticker, size: sticker.initialSize } : sticker,
      ),
    );
  }

  function handlePhotoPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    setSelectedStickerId(undefined);
    event.currentTarget.setPointerCapture(event.pointerId);
    photoPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    photoGesture.current = gestureSnapshot(photoPointers.current, photoOffset, photoScale);
  }

  function handlePhotoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointers = photoPointers.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const stage = stageReference.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const start = photoGesture.current;

    if (pointers.size === 1) {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      setPhotoOffset({
        x: clamp(start.offsetX + ((pointer.x - start.x) / rect.width) * 100, -50, 50),
        y: clamp(start.offsetY + ((pointer.y - start.y) / rect.height) * 100, -50, 50),
      });
      return;
    }

    const iterator = pointers.values();
    const first = iterator.next();
    const second = iterator.next();
    if (first.done || second.done || start.distance === 0) return;
    const distance = Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y);
    setPhotoScale(
      clamp(start.scale * (distance / start.distance), PHOTO_MIN_SCALE, PHOTO_MAX_SCALE),
    );
    setPhotoOffset({
      x: clamp(
        start.offsetX + (((first.value.x + second.value.x) / 2 - start.x) / rect.width) * 100,
        -50,
        50,
      ),
      y: clamp(
        start.offsetY + (((first.value.y + second.value.y) / 2 - start.y) / rect.height) * 100,
        -50,
        50,
      ),
    });
  }

  function handlePhotoPointerUp(event: PointerEvent<HTMLDivElement>) {
    const pointers = photoPointers.current;
    pointers.delete(event.pointerId);
    if (pointers.size > 0) {
      photoGesture.current = gestureSnapshot(pointers, photoOffset, photoScale);
    }
  }

  function handleStickerPointerDown(event: PointerEvent<HTMLButtonElement>, id: number) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedStickerId(id);

    const stage = stageReference.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();

    function move(moveEvent: globalThis.PointerEvent) {
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      setStickers((current) =>
        current.map((sticker) =>
          sticker.id === id ? { ...sticker, x: clamp(x, 4, 96), y: clamp(y, 4, 96) } : sticker,
        ),
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

  async function handleBackgroundFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setIsBackgroundProcessing(true);
    try {
      setBackgroundImage(await fileToDataUrl(file));
    } catch {
      setError("读取背景图失败，请重试");
    } finally {
      setIsBackgroundProcessing(false);
    }
  }

  // 背景色、背景图和贴纸都只在前端合成，预览和导出的就是最终 PNG。
  async function composeImage() {
    const source = await loadImage(image.url);
    const backgroundSource = backgroundImage === "" ? undefined : await loadImage(backgroundImage);

    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth;
    canvas.height = Math.round(source.naturalWidth / stageRatio);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法导出图片");

    if (backgroundSource) {
      // 和预览的 object-cover 一致：等比放大后居中裁切填满
      const scale = Math.max(
        canvas.width / backgroundSource.naturalWidth,
        canvas.height / backgroundSource.naturalHeight,
      );
      const width = backgroundSource.naturalWidth * scale;
      const height = backgroundSource.naturalHeight * scale;
      context.drawImage(
        backgroundSource,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height,
      );
    } else if (background !== "transparent") {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 和预览的 object-contain 一致：先等比放进画布，再叠加缩放和位移
    const fitScale = Math.min(
      canvas.width / source.naturalWidth,
      canvas.height / source.naturalHeight,
    );
    const width = source.naturalWidth * fitScale * photoScale;
    const height = source.naturalHeight * fitScale * photoScale;
    context.drawImage(
      source,
      (canvas.width - width) / 2 + (photoOffset.x / 100) * canvas.width,
      (canvas.height - height) / 2 + (photoOffset.y / 100) * canvas.height,
      width,
      height,
    );

    const stickerImages = await Promise.all(stickers.map((sticker) => loadImage(sticker.src)));
    for (const [index, sticker] of stickers.entries()) {
      const stickerImage = stickerImages[index];
      const width = sticker.size * canvas.width;
      const height = width * (stickerImage.naturalHeight / stickerImage.naturalWidth);
      context.drawImage(
        stickerImage,
        (sticker.x / 100) * canvas.width - width / 2,
        (sticker.y / 100) * canvas.height - height / 2,
        width,
        height,
      );
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) throw new Error("无法导出图片");
    return blob;
  }

  async function openPreview() {
    setError("");
    setIsPreviewLoading(true);
    try {
      setPreviewUrl(URL.createObjectURL(await composeImage()));
    } catch {
      setError("预览失败，请重试");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function save() {
    setError("");
    try {
      const url = URL.createObjectURL(await composeImage());
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
        <div
          className="relative mx-auto w-full max-w-72 touch-none overflow-hidden rounded-xl border select-none"
          data-base-ui-swipe-ignore=""
          onPointerCancel={handlePhotoPointerUp}
          onPointerDown={handlePhotoPointerDown}
          onPointerMove={handlePhotoPointerMove}
          onPointerUp={handlePhotoPointerUp}
          ref={stageReference}
          style={{
            aspectRatio: stageRatio,
            containerType: "inline-size",
            backgroundColor:
              backgroundImage === "" && background !== "transparent" ? background : undefined,
          }}
        >
          {backgroundImage === "" ? (
            background === "transparent" ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={CHECKERBOARD}
              />
            ) : undefined
          ) : (
            <img
              alt=""
              className="pointer-events-none absolute inset-0 size-full object-cover"
              src={backgroundImage}
            />
          )}
          <img
            alt=""
            className="pointer-events-none absolute inset-0 size-full object-contain"
            crossOrigin="anonymous"
            draggable={false}
            src={image.url}
            style={{
              transform: `translate(${photoOffset.x}%, ${photoOffset.y}%) scale(${photoScale})`,
              transformOrigin: "center",
            }}
          />
          {stickers.map((sticker) => (
            <button
              aria-label={`贴纸 ${sticker.label}`}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab bg-transparent p-0 active:cursor-grabbing",
                sticker.id === selectedStickerId &&
                  "rounded-md outline-2 outline-dashed outline-primary",
              )}
              key={sticker.id}
              onPointerDown={(event) => {
                handleStickerPointerDown(event, sticker.id);
              }}
              style={{
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                width: `${sticker.size * 100}%`,
                touchAction: "none",
              }}
              type="button"
            >
              <img
                alt=""
                className="block h-auto w-full"
                crossOrigin="anonymous"
                draggable={false}
                src={sticker.src}
              />
            </button>
          ))}
        </div>

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

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">背景</p>
            <div className="flex flex-wrap gap-1">
              {BACKGROUNDS.map((item) => (
                <button
                  aria-label={`背景：${item.label}`}
                  aria-pressed={backgroundImage === "" && background === item.value}
                  className="flex size-11 items-center justify-center rounded-full"
                  key={item.value}
                  onClick={() => {
                    setBackground(item.value);
                    setBackgroundImage("");
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
                    style={
                      item.value === "transparent" ? CHECKERBOARD : { backgroundColor: item.value }
                    }
                  />
                </button>
              ))}
              <label className="relative flex size-11 cursor-pointer items-center justify-center rounded-full">
                <input
                  aria-label="自定义背景颜色"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  onChange={(event) => {
                    setBackground(event.target.value);
                    setBackgroundImage("");
                  }}
                  type="color"
                  value={background === "transparent" ? "#f6f0e7" : background}
                />
                <span
                  aria-hidden
                  className="pointer-events-none size-7 rounded-full border shadow-sm"
                  style={{
                    background:
                      "conic-gradient(#f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)",
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
                <img
                  alt=""
                  className="h-10 w-14 rounded-md border object-cover"
                  src={backgroundImage}
                />
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
                  onClick={() => {
                    setBackgroundImage("");
                  }}
                  type="button"
                >
                  <span className="text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                    移除
                  </span>
                </button>
              )}
            </div>
          </div>
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

function backgroundActionLabel(isProcessing: boolean, hasImage: boolean) {
  if (isProcessing) return "处理中…";
  return hasImage ? "更换背景图" : "自定义背景图";
}

function regenerateHint(hasPhotos: boolean, remainingEdits: number) {
  if (!hasPhotos) return "需要先重新上传两张照片";
  if (remainingEdits === 0) return "修改次数已用完";
  return "会消耗 1 次修改次数，人不像就直接重新生成。";
}

async function loadImage(source: string) {
  const image = new Image();
  // 贴纸从 CDN 取，导出 canvas 需要跨域许可；成图走同源 /media 代理
  image.crossOrigin = "anonymous";
  image.src = source;
  await image.decode();
  return image;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gestureSnapshot(
  pointers: Map<number, { x: number; y: number }>,
  offset: { x: number; y: number },
  scale: number,
): PhotoGesture {
  const iterator = pointers.values();
  const first = iterator.next();
  if (first.done) return { offsetX: offset.x, offsetY: offset.y, scale, distance: 0, x: 0, y: 0 };
  const second = iterator.next();
  if (second.done) {
    return {
      offsetX: offset.x,
      offsetY: offset.y,
      scale,
      distance: 0,
      x: first.value.x,
      y: first.value.y,
    };
  }
  return {
    offsetX: offset.x,
    offsetY: offset.y,
    scale,
    distance: Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y),
    x: (first.value.x + second.value.x) / 2,
    y: (first.value.y + second.value.y) / 2,
  };
}
