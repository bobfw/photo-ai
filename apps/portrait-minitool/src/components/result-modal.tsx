import { useEffect, useRef, useState } from "react";

import { CHECKERBOARD } from "../checkerboard.ts";
import { errorMessage } from "../error-message.ts";
import { publishNote, saveToAlbum } from "../xhs.ts";
import { FollowGuide } from "./follow-guide.tsx";

interface ResultModalProperties {
  blob: Blob;
  isTransparent: boolean;
  onClose: () => void;
  src: string;
}

export function ResultModal({ blob, isTransparent, onClose, src }: ResultModalProperties) {
  const primaryButtonReference = useRef<HTMLButtonElement>(null);
  const sheetReference = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(isTransparent ? "已生成透明底成片" : "已生成高清成片");
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    primaryButtonReference.current?.focus();
  }, []);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  useEffect(() => {
    setStatus(isTransparent ? "已生成透明底成片" : "已生成高清成片");
  }, [isTransparent, src]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const sheet = sheetReference.current;
      if (!sheet) return;
      const focusable = [
        ...sheet.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;

      const first = focusable[0];
      // oxlint-disable-next-line unicorn/prefer-at -- Chrome 61 has no Array.prototype.at
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handlePost() {
    setIsPosting(true);
    setStatus("正在打开发布页…");
    try {
      await publishNote(blob);
      setStatus("已打开发布页");
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setIsPosting(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setStatus("正在保存…");
    try {
      await saveToAlbum(blob);
      setStatus("已保存到相册");
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 top-0 z-[100] flex items-end justify-center overflow-hidden bg-[rgba(0,0,0,0.6)]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="result-title"
        aria-modal="true"
        className="sheet-theme max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-[20px] bg-[#ffffff] px-5 pb-[calc(20px_+_var(--safe-bottom))] pt-2 text-[#1a1a1a] shadow-sheet [-webkit-overflow-scrolling:touch] [animation:sheet-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none"
        ref={sheetReference}
        role="dialog"
      >
        <div aria-hidden="true" className="mx-auto mb-2 h-1 w-9 rounded-full bg-[#e5e5e5]" />
        <div className="flex items-center justify-between pt-1">
          <h2 className="m-0 text-lg font-semibold tracking-[-0.01em]" id="result-title">
            成片
          </h2>
          <button
            aria-label="关闭"
            className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-transparent text-[#666666] active:bg-[#f5f5f5] active:text-[#1a1a1a]"
            onClick={onClose}
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

        <div
          className="mx-auto mt-3 flex w-fit max-w-full overflow-hidden rounded-[12px] bg-[#f5f5f5]"
          style={isTransparent ? CHECKERBOARD : undefined}
        >
          <img
            alt="生成的成片"
            className="block h-auto max-h-[46vh] w-auto max-w-full object-contain"
            src={src}
          />
        </div>
        <p className="mb-0 mt-3 min-h-[18px] text-center text-xs text-[#666666]" role="status">
          {status}
        </p>

        <FollowGuide compact />

        <div className="mt-4 flex flex-col">
          <button
            className="min-h-12 w-full rounded-full bg-brand-strong px-6 text-sm font-semibold text-inverse transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
            disabled={isSaving || isPosting}
            onClick={() => {
              void handlePost();
            }}
            ref={primaryButtonReference}
            type="button"
          >
            发笔记
          </button>
          <button
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-muted px-5 text-[13px] font-medium text-ink transition-transform duration-150 active:scale-[0.98] disabled:opacity-[0.45] motion-reduce:transition-none"
            disabled={isSaving || isPosting}
            onClick={() => {
              void handleSave();
            }}
            type="button"
          >
            保存到相册
          </button>
        </div>
        <button
          className="mx-auto mt-2 flex min-h-11 items-center justify-center rounded-full bg-transparent px-3 text-[13px] text-ink-soft active:text-ink"
          onClick={onClose}
          type="button"
        >
          返回修改
        </button>
      </div>
    </div>
  );
}
