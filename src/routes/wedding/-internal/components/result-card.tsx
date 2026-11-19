import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Maximize2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#ui/select";

import "yet-another-react-lightbox/styles.css";

import { RETOUCH_LEVELS, type RetouchLevel } from "../services/retouch.ts";
import type { PublicImage, PublicImageVersion } from "../services/wedding.ts";
import { editGeneratedImage } from "../services/wedding.ts";

interface ResultCardProperties {
  code: string;
  image: PublicImage;
  globalRetouch: RetouchLevel;
  canRegenerate: boolean;
  isRegenerating: boolean;
  regenerateHint: string;
  onRegenerate: () => void;
}

export function ResultCard({
  code,
  image,
  globalRetouch,
  canRegenerate,
  isRegenerating,
  regenerateHint,
  onRegenerate,
}: ResultCardProperties) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [editRetouch, setEditRetouch] = useState<RetouchLevel>(globalRetouch);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const versions = image.versions;
  const latestVersionId = versions.at(-1)?.id ?? 0;
  const [selectedVersionId, setSelectedVersionId] = useState(latestVersionId);
  useEffect(() => {
    setSelectedVersionId(latestVersionId);
  }, [latestVersionId]);
  const coverVersion = versions.at(-1) ?? {
    id: 0,
    url: image.url,
    createdAt: image.createdAt,
  };
  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? coverVersion;

  const editMutation = useMutation({
    mutationFn: (text: string) =>
      editGeneratedImage({
        data: {
          code,
          imageId: image.id,
          versionId: selectedVersion.id,
          instruction: text,
          retouch: editRetouch,
        },
      }),
    onSuccess: () => {
      setInstruction("");
      void router.invalidate();
    },
  });

  const selectedIndex = versions.findIndex((version) => version.id === selectedVersion.id);
  const filename = `婚纱照-${image.id}-${Math.max(0, selectedIndex) + 1}.png`;
  const canEdit = image.remainingEdits > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 ease-out-strong duration-500 motion-reduce:animate-none">
      <Drawer showSwipeHandle swipeDirection="down">
        <DrawerTrigger
          render={
            <button
              aria-label="查看或修改这张婚纱照"
              className="ease-out-strong bg-muted relative block w-full cursor-zoom-in overflow-hidden rounded-2xl transition duration-150 active:scale-[0.99]"
              type="button"
            />
          }
        >
          <img
            alt="生成的婚纱照"
            className="aspect-3/4 w-full object-cover"
            decoding="async"
            src={coverVersion.url}
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/70 via-black/25 to-transparent px-3 pt-12 pb-3 text-xs font-medium text-white">
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
              <Pencil aria-hidden className="size-3.5" />
              查看与修改
            </span>
          </span>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="relative">
            <DrawerTitle className="font-heading">婚纱照</DrawerTitle>
            <DrawerClose
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
            </DrawerClose>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <button
              aria-label="放大查看婚纱照"
              className="relative mx-auto block w-fit max-w-full overflow-hidden rounded-2xl"
              onClick={() => {
                setIsPreviewOpen(true);
              }}
              type="button"
            >
              <img
                alt="当前版本婚纱照"
                className="block max-h-[40dvh] max-w-full object-contain"
                src={selectedVersion.url}
              />
              <span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                <Maximize2 aria-hidden className="size-3.5" />
                看大图
              </span>
            </button>
            {versions.length > 1 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">{versions.length} 个版本</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {versions.map((version, index) => {
                    const isSelected = version.id === selectedVersion.id;
                    return (
                      <button
                        aria-label={`查看第 ${index + 1} 个版本`}
                        aria-pressed={isSelected}
                        className={cn(
                          "ease-out-strong flex w-20 shrink-0 flex-col gap-1 rounded-lg border-2 p-0.5 transition duration-150 active:scale-95",
                          isSelected ? "border-primary" : "border-transparent",
                        )}
                        key={version.id}
                        onClick={() => {
                          setSelectedVersionId(version.id);
                        }}
                        type="button"
                      >
                        <img
                          alt=""
                          className="aspect-3/4 w-full rounded-md object-cover"
                          loading="lazy"
                          src={version.url}
                        />
                        <span className="text-muted-foreground truncate text-center text-[10px] leading-3">
                          {versionLabel(version, index)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : undefined}
            <div className="space-y-2">
              <p className="text-muted-foreground text-[13px] leading-5">
                还可修改 {image.remainingEdits} 次
              </p>
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs">修图力度</p>
                <Select
                  items={RETOUCH_LEVELS}
                  onValueChange={(value) => {
                    if (value === null) return;
                    const level = RETOUCH_LEVELS.find((item) => item.value === value)?.value;
                    if (level) setEditRetouch(level);
                  }}
                  value={editRetouch}
                >
                  <SelectTrigger className="h-11 w-full" size="default">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETOUCH_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <textarea
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEdit || editMutation.isPending}
                onChange={(event) => {
                  setInstruction(event.target.value);
                }}
                placeholder="描述想修改的地方…"
                value={instruction}
              />
            </div>
            {image.referenceKey === "custom" ? undefined : (
              <div className="border-border/60 space-y-1 border-t pt-3">
                <Button
                  className="h-11 w-full"
                  disabled={!canRegenerate || isRegenerating}
                  onClick={onRegenerate}
                  type="button"
                  variant="outline"
                >
                  {isRegenerating ? "正在重新生成…" : "基于这个造型重新生成"}
                </Button>
                <p className="text-muted-foreground text-center text-xs">
                  {isRegenerating ? "预计 1–3 分钟" : regenerateHint}
                </p>
              </div>
            )}
          </div>
          <DrawerFooter className="border-border/70 border-t">
            <div className="flex gap-2">
              <Button
                className="h-11 flex-1"
                nativeButton={false}
                render={<a download={filename} href={selectedVersion.url} />}
                variant="outline"
              >
                下载
              </Button>
              <Button
                className="h-11 flex-1"
                disabled={!canEdit || instruction.trim().length === 0 || editMutation.isPending}
                onClick={() => {
                  editMutation.mutate(instruction.trim());
                }}
                type="button"
              >
                {editMutation.isPending ? "修改中…" : "修改这张"}
              </Button>
            </div>
            {editMutation.error ? (
              <p className="text-destructive text-[13px] leading-5" role="alert">
                {editMutation.error.message}
              </p>
            ) : undefined}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Lightbox
        carousel={{ finite: true }}
        close={() => {
          setIsPreviewOpen(false);
        }}
        open={isPreviewOpen}
        plugins={[Zoom]}
        render={{ buttonNext: () => <></>, buttonPrev: () => <></> }} // 只有一张图，隐去左右箭头
        slides={[{ src: selectedVersion.url }]}
      />
    </div>
  );
}

function versionLabel(version: PublicImageVersion, index: number) {
  if (index === 0) return "原始";
  return version.instruction ? "修改" : "重新生成";
}
