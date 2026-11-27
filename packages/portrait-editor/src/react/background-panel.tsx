import { useEffect, useRef, type ChangeEvent } from "react";

import { loadImageElement } from "../pipeline.ts";
import { useBackgroundOptions } from "./background-options.tsx";
import { BACKGROUNDS } from "./backgrounds.ts";
import { usePortraitEditor } from "./editor-context.tsx";
import { formatPercent } from "./format.ts";
import { RangeControl } from "./range-control.tsx";

export function BackgroundPanel() {
  const { state, update, resetComposition, reportError } = usePortraitEditor();
  const { ratios, hasAlpha, checkerboard } = useBackgroundOptions();
  const backgroundInputReference = useRef<HTMLInputElement>(null);
  const backgroundObjectUrlReference = useRef("");
  const hasBackground = state.backgroundImage !== undefined || state.background !== "transparent";
  const isSolid = state.backgroundImage === undefined && state.background !== "transparent";
  const isTransparent = state.backgroundImage === undefined && state.background === "transparent";
  const colorPresets = BACKGROUNDS.filter((preset) => preset.value !== "transparent");
  const transparentPreset = BACKGROUNDS.find((preset) => preset.value === "transparent");
  const activeRatio = ratios.find((item) => Math.abs(state.ratio - item.value) < 0.001);

  useEffect(() => {
    return () => {
      if (backgroundObjectUrlReference.current) {
        URL.revokeObjectURL(backgroundObjectUrlReference.current);
      }
    };
  }, []);

  async function handleBackgroundFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      reportError(new Error("请选择图片文件"));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImageElement(objectUrl);
      if (backgroundObjectUrlReference.current) {
        URL.revokeObjectURL(backgroundObjectUrlReference.current);
      }
      backgroundObjectUrlReference.current = objectUrl;
      update({ backgroundImage: image });
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      reportError(error);
    }
  }

  function handleBackgroundInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleBackgroundFile(file);
  }

  function clearBackgroundImage() {
    if (backgroundObjectUrlReference.current) {
      URL.revokeObjectURL(backgroundObjectUrlReference.current);
      backgroundObjectUrlReference.current = "";
    }
    update({ backgroundImage: undefined });
  }

  function handleBackground(color: string) {
    if (backgroundObjectUrlReference.current) {
      URL.revokeObjectURL(backgroundObjectUrlReference.current);
      backgroundObjectUrlReference.current = "";
    }
    update({ background: color, backgroundImage: undefined });
  }

  return (
    <>
      <p className="m-0 text-sm font-semibold">背景颜色</p>
      <p className="text-muted-foreground mt-1 mb-0 text-[11px] leading-[1.5]">
        只对透明底人像生效，背景会填在人像的镂空处。
      </p>
      {hasAlpha ? undefined : (
        <p className="text-destructive mt-2 mb-0 text-[11px] leading-[1.5]">
          这张图没有透明区域，背景不会透出；换一张透明底照片才能看到背景。
        </p>
      )}
      <div className="-mx-1 mt-1 flex overflow-x-auto py-1 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {colorPresets.map((preset) => {
          const isActive = state.backgroundImage === undefined && state.background === preset.value;
          return (
            <button
              aria-label={`背景：${preset.label}`}
              aria-pressed={isActive}
              className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border-0 bg-transparent p-0"
              key={preset.value}
              onClick={() => {
                handleBackground(preset.value);
              }}
              type="button"
            >
              <span
                className={`border-border h-[26px] w-[26px] rounded-full border ${
                  isActive ? "outline-primary outline outline-2 outline-offset-2" : ""
                }`}
                style={{ backgroundColor: preset.value }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex min-w-0 items-center justify-between">
        <div className="flex min-w-0 items-center">
          <label
            className="text-muted-foreground inline-flex min-h-11 items-center text-xs"
            htmlFor="custom-color"
          >
            <span className="flex h-11 w-11 items-center justify-center">
              <input
                aria-label="自定义背景颜色"
                className="border-border m-0 h-[30px] w-[30px] rounded-full border bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0.5"
                id="custom-color"
                onChange={(event) => {
                  handleBackground(event.target.value);
                }}
                type="color"
                value={state.background === "transparent" ? "#f4ede2" : state.background}
              />
            </span>
            <span className="ml-2">自定义</span>
          </label>
          {transparentPreset ? (
            <button
              aria-label={`背景：${transparentPreset.label}`}
              aria-pressed={isTransparent}
              className={`ml-1 inline-flex min-h-11 shrink-0 items-center rounded-full bg-transparent px-1 text-xs ${
                isTransparent ? "text-foreground" : "text-muted-foreground active:text-foreground"
              }`}
              onClick={() => {
                handleBackground("transparent");
              }}
              type="button"
            >
              <span
                className={`border-border h-[26px] w-[26px] rounded-full border ${
                  isTransparent ? "outline-primary outline outline-2 outline-offset-2" : ""
                }`}
                style={checkerboard}
              />
              <span className="ml-1.5">{transparentPreset.label}</span>
            </button>
          ) : undefined}
        </div>
        {state.backgroundImage ? (
          <div className="flex min-w-0 items-center">
            <button
              aria-label="更换背景图"
              className="border-border bg-muted ml-2 h-11 w-11 shrink-0 rounded-lg border bg-cover bg-center"
              onClick={() => backgroundInputReference.current?.click()}
              style={{ backgroundImage: `url("${state.backgroundImage.src}")` }}
              type="button"
            />
            <button
              className="text-muted-foreground active:text-foreground inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px]"
              onClick={clearBackgroundImage}
              type="button"
            >
              移除
            </button>
          </div>
        ) : (
          <label
            className="bg-muted text-foreground inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-medium transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none"
            htmlFor="background-input"
          >
            上传背景图
          </label>
        )}
      </div>

      <RangeControl
        disabled={!isSolid}
        display={formatPercent(state.light * 100)}
        label="光影"
        max={100}
        min={0}
        onChange={(value) => {
          update({ light: value / 100 });
        }}
        value={Math.round(state.light * 100)}
      />
      <RangeControl
        disabled={!isSolid}
        display={formatPercent(state.grain * 100)}
        label="颗粒"
        max={100}
        min={0}
        onChange={(value) => {
          update({ grain: value / 100 });
        }}
        value={Math.round(state.grain * 100)}
      />
      <RangeControl
        disabled={!isSolid}
        display={formatPercent(state.texture * 100)}
        label="纹理"
        max={100}
        min={0}
        onChange={(value) => {
          update({ texture: value / 100 });
        }}
        value={Math.round(state.texture * 100)}
      />
      <RangeControl
        disabled={!hasBackground}
        display={formatPercent(state.shadow * 100)}
        label="投影"
        max={100}
        min={0}
        onChange={(value) => {
          update({ shadow: value / 100 });
        }}
        value={Math.round(state.shadow * 100)}
      />
      {state.backgroundImage ? (
        <RangeControl
          display={formatPercent(state.dof * 100)}
          label="景深"
          max={100}
          min={0}
          onChange={(value) => {
            update({ dof: value / 100 });
          }}
          value={Math.round(state.dof * 100)}
        />
      ) : undefined}
      <RangeControl
        display={formatPercent(state.scale * 100)}
        label="人像大小"
        max={300}
        min={50}
        onChange={(value) => {
          update({ scale: value / 100 });
        }}
        value={Math.round(state.scale * 100)}
      />
      <div className="flex min-w-0 items-center">
        <button
          className="text-muted-foreground active:text-foreground inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px]"
          onClick={resetComposition}
          type="button"
        >
          复位构图
        </button>
      </div>

      <p className="m-0 text-sm font-semibold">画面比例</p>
      <div className="before:bg-muted relative mt-2 flex space-x-1.5 before:absolute before:top-1/2 before:right-0 before:left-0 before:h-8 before:-translate-y-1/2 before:rounded-full before:content-['']">
        {ratios.map((item) => {
          const isActive = Math.abs(state.ratio - item.value) < 0.001;
          return (
            <button
              aria-pressed={isActive}
              className={`relative z-0 flex h-11 flex-1 items-center justify-center rounded-full border-0 bg-transparent p-0 text-xs transition-colors before:absolute before:top-1/2 before:right-0.5 before:left-0.5 before:-z-10 before:h-8 before:-translate-y-1/2 before:rounded-full before:content-[''] active:scale-[0.98] motion-reduce:transition-none ${
                isActive
                  ? "text-primary-foreground before:bg-primary font-semibold"
                  : "text-muted-foreground font-medium"
              }`}
              key={item.label}
              onClick={() => {
                update({ ratio: item.value });
              }}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeRatio?.hint ? (
        <p className="text-muted-foreground mt-2 mb-0 text-[11px] leading-[1.5]">
          {activeRatio.hint}
        </p>
      ) : undefined}
      <p className="text-muted-foreground mt-3.5 mb-0 text-[11px] leading-[1.6]">
        用「人像大小」缩小人像能露出更多背景；光影/颗粒/纹理仅纯色背景，景深仅背景图；投影让脚下更落地。
      </p>

      <input
        accept="image/*"
        className="sr-only"
        id="background-input"
        onChange={handleBackgroundInput}
        ref={backgroundInputReference}
        type="file"
      />
    </>
  );
}
