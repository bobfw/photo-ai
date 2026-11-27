/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

import { drawComposition, type EditorState } from "../editor.ts";

interface GestureSnapshot {
  scale: number;
  offsetX: number;
  offsetY: number;
  distance: number;
  x: number;
  y: number;
}

interface Point {
  x: number;
  y: number;
}

interface EditorStageProperties {
  stateRef: { current: EditorState };
  preview: HTMLCanvasElement | undefined;
  ratio: number;
  background: string;
  backgroundImage: HTMLImageElement | undefined;
  light: number;
  grain: number;
  texture: number;
  scale: number;
  redrawKey: number;
  busy: boolean;
  busyText: string;
  canCompose: boolean;
  onCompositionCommit: () => void;
}

export function EditorStage({
  stateRef,
  preview,
  ratio,
  background,
  backgroundImage,
  light,
  grain,
  texture,
  scale,
  redrawKey,
  busy,
  busyText,
  canCompose,
  onCompositionCommit,
}: EditorStageProperties) {
  const stageReference = useRef<HTMLDivElement>(null);
  const canvasReference = useRef<HTMLCanvasElement>(null);
  const drawReference = useRef<() => void>(() => {
    // effect 挂载后替换为实际绘制函数。
  });
  const renderFrameReference = useRef(0);
  const pointersReference = useRef<Map<number, Point>>(new Map());
  const gestureReference = useRef<GestureSnapshot>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    distance: 0,
    x: 0,
    y: 0,
  });

  function fitStage() {
    const stageElement = stageReference.current;
    const canvas = canvasReference.current;
    if (!stageElement || !canvas) return;

    const maxWidth = Math.min(window.innerWidth - 32, 420);
    const maxHeight = Math.max(220, window.innerHeight * 0.48);
    let width = maxWidth;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const internalWidth = Math.max(1, Math.round(width * dpr));
    const internalHeight = Math.max(1, Math.round(internalWidth / ratio));
    if (canvas.width === internalWidth && canvas.height === internalHeight) return;

    canvas.width = internalWidth;
    canvas.height = internalHeight;
    stageElement.style.width = `${internalWidth / dpr}px`;
    stageElement.style.height = `${internalHeight / dpr}px`;
  }

  function drawFrame() {
    const canvas = canvasReference.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!preview) return;

    drawComposition(context, stateRef.current, preview, canvas.width, canvas.height);
  }

  useEffect(() => {
    drawReference.current = drawFrame;
    fitStage();
    drawFrame();
  }, [preview, ratio, background, backgroundImage, light, grain, texture, scale, redrawKey]);

  useEffect(() => {
    const handleResize = () => {
      fitStage();
      drawReference.current();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [ratio]);

  useEffect(() => {
    return () => {
      if (renderFrameReference.current) window.cancelAnimationFrame(renderFrameReference.current);
    };
  }, []);

  function requestDraw() {
    if (renderFrameReference.current) return;
    renderFrameReference.current = window.requestAnimationFrame(() => {
      renderFrameReference.current = 0;
      drawReference.current();
    });
  }

  function snapshotGesture(): GestureSnapshot {
    const iterator = pointersReference.current.values();
    const first = iterator.next();
    if (first.done) {
      return {
        scale: stateRef.current.scale,
        offsetX: stateRef.current.offset.x,
        offsetY: stateRef.current.offset.y,
        distance: 0,
        x: 0,
        y: 0,
      };
    }

    const second = iterator.next();
    if (second.done) {
      return {
        scale: stateRef.current.scale,
        offsetX: stateRef.current.offset.x,
        offsetY: stateRef.current.offset.y,
        distance: 0,
        x: first.value.x,
        y: first.value.y,
      };
    }

    return {
      scale: stateRef.current.scale,
      offsetX: stateRef.current.offset.x,
      offsetY: stateRef.current.offset.y,
      distance: Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y),
      x: (first.value.x + second.value.x) / 2,
      y: (first.value.y + second.value.y) / 2,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!preview || !canCompose) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersReference.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestureReference.current = snapshotGesture();
    stageReference.current?.classList.add("is-dragging");
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!pointersReference.current.has(event.pointerId)) return;

    pointersReference.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const canvas = canvasReference.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const gesture = gestureReference.current;
    if (pointersReference.current.size === 1) {
      const point = pointersReference.current.get(event.pointerId);
      if (!point) return;
      stateRef.current.offset = {
        x: clamp(gesture.offsetX + ((point.x - gesture.x) / rect.width) * 100, -50, 50),
        y: clamp(gesture.offsetY + ((point.y - gesture.y) / rect.height) * 100, -50, 50),
      };
    } else {
      const iterator = pointersReference.current.values();
      const first = iterator.next();
      const second = iterator.next();
      if (first.done || second.done || gesture.distance === 0) return;

      const distance = Math.hypot(first.value.x - second.value.x, first.value.y - second.value.y);
      stateRef.current.scale = clamp(gesture.scale * (distance / gesture.distance), 0.5, 3);
      const centerX = (first.value.x + second.value.x) / 2;
      const centerY = (first.value.y + second.value.y) / 2;
      stateRef.current.offset = {
        x: clamp(gesture.offsetX + ((centerX - gesture.x) / rect.width) * 100, -50, 50),
        y: clamp(gesture.offsetY + ((centerY - gesture.y) / rect.height) * 100, -50, 50),
      };
    }

    requestDraw();
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointersReference.current.delete(event.pointerId);
    if (pointersReference.current.size > 0) {
      gestureReference.current = snapshotGesture();
      return;
    }

    stageReference.current?.classList.remove("is-dragging");
    onCompositionCommit();
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointersReference.current.clear();
    stageReference.current?.classList.remove("is-dragging");
    onCompositionCommit();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="stage-wrap">
      <div
        aria-busy={busy}
        className={canCompose ? "stage can-drag" : "stage"}
        ref={stageReference}
      >
        <canvas
          aria-label={canCompose ? "透明底人像与背景预览" : "人像预览"}
          onPointerCancel={canCompose ? handlePointerCancel : undefined}
          onPointerDown={canCompose ? handlePointerDown : undefined}
          onPointerMove={canCompose ? handlePointerMove : undefined}
          onPointerUp={canCompose ? handlePointerUp : undefined}
          ref={canvasReference}
          role="img"
        />
        {busy ? (
          <div className="stage-busy" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>{busyText}</span>
          </div>
        ) : undefined}
      </div>
      {canCompose ? <p className="stage-hint">拖动或双指缩放人像</p> : undefined}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
