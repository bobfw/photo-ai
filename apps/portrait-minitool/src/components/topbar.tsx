import type { ReactNode } from "react";

interface TopbarProperties {
  action?: ReactNode;
}

export function Topbar({ action }: TopbarProperties) {
  return (
    <header className="mx-auto flex max-w-[480px] items-center px-4 pb-3 pt-[calc(12px_+_var(--safe-top))]">
      <div className="flex min-w-0 items-center">
        <img
          aria-hidden="true"
          alt=""
          className="block h-8 w-8 shrink-0 rounded-[8px]"
          height={32}
          src="./assets/icon.png"
          width={32}
        />
        <span className="ml-2 whitespace-nowrap text-[17px] font-semibold">人像出片棚</span>
      </div>
      {action ? <div className="ml-3 shrink-0">{action}</div> : undefined}
    </header>
  );
}
