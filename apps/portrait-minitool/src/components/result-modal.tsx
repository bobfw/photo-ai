import { useEffect, useRef, useState } from "react";

import { errorMessage } from "../error-message.ts";
import { publishNote, saveToAlbum } from "../xhs.ts";
import { FollowGuide } from "./follow-guide.tsx";

interface ResultModalProperties {
  dataUrl: string;
  isTransparent: boolean;
  onClose: () => void;
}

export function ResultModal({ dataUrl, isTransparent, onClose }: ResultModalProperties) {
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
  }, [dataUrl, isTransparent]);

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
      await publishNote(dataUrl);
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
      await saveToAlbum(dataUrl);
      setStatus("已保存到相册");
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-labelledby="result-title"
        aria-modal="true"
        className="modal-card sheet-theme"
        ref={sheetReference}
        role="dialog"
      >
        <div aria-hidden="true" className="sheet-handle" />
        <div className="modal-head">
          <h2 id="result-title">成片</h2>
          <button aria-label="关闭" className="icon-button" onClick={onClose} type="button">
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

        <div className={`result-image ${isTransparent ? "is-transparent" : ""}`}>
          <img alt="生成的成片" className="result-image-content" src={dataUrl} />
        </div>
        <p className="modal-status" role="status">
          {status}
        </p>

        <FollowGuide compact />

        <div className="modal-actions">
          <button
            className="primary-button"
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
            className="secondary-button"
            disabled={isSaving || isPosting}
            onClick={() => {
              void handleSave();
            }}
            type="button"
          >
            保存到相册
          </button>
        </div>
        <button className="text-button" onClick={onClose} type="button">
          返回修改
        </button>
      </div>
    </div>
  );
}
