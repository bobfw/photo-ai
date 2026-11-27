import { useEffect, useRef } from "react";

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
      className={`preview ${isTransparent ? "is-transparent" : ""}`}
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
      <img alt="成片预览" className="preview-image" src={src} />
      <button
        aria-label="关闭预览"
        className="preview-close"
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
