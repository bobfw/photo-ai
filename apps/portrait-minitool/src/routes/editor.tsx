/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

import type { PortraitAdjustments } from "@photo-ai/portrait-editor";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";

import { EditorStage } from "../components/editor-stage.tsx";
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
      ? 3 / 4
      : session.source.naturalWidth / Math.max(1, session.source.naturalHeight),
    scale: isCutout ? 0.9 : 1,
    offset: { x: 0, y: 0 },
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
  const [scale, setScale] = useState(Math.round(stateReference.current.scale * 100));
  const [ratio, setRatio] = useState(stateReference.current.ratio);
  const [activeTab, setActiveTab] = useState<TabName>(isCutout ? "background" : "beauty");
  const [preview, setPreview] = useState<HTMLCanvasElement>();
  const [redrawKey, setRedrawKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("正在处理人像…");
  const [toast, setToast] = useState<ToastState>();
  const [resultDataUrl, setResultDataUrl] = useState("");
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
    stateReference.current.scale = 0.9;
    stateReference.current.offset = { x: 0, y: 0 };
    setScale(90);
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

  function handleRatio(value: number) {
    stateReference.current.ratio = value;
    setRatio(value);
  }

  function handleTabChange(tab: TabName) {
    setActiveTab(tab);
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
        <div className="row">
          <button className="text-button" onClick={resetBeauty} type="button">
            重置美颜
          </button>
        </div>
        <p className="hint">磨皮只作用于肤色区域，保留五官细节。</p>
      </>
    );
  }

  function renderBackgroundPanel() {
    return (
      <>
        <p className="control-title">背景颜色</p>
        <p className="control-note">只对透明底人像生效，背景会填在人像的镂空处。</p>
        {session.hasAlpha ? undefined : (
          <p className="control-note is-warning">
            这张图没有透明区域，背景不会透出；换一张透明底照片才能看到背景。
          </p>
        )}
        <div className="swatches" id="color-list">
          {BACKGROUNDS.map((preset) => {
            const isActive = backgroundImage === undefined && background === preset.value;
            return (
              <button
                aria-label={`背景：${preset.label}`}
                aria-pressed={isActive}
                className={`swatch ${isActive ? "is-active" : ""} ${
                  preset.value === "transparent" ? "is-transparent" : ""
                }`}
                key={preset.value}
                onClick={() => {
                  handleBackground(preset.value);
                }}
                type="button"
              >
                <span
                  style={
                    preset.value === "transparent" ? undefined : { backgroundColor: preset.value }
                  }
                />
              </button>
            );
          })}
        </div>
        <div className="row">
          <label className="color-picker" htmlFor="custom-color">
            <input
              aria-label="自定义背景颜色"
              id="custom-color"
              onChange={(event) => {
                handleBackground(event.target.value);
              }}
              type="color"
              value={background === "transparent" ? "#f4ede2" : background}
            />
            <span>自定义颜色</span>
          </label>
        </div>

        <div className="row row-between background-upload">
          <div className="row">
            <label className="secondary-button" htmlFor="background-input">
              上传背景图
            </label>
            {backgroundImage ? (
              <button className="text-button" onClick={clearBackgroundImage} type="button">
                移除
              </button>
            ) : undefined}
          </div>
          {backgroundImage ? (
            <div
              aria-label="当前背景图"
              className="background-thumb"
              role="img"
              style={{ backgroundImage: `url("${backgroundImage.src}")` }}
            />
          ) : undefined}
        </div>

        <RangeControl
          display={formatPercent(light)}
          label="光影"
          max={100}
          min={0}
          onChange={handleLight}
          value={light}
        />
        <RangeControl
          display={formatPercent(grain)}
          label="颗粒"
          max={100}
          min={0}
          onChange={handleGrain}
          value={grain}
        />
        <RangeControl
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
        <div className="row">
          <button className="text-button" onClick={resetComposition} type="button">
            复位构图
          </button>
        </div>

        <p className="control-title">画面比例</p>
        <div className="segmented" id="ratio-list">
          {RATIOS.map((item) => {
            const isActive = Math.abs(ratio - item.value) < 0.001;
            return (
              <button
                aria-pressed={isActive}
                className={`segment ${isActive ? "is-active" : ""}`}
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
        <p className="hint">
          背景只从透明区域透出；用「人像大小」缩小人像，能露出更多背景。颗粒/纹理只作用于纯色背景。
        </p>
      </>
    );
  }

  function renderExportPanel() {
    return (
      <>
        <p className="control-title">成片</p>
        <p className="hint">
          {isCutout
            ? "生成 1400px 宽的成片，背景和人像会一起导出。"
            : "生成 1400px 宽的成片，按原图比例导出人像。"}
        </p>
        <button
          className="primary-button wide"
          disabled={isExporting}
          onClick={() => {
            void handleExport();
          }}
          type="button"
        >
          {isExporting ? "生成中…" : "生成成片"}
        </button>
        <p className="hint">
          保存到相册和发笔记需要在小红书 App 内打开。照片只在本机处理，不会上传。
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
            className="ghost-button"
            onClick={() => {
              void navigate({ to: "/" });
            }}
            type="button"
          >
            换一张
          </button>
        }
      />

      <main className="page">
        <section className="editor">
          <EditorStage
            background={background}
            backgroundImage={backgroundImage}
            busy={busy}
            busyText={busyText}
            canCompose={isCutout}
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

          <div aria-label="编辑步骤" className="tabs" role="tablist">
            {tabNames.map((tab) => (
              <button
                aria-controls={`panel-${tab}`}
                aria-selected={activeTab === tab}
                className={`tab ${activeTab === tab ? "is-active" : ""}`}
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
            ))}
          </div>

          <div className="panels">
            <section
              aria-labelledby="tab-beauty"
              className="panel"
              hidden={activeTab !== "beauty"}
              id="panel-beauty"
              role="tabpanel"
            >
              {renderBeautyPanel()}
            </section>
            {isCutout ? (
              <section
                aria-labelledby="tab-background"
                className="panel"
                hidden={activeTab !== "background"}
                id="panel-background"
                role="tabpanel"
              >
                {renderBackgroundPanel()}
              </section>
            ) : undefined}
            <section
              aria-labelledby="tab-export"
              className="panel"
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
        className="visually-hidden"
        id="background-input"
        onChange={handleBackgroundInput}
        ref={backgroundInputReference}
        type="file"
      />

      {toast ? (
        <div
          className={`toast ${toast.isError ? "is-error" : ""}`}
          role={toast.isError ? "alert" : "status"}
        >
          {toast.message}
        </div>
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
