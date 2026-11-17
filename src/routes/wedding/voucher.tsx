import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { Button } from "#ui/button";
import { Input } from "#ui/input";

export const Route = createFileRoute("/wedding/voucher")({
  validateSearch: z.object({ error: z.literal("invalid").optional() }),
  component: VoucherPage,
});

function VoucherPage() {
  const navigate = useNavigate();
  const { error: redirectError } = Route.useSearch();
  const [code, setCode] = useState("");
  const [error, setError] = useState(redirectError === "invalid" ? "凭证无效，请检查后重试" : "");

  return (
    <main className="bg-background flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <header className="border-border/70 flex items-center justify-between border-b pb-5">
          <span className="font-heading text-xl tracking-[0.3em]">出片</span>
          <span className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            AI Wedding Studio
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-12">
          <h1 className="font-heading text-[clamp(2rem,9vw,3rem)] leading-[1.2] text-balance">
            把你们的故事，
            <br />
            拍成婚纱照。
          </h1>
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            上传两张正脸照片，挑一组喜欢的风格，几分钟生成属于你们的婚纱照。
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const value = code.trim();
              if (!value) return;
              if (!z.uuid().safeParse(value).success) {
                setError("凭证码格式不正确，请检查后重试");
                return;
              }
              void navigate({ to: "/wedding", search: { code: value } });
            }}
          >
            <Input
              aria-label="凭证码"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
              enterKeyHint="go"
              className="bg-card h-12 rounded-full px-5 font-mono text-base tracking-wider"
              onChange={(event) => {
                const value = event.target.value.trim();
                setCode(value);
                if (z.uuid().safeParse(value).success) {
                  void navigate({ to: "/wedding", search: { code: value } });
                }
              }}
              placeholder="粘贴凭证码"
              spellCheck={false}
              value={code}
            />
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : undefined}
            <Button className="w-full" disabled={code.trim().length === 0} size="cta" type="submit">
              开始生成
            </Button>
          </form>

          <p className="text-muted-foreground mt-5 text-center text-[13px] leading-5">
            凭证可在网店购买 · 一个凭证可生成多张照片
          </p>
        </section>
      </div>
    </main>
  );
}
