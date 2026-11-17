import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { Button } from "#ui/button";
import { Skeleton } from "#ui/skeleton";
import { toast } from "#ui/toast";

import { PhotoUploader } from "./-internal/components/photo-uploader.tsx";
import { ReferencePicker } from "./-internal/components/reference-picker.tsx";
import { ResultCard } from "./-internal/components/result-card.tsx";
import { REFERENCE_GROUPS } from "./-internal/services/references.ts";
import { generateWedding, getVoucherState } from "./-internal/services/wedding.ts";

/* oxlint-disable typescript/only-throw-error -- TanStack Router 的 redirect 必须 throw */

type VoucherState = NonNullable<Awaited<ReturnType<typeof getVoucherState>>>;

export const Route = createFileRoute("/wedding/")({
  validateSearch: z.object({ code: z.string().optional() }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ deps: { code } }) => {
    if (!code) {
      throw redirect({ to: "/wedding/voucher" });
    }
    if (!z.uuid().safeParse(code).success) {
      throw redirect({ to: "/wedding/voucher", search: { error: "invalid" } });
    }
    const state = await getVoucherState({ data: { code } });
    if (!state) {
      throw redirect({ to: "/wedding/voucher", search: { error: "invalid" } });
    }
    return { code, state };
  },
  pendingComponent: () => <CenteredMessage>正在验证凭证…</CenteredMessage>,
  component: WeddingPage,
});

function WeddingPage() {
  const { code, state } = Route.useLoaderData();
  return <WeddingStudio code={code} state={state} />;
}

function WeddingStudio({ code, state }: { code: string; state: VoucherState }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [photoA, setPhotoA] = useState("");
  const [photoB, setPhotoB] = useState("");
  const maxSelectable = Math.min(state.remaining, REFERENCE_GROUPS.length);

  function toggleReference(key: string) {
    if (selected.includes(key)) {
      setSelected((current) => current.filter((item) => item !== key));
      return;
    }
    if (selected.length >= maxSelectable) {
      toast.add({
        title: maxSelectable === 0 ? "照片额度已用完" : `最多只能选择 ${maxSelectable} 张参考图`,
        type: "warning",
      });
      return;
    }
    setSelected((current) => [...current, key]);
  }

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (photoA === "" || photoB === "") {
        throw new Error("请上传女生和男生的照片");
      }
      if (selected.length === 0) {
        throw new Error("请选择至少一张参考图");
      }
      const results = await Promise.allSettled(
        selected.map((reference) =>
          generateWedding({ data: { code, reference, faces: [photoA, photoB] } }),
        ),
      );
      const failed = results.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (failed) throw failed.reason;
    },
    onSuccess: () => {
      toast.add({
        title: "生成完成",
        description: `共 ${selected.length} 张，在页面下方查看`,
        type: "success",
      });
    },
    onSettled: () => {
      void router.invalidate();
    },
  });

  const canGenerate =
    state.remaining > 0 &&
    photoA !== "" &&
    photoB !== "" &&
    selected.length > 0 &&
    !generateMutation.isPending;

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-6 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl">出片 · 婚纱照</h1>
          <span className="text-muted-foreground shrink-0 text-xs tracking-[0.15em] tabular-nums">
            剩余 {state.remaining} 张
          </span>
        </div>

        <section className="border-border/60 mt-6 space-y-4 border-t pt-6">
          <StepHeading index="01" title="上传照片" hint="请使用正脸、光线均匀、无遮挡的单人照。" />
          <div className="mx-auto grid max-w-80 grid-cols-2 gap-4">
            <PhotoUploader label="女生照片" onChange={setPhotoA} value={photoA} />
            <PhotoUploader label="男生照片" onChange={setPhotoB} value={photoB} />
          </div>
          <p className="border-border/60 text-foreground flex items-center gap-2 border-t pt-3 text-[13px] leading-5 font-medium">
            <ShieldCheck className="text-primary size-4 shrink-0" strokeWidth={1.5} />
            隐私承诺：不会保存你上传的照片，仅用于本次生成。
          </p>
        </section>

        <section className="border-border/60 mt-8 space-y-4 border-t pt-6">
          <StepHeading
            index="02"
            title="挑选参考风格"
            hint={`最多可选 ${maxSelectable} 张；一张参考图生成一张婚纱照。`}
          />
          <ReferencePicker
            groups={REFERENCE_GROUPS}
            max={maxSelectable}
            onToggle={toggleReference}
            selected={selected}
          />
        </section>

        <section className="border-border/60 mt-8 space-y-4 border-t pt-6">
          <StepHeading index="03" title="生成婚纱照" hint="预计 1–3 分钟，生成后还可以继续修改。" />
          <Button
            className="w-full shadow-sm"
            disabled={!canGenerate}
            onClick={() => {
              generateMutation.mutate();
            }}
            size="cta"
            type="button"
          >
            {generateMutation.isPending ? <Loader2 className="animate-spin" /> : undefined}
            {generateButtonLabel(generateMutation.isPending, state.remaining, selected.length)}
          </Button>
          {generateMutation.error ? (
            <p className="text-destructive text-center text-sm" role="alert">
              {generateMutation.error.message}
            </p>
          ) : undefined}
        </section>

        {generateMutation.isPending ? (
          <section aria-busy="true" className="mt-10 space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="font-heading text-2xl">正在生成</h2>
              <span className="text-muted-foreground text-xs tracking-[0.15em] tabular-nums">
                {selected.length} 张
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: selected.length }, (_, index) => (
                <Skeleton
                  className="aspect-3/4 rounded-2xl motion-reduce:animate-none"
                  key={index}
                />
              ))}
            </div>
          </section>
        ) : undefined}

        {state.images.length > 0 ? (
          <section className="mt-10 space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="font-heading text-2xl">生成结果</h2>
              <span className="text-muted-foreground text-xs tracking-[0.15em] tabular-nums">
                {state.images.length} 张
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.images.map((image) => (
                <ResultCard code={code} image={image} key={image.id} />
              ))}
            </div>
          </section>
        ) : undefined}
      </div>
    </main>
  );
}

function StepHeading({ index, title, hint }: { index: string; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-heading text-primary/30 pt-0.5 text-2xl leading-none tabular-nums">
        {index}
      </span>
      <div className="min-w-0 space-y-1.5">
        <h2 className="font-heading text-xl leading-tight text-balance">{title}</h2>
        <p className="text-muted-foreground text-[13px] leading-5">{hint}</p>
      </div>
    </div>
  );
}

function generateButtonLabel(isPending: boolean, remaining: number, count: number) {
  if (isPending) return `生成中…（${count} 张）`;
  if (remaining === 0) return "照片额度已用完";
  if (count === 0) return "生成婚纱照";
  return `生成 ${count} 张婚纱照`;
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <span className="font-heading text-2xl tracking-[0.3em]">出片</span>
      <p className="text-muted-foreground text-sm">{children}</p>
    </main>
  );
}
