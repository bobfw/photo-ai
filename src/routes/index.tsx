import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "#ui/button";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});

function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <header className="space-y-3">
        <h1 className="font-heading text-5xl font-semibold tracking-tight">出片</h1>
        <p className="text-muted-foreground text-sm">AI 婚纱照 · 上传照片，生成属于你们的婚纱照</p>
      </header>
      <Button className="h-11 w-full px-6" render={<Link to="/voucher" />} size="lg">
        进入婚纱照
      </Button>
      <p className="text-muted-foreground text-xs">凭证可在网店购买，一个凭证可生成多张婚纱照。</p>
    </main>
  );
}
