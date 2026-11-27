import { useEffect, useRef } from "react";

import { CHECKERBOARD } from "../checkerboard.ts";

interface ImagePreviewProperties {
  isTransparent: boolean;
  onClose: () => void;
  src: string;
}

export function ImagePreview({ isTransparent, onClose, src }: ImagePreviewProperties) {
  const closeReference = useRef<HTMLButtonElement>(null);
  const onCloseReference = useRef(onClose);

  useEffect(() => {
    onCloseReference.current = onClose;
  });

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

  return (
    <div
      aria-label="成片预览"
      aria-modal="true"
      className="fixed bottom-0 left-0 right-0 top-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.94)] px-4 pb-[calc(16px_+_var(--safe-bottom))] pt-[calc(56px_+_var(--safe-top))]"
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
        className="block max-h-full max-w-full object-contain"
        src={src}
        style={isTransparent ? CHECKERBOARD : undefined}
      />
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
