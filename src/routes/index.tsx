import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "#ui/button";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <main className="bg-background relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="bg-accent/60 pointer-events-none absolute -top-44 left-1/2 h-112 w-2xl -translate-x-1/2 rounded-full blur-3xl"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
        <header className="space-y-3">
          <h1 className="font-heading text-5xl tracking-[0.3em]">出片</h1>
          <p className="text-muted-foreground text-sm">AI 摄影工作室</p>
        </header>
        <Button
          className="h-12 w-full max-w-xs rounded-full text-base tracking-[0.15em]"
          render={<Link to="/wedding/voucher" />}
          size="lg"
        >
          婚纱照
        </Button>
      </div>
    </main>
  );
}
