/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

import { DEFAULT_ADJUSTMENTS, type EditorState } from "@photo-ai/portrait-editor";
import {
  BackgroundOptionsProvider,
  PortraitEditor,
  PortraitEditorProvider,
} from "@photo-ai/portrait-editor/react";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { CHECKERBOARD, STAGE_CHECKERBOARD } from "../checkerboard.ts";
import { Topbar } from "../components/topbar.tsx";
import { PREVIEW_EDGE, RATIOS } from "../constants.ts";
import { errorMessage } from "../error-message.ts";
import { usePortraitSession, type PortraitSession } from "../portrait-session.tsx";
import type { ToastState } from "../types.ts";
import { createEditorPlugins } from "./-editor/plugins.ts";
import { getIsCutout } from "./-editor/session.ts";

export const Route = createFileRoute("/editor")({
  component: EditorRoute,
});

function EditorRoute() {
  const { getSession } = usePortraitSession();
  const session = getSession();

  if (!session) return <Navigate replace to="/" />;
  return <EditorPage session={session} />;
}

// 默认比例取最接近原图的预设，保证比例按钮里有选中项。
function closestRatio(width: number, height: number) {
  const ratio = width / Math.max(1, height);
  let closest: number = RATIOS[0].value;
  for (const item of RATIOS) {
    if (Math.abs(item.value - ratio) < Math.abs(closest - ratio)) closest = item.value;
  }
  return closest;
}

function createInitialState(session: PortraitSession): EditorState {
  const isCutout = getIsCutout(session);
  return {
    source: session.source,
    adjustments: DEFAULT_ADJUSTMENTS,
    background: isCutout ? "#f4ede2" : "#ffffff",
    backgroundImage: undefined,
    light: isCutout ? 0.7 : 0,
    grain: isCutout ? 0.25 : 0,
    texture: 0,
    ratio: isCutout
      ? closestRatio(session.source.naturalWidth, session.source.naturalHeight)
      : session.source.naturalWidth / Math.max(1, session.source.naturalHeight),
    scale: 1,
    offset: { x: 0, y: 0 },
    cleanEdges: isCutout,
    dof: 0,
    shadow: 0,
  };
}

function EditorPage({ session }: { session: PortraitSession }) {
  const isCutout = getIsCutout(session);
  const navigate = useNavigate();
  const [initialState] = useState(() => createInitialState(session));
  const [toast, setToast] = useState<ToastState>();

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ isError, message });
  }, []);
  const handleError = useCallback(
    (error: unknown) => {
      showToast(errorMessage(error), true);
    },
    [showToast],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(undefined);
    }, 3200);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    document.body.classList.add("editor-mode");
    return () => {
      document.body.classList.remove("editor-mode");
    };
  }, []);

  return (
    <PortraitEditorProvider
      initialState={initialState}
      onError={handleError}
      previewEdge={PREVIEW_EDGE}
      processingLabel="正在处理人像…"
    >
      <BackgroundOptionsProvider
        checkerboard={CHECKERBOARD}
        hasAlpha={session.hasAlpha}
        ratios={RATIOS}
      >
        <Topbar
          action={
            <button
              className="min-h-11 rounded-full bg-muted px-4 text-[13px] font-semibold text-ink transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
              onClick={() => {
                void navigate({ to: "/" });
              }}
              type="button"
            >
              换一张
            </button>
          }
        />

        <main className="mx-auto max-w-[480px] px-4 pb-[calc(32px_+_var(--safe-bottom))] min-[520px]:px-5">
          <section className="pt-1">
            <PortraitEditor
              checkerboard={STAGE_CHECKERBOARD}
              defaultPluginId={isCutout ? "background" : "beauty"}
              interactive={isCutout}
              plugins={createEditorPlugins(isCutout)}
            />
          </section>
        </main>

        {toast ? (
          <div
            className={`fixed bottom-[calc(20px_+_var(--safe-bottom))] left-1/2 z-[200] max-w-[calc(100vw_-_32px)] -translate-x-1/2 rounded-full px-4 py-2.5 text-center text-xs text-inverse shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${
              toast.isError ? "bg-brand-strong" : "bg-[#1a1a1a]"
            }`}
            role={toast.isError ? "alert" : "status"}
          >
            {toast.message}
          </div>
        ) : undefined}
      </BackgroundOptionsProvider>
    </PortraitEditorProvider>
  );
}
