import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { compact } from "es-toolkit";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { Button } from "#ui/button";

import { PhotoUploader } from "./-internal/components/photo-uploader.tsx";
import { ResultCard } from "./-internal/components/result-card.tsx";
import { ScenePicker } from "./-internal/components/scene-picker.tsx";
import { WEDDING_SCENES } from "./-internal/services/scenes.ts";
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
  type Mode = "single" | "couple";
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("single");
  const [sceneId, setSceneId] = useState<string>(WEDDING_SCENES[0].id);
  const [photoA, setPhotoA] = useState("");
  const [photoB, setPhotoB] = useState("");

  const generateMutation = useMutation({
    mutationFn: () => {
      const faces = compact(mode === "couple" ? [photoA, photoB] : [photoA]);
      const expected = mode === "couple" ? 2 : 1;
      if (faces.length !== expected) {
        throw new Error(mode === "couple" ? "请上传女生和男生的照片" : "请上传一张照片");
      }
      return generateWedding({ data: { code, mode, sceneId, faces } });
    },
    onSuccess: () => {
      void router.invalidate();
    },
  });

  const canGenerate =
    state.remaining > 0 &&
    photoA !== "" &&
    (mode === "single" || photoB !== "") &&
    !generateMutation.isPending;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">上相 · 婚纱照</h1>
          <p className="text-muted-foreground text-sm">
            上传正脸照片，选择场景，生成属于你们的婚纱照。
          </p>
        </div>
        <span className="bg-muted rounded-full px-3 py-1 text-xs">
          剩余 {state.remaining} / {state.totalImages} 张
        </span>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">1. 选择人数</h2>
        <div className="flex gap-2">
          <ModeButton
            active={mode === "single"}
            onClick={() => {
              setMode("single");
            }}
          >
            单人婚纱照
          </ModeButton>
          <ModeButton
            active={mode === "couple"}
            onClick={() => {
              setMode("couple");
            }}
          >
            双人婚纱照
          </ModeButton>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">2. 上传照片</h2>
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <PhotoUploader
            label={mode === "single" ? "本人照片" : "女生照片"}
            onChange={setPhotoA}
            value={photoA}
          />
          {mode === "couple" ? (
            <PhotoUploader label="男生照片" onChange={setPhotoB} value={photoB} />
          ) : undefined}
        </div>
        <p className="text-muted-foreground text-xs">
          请上传正脸、光线均匀、无遮挡的单人照片。照片仅用于本次生成，24 小时后自动删除。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">3. 选择场景</h2>
        <ScenePicker onChange={setSceneId} value={sceneId} />
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
          {generateButtonLabel(generateMutation.isPending, state.remaining)}
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

function generateButtonLabel(isPending: boolean, remaining: number) {
  if (isPending) return "生成中…（可能需要 1–3 分钟）";
  if (remaining === 0) return "照片额度已用完";
  return "生成婚纱照";
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={
        active
          ? "border-primary bg-primary/5 rounded-lg border px-4 py-3 text-sm font-medium"
          : "border-border hover:bg-muted/50 rounded-lg border px-4 py-3 text-sm"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="text-muted-foreground flex min-h-dvh items-center justify-center px-4 text-sm">
      {children}
    </main>
  );
}
