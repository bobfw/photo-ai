import type { ReactNode } from "react";

export function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <span className="font-heading text-2xl tracking-[0.3em]">出片</span>
      <p className="text-muted-foreground text-sm">{children}</p>
    </main>
  );
}
