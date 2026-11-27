/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

import type { PortraitAdjustments } from "@photo-ai/portrait-editor";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { CHECKERBOARD } from "../checkerboard.ts";
import { EditorStage } from "../components/editor-stage.tsx";
import { ImagePreview } from "../components/image-preview.tsx";
import { RangeControl } from "../components/range-control.tsx";
import { ResultModal } from "../components/result-modal.tsx";
import { Topbar } from "../components/topbar.tsx";
import {
  BACKGROUNDS,
  CUTOUT_TAB_NAMES,
  DEFAULT_ADJUSTMENTS,
  PHOTO_TAB_NAMES,
  RATIOS,
  TAB_LABELS,
} from "../constants.ts";
import {
  buildPortrait,
  compose,
  EXPORT_EDGE,
  EXPORT_WIDTH,
  loadImageElement,
  PREVIEW_EDGE,
  type EditorState,
} from "../editor.ts";
import { errorMessage } from "../error-message.ts";
import { usePortraitSession, type PortraitSession } from "../portrait-session.tsx";
import type { TabName, ToastState } from "../types.ts";

export const Route = createFileRoute("/editor")({
  component: EditorRoute,
});

function EditorRoute() {
  const { getSession } = usePortraitSession();
  const session = getSession();

  if (!session) return <Navigate replace to="/" />;
  return <EditorPage session={session} />;
}

function getIsCutout(session: PortraitSession) {
  return session.kind === "cutout" || session.hasAlpha;
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
  };
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatSigned(value: number) {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function EditorPage({ session }: { session: PortraitSession }) {
  const isCutout = getIsCutout(session);
  const stateReference = useRef<EditorState>(createInitialState(session));
  const backgroundInputReference = useRef<HTMLInputElement>(null);
  const backgroundObjectUrlReference = useRef("");
  const navigate = useNavigate();

  const [adjustments, setAdjustments] = useState<PortraitAdjustments>(DEFAULT_ADJUSTMENTS);
  const [background, setBackground] = useState(stateReference.current.background);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement>();
  const [light, setLight] = useState(Math.round(stateReference.current.light * 100));
  const [grain, setGrain] = useState(Math.round(stateReference.current.grain * 100));
  const [texture, setTexture] = useState(0);
  const [dof, setDof] = useState(0);
  const [scale, setScale] = useState(Math.round(stateReference.current.scale * 100));
  const [ratio, setRatio] = useState(stateReference.current.ratio);
  const [activeTab, setActiveTab] = useState<TabName>(isCutout ? "background" : "beauty");
  const [preview, setPreview] = useState<HTMLCanvasElement>();
  const [redrawKey, setRedrawKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("正在处理人像…");
  const [toast, setToast] = useState<ToastState>();
  const [resultDataUrl, setResultDataUrl] = useState("");
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [isTransparentResult, setIsTransparentResult] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ isError, message });
  }, []);

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
    setBusy(true);
    setBusyText("正在处理人像…");
    const timer = window.setTimeout(() => {
      try {
        setPreview(buildPortrait(stateReference.current, PREVIEW_EDGE));
      } catch (error) {
        showToast(errorMessage(error), true);
      } finally {
        setBusy(false);
      }
    }, 160);

    return () => {
      window.clearTimeout(timer);
    };
  }, [session.source, adjustments, showToast]);

  useEffect(() => {
    document.body.classList.add("editor-mode");
    return () => {
      document.body.classList.remove("editor-mode");
    };
  }, []);

  useEffect(() => {
    return () => {
      if (backgroundObjectUrlReference.current)
        URL.revokeObjectURL(backgroundObjectUrlReference.current);
    };
  }, []);

  async function handleBackgroundFile(file: File) {
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件", true);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImageElement(objectUrl);
      if (backgroundObjectUrlReference.current)
        URL.revokeObjectURL(backgroundObjectUrlReference.current);
      backgroundObjectUrlReference.current = objectUrl;
      stateReference.current.backgroundImage = image;
      setBackgroundImage(image);
      setRedrawKey((key) => key + 1);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      showToast(errorMessage(error), true);
    }
  }

  function handleBackgroundInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleBackgroundFile(file);
  }

  function clearBackgroundImage() {
    if (backgroundObjectUrlReference.current) {
      URL.revokeObjectURL(backgroundObjectUrlReference.current);
      backgroundObjectUrlReference.current = "";
    }
    stateReference.current.backgroundImage = undefined;
    setBackgroundImage(undefined);
    setRedrawKey((key) => key + 1);
  }

  function handleBackground(color: string) {
    clearBackgroundImage();
    stateReference.current.background = color;
    setBackground(color);
    setRedrawKey((key) => key + 1);
  }

  function updateAdjustment(patch: Partial<PortraitAdjustments>) {
    const next = { ...stateReference.current.adjustments, ...patch };
    stateReference.current.adjustments = next;
    setAdjustments(next);
  }

  function resetBeauty() {
    stateReference.current.adjustments = DEFAULT_ADJUSTMENTS;
    setAdjustments(DEFAULT_ADJUSTMENTS);
  }

  function handleScale(value: number) {
    stateReference.current.scale = value / 100;
    setScale(value);
  }

  function handleCompositionCommit() {
    setScale(Math.round(stateReference.current.scale * 100));
  }

  function resetComposition() {
    stateReference.current.scale = 1;
    stateReference.current.offset = { x: 0, y: 0 };
    setScale(100);
    setRedrawKey((key) => key + 1);
  }

  function handleLight(value: number) {
    stateReference.current.light = value / 100;
    setLight(value);
  }

  function handleGrain(value: number) {
    stateReference.current.grain = value / 100;
    setGrain(value);
  }

  function handleTexture(value: number) {
    stateReference.current.texture = value / 100;
    setTexture(value);
  }

  function handleDof(value: number) {
    stateReference.current.dof = value / 100;
    setDof(value);
  }

  function handleRatio(value: number) {
    stateReference.current.ratio = value;
    setRatio(value);
  }

  function handleTabChange(tab: TabName) {
    setActiveTab(tab);
  }

  function handlePreview() {
    try {
      const state = stateReference.current;
      const width = Math.min(EXPORT_WIDTH, PREVIEW_EDGE);
      const height = Math.round(width / state.ratio);
      const portrait = preview ?? buildPortrait(state, PREVIEW_EDGE);
      const canvas = compose(state, portrait, width, height);
      const isTransparentPreview =
        state.backgroundImage === undefined && state.background === "transparent";
      setPreviewDataUrl(canvas.toDataURL(isTransparentPreview ? "image/png" : "image/jpeg", 0.92));
    } catch (error) {
      showToast(errorMessage(error), true);
    }
  }

  async function handleExport() {
    if (!stateReference.current.source) return;

    setIsExporting(true);
    setBusy(true);
    setBusyText("正在生成成片…");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 40);
    });

    try {
      const state = stateReference.current;
      const exportHeight = Math.round(EXPORT_WIDTH / state.ratio);
      const exportLongEdge = Math.ceil(EXPORT_WIDTH / Math.min(state.ratio, 1));
      const portraitEdge = isCutout
        ? EXPORT_EDGE
        : Math.min(3200, Math.max(EXPORT_EDGE, exportLongEdge));
      const exportPortrait = buildPortrait(state, portraitEdge);
      const canvas = compose(state, exportPortrait, EXPORT_WIDTH, exportHeight);
      const hasAlpha = state.backgroundImage === undefined && state.background === "transparent";
      setResultDataUrl(canvas.toDataURL(hasAlpha ? "image/png" : "image/jpeg", 0.92));
      setIsTransparentResult(hasAlpha);
    } catch (error) {
      showToast(errorMessage(error), true);
    } finally {
      setIsExporting(false);
      setBusy(false);
    }
  }

  function closeResult() {
    setResultDataUrl("");
    setIsTransparentResult(false);
  }

  function renderBeautyPanel() {
    return (
      <>
        <RangeControl
          display={formatPercent(adjustments.smooth * 100)}
          label="磨皮"
          max={100}
          min={0}
          onChange={(value) => {
            updateAdjustment({ smooth: value / 100 });
          }}
          value={Math.round(adjustments.smooth * 100)}
        />
        <RangeControl
          display={formatPercent(adjustments.whiten * 100)}
          label="美白"
          max={100}
          min={0}
          onChange={(value) => {
            updateAdjustment({ whiten: value / 100 });
          }}
          value={Math.round(adjustments.whiten * 100)}
        />
        <RangeControl
          display={formatSigned(adjustments.brightness * 50)}
          label="亮度"
          max={50}
          min={-50}
          onChange={(value) => {
            updateAdjustment({ brightness: value / 50 });
          }}
          value={Math.round(adjustments.brightness * 50)}
        />
        <RangeControl
          display={formatSigned(adjustments.saturation * 50)}
          label="饱和度"
          max={50}
          min={-50}
          onChange={(value) => {
            updateAdjustment({ saturation: value / 50 });
          }}
          value={Math.round(adjustments.saturation * 50)}
        />
        <RangeControl
          display={formatSigned(adjustments.warmth * 50)}
          label="色温"
          max={50}
          min={-50}
          onChange={(value) => {
            updateAdjustment({ warmth: value / 50 });
          }}
          value={Math.round(adjustments.warmth * 50)}
        />
        <div className="flex min-w-0 items-center">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px] text-ink-soft active:text-ink"
            onClick={resetBeauty}
            type="button"
          >
            重置美颜
          </button>
        </div>
        <p className="mb-0 mt-3.5 text-[11px] leading-[1.6] text-faint">
          磨皮只作用于肤色区域，保留五官细节。
        </p>
      </>
    );
  }

  function renderBackgroundPanel() {
    return (
      <>
        <p className="m-0 text-sm font-semibold">背景颜色</p>
        <p className="mb-0 mt-1 text-[11px] leading-[1.5] text-faint">
          只对透明底人像生效，背景会填在人像的镂空处。
        </p>
        {session.hasAlpha ? undefined : (
          <p className="mb-0 mt-2 text-[11px] leading-[1.5] text-brand-strong">
            这张图没有透明区域，背景不会透出；换一张透明底照片才能看到背景。
          </p>
        )}
        <div
          className="-mx-1 mt-1 flex overflow-x-auto py-1 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          id="color-list"
        >
          {BACKGROUNDS.map((preset) => {
            const isActive = backgroundImage === undefined && background === preset.value;
            return (
              <button
                aria-label={`背景：${preset.label}`}
                aria-pressed={isActive}
                className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-full border-0 bg-transparent p-0"
                key={preset.value}
                onClick={() => {
                  handleBackground(preset.value);
                }}
                type="button"
              >
                <span
                  className={`h-[26px] w-[26px] rounded-full border border-[#3a3a3c] ${
                    isActive ? "outline outline-2 outline-offset-2 outline-brand" : ""
                  }`}
                  style={
                    preset.value === "transparent"
                      ? CHECKERBOARD
                      : { backgroundColor: preset.value }
                  }
                />
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 items-center justify-between">
          <label
            className="inline-flex min-h-11 items-center text-xs text-ink-soft"
            htmlFor="custom-color"
          >
            <input
              aria-label="自定义背景颜色"
              className="m-0 h-11 w-11 rounded-full border border-line bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0"
              id="custom-color"
              onChange={(event) => {
                handleBackground(event.target.value);
              }}
              type="color"
              value={background === "transparent" ? "#f4ede2" : background}
            />
            <span className="ml-2">自定义颜色</span>
          </label>
          {backgroundImage ? (
            <div className="flex min-w-0 items-center">
              <button
                aria-label="更换背景图"
                className="ml-2 h-11 w-11 shrink-0 rounded-lg border border-line bg-muted bg-cover bg-center"
                onClick={() => backgroundInputReference.current?.click()}
                style={{ backgroundImage: `url("${backgroundImage.src}")` }}
                type="button"
              />
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px] text-ink-soft active:text-ink"
                onClick={clearBackgroundImage}
                type="button"
              >
                移除
              </button>
            </div>
          ) : (
            <label
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-muted px-5 text-[13px] font-medium text-ink transition-transform duration-150 active:scale-[0.98]"
              htmlFor="background-input"
            >
              上传背景图
            </label>
          )}
        </div>

        {backgroundImage ? (
          <RangeControl
            display={formatPercent(dof)}
            label="景深"
            max={100}
            min={0}
            onChange={handleDof}
            value={dof}
          />
        ) : undefined}

        <RangeControl
          disabled={backgroundImage !== undefined}
          display={formatPercent(light)}
          label="光影"
          max={100}
          min={0}
          onChange={handleLight}
          value={light}
        />
        <RangeControl
          disabled={backgroundImage !== undefined}
          display={formatPercent(grain)}
          label="颗粒"
          max={100}
          min={0}
          onChange={handleGrain}
          value={grain}
        />
        <RangeControl
          disabled={backgroundImage !== undefined}
          display={formatPercent(texture)}
          label="纹理"
          max={100}
          min={0}
          onChange={handleTexture}
          value={texture}
        />
        <RangeControl
          display={formatPercent(scale)}
          label="人像大小"
          max={300}
          min={50}
          onChange={handleScale}
          value={scale}
        />
        <div className="flex min-w-0 items-center">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px] text-ink-soft active:text-ink"
            onClick={resetComposition}
            type="button"
          >
            复位构图
          </button>
        </div>

        <p className="m-0 text-sm font-semibold">画面比例</p>
        <div
          className="relative mt-2 flex space-x-1.5 before:absolute before:left-0 before:right-0 before:top-1/2 before:h-8 before:-translate-y-1/2 before:rounded-full before:bg-muted before:content-['']"
          id="ratio-list"
        >
          {RATIOS.map((item) => {
            const isActive = Math.abs(ratio - item.value) < 0.001;
            return (
              <button
                aria-pressed={isActive}
                className={`relative z-0 flex h-11 flex-1 items-center justify-center rounded-full border-0 bg-transparent p-0 text-xs transition-colors before:absolute before:left-0.5 before:right-0.5 before:top-1/2 before:-z-10 before:h-8 before:-translate-y-1/2 before:rounded-full before:content-[''] active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none ${
                  isActive
                    ? "font-semibold text-inverse before:bg-brand-strong"
                    : "font-medium text-ink-soft"
                }`}
                key={item.label}
                onClick={() => {
                  handleRatio(item.value);
                }}
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mb-0 mt-3.5 text-[11px] leading-[1.6] text-faint">
          用「人像大小」缩小人像能露出更多背景；光影/颗粒/纹理仅纯色背景，景深仅背景图。
        </p>
      </>
    );
  }

  function renderExportPanel() {
    return (
      <>
        <p className="m-0 text-sm font-semibold">成片</p>
        <div className="mt-3.5 flex">
          <button
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-muted px-5 text-[13px] font-medium text-ink transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none"
            onClick={handlePreview}
            type="button"
          >
            预览
          </button>
          <button
            className="ml-2 min-h-12 flex-1 rounded-full bg-brand-strong px-6 text-sm font-semibold text-inverse transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
            disabled={isExporting}
            onClick={() => {
              void handleExport();
            }}
            type="button"
          >
            {isExporting ? "生成中…" : "生成成片"}
          </button>
        </div>
        <p className="mb-0 mt-3.5 text-[11px] leading-[1.6] text-faint">
          照片只在本机处理，不会上传。
        </p>
      </>
    );
  }

  const tabNames = isCutout ? CUTOUT_TAB_NAMES : PHOTO_TAB_NAMES;

  return (
    <>
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
          <EditorStage
            background={background}
            backgroundImage={backgroundImage}
            busy={busy}
            busyText={busyText}
            canCompose={isCutout}
            dof={dof}
            grain={grain}
            light={light}
            onCompositionCommit={handleCompositionCommit}
            preview={preview}
            ratio={ratio}
            redrawKey={redrawKey}
            scale={scale}
            stateRef={stateReference}
            texture={texture}
          />

          <div aria-label="编辑步骤" className="mt-3 flex border-b border-line" role="tablist">
            {tabNames.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  aria-controls={`panel-${tab}`}
                  aria-selected={isActive}
                  className={`relative h-11 flex-1 border-0 bg-transparent text-sm transition-colors active:opacity-70 motion-reduce:transition-none ${
                    isActive
                      ? "font-semibold text-ink after:absolute after:bottom-0 after:left-1/2 after:h-[3px] after:w-5 after:-translate-x-1/2 after:rounded-[2px] after:bg-brand after:content-['']"
                      : "font-medium text-ink-soft"
                  }`}
                  id={`tab-${tab}`}
                  key={tab}
                  onClick={() => {
                    handleTabChange(tab);
                  }}
                  role="tab"
                  type="button"
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-[16px] border border-line bg-surface p-4">
            <section
              aria-labelledby="tab-beauty"
              className="min-w-0"
              hidden={activeTab !== "beauty"}
              id="panel-beauty"
              role="tabpanel"
            >
              {renderBeautyPanel()}
            </section>
            {isCutout ? (
              <section
                aria-labelledby="tab-background"
                className="min-w-0"
                hidden={activeTab !== "background"}
                id="panel-background"
                role="tabpanel"
              >
                {renderBackgroundPanel()}
              </section>
            ) : undefined}
            <section
              aria-labelledby="tab-export"
              className="min-w-0"
              hidden={activeTab !== "export"}
              id="panel-export"
              role="tabpanel"
            >
              {renderExportPanel()}
            </section>
          </div>
        </section>
      </main>

      <input
        accept="image/*"
        className="sr-only"
        id="background-input"
        onChange={handleBackgroundInput}
        ref={backgroundInputReference}
        type="file"
      />

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

      {previewDataUrl ? (
        <ImagePreview
          isTransparent={backgroundImage === undefined && background === "transparent"}
          onClose={() => {
            setPreviewDataUrl("");
          }}
          src={previewDataUrl}
        />
      ) : undefined}

      {resultDataUrl ? (
        <ResultModal
          dataUrl={resultDataUrl}
          isTransparent={isTransparentResult}
          onClose={closeResult}
        />
      ) : undefined}
    </>
  );
}
