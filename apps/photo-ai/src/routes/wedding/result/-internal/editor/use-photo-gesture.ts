import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";

import { PHOTO_MAX_SCALE, PHOTO_MIN_SCALE } from "./constants.ts";
import type { PhotoOffset } from "./types.ts";

interface PhotoGesture {
  offsetX: number;
  offsetY: number;
  scale: number;
  distance: number;
  x: number;
  y: number;
}

export function usePhotoGesture(
  imageUrl: string,
  stageReference: RefObject<HTMLDivElement | null>,
) {
  const photoPointers = useRef(new Map<number, { x: number; y: number }>());
  const photoGesture = useRef<PhotoGesture>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    distance: 0,
    x: 0,
    y: 0,
  });
  const [photoScale, setPhotoScale] = useState(1);
  const [photoOffset, setPhotoOffset] = useState<PhotoOffset>({ x: 0, y: 0 });

  useEffect(() => {
    setPhotoScale(1);
    setPhotoOffset({ x: 0, y: 0 });
  }, [imageUrl]);

  function resetPhoto() {
    setPhotoScale(1);
    setPhotoOffset({ x: 0, y: 0 });
  }

  function handlePhotoPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    photoPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    photoGesture.current = gestureSnapshot(photoPointers.current, photoOffset, photoScale);
  }

  function handlePhotoPointerMove(event: PointerEvent<HTMLDivElement>) {
    const pointers = photoPointers.current;
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const stage = stageReference.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const start = photoGesture.current;

    if (pointers.size === 1) {
      const pointer = pointers.get(event.pointerId);
      if (!pointer) return;
      setPhotoOffset({
        x: clamp(start.offsetX + ((pointer.x - start.x) / rect.width) * 100, -50, 50),
        y: clamp(start.offsetY + ((pointer.y - start.y) / rect.height) * 100, -50, 50),
      });
      return;
    }

    const iterator = pointers.values();
    const first = iterator.next();
    const second = iterator.next();
    if (first.done || second.done || start.distance === 0) return;
    const distance = Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y);
    setPhotoScale(
      clamp(start.scale * (distance / start.distance), PHOTO_MIN_SCALE, PHOTO_MAX_SCALE),
    );
    setPhotoOffset({
      x: clamp(
        start.offsetX + (((first.value.x + second.value.x) / 2 - start.x) / rect.width) * 100,
        -50,
        50,
      ),
      y: clamp(
        start.offsetY + (((first.value.y + second.value.y) / 2 - start.y) / rect.height) * 100,
        -50,
        50,
      ),
    });
  }

  function handlePhotoPointerUp(event: PointerEvent<HTMLDivElement>) {
    const pointers = photoPointers.current;
    pointers.delete(event.pointerId);
    if (pointers.size > 0) {
      photoGesture.current = gestureSnapshot(pointers, photoOffset, photoScale);
    }
  }

  return {
    photoScale,
    photoOffset,
    setPhotoScale,
    resetPhoto,
    handlePhotoPointerDown,
    handlePhotoPointerMove,
    handlePhotoPointerUp,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function gestureSnapshot(
  pointers: Map<number, { x: number; y: number }>,
  offset: PhotoOffset,
  scale: number,
): PhotoGesture {
  const iterator = pointers.values();
  const first = iterator.next();
  if (first.done) return { offsetX: offset.x, offsetY: offset.y, scale, distance: 0, x: 0, y: 0 };
  const second = iterator.next();
  if (second.done) {
    return {
      offsetX: offset.x,
      offsetY: offset.y,
      scale,
      distance: 0,
      x: first.value.x,
      y: first.value.y,
    };
  }
  return {
    offsetX: offset.x,
    offsetY: offset.y,
    scale,
    distance: Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y),
    x: (first.value.x + second.value.x) / 2,
    y: (first.value.y + second.value.y) / 2,
  };
}
