import { useState } from "react";

import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { Checkbox } from "#ui/checkbox";
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
            <Button className="h-11 w-full sm:w-auto" size="lg" type="button" variant="outline" />
          }
        >
          选择参考图{selected.length > 0 ? `（已选 ${selected.length} 张）` : ""}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>选择参考图</DrawerTitle>
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
                {groups.map((item) => (
                  <SelectItem key={item.title} value={item.title}>
                    {item.title}
                    {item.images.some((image) => selected.includes(image.key)) ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.images.map((image, imageIndex) => {
                const isActive = selected.includes(image.key);
                return (
                  <div className="relative" key={image.key}>
                    <button
                      aria-pressed={isActive}
                      className={cn(
                        "block w-full overflow-hidden rounded-lg border-2 transition-colors",
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
                    <Checkbox
                      aria-label={`选择 ${group.title} 第 ${imageIndex + 1} 张参考图`}
                      checked={isActive}
                      className="bg-background/90 absolute top-1 right-1 size-5"
                      onCheckedChange={() => {
                        onToggle(image.key);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <DrawerFooter className="border-t">
            <DrawerClose render={<Button className="h-11 w-full" size="lg" type="button" />}>
              完成{selected.length > 0 ? `（已选 ${selected.length} 张）` : ""}
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      {selectedImages.length > 0 ? (
        <div className="grid grid-cols-5 gap-2 sm:max-w-md">
          {selectedImages.map((image) => (
            <img
              alt="已选参考图"
              className="aspect-3/4 w-full rounded-lg object-cover"
              key={image.key}
              src={image.url}
            />
          ))}
        </div>
      ) : undefined}
    </div>
  );
}
