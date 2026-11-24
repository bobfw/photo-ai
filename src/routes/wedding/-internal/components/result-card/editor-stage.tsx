import { useEffect, useRef, type PointerEvent, type ReactNode, type RefObject } from "react";

import { cn } from "#lib/utils";

import { RetryImage } from "../retry-image.tsx";
import { CHECKERBOARD, STUDIO_LIGHT_PREVIEW_WIDTH } from "./constants.ts";
import { paintStudioLight } from "./studio-light.ts";
import type { PhotoOffset, Sticker } from "./types.ts";

interface EditorStageProperties {
  background: string;
  backgroundImage: string;
  imageUrl: string;
  isStudioLightVisible: boolean;
  lightIntensity: number;
  onPhotoPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPhotoPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPhotoPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onStickerPointerDown: (event: PointerEvent<HTMLButtonElement>, id: number) => void;
  photoOffset: PhotoOffset;
  photoScale: number;
  selectedStickerId: number | undefined;
  stageRatio: number;
  stageReference: RefObject<HTMLDivElement | null>;
  stickers: Sticker[];
}

export function EditorStage({
  background,
  backgroundImage,
  imageUrl,
  isStudioLightVisible,
  lightIntensity,
  onPhotoPointerDown,
  onPhotoPointerMove,
  onPhotoPointerUp,
  onStickerPointerDown,
  photoOffset,
  photoScale,
  selectedStickerId,
  stageRatio,
  stageReference,
  stickers,
}: EditorStageProperties) {
  const lightCanvasReference = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = lightCanvasReference.current;
    if (!canvas || !isStudioLightVisible) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = STUDIO_LIGHT_PREVIEW_WIDTH;
    canvas.height = Math.round(STUDIO_LIGHT_PREVIEW_WIDTH / stageRatio);
    paintStudioLight(context, canvas.width, canvas.height, background, lightIntensity);
  }, [background, isStudioLightVisible, lightIntensity, stageRatio]);

  let backgroundLayer: ReactNode;
  if (backgroundImage !== "") {
    backgroundLayer = (
      <img
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover"
        src={backgroundImage}
      />
    );
  } else if (background === "transparent") {
    backgroundLayer = (
      <div aria-hidden className="pointer-events-none absolute inset-0" style={CHECKERBOARD} />
    );
  } else if (isStudioLightVisible) {
    backgroundLayer = (
      <canvas
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        height={Math.round(STUDIO_LIGHT_PREVIEW_WIDTH / stageRatio)}
        ref={lightCanvasReference}
        width={STUDIO_LIGHT_PREVIEW_WIDTH}
      />
    );
  }

  return (
    <div
      className="relative mx-auto w-full max-w-72 touch-none overflow-hidden rounded-xl border select-none"
      data-base-ui-swipe-ignore=""
      onPointerCancel={onPhotoPointerUp}
      onPointerDown={onPhotoPointerDown}
      onPointerMove={onPhotoPointerMove}
      onPointerUp={onPhotoPointerUp}
      ref={stageReference}
      style={{
        aspectRatio: stageRatio,
        containerType: "inline-size",
        backgroundColor:
          backgroundImage === "" && background !== "transparent" ? background : undefined,
      }}
    >
      {backgroundLayer}
      <RetryImage
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-contain"
        crossOrigin="anonymous"
        draggable={false}
        src={imageUrl}
        style={{
          transform: `translate(${photoOffset.x}%, ${photoOffset.y}%) scale(${photoScale})`,
          transformOrigin: "center",
        }}
      />
      {stickers.map((sticker) => (
        <button
          aria-label={`贴纸 ${sticker.label}`}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab bg-transparent p-0 active:cursor-grabbing",
            sticker.id === selectedStickerId &&
              "rounded-md outline-2 outline-dashed outline-primary",
          )}
          key={sticker.id}
          onPointerDown={(event) => {
            onStickerPointerDown(event, sticker.id);
          }}
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.size * 100}%`,
            touchAction: "none",
          }}
          type="button"
        >
          <img
            alt=""
            className="block h-auto w-full"
            crossOrigin="anonymous"
            draggable={false}
            src={sticker.src}
          />
        </button>
      ))}
    </div>
  );
}
