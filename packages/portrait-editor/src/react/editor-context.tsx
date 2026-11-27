/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { PortraitAdjustments } from "../beauty.ts";
import { buildPortrait, compose, type EditorState } from "../pipeline.ts";
import type { PortraitEditorContextValue } from "./types.ts";

interface PortraitEditorProviderProperties {
  initialState: EditorState;
  previewEdge?: number;
  processingLabel?: string;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

const PortraitEditorContext = createContext<PortraitEditorContextValue | undefined>(undefined);

export function PortraitEditorProvider({
  initialState,
  previewEdge = 960,
  processingLabel = "正在处理人像…",
  onError,
  children,
}: PortraitEditorProviderProperties) {
  const stateReference = useRef<EditorState>(initialState);
  const onErrorReference = useRef(onError);
  const [state, setState] = useState(initialState);
  const [preview, setPreview] = useState<HTMLCanvasElement>();
  const [busyCount, setBusyCount] = useState(0);
  const [busyText, setBusyText] = useState(processingLabel);

  useEffect(() => {
    onErrorReference.current = onError;
  });

  const beginBusy = useCallback((text: string) => {
    setBusyCount((count) => count + 1);
    setBusyText(text);
  }, []);

  const endBusy = useCallback(() => {
    setBusyCount((count) => Math.max(0, count - 1));
  }, []);

  const setBusy = useCallback(
    (isBusy: boolean, text?: string) => {
      if (isBusy) beginBusy(text ?? processingLabel);
      else endBusy();
    },
    [beginBusy, endBusy, processingLabel],
  );

  useEffect(() => {
    beginBusy(processingLabel);
    let isFinished = false;
    const timer = window.setTimeout(() => {
      isFinished = true;
      try {
        setPreview(buildPortrait(stateReference.current, previewEdge));
      } catch (error) {
        onErrorReference.current?.(error);
      } finally {
        endBusy();
      }
    }, 160);

    return () => {
      window.clearTimeout(timer);
      if (!isFinished) endBusy();
    };
  }, [state.source, state.adjustments, previewEdge, processingLabel, beginBusy, endBusy]);

  const update = useCallback((patch: Partial<EditorState>) => {
    stateReference.current = { ...stateReference.current, ...patch };
    setState(stateReference.current);
  }, []);

  const updateAdjustments = useCallback(
    (patch: Partial<PortraitAdjustments>) => {
      update({ adjustments: { ...stateReference.current.adjustments, ...patch } });
    },
    [update],
  );

  const resetComposition = useCallback(() => {
    stateReference.current.scale = 1;
    stateReference.current.offset = { x: 0, y: 0 };
    setState({ ...stateReference.current });
  }, []);

  const commitScale = useCallback(() => {
    setState({ ...stateReference.current });
  }, []);

  const reportError = useCallback((error: unknown) => {
    onErrorReference.current?.(error);
  }, []);

  const renderCanvas = useCallback(
    ({ width, portraitEdge }: { width: number; portraitEdge: number }) => {
      const current = stateReference.current;
      if (!current.source) throw new Error("还没有选择人像");

      const height = Math.round(width / current.ratio);
      const portrait = buildPortrait(current, portraitEdge);
      return compose(current, portrait, width, height);
    },
    [],
  );

  const renderImage = useCallback(
    async ({ width, portraitEdge }: { width: number; portraitEdge: number }) => {
      const current = stateReference.current;
      const canvas = renderCanvas({ width, portraitEdge });
      const isTransparent =
        current.backgroundImage === undefined && current.background === "transparent";
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value);
          else reject(new Error("无法生成图片"));
        }, "image/png");
      });
      return { blob, isTransparent };
    },
    [renderCanvas],
  );

  const value: PortraitEditorContextValue = {
    state,
    stateRef: stateReference,
    preview,
    isBusy: busyCount > 0,
    busyText,
    update,
    updateAdjustments,
    resetComposition,
    commitScale,
    setBusy,
    reportError,
    renderCanvas,
    renderImage,
  };

  return <PortraitEditorContext.Provider value={value}>{children}</PortraitEditorContext.Provider>;
}

export function usePortraitEditor() {
  const value = useContext(PortraitEditorContext);
  if (!value) throw new Error("缺少 PortraitEditorProvider");
  return value;
}
