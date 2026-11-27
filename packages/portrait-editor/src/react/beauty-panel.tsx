import { DEFAULT_ADJUSTMENTS } from "../beauty.ts";
import { usePortraitEditor } from "./editor-context.tsx";
import { formatPercent, formatSigned } from "./format.ts";
import { RangeControl } from "./range-control.tsx";

export function BeautyPanel() {
  const { state, updateAdjustments } = usePortraitEditor();
  const adjustments = state.adjustments;

  return (
    <>
      <RangeControl
        display={formatPercent(adjustments.smooth * 100)}
        label="磨皮"
        max={100}
        min={0}
        onChange={(value) => {
          updateAdjustments({ smooth: value / 100 });
        }}
        value={Math.round(adjustments.smooth * 100)}
      />
      <RangeControl
        display={formatPercent(adjustments.whiten * 100)}
        label="美白"
        max={100}
        min={0}
        onChange={(value) => {
          updateAdjustments({ whiten: value / 100 });
        }}
        value={Math.round(adjustments.whiten * 100)}
      />
      <RangeControl
        display={formatSigned(adjustments.brightness * 50)}
        label="亮度"
        max={50}
        min={-50}
        onChange={(value) => {
          updateAdjustments({ brightness: value / 50 });
        }}
        value={Math.round(adjustments.brightness * 50)}
      />
      <RangeControl
        display={formatSigned(adjustments.saturation * 50)}
        label="饱和度"
        max={50}
        min={-50}
        onChange={(value) => {
          updateAdjustments({ saturation: value / 50 });
        }}
        value={Math.round(adjustments.saturation * 50)}
      />
      <RangeControl
        display={formatSigned(adjustments.warmth * 50)}
        label="色温"
        max={50}
        min={-50}
        onChange={(value) => {
          updateAdjustments({ warmth: value / 50 });
        }}
        value={Math.round(adjustments.warmth * 50)}
      />
      <div className="flex min-w-0 items-center">
        <button
          className="text-muted-foreground active:text-foreground inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px]"
          onClick={() => {
            updateAdjustments(DEFAULT_ADJUSTMENTS);
          }}
          type="button"
        >
          重置美颜
        </button>
      </div>
      <p className="text-muted-foreground mt-3.5 mb-0 text-[11px] leading-[1.6]">
        磨皮只作用于肤色区域，保留五官细节。
      </p>
    </>
  );
}
