import { Briefcase, Camera, Shirt, User } from "lucide-react";
import { useState } from "react";

import { portraitLooks } from "#agents/portrait/prompts";
import { cn } from "#lib/utils";
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

import { PORTRAIT_COMPOSITIONS, PORTRAIT_POSES } from "../services/styles.ts";

export interface StyleChoice {
  style: string;
  pose: string;
  composition: string;
  request: string;
}

interface StylePickerProperties {
  actionDisabled: boolean;
  triggerDisabled: boolean;
  triggerHint: string;
  triggerLabel: string;
  onGenerate: (choice: StyleChoice) => void;
}

const STYLE_ICONS = {
  "business-formal": Briefcase,
  "business-casual": Shirt,
  "white-shirt": User,
  editorial: Camera,
} as const;

export function StylePicker({
  actionDisabled,
  triggerDisabled,
  triggerHint,
  triggerLabel,
  onGenerate,
}: StylePickerProperties) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [poseKey, setPoseKey] = useState<string>(PORTRAIT_POSES[0].key);
  const [compositionKey, setCompositionKey] = useState<string>(PORTRAIT_COMPOSITIONS[0].key);
  const [request, setRequest] = useState("");
  const [pendingChoice, setPendingChoice] = useState<StyleChoice>();

  function openConfirm() {
    if (!selectedKey) return;
    setPendingChoice({
      style: selectedKey,
      pose: poseKey,
      composition: compositionKey,
      request: request.trim(),
    });
  }

  function confirmGenerate() {
    if (!pendingChoice) return;
    const choice = pendingChoice;
    setPendingChoice(undefined);
    setSelectedKey(undefined);
    setRequest("");
    setIsOpen(false);
    onGenerate(choice);
  }

  const styleTitle = portraitLooks.find((style) => style.key === pendingChoice?.style)?.title;
  const poseTitle = PORTRAIT_POSES.find((pose) => pose.key === pendingChoice?.pose)?.title;
  const compositionTitle = PORTRAIT_COMPOSITIONS.find(
    (composition) => composition.key === pendingChoice?.composition,
  )?.title;

  return (
    <>
      <Drawer onOpenChange={setIsOpen} open={isOpen} showSwipeHandle swipeDirection="down">
        <DrawerTrigger
          render={
            <button
              className="bg-card ease-out-strong disabled:hover:bg-card flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-sm transition duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              disabled={triggerDisabled}
              type="button"
            />
          }
        >
          <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
            <Camera className="size-5" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{triggerLabel}</span>
            <span className="text-muted-foreground mt-0.5 block text-[13px] leading-5">
              {triggerHint}
            </span>
          </span>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-lg font-bold">定制形象照</DrawerTitle>
            <DrawerDescription>选风格、姿势和构图，生成后还能换背景</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">风格</p>
              <div className="grid grid-cols-2 gap-2.5">
                {portraitLooks.map((style) => {
                  const Icon = STYLE_ICONS[style.key];
                  const isSelected = style.key === selectedKey;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={cn(
                        "ease-out-strong border-border bg-card flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition duration-150 active:scale-[0.98]",
                        isSelected && "border-primary ring-primary/20 ring-2",
                      )}
                      key={style.key}
                      onClick={() => {
                        setSelectedKey(style.key);
                      }}
                      type="button"
                    >
                      <span className="bg-primary/10 text-primary inline-flex size-9 items-center justify-center rounded-full">
                        <Icon className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="text-sm font-semibold">{style.title}</span>
                      <span className="text-muted-foreground text-xs leading-4">
                        {style.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <OptionGroup
              onChange={setPoseKey}
              options={PORTRAIT_POSES}
              title="姿势"
              value={poseKey}
            />
            <OptionGroup
              onChange={setCompositionKey}
              options={PORTRAIT_COMPOSITIONS}
              title="构图"
              value={compositionKey}
            />
            <label className="block space-y-1.5">
              <span className="text-muted-foreground text-xs">补充要求（选填）</span>
              <textarea
                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-3"
                maxLength={200}
                onChange={(event) => {
                  setRequest(event.target.value);
                }}
                placeholder="例如：戴眼镜、笑容再自然一点、不要修得太年轻"
                value={request}
              />
            </label>
          </div>
          <DrawerFooter className="border-border/70 border-t">
            <p className="text-muted-foreground mb-1 text-center text-xs leading-5">
              将消耗 1 张额度，预计 20 秒–2 分钟；刷新后可自动继续。
            </p>
            <div className="flex gap-2">
              <DrawerClose
                render={<Button className="h-11 flex-1" type="button" variant="outline" />}
              >
                取消
              </DrawerClose>
              <Button
                className="h-11 flex-1"
                disabled={actionDisabled || selectedKey === undefined}
                onClick={openConfirm}
                type="button"
              >
                {actionDisabled ? "照片额度已用完" : "生成形象照"}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setPendingChoice(undefined);
        }}
        open={pendingChoice !== undefined}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogTitle>确认生成形象照？</DialogTitle>
          <DialogDescription>
            将消耗 1 张额度，预计 20 秒–2 分钟。刷新后可自动继续，生成后可以换背景、调比例。
          </DialogDescription>
          <div className="bg-muted space-y-1.5 rounded-xl p-3 text-sm">
            <p>
              <span className="text-muted-foreground">风格：</span>
              {styleTitle}
            </p>
            <p>
              <span className="text-muted-foreground">姿势：</span>
              {poseTitle}
            </p>
            <p>
              <span className="text-muted-foreground">构图：</span>
              {compositionTitle}
            </p>
            {pendingChoice?.request ? (
              <p className="break-words">
                <span className="text-muted-foreground">补充要求：</span>
                {pendingChoice.request}
              </p>
            ) : undefined}
          </div>
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1"
              onClick={() => {
                setPendingChoice(undefined);
              }}
              type="button"
              variant="outline"
            >
              再看看
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={actionDisabled}
              onClick={confirmGenerate}
              type="button"
            >
              {actionDisabled ? "照片额度已用完" : "确认生成"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PortraitOption {
  key: string;
  title: string;
  description: string;
}

interface OptionGroupProperties {
  title: string;
  options: readonly PortraitOption[];
  value: string;
  onChange: (key: string) => void;
}

function OptionGroup({ title, options, value, onChange }: OptionGroupProperties) {
  const selected = options.find((option) => option.key === value);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex gap-2">
        {options.map((option) => {
          const isSelected = option.key === value;
          return (
            <button
              aria-pressed={isSelected}
              className={cn(
                "border-border bg-background ease-out-strong h-11 flex-1 rounded-full border px-2 text-sm font-medium transition duration-150 active:scale-[0.97]",
                isSelected && "border-primary bg-primary/10 text-primary font-semibold",
              )}
              key={option.key}
              onClick={() => {
                onChange(option.key);
              }}
              type="button"
            >
              {option.title}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs leading-4">{selected?.description}</p>
    </div>
  );
}
