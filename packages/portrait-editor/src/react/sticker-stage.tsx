/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

import type { PointerEvent as ReactPointerEvent } from "react";

import type { Sticker } from "../stickers.ts";
import { useStickers } from "./stickers-context.tsx";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function StickerStage() {
  const { moveSticker, selectSticker, selectedSticker, stickers } = useStickers();

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, sticker: Sticker) {
    event.preventDefault();
    event.stopPropagation();
    selectSticker(sticker.id);

    const overlay = event.currentTarget.parentElement;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    function move(moveEvent: PointerEvent) {
      moveSticker(
        sticker.id,
        clamp(((moveEvent.clientX - rect.left) / rect.width) * 100, 4, 96),
        clamp(((moveEvent.clientY - rect.top) / rect.height) * 100, 4, 96),
      );
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  return (
    <div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0">
      {stickers.map((sticker) => (
        <button
          aria-label={`贴纸 ${sticker.label}`}
          className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-md border-0 bg-transparent p-0 before:absolute before:-top-4 before:-right-4 before:-bottom-4 before:-left-4 before:content-[''] active:cursor-grabbing ${
            sticker.id === selectedSticker?.id ? "outline-primary outline-2 outline-dashed" : ""
          }`}
          key={sticker.id}
          onPointerDown={(event) => {
            handlePointerDown(event, sticker);
          }}
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.size * 100}%`,
          }}
          type="button"
        >
          <img
            alt=""
            className="block h-auto w-full select-none"
            crossOrigin="anonymous"
            draggable={false}
            src={sticker.src}
          />
        </button>
      ))}
    </div>
  );
}
