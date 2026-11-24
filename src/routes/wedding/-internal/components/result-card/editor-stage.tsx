import { useEffect, useRef, type PointerEvent, type ReactNode, type RefObject } from "react";

import { cn } from "#lib/utils";

import { RetryImage } from "../retry-image.tsx";
import { CHECKERBOARD, STUDIO_LIGHT_PREVIEW_WIDTH } from "./constants.ts";
import { paintContactShadow, type PersonFootprint } from "./contact-shadow.ts";
import { paintPaperGrain, paintPaperTexture } from "./paper-texture.ts";
import { paintStudioLight } from "./studio-light.ts";
import type { PhotoOffset, Sticker } from "./types.ts";

interface EditorStageProperties {
  background: string;
  backgroundImage: string;
  dofIntensity: number;
  footprint: PersonFootprint | undefined;
  grainIntensity: number;
  imageUrl: string;
  isContactShadowVisible: boolean;
  isStudioBackdropVisible: boolean;
  lightIntensity: number;
  onPhotoPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPhotoPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPhotoPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onStickerPointerDown: (event: PointerEvent<HTMLButtonElement>, id: number) => void;
  photoOffset: PhotoOffset;
  photoScale: number;
  selectedStickerId: number | undefined;
  shadowIntensity: number;
  stageRatio: number;
  stageReference: RefObject<HTMLDivElement | null>;
  stickers: Sticker[];
  textureIntensity: number;
}

export function EditorStage({
  background,
  backgroundImage,
  dofIntensity,
  footprint,
  grainIntensity,
  imageUrl,
  isContactShadowVisible,
  isStudioBackdropVisible,
  lightIntensity,
  onPhotoPointerDown,
  onPhotoPointerMove,
  onPhotoPointerUp,
  onStickerPointerDown,
  photoOffset,
  photoScale,
  selectedStickerId,
  shadowIntensity,
  stageRatio,
  stageReference,
  stickers,
  textureIntensity,
}: EditorStageProperties) {
  const backdropCanvasReference = useRef<HTMLCanvasElement>(null);
  const shadowCanvasReference = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = backdropCanvasReference.current;
    if (!canvas || !isStudioBackdropVisible) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = STUDIO_LIGHT_PREVIEW_WIDTH;
    canvas.height = Math.round(STUDIO_LIGHT_PREVIEW_WIDTH / stageRatio);
    paintStudioLight(context, canvas.width, canvas.height, background, lightIntensity);
    paintPaperTexture(context, canvas.width, canvas.height, textureIntensity);
    paintPaperGrain(context, canvas.width, canvas.height, grainIntensity);
  }, [
    background,
    grainIntensity,
    isStudioBackdropVisible,
    lightIntensity,
    stageRatio,
    textureIntensity,
  ]);

  useEffect(() => {
    const canvas = shadowCanvasReference.current;
    if (!canvas || !isContactShadowVisible || !footprint) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const width = STUDIO_LIGHT_PREVIEW_WIDTH;
    const height = Math.round(width / stageRatio);
    if (canvas.width !== width || canvas.height !== height) {
      // 改尺寸会清空 canvas；拖动照片时尺寸不变，只清屏，避免每帧重建缓冲区。
      canvas.width = width;
      canvas.height = height;
    } else {
      context.clearRect(0, 0, width, height);
    }
    paintContactShadow(context, width, height, footprint, photoScale, photoOffset, shadowIntensity);
  }, [footprint, isContactShadowVisible, photoOffset, photoScale, shadowIntensity, stageRatio]);

  let backgroundLayer: ReactNode;
  if (backgroundImage !== "") {
    backgroundLayer = (
      <img
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover"
        src={backgroundImage}
        style={
          dofIntensity > 0
            ? {
                filter: `blur(${dofIntensity * 2.5}cqw)`,
                transform: `scale(${1 + dofIntensity * 0.06})`,
              }
            : undefined
        }
      />
    );
  } else if (background === "transparent") {
    backgroundLayer = (
      <div aria-hidden className="pointer-events-none absolute inset-0" style={CHECKERBOARD} />
    );
  } else if (isStudioBackdropVisible) {
    backgroundLayer = (
      <canvas
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        height={Math.round(STUDIO_LIGHT_PREVIEW_WIDTH / stageRatio)}
        ref={backdropCanvasReference}
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
      {isContactShadowVisible ? (
        <canvas
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
          height={Math.round(STUDIO_LIGHT_PREVIEW_WIDTH / stageRatio)}
          ref={shadowCanvasReference}
          width={STUDIO_LIGHT_PREVIEW_WIDTH}
        />
      ) : undefined}
      <RetryImage
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-contain"
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
