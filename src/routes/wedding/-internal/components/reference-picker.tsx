import { Check, ChevronRight, Images, X } from "lucide-react";
import { useState } from "react";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "#ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#ui/select";

import type { ReferenceGroup } from "../services/references.ts";

interface ReferencePickerProperties {
  groups: ReferenceGroup[];
  selected: string[];
  max: number;
  onToggle: (key: string) => void;
}

export function ReferencePicker({ groups, selected, max, onToggle }: ReferencePickerProperties) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.title ?? "");
  const [preview, setPreview] = useState<{ url: string; label: string }>();
  const groupIndex = Math.max(
    0,
    groups.findIndex((item) => item.title === activeGroup),
  );
  const group = groups[groupIndex];
  const imagesByKey = new Map(
    groups.flatMap((item) => item.images.map((image) => [image.key, image])),
  );
  const selectedImages = selected.flatMap((key) => {
    const image = imagesByKey.get(key);
    return image ? [image] : [];
  });

  return (
    <div className="space-y-3">
      <Drawer showSwipeHandle swipeDirection="down">
        <DrawerTrigger
          render={
            <button
              className="border-border bg-background hover:bg-secondary/60 active:bg-secondary ease-out-strong flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition duration-150 active:scale-[0.99]"
              type="button"
            />
          }
        >
          <span className="border-border text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-full border">
            <Images className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {selected.length > 0 ? `已选 ${selected.length} 张参考图` : "浏览参考图"}
            </span>
            <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-5">
              {selected.length > 0 ? "点此继续挑选或调整" : `共 ${groups.length} 组风格 · 点此挑选`}
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-heading">选择参考图</DrawerTitle>
            <DrawerDescription>最多选择 {max} 张；一张参考图生成一张婚纱照。</DrawerDescription>
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
                {groups.map((item) => {
                  const count = item.images.filter((image) => selected.includes(image.key)).length;
                  return (
                    <SelectItem key={item.title} value={item.title}>
                      {item.title}
                      {count > 0 ? ` · 已选 ${count}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {group.images.map((image, imageIndex) => {
                const isActive = selected.includes(image.key);
                return (
                  <div className="relative" key={image.key}>
                    <button
                      aria-pressed={isActive}
                      className={cn(
                        "block w-full overflow-hidden rounded-xl border-2 shadow-sm transition duration-150 ease-out-strong active:scale-95",
                        isActive ? "border-primary" : "border-transparent",
                      )}
                      onClick={() => {
                        onToggle(image.key);
                      }}
                      type="button"
                    >
                      <img
                        alt={`${group.title} 参考图 ${imageIndex + 1}`}
                        className="aspect-3/4 w-full object-cover"
                        loading="lazy"
                        src={image.url}
                      />
                    </button>
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full border shadow-sm transition-colors duration-150",
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background/90 text-transparent",
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <DrawerFooter className="border-border/70 border-t">
            <DrawerClose render={<Button className="w-full" size="cta" type="button" />}>
              完成{selected.length > 0 ? `（已选 ${selected.length} 张）` : ""}
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {selectedImages.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {selectedImages.map((image, index) => (
            <button
              aria-label={`放大查看已选参考图 ${index + 1}`}
              className="ease-out-strong border-border block w-full cursor-zoom-in overflow-hidden rounded-xl border transition duration-150 active:scale-95"
              key={image.key}
              onClick={() => {
                setPreview({ url: image.url, label: `已选参考图 ${index + 1}` });
              }}
              type="button"
            >
              <img alt="已选参考图" className="aspect-3/4 w-full object-cover" src={image.url} />
            </button>
          ))}
        </div>
      ) : undefined}
      <Dialog
        onOpenChange={(open) => {
          if (!open) setPreview(undefined);
        }}
        open={preview !== undefined}
      >
        <DialogContent className="inset-0 top-0 left-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0">
          <DialogTitle className="sr-only">放大查看参考图</DialogTitle>
          {preview ? (
            <div className="flex h-full items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
              <img
                alt={preview.label}
                className="max-h-full max-w-full object-contain"
                src={preview.url}
              />
            </div>
          ) : undefined}
          <DialogClose
            render={
              <Button
                aria-label="关闭"
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 size-11 rounded-full"
                size="icon-lg"
                variant="secondary"
              />
            }
          >
            <X aria-hidden />
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
