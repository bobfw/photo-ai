import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "#ui/button";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <main className="bg-background flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <header className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <h1 className="font-heading indent-[0.3em] text-6xl leading-none tracking-[0.3em]">
            出片
          </h1>
          <p className="text-muted-foreground mt-5 text-xs tracking-[0.35em]">AI 摄影工作室</p>
          <p className="font-heading text-muted-foreground mt-6 text-sm tracking-[0.15em]">
            让每一个想象，都能出片
          </p>
        </header>

        <div className="pb-[max(2rem,env(safe-area-inset-bottom))]">
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link to="/wedding/voucher" />}
            size="cta"
          >
            开始制作婚纱照
          </Button>
        </div>
      </div>
    </main>
  );
}
