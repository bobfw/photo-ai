import type { ReactNode } from "react";

interface TopbarProperties {
  action?: ReactNode;
}

export function Topbar({ action }: TopbarProperties) {
  return (
    <header className="topbar">
      <div className="brand">
        <img
          aria-hidden="true"
          alt=""
          className="brand-mark-image"
          height={32}
          src="./assets/icon.png"
          width={32}
        />
        <span className="brand-name">人像出片棚</span>
      </div>
      {action ? <div className="topbar-action">{action}</div> : undefined}
    </header>
  );
}
