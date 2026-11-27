import { createContext, useContext, useRef, useState, type ReactNode } from "react";

import type { Sticker, StickerPreset } from "../stickers.ts";

interface StickerContextValue {
  presets: readonly StickerPreset[];
  stickers: Sticker[];
  selectedSticker: Sticker | undefined;
  addSticker: (preset: StickerPreset) => void;
  selectSticker: (id: number | undefined) => void;
  moveSticker: (id: number, x: number, y: number) => void;
  resizeSticker: (size: number) => void;
  resetSticker: () => void;
  removeSticker: () => void;
}

interface StickerProviderProperties {
  presets: readonly StickerPreset[];
  children: ReactNode;
}

const StickerContext = createContext<StickerContextValue | undefined>(undefined);

export function StickerProvider({ presets, children }: StickerProviderProperties) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<number>();
  const nextStickerIdReference = useRef(1);
  const selectedSticker = stickers.find((sticker) => sticker.id === selectedStickerId);

  function addSticker(preset: StickerPreset) {
    // 错开位置，避免连续添加时叠在一起选不中
    const offset = (stickers.length % 3) * 8;
    const sticker: Sticker = {
      id: nextStickerIdReference.current++,
      src: preset.src,
      label: preset.label,
      x: 50 + offset,
      y: 45 + offset,
      size: preset.width,
      initialSize: preset.width,
    };
    setStickers((current) => [...current, sticker]);
    setSelectedStickerId(sticker.id);
  }

  function resizeSticker(size: number) {
    setStickers((current) =>
      current.map((sticker) => (sticker.id === selectedStickerId ? { ...sticker, size } : sticker)),
    );
  }

  function moveSticker(id: number, x: number, y: number) {
    setStickers((current) =>
      current.map((sticker) => (sticker.id === id ? { ...sticker, x, y } : sticker)),
    );
  }

  function resetSticker() {
    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === selectedStickerId ? { ...sticker, size: sticker.initialSize } : sticker,
      ),
    );
  }

  function removeSticker() {
    setStickers((current) => current.filter((sticker) => sticker.id !== selectedStickerId));
    setSelectedStickerId(undefined);
  }

  return (
    <StickerContext.Provider
      value={{
        presets,
        stickers,
        selectedSticker,
        addSticker,
        selectSticker: setSelectedStickerId,
        moveSticker,
        resizeSticker,
        resetSticker,
        removeSticker,
      }}
    >
      {children}
    </StickerContext.Provider>
  );
}

export function useStickers() {
  const value = useContext(StickerContext);
  if (!value) throw new Error("缺少 StickerProvider");
  return value;
}
