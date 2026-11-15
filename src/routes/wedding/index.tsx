import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { Button } from "#ui/button";
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
      throw redirect({ to: "/voucher" });
    }
    if (!z.uuidv7().safeParse(code).success) {
      throw redirect({ to: "/voucher", search: { error: "invalid" } });
    }
    const state = await getVoucherState({ data: { code } });
    if (!state) {
      throw redirect({ to: "/voucher", search: { error: "invalid" } });
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
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">出片 · 婚纱照</h1>
          <p className="text-muted-foreground text-sm">
            上传正脸照片，选择参考图，生成属于你们的婚纱照。
          </p>
        </div>
        <span className="bg-muted rounded-full px-3 py-1 text-xs">
          剩余 {state.remaining} / {state.totalImages} 张
        </span>
      </header>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">1. 上传照片</h2>
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground font-medium">隐私承诺：</span>
            我们不会保存你上传的照片，仅用于本次生成。
          </p>
        </div>
        <div className="grid max-w-xl grid-cols-2 gap-4">
          <PhotoUploader label="女生照片" onChange={setPhotoA} value={photoA} />
          <PhotoUploader label="男生照片" onChange={setPhotoB} value={photoB} />
        </div>
        <p className="text-muted-foreground text-xs">请上传正脸、光线均匀、无遮挡的单人照片。</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">2. 选择参考图</h2>
        <ReferencePicker
          groups={REFERENCE_GROUPS}
          max={maxSelectable}
          onToggle={toggleReference}
          selected={selected}
        />
      </section>

      <section className="space-y-3">
        <Button
          className="h-11 w-full px-6 sm:w-auto"
          disabled={!canGenerate}
          onClick={() => {
            generateMutation.mutate();
          }}
          size="lg"
          type="button"
        >
          {generateButtonLabel(generateMutation.isPending, state.remaining, selected.length)}
        </Button>
        {generateMutation.error ? (
          <p className="text-destructive text-sm">{generateMutation.error.message}</p>
        ) : undefined}
      </section>

      {state.images.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">生成结果</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.images.map((image) => (
              <ResultCard code={code} image={image} key={image.id} />
            ))}
          </div>
        </section>
      ) : undefined}
    </main>
  );
}

function generateButtonLabel(isPending: boolean, remaining: number, count: number) {
  if (isPending) return `生成中…（${count} 张，可能需要 1–3 分钟）`;
  if (remaining === 0) return "照片额度已用完";
  if (count === 0) return "生成婚纱照";
  return `生成 ${count} 张婚纱照`;
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="text-muted-foreground flex min-h-dvh items-center justify-center px-4 text-sm">
      {children}
    </main>
  );
}
