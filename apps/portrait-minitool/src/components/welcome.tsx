import type { PortraitKind } from "../types.ts";
import { FollowGuide } from "./follow-guide.tsx";

interface WelcomeProperties {
  busy: boolean;
  error: string;
  kind: PortraitKind;
  onKindChange: (kind: PortraitKind) => void;
}

const KIND_OPTIONS: readonly { label: string; value: PortraitKind }[] = [
  { label: "透明底人像", value: "cutout" },
  { label: "普通照片", value: "photo" },
];

export function Welcome({ busy, error, kind, onKindChange }: WelcomeProperties) {
  const isCutout = kind === "cutout";
  const flowSteps = isCutout
    ? ["选透明底人像", "磨皮调色", "选背景", "发笔记"]
    : ["选人像", "磨皮调色", "导出成片", "发笔记"];

  return (
    <section className="welcome" id="welcome">
      <h1>
        {isCutout ? "透明底人像，" : "一张人像，"}
        <br />
        {isCutout ? "换进影棚" : "干净出片"}
      </h1>
      <p className="lede">
        {isCutout ? "磨皮调色，给透明底人像换上影棚背景。" : "磨皮调色，导出自然干净的人像成片。"}
      </p>

      <div aria-label="人像类型" className="kind-switch" role="group">
        {KIND_OPTIONS.map((option) => (
          <button
            aria-pressed={kind === option.value}
            className={`kind-option ${kind === option.value ? "is-active" : ""}`}
            disabled={busy}
            key={option.value}
            onClick={() => {
              onKindChange(option.value);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <label
        aria-busy={busy}
        className={`upload-card ${busy ? "is-busy" : ""}`}
        htmlFor="photo-input"
      >
        <span className="upload-icon" aria-hidden="true">
          <svg fill="none" height="28" viewBox="0 0 24 24" width="28">
            <rect
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.8"
              width="18"
              x="3"
              y="4"
            />
            <circle cx="9" cy="10" fill="currentColor" r="1.8" />
            <path
              d="M4.5 17l4.8-4.6 3.4 3.1 3.1-2.7 3.7 4.2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </span>
        <span className="upload-title">{isCutout ? "选择透明底人像" : "选择一张人像"}</span>
        <span className="upload-note">
          {isCutout ? "透明底照片，背景已抠好" : "正面、光线均匀，普通照片即可"}
        </span>
        <span className="upload-cta">{busy ? "正在读取…" : "从相册选择"}</span>
      </label>

      {error ? (
        <p className="upload-error" role="alert">
          {error}
        </p>
      ) : undefined}

      <ol aria-label="使用步骤" className="flow">
        {flowSteps.map((step, index) => (
          <li key={step}>
            <span>{step}</span>
            {index < flowSteps.length - 1 ? (
              <svg aria-hidden="true" fill="none" viewBox="0 0 8 8">
                <path
                  d="M2.5 1L5.5 4l-3 3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            ) : undefined}
          </li>
        ))}
      </ol>

      <p className="privacy">
        <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
          <rect
            height="10"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
            width="14"
            x="5"
            y="10"
          />
          <path
            d="M8 10V7.5a4 4 0 018 0V10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
        照片只在本机处理，不会上传
      </p>

      <FollowGuide />
    </section>
  );
}
