import { ChevronRight, Loader2, Maximize2, Plus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { Button } from "#ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
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

import type { ReferenceChoice, ReferenceGroup } from "../services/references.ts";
import { DEFAULT_RETOUCH, RETOUCH_LEVELS, type RetouchLevel } from "../services/retouch.ts";
import { fileToDataUrl } from "./photo-uploader.tsx";

interface ReferencePickerProperties {
  groups: ReferenceGroup[];
  triggerLabel: string;
  actionLabel: string;
  actionDisabled: boolean;
  onGenerate: (reference: ReferenceChoice, retouch: RetouchLevel) => void;
}

export function ReferencePicker({
  groups,
  triggerLabel,
  actionLabel,
  actionDisabled,
  onGenerate,
}: ReferencePickerProperties) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.title ?? "");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isCustomProcessing, setIsCustomProcessing] = useState(false);
  const [customError, setCustomError] = useState("");
  const customInputReference = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState<{
    reference: ReferenceChoice;
    url: string;
    label: string;
    retouch?: RetouchLevel;
  }>();
  const groupIndex = Math.max(
    0,
    groups.findIndex((item) => item.title === activeGroup),
  );
  const group = groups[groupIndex];

  async function handleCustomFile(file: File | undefined) {
    if (!file) return;
    setCustomError("");
    setIsCustomProcessing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setConfirming({
        reference: { kind: "custom", dataUrl },
        url: dataUrl,
        label: "自定义造型",
      });
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "读取图片失败");
    } finally {
      setIsCustomProcessing(false);
    }
  }

  return (
    <div>
      <Drawer
        onOpenChange={setIsDrawerOpen}
        open={isDrawerOpen}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerTrigger
          render={
            <button
              className="border-border bg-background hover:bg-secondary/60 active:bg-secondary ease-out-strong flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition duration-150 active:scale-[0.99]"
              type="button"
            />
          }
        >
          <span className="border-border text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-full border">
            <Plus className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{triggerLabel}</span>
            <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-5">
              选一张造型，确认后生成
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-heading">挑一张喜欢的造型</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
            <Select
              onValueChange={(value) => {
                if (value !== null) setActiveGroup(value);
              }}
              value={group.title}
            >
              <SelectTrigger className="h-11 w-full" size="default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((item) => (
                  <SelectItem key={item.title} value={item.title}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {group.images.map((image, imageIndex) => (
                <button
                  aria-label={`选择${group.title}参考图 ${imageIndex + 1}`}
                  className="ease-out-strong border-border block w-full overflow-hidden rounded-xl border shadow-sm transition duration-150 active:scale-95"
                  key={image.key}
                  onClick={() => {
                    setConfirming({
                      reference: { kind: "curated", key: image.key, url: image.url },
                      url: image.url,
                      label: `${group.title} 参考图 ${imageIndex + 1}`,
                    });
                  }}
                  type="button"
                >
                  <img
                    alt=""
                    className="aspect-3/4 w-full object-cover"
                    loading="lazy"
                    src={image.url}
                  />
                </button>
              ))}
            </div>
          </div>
          <DrawerFooter className="border-border/70 border-t">
            <input
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void handleCustomFile(file);
              }}
              ref={customInputReference}
              type="file"
            />
            <Button
              className="w-full text-sm"
              disabled={isCustomProcessing}
              onClick={() => customInputReference.current?.click()}
              size="cta"
              type="button"
            >
              {isCustomProcessing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {isCustomProcessing ? "正在处理…" : "没有喜欢的？使用自定义造型"}
            </Button>
            {customError ? (
              <p className="text-destructive text-center text-xs" role="alert">
                {customError}
              </p>
            ) : undefined}
            <DrawerClose
              render={<Button className="w-full" size="cta" type="button" variant="outline" />}
            >
              取消
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Dialog
        onOpenChange={(open) => {
          if (open) return;
          setConfirming(undefined);
          setIsZoomOpen(false);
        }}
        open={confirming !== undefined}
      >
        <DialogContent>
          <DialogTitle>确认这张造型？</DialogTitle>
          {confirming ? (
            <button
              aria-label="放大查看参考图"
              className="relative mx-auto block w-fit max-w-full overflow-hidden rounded-xl"
              onClick={() => {
                setIsZoomOpen(true);
              }}
              type="button"
            >
              <img
                alt={confirming.label}
                className="block max-h-[40dvh] max-w-full object-contain"
                src={confirming.url}
              />
              <span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                <Maximize2 aria-hidden className="size-3.5" />
                看大图
              </span>
            </button>
          ) : undefined}
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">修图力度</p>
            <Select
              items={RETOUCH_LEVELS}
              onValueChange={(value) => {
                if (value === null) return;
                const selected = RETOUCH_LEVELS.find((level) => level.value === value)?.value;
                setConfirming((current) => (current ? { ...current, retouch: selected } : current));
              }}
              value={confirming?.retouch ?? DEFAULT_RETOUCH}
            >
              <SelectTrigger className="h-11 w-full" size="default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETOUCH_LEVELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogDescription>
            {confirming?.reference.kind === "custom"
              ? "将消耗 1 张额度，预计 1–3 分钟；自定义造型仅用于本次生成，不会保存。"
              : "将消耗 1 张额度，预计 1–3 分钟；生成后还可以继续修改。"}
          </DialogDescription>
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1"
              onClick={() => {
                setConfirming(undefined);
                setIsZoomOpen(false);
              }}
              type="button"
              variant="outline"
            >
              再看看
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={actionDisabled}
              onClick={() => {
                if (!confirming) return;
                onGenerate(confirming.reference, confirming.retouch ?? DEFAULT_RETOUCH);
                setConfirming(undefined);
                setIsZoomOpen(false);
                setIsDrawerOpen(false);
              }}
              type="button"
            >
              {actionLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Lightbox
        carousel={{ finite: true }}
        close={() => {
          setIsZoomOpen(false);
        }}
        open={isZoomOpen}
        plugins={[Zoom]}
        render={{ buttonNext: () => <></>, buttonPrev: () => <></> }}
        slides={confirming ? [{ alt: confirming.label, src: confirming.url }] : []}
      />
    </div>
  );
}
