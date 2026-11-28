import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";

import { acceptVoucherTerms } from "#services/vouchers";
import { Button } from "#ui/button";
import { Checkbox } from "#ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";
import { Input } from "#ui/input";

interface VoucherGateProperties {
  initialCode: string | undefined;
  initialError: "invalid" | "consent" | undefined;
  type: string;
  onEnter: (code: string) => Promise<void>;
}

function initialErrorMessage(error: "invalid" | "consent" | undefined) {
  if (error === "invalid") return "凭证无效，请检查后重试";
  return "";
}

const PRODUCT_NAMES: Record<string, string> = {
  wedding: "婚纱照",
  portrait: "形象照",
};

// 婚纱照和形象照共用的凭证入口；验证通过后由各产品路由自己跳转。
export function VoucherGate({ initialCode, initialError, type, onEnter }: VoucherGateProperties) {
  const [code, setCode] = useState(initialCode ?? "");
  const [agreed, setAgreed] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState(initialErrorMessage(initialError));
  const productName = PRODUCT_NAMES[type] ?? "写真";

  // redirect 回来时组件可能没有重新挂载，同步一下 search 带来的状态
  useEffect(() => {
    if (initialCode !== undefined) setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    const message = initialErrorMessage(initialError);
    if (message) setError(message);
  }, [initialError]);

  async function acceptAndEnter() {
    const value = code.trim();
    if (!value) return;
    setError("");
    setIsAccepting(true);
    try {
      await acceptVoucherTerms({ data: { code: value, type } });
      await onEnter(value);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "凭证无效，请检查后重试");
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <main className="bg-background flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-2.5 pb-5">
          <img alt="" className="size-9 rounded-[10px]" height={36} src="/favicon.png" width={36} />
          <div className="min-w-0 flex-1">
            <p className="text-[17px] leading-tight font-bold">出片</p>
            <p className="text-muted-foreground text-xs">AI 摄影工作室</p>
          </div>
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
            {productName}
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center pt-6 pb-32">
          <h1 className="text-[clamp(2rem,9vw,3rem)] leading-[1.2] font-bold tracking-tight">
            让每一个想象，
            <br />
            <span className="text-primary">都能出片</span>
          </h1>
          <p className="bg-primary/5 text-foreground mt-5 flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] leading-5">
            <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
            <span>
              <span className="font-semibold">隐私承诺</span>：你的照片只用于出片，24
              小时内自动删除。
            </span>
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
                setError("请先阅读并同意用户协议");
                setConsentOpen(true);
                return;
              }
              void acceptAndEnter();
            }}
          >
            <p className="text-muted-foreground text-[13px] leading-5">
              输入{productName}凭证码，验证后开始制作
            </p>
            <Input
              aria-label="凭证码"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
              enterKeyHint="go"
              className="bg-muted focus-visible:bg-background h-12 rounded-full border-transparent px-5 text-center font-mono text-base tracking-wider"
              onChange={(event) => {
                setCode(event.target.value.trim());
                setError("");
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
            <Button
              className="w-full"
              disabled={code.trim().length === 0 || isAccepting}
              size="cta"
              type="submit"
            >
              {isAccepting ? "验证中…" : `进入${productName}`}
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
                    void acceptAndEnter();
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
            凭证可在网店购买 · 可生成张数以商品说明为准
          </p>
        </section>
      </div>
    </main>
  );
}
