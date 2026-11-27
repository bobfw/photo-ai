import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "#ui/button";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});

const STEPS = ["上传照片", "选风格", "保存成片"];

function WelcomePage() {
  return (
    <main className="bg-background flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
        <header className="flex items-center gap-2.5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <img alt="" className="size-9 rounded-[10px]" height={36} src="/favicon.png" width={36} />
          <div className="min-w-0">
            <p className="text-[17px] leading-tight font-bold">出片</p>
            <p className="text-muted-foreground text-xs">AI 摄影工作室</p>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <h1 className="text-[40px] leading-[1.15] font-bold tracking-tight">
            上传照片，
            <br />
            <span className="text-primary">拍出写真大片</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            婚纱照、形象照，选喜欢的风格，AI
            帮你拍出写真大片。还能换背景、调比例，成品直接保存到相册。
          </p>

          <ol
            aria-label="使用步骤"
            className="bg-muted mt-7 flex items-center justify-between rounded-full px-4 py-2.5 text-xs font-medium"
          >
            {STEPS.map((step, index) => (
              <li className="flex items-center" key={step}>
                <span>{step}</span>
                {index < STEPS.length - 1 ? (
                  <ChevronRight aria-hidden className="text-primary mx-1 size-3.5 shrink-0" />
                ) : undefined}
              </li>
            ))}
          </ol>

          <div className="bg-primary/5 mt-4 flex items-start gap-2.5 rounded-2xl p-4">
            <ShieldCheck className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={1.8} />
            <p className="text-[13px] leading-5">
              <span className="font-semibold">隐私承诺</span>
              <span className="text-muted-foreground">：上传的照片仅用于本次生成，不会保存。</span>
            </p>
          </div>
        </section>

        <div className="space-y-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link to="/wedding/voucher" />}
            size="cta"
          >
            <Sparkles aria-hidden />
            婚纱照 · 双人合影
          </Button>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link to="/portrait/voucher" />}
            size="cta"
            variant="outline"
          >
            <Camera aria-hidden />
            形象照 · 单人职业照
          </Button>
          <p className="text-muted-foreground pt-1 text-center text-xs">
            凭证可在网店购买 · 可生成张数以商品说明为准
          </p>
        </div>
      </div>
    </main>
  );
}
