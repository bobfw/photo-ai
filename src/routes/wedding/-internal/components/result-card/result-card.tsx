import { useMutation } from "@tanstack/react-query";
import { Loader2, Palette, Pencil, X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "#ui/drawer";

import { findPoseSeries } from "../../services/poses.ts";
import { editGeneratedImage, regenerateWedding, type PublicImage } from "../../services/wedding.ts";
import { RetryImage } from "../retry-image.tsx";
import { CHECKERBOARD } from "./constants.ts";
import { Editor } from "./editor.tsx";

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
  // 手动"重新获取"时换 key 重挂载，让 RetryImage 重新开始自动重试
  const [imageAttempt, setImageAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageAttempt(0);
    setImageFailed(false);
  }, [image.url]);

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
            <RetryImage
              alt={`${seriesTitle}姿态 ${image.pose} 的婚纱照`}
              className="w-full object-contain"
              crossOrigin="anonymous"
              decoding="async"
              key={imageAttempt}
              src={image.url}
              style={{ aspectRatio }}
              onFinalError={() => {
                setImageFailed(true);
              }}
              onLoad={() => {
                setImageFailed(false);
              }}
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
        {imageFailed ? (
          <button
            aria-label="重新获取这张婚纱照"
            className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/50"
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
                  <RetryImage alt={`第 ${index + 1} 版`} className="w-full" src={version.url} />
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

function regenerateHint(hasPhotos: boolean, remainingEdits: number) {
  if (!hasPhotos) return "需要先重新上传两张照片";
  if (remainingEdits === 0) return "修改次数已用完";
  return "会消耗 1 次修改次数，人不像就直接重新生成。";
}
