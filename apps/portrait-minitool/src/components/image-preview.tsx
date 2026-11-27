import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { CHECKERBOARD } from "../checkerboard.ts";

interface ImagePreviewProperties {
  isTransparent: boolean;
  onClose: () => void;
  src: string;
}

interface Point {
  x: number;
  y: number;
}

interface View {
  scale: number;
  x: number;
  y: number;
}

interface Gesture {
  scale: number;
  x: number;
  y: number;
  distance: number;
  midX: number;
  midY: number;
}

const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_TOLERANCE = 8;

export function ImagePreview({ isTransparent, onClose, src }: ImagePreviewProperties) {
  const closeReference = useRef<HTMLButtonElement>(null);
  const imageReference = useRef<HTMLImageElement>(null);
  const pointersReference = useRef<Map<number, Point>>(new Map());
  const viewReference = useRef<View>({ scale: 1, x: 0, y: 0 });
  const gestureReference = useRef<Gesture>({
    scale: 1,
    x: 0,
    y: 0,
    distance: 0,
    midX: 0,
    midY: 0,
  });
  const tapReference = useRef({ time: 0, x: 0, y: 0, moved: false });
  const lastTapReference = useRef(0);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const onCloseReference = useRef(onClose);

  useEffect(() => {
    onCloseReference.current = onClose;
  });

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeReference.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseReference.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  function applyView(next: View) {
    viewReference.current = next;
    setView(next);
  }

  function clampView(next: View) {
    const image = imageReference.current;
    if (!image) return next;
    const maxX = ((next.scale - 1) * image.offsetWidth) / 2;
    const maxY = ((next.scale - 1) * image.offsetHeight) / 2;
    return {
      scale: next.scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function snapshotGesture() {
    const iterator = pointersReference.current.values();
    const first = iterator.next();
    const second = iterator.next();
    const current = viewReference.current;

    if (first.done) {
      gestureReference.current = {
        scale: current.scale,
        x: current.x,
        y: current.y,
        distance: 0,
        midX: 0,
        midY: 0,
      };
      return;
    }

    if (second.done) {
      gestureReference.current = {
        scale: current.scale,
        x: current.x,
        y: current.y,
        distance: 0,
        midX: first.value.x,
        midY: first.value.y,
      };
      return;
    }

    gestureReference.current = {
      scale: current.scale,
      x: current.x,
      y: current.y,
      distance: Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y),
      midX: (first.value.x + second.value.x) / 2,
      midY: (first.value.y + second.value.y) / 2,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLImageElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersReference.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersReference.current.size > 1) {
      tapReference.current.moved = true;
    } else {
      tapReference.current = { time: Date.now(), x: event.clientX, y: event.clientY, moved: false };
    }
    snapshotGesture();
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLImageElement>) {
    if (!pointersReference.current.has(event.pointerId)) return;
    pointersReference.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const tap = tapReference.current;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_MOVE_TOLERANCE) {
      tap.moved = true;
    }

    const gesture = gestureReference.current;
    if (pointersReference.current.size === 1) {
      if (viewReference.current.scale <= 1) return;
      const point = pointersReference.current.get(event.pointerId);
      if (!point) return;
      applyView(
        clampView({
          scale: gesture.scale,
          x: gesture.x + point.x - gesture.midX,
          y: gesture.y + point.y - gesture.midY,
        }),
      );
      return;
    }

    const iterator = pointersReference.current.values();
    const first = iterator.next();
    const second = iterator.next();
    if (first.done || second.done || gesture.distance === 0) return;
    const distance = Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y);
    const scale = Math.min(MAX_SCALE, Math.max(1, gesture.scale * (distance / gesture.distance)));
    const midX = (first.value.x + second.value.x) / 2;
    const midY = (first.value.y + second.value.y) / 2;
    applyView(
      clampView({
        scale,
        x: gesture.x + midX - gesture.midX,
        y: gesture.y + midY - gesture.midY,
      }),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLImageElement>) {
    pointersReference.current.delete(event.pointerId);
    if (pointersReference.current.size > 0) {
      snapshotGesture();
      return;
    }

    const tap = tapReference.current;
    if (!tap.moved && Date.now() - tap.time < 250) {
      const now = Date.now();
      if (now - lastTapReference.current < DOUBLE_TAP_MS) {
        lastTapReference.current = 0;
        applyView({ scale: viewReference.current.scale > 1 ? 1 : 2.5, x: 0, y: 0 });
      } else {
        lastTapReference.current = now;
      }
    }
    if (viewReference.current.scale === 1) applyView({ scale: 1, x: 0, y: 0 });
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLImageElement>) {
    pointersReference.current.clear();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (viewReference.current.scale === 1) applyView({ scale: 1, x: 0, y: 0 });
  }

  return (
    <div
      aria-label="成片预览"
      aria-modal="true"
      className="fixed bottom-0 left-0 right-0 top-0 z-[200] flex touch-none items-center justify-center overflow-hidden bg-[rgba(0,0,0,0.94)] px-4 pb-[calc(16px_+_var(--safe-bottom))] pt-[calc(56px_+_var(--safe-top))]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseReference.current();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        event.preventDefault();
        closeReference.current?.focus();
      }}
      role="dialog"
    >
      <img
        alt="成片预览"
        className="block max-h-full max-w-full touch-none select-none object-contain"
        draggable={false}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={imageReference}
        src={src}
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          transformOrigin: "center",
          ...(isTransparent && CHECKERBOARD),
        }}
      />
      <p className="pointer-events-none absolute bottom-[calc(16px_+_var(--safe-bottom))] left-1/2 -translate-x-1/2 text-xs text-white/70">
        双指缩放 · 双击放大
      </p>
      <button
        aria-label="关闭预览"
        className="absolute left-3 top-[calc(12px_+_var(--safe-top))] flex h-11 w-11 items-center justify-center rounded-full border-0 bg-[rgba(255,255,255,0.16)] text-white"
        onClick={() => {
          onCloseReference.current();
        }}
        ref={closeReference}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>
    </div>
  );
}
