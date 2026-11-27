import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "#ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
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

import { findPoseSeries, POSE_COUNT, POSE_SERIES, poseImageUrl } from "../services/poses.ts";

export interface PoseChoice {
  series: string;
  pose: number;
  outfit: string;
  request: string;
}

interface PosePickerProperties {
  actionDisabled: boolean;
  actionLabel: string;
  triggerDisabled: boolean;
  triggerHint: string;
  triggerLabel: string;
  onGenerate: (choice: PoseChoice) => void;
}

const POSES = Array.from({ length: POSE_COUNT }, (_, index) => index + 1);
const SERIES_ITEMS = POSE_SERIES.map((series) => ({ value: series.key, label: series.title }));

export function PosePicker({
  actionDisabled,
  actionLabel,
  triggerDisabled,
  triggerHint,
  triggerLabel,
  onGenerate,
}: PosePickerProperties) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSeriesKey, setActiveSeriesKey] = useState(POSE_SERIES[0].key);
  const [selectedPose, setSelectedPose] = useState<number>();
  const [outfit, setOutfit] = useState(POSE_SERIES[0].outfit);
  const [request, setRequest] = useState("");
  const activeSeries = findPoseSeries(activeSeriesKey) ?? POSE_SERIES[0];

  function handleGenerate() {
    if (selectedPose === undefined) return;
    onGenerate({
      series: activeSeries.key,
      pose: selectedPose,
      outfit: outfit.trim() === "" ? activeSeries.outfit : outfit.trim(),
      request: request.trim(),
    });
    setSelectedPose(undefined);
    setIsDrawerOpen(false);
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
              className="border-border bg-background hover:bg-secondary/60 active:bg-secondary ease-out-strong disabled:hover:bg-background flex w-full items-center gap-3 rounded-2xl border border-dashed p-4 text-left transition duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              disabled={triggerDisabled}
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
              {triggerHint}
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="font-heading">挑一个姿态</DrawerTitle>
            <DrawerDescription>选一个系列，再挑一个姿态</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
            <Select
              items={SERIES_ITEMS}
              onValueChange={(value) => {
                if (value === null) return;
                setActiveSeriesKey(value);
                setOutfit(findPoseSeries(value)?.outfit ?? "");
              }}
              value={activeSeries.key}
            >
              <SelectTrigger className="h-11 w-full" size="default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERIES_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-4 gap-2.5">
              {POSES.map((pose) => (
                <button
                  aria-label={`选择姿态 ${pose}`}
                  className="ease-out-strong border-border block aspect-4/5 w-full overflow-hidden rounded-xl border bg-white shadow-sm transition duration-150 active:scale-95"
                  key={pose}
                  onClick={() => {
                    setSelectedPose(pose);
                  }}
                  type="button"
                >
                  <img
                    alt=""
                    className="size-full object-contain"
                    loading="lazy"
                    src={poseImageUrl(activeSeries.key, pose)}
                  />
                </button>
              ))}
            </div>
          </div>
          <DrawerFooter className="border-border/70 border-t">
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
          if (!open) setSelectedPose(undefined);
        }}
        open={selectedPose !== undefined}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogTitle>
            生成「{activeSeries.title}」姿态 {selectedPose} 的婚纱照？
          </DialogTitle>
          {selectedPose === undefined ? undefined : (
            <div
              className="mx-auto w-40 overflow-hidden rounded-xl border bg-white"
              style={{ aspectRatio: "2 / 3" }}
            >
              <img
                alt={`${activeSeries.title} 姿态 ${selectedPose}`}
                className="size-full object-contain"
                src={poseImageUrl(activeSeries.key, selectedPose)}
              />
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-muted-foreground text-xs">服装</span>
            <textarea
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-16 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-3"
              maxLength={200}
              onChange={(event) => {
                setOutfit(event.target.value);
              }}
              value={outfit}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-muted-foreground text-xs">补充要求（选填）</span>
            <textarea
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-3"
              maxLength={200}
              onChange={(event) => {
                setRequest(event.target.value);
              }}
              placeholder="例如：想要复古妆发、戴珍珠耳环、裙摆更有层次"
              value={request}
            />
          </label>
          <DialogDescription>
            将消耗 1 张额度，预计 20 秒–2
            分钟，生成时请勿刷新页面。生成后可以换背景、加贴纸，再保存到手机。
          </DialogDescription>
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1"
              onClick={() => {
                setSelectedPose(undefined);
              }}
              type="button"
              variant="outline"
            >
              再看看
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={actionDisabled}
              onClick={handleGenerate}
              type="button"
            >
              {actionLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
