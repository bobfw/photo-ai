import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <img alt="" className="size-12 rounded-2xl" height={48} src="/favicon.png" width={48} />
      <p className="text-foreground flex items-center gap-2 text-sm font-medium">
        <Loader2
          aria-hidden
          className="text-primary size-4 animate-spin motion-reduce:animate-none"
        />
        {children}
      </p>
    </main>
  );
}
