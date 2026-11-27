import type { ReactNode } from "react";

interface TopbarProperties {
  action?: ReactNode;
}

export function Topbar({ action }: TopbarProperties) {
  return (
    <header className="topbar">
      <div className="brand">
        <span aria-hidden="true" className="brand-mark">
          出片
        </span>
        <span className="brand-name">人像出片棚</span>
      </div>
      {action}
    </header>
  );
}
