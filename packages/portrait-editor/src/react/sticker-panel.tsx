import { STICKER_MAX_SIZE, STICKER_MIN_SIZE } from "../stickers.ts";
import { formatPercent } from "./format.ts";
import { RangeControl } from "./range-control.tsx";
import { useStickers } from "./stickers-context.tsx";

export function StickerPanel() {
  const { addSticker, presets, removeSticker, resetSticker, resizeSticker, selectedSticker } =
    useStickers();

  return (
    <>
      <p className="m-0 text-sm font-semibold">贴纸</p>
      <p className="text-muted-foreground mt-1 mb-0 text-[11px] leading-[1.5]">
        点选添加，拖动贴纸调整位置。
      </p>
      <div className="mt-2 flex flex-wrap">
        {presets.map((item) => (
          <button
            aria-label={`添加贴纸 ${item.label}`}
            className="mr-2 inline-flex h-12 w-12 items-center justify-center rounded-full border-0 bg-transparent p-0 transition-transform duration-150 active:scale-95 motion-reduce:transition-none"
            key={item.key}
            onClick={() => {
              addSticker(item);
            }}
            type="button"
          >
            <span className="border-border flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-[#9E2A2B] p-1">
              <img alt="" className="max-h-full max-w-full object-contain" src={item.src} />
            </span>
          </button>
        ))}
      </div>

      {selectedSticker ? (
        <>
          <RangeControl
            display={formatPercent(selectedSticker.size * 100)}
            label="贴纸大小"
            max={STICKER_MAX_SIZE * 100}
            min={STICKER_MIN_SIZE * 100}
            onChange={(value) => {
              resizeSticker(value / 100);
            }}
            value={Math.round(selectedSticker.size * 100)}
          />
          <div className="mt-1 flex min-w-0 items-center">
            <button
              className="text-muted-foreground active:text-foreground inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px]"
              onClick={resetSticker}
              type="button"
            >
              复位大小
            </button>
            <button
              className="text-destructive inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px] active:opacity-80"
              onClick={removeSticker}
              type="button"
            >
              删除贴纸
            </button>
          </div>
          <p className="text-muted-foreground mt-2 mb-0 text-[11px] leading-[1.5]">
            当前选中：{selectedSticker.label}。
          </p>
        </>
      ) : (
        <p className="text-muted-foreground mt-3 mb-0 text-[11px] leading-[1.5]">
          添加后可以拖动位置、调整大小；导出时会画进成片。
        </p>
      )}
    </>
  );
}
