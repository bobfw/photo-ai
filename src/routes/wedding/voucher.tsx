import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "#ui/button";
import { Checkbox } from "#ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
import { Input } from "#ui/input";

export const Route = createFileRoute("/wedding/voucher")({
  validateSearch: z.object({ error: z.literal("invalid").optional() }),
  component: VoucherPage,
});

function VoucherPage() {
  const navigate = useNavigate();
  const { error: redirectError } = Route.useSearch();
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [error, setError] = useState(redirectError === "invalid" ? "凭证无效，请检查后重试" : "");

  return (
    <main className="bg-background flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <header className="border-border/70 flex items-center justify-between border-b pb-5">
          <span className="font-heading text-xl tracking-[0.3em]">出片</span>
          <span className="text-muted-foreground text-xs tracking-[0.25em] uppercase">
            AI Chestnut Studio
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center pt-6 pb-32">
          <h1 className="font-heading text-[clamp(2rem,9vw,3rem)] leading-[1.2] text-balance">
            让每一个想象，
            <br />
            都能出片
          </h1>
          <p className="text-foreground mt-5 flex items-start gap-2 text-sm leading-6 font-medium">
            <ShieldCheck className="text-primary mt-1 size-4 shrink-0" strokeWidth={1.5} />
            你的照片只用于出片，不会被保存。
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
              if (!agreed) {
                setConsentOpen(true);
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
                if (agreed && z.uuid().safeParse(value).success) {
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
            <label
              className="text-muted-foreground flex min-h-11 items-center gap-2 text-[13px] leading-5"
              htmlFor="accept-terms"
            >
              <Checkbox checked={agreed} id="accept-terms" onCheckedChange={setAgreed} />
              <span>
                我已阅读并同意
                <a
                  className="text-foreground underline underline-offset-2"
                  href="/terms"
                  rel="noreferrer"
                  target="_blank"
                >
                  《用户协议》
                </a>
              </span>
            </label>
            <Button className="w-full" disabled={code.trim().length === 0} size="cta" type="submit">
              开始生成
            </Button>
          </form>

          <Dialog onOpenChange={setConsentOpen} open={consentOpen}>
            <DialogContent>
              <div className="space-y-1.5">
                <DialogTitle>同意用户协议</DialogTitle>
                <DialogDescription>
                  继续即表示你已阅读并同意
                  <a
                    className="text-foreground underline underline-offset-2"
                    href="/terms"
                    rel="noreferrer"
                    target="_blank"
                  >
                    《用户协议》
                  </a>
                  。
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <DialogClose render={<Button className="flex-1" size="cta" variant="outline" />}>
                  取消
                </DialogClose>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setAgreed(true);
                    setConsentOpen(false);
                    void navigate({ to: "/wedding", search: { code: code.trim() } });
                  }}
                  size="cta"
                  type="button"
                >
                  继续
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <p className="text-muted-foreground mt-5 text-center text-[13px] leading-5">
            凭证可在网店购买 · 一个凭证可生成多张照片
          </p>
        </section>
      </div>
    </main>
  );
}
