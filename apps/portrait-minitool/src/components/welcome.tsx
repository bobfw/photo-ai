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
    <section className="pt-2" id="welcome">
      <h1 className="mb-0 mt-2 text-[34px] font-bold leading-[1.18] tracking-[-0.03em] min-[520px]:text-[38px]">
        {isCutout ? "透明底人像，" : "一张人像，"}
        <br />
        {isCutout ? "换进影棚" : "干净出片"}
      </h1>
      <p className="mb-0 mt-3 text-sm leading-[1.7] text-ink-soft">
        {isCutout ? "磨皮调色，给透明底人像换上影棚背景。" : "磨皮调色，导出自然干净的人像成片。"}
      </p>

      <div aria-label="人像类型" className="mt-5 flex rounded-full bg-muted p-[3px]" role="group">
        {KIND_OPTIONS.map((option) => {
          const isActive = kind === option.value;
          return (
            <button
              aria-pressed={isActive}
              className={`flex h-11 flex-1 appearance-none items-center justify-center rounded-full border-0 text-[13px] transition-colors disabled:opacity-50 ${
                isActive
                  ? "bg-surface font-semibold text-ink shadow-card"
                  : "bg-transparent font-medium text-ink-soft"
              }`}
              disabled={busy}
              key={option.value}
              onClick={() => {
                onKindChange(option.value);
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <label
        aria-busy={busy}
        className={`mt-4 flex min-h-[232px] w-full flex-col items-center justify-center rounded-[20px] border-[1.5px] border-dashed border-[#ffb3c1] bg-[#fff7f8] px-5 py-7 text-center text-ink shadow-card transition duration-150 ease-out active:scale-[0.99] active:border-brand motion-reduce:transition-none ${
          busy ? "opacity-60" : ""
        }`}
        htmlFor="photo-input"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand"
        >
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
        <span className="mt-3.5 text-[17px] font-semibold">
          {isCutout ? "选择透明底人像" : "选择一张人像"}
        </span>
        <span className="mt-1 text-xs text-ink-soft">
          {isCutout ? "透明底照片，背景已抠好" : "正面、光线均匀，普通照片即可"}
        </span>
        <span className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-brand-strong px-6 text-sm font-semibold text-inverse">
          {busy ? "正在读取…" : "从相册选择"}
        </span>
      </label>

      {error ? (
        <p className="mb-0 mt-3 text-center text-xs text-brand-strong" role="alert">
          {error}
        </p>
      ) : undefined}

      <ol
        aria-label="使用步骤"
        className="m-0 mt-5 flex w-full list-none items-center justify-between rounded-full bg-muted px-4 py-2.5 text-[12px] font-medium text-ink-soft"
      >
        {flowSteps.map((step, index) => (
          <li className="flex items-center whitespace-nowrap" key={step}>
            <span>{step}</span>
            {index < flowSteps.length - 1 ? (
              <svg
                aria-hidden="true"
                className="ml-1.5 h-2.5 w-2.5 shrink-0 text-brand"
                fill="none"
                viewBox="0 0 8 8"
              >
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

      <p className="mt-6 flex items-center justify-center text-[11px] text-faint">
        <svg
          aria-hidden="true"
          className="mr-1.5 h-3.5 w-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
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
