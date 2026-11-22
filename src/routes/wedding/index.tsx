import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { toast } from "#ui/toast";

import { PhotoUploader } from "./-internal/components/photo-uploader.tsx";
import { PosePicker, type PoseChoice } from "./-internal/components/pose-picker.tsx";
import { ResultCard } from "./-internal/components/result-card.tsx";
import { generatePoseImage, getVoucherState } from "./-internal/services/wedding.ts";

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
    if (!state.termsAccepted) {
      throw redirect({ to: "/wedding/voucher", search: { code, error: "consent" } });
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
  const [images, setImages] = useState(state.images);
  const [remaining, setRemaining] = useState(state.remaining);
  const [photoA, setPhotoA] = useState("");
  const [photoB, setPhotoB] = useState("");
  const hasPhotos = photoA !== "" && photoB !== "";
  const canGenerate = hasPhotos && remaining > 0;

  const generateMutation = useMutation({
    mutationFn: (choice: PoseChoice) =>
      generatePoseImage({
        data: {
          code,
          series: choice.series,
          pose: choice.pose,
          outfit: choice.outfit,
          faces: [photoA, photoB],
          request: choice.request,
        },
      }),
    onSuccess: (image) => {
      setImages((current) => [...current, image]);
      setRemaining((current) => Math.max(0, current - 1));
      toast.add({
        title: "生成完成",
        description: "可以换背景、加贴纸了",
        type: "success",
      });
    },
  });

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-6 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl">出片 · 婚纱照</h1>
          <span className="text-muted-foreground shrink-0 text-xs tracking-[0.15em] tabular-nums">
            还可生成 {remaining} 张
          </span>
        </div>

        <section className="border-border/60 mt-6 space-y-4 border-t pt-6">
          <StepHeading
            index="01"
            title="上传照片"
            hint="请用正脸、光线均匀、无遮挡、自己 P 过且满意的单人照，男生照片尤其要先 P，出图质量会好很多。"
          />
          <div className="mx-auto grid max-w-80 grid-cols-2 gap-4">
            <PhotoUploader label="女生照片" onChange={setPhotoA} value={photoA} />
            <PhotoUploader label="男生照片" onChange={setPhotoB} value={photoB} />
          </div>
          <p className="text-foreground -mt-1 flex items-center gap-2 text-[13px] leading-5 font-medium">
            <ShieldCheck className="text-primary size-4 shrink-0" strokeWidth={1.5} />
            隐私承诺：不会保存你上传的照片，仅用于本次生成。
          </p>
        </section>

        <section className="border-border/60 mt-4 space-y-4 border-t pt-4">
          <StepHeading
            index="02"
            title="你们的婚纱照"
            hint="选一个系列和姿态，确认时可写补充要求；生成后可以换背景、加贴纸。"
          />
          {images.length > 0 ? (
            <div className="flex items-end justify-between gap-4">
              <p className="text-muted-foreground text-[13px] leading-5">
                图片仅保留 24 小时，请及时保存。
              </p>
              <span className="text-muted-foreground shrink-0 text-xs tracking-[0.15em] tabular-nums">
                {images.length} 张
              </span>
            </div>
          ) : undefined}
          {images.length > 0 || generateMutation.isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {images.map((image) => (
                <ResultCard
                  code={code}
                  faces={[photoA, photoB]}
                  hasPhotos={hasPhotos}
                  image={image}
                  key={image.id}
                  onImageChange={(updated) => {
                    setImages((current) =>
                      current.map((item) => (item.id === updated.id ? updated : item)),
                    );
                  }}
                />
              ))}
              {generateMutation.isPending ? (
                <GeneratingCard pose={generateMutation.variables.pose} />
              ) : undefined}
            </div>
          ) : undefined}
          <div className={generateMutation.isPending ? "hidden" : undefined}>
            <PosePicker
              actionDisabled={!canGenerate}
              actionLabel={actionLabel(remaining, hasPhotos)}
              onGenerate={(choice) => {
                generateMutation.mutate(choice);
              }}
              triggerLabel={images.length === 0 ? "选一个姿态开始生成" : "再生成一张婚纱照"}
            />
            {generateMutation.error ? (
              <p className="text-destructive mt-4 text-center text-sm" role="alert">
                {generateMutation.error.message}
              </p>
            ) : undefined}
          </div>
        </section>
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

function GeneratingCard({ pose }: { pose: number }) {
  return (
    <div aria-busy="true" className="w-full">
      <div
        className="border-border relative overflow-hidden rounded-2xl border"
        style={{ aspectRatio: "2 / 3" }}
      >
        <div className="bg-secondary size-full" />
        <div
          className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-sm"
          role="status"
        >
          <Loader2
            aria-hidden
            className="text-primary size-7 animate-spin motion-reduce:animate-none"
            strokeWidth={1.5}
          />
          <p className="font-heading text-xl">正在生成姿态 {pose}</p>
          <p className="text-muted-foreground text-[13px] leading-5">
            预计 20 秒–2 分钟，请勿刷新页面。
          </p>
        </div>
      </div>
    </div>
  );
}

function actionLabel(remaining: number, hasPhotos: boolean) {
  if (remaining === 0) return "照片额度已用完";
  if (!hasPhotos) return "请先上传人像照片";
  return "生成这张";
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <span className="font-heading text-2xl tracking-[0.3em]">出片</span>
      <p className="text-muted-foreground text-sm">{children}</p>
    </main>
  );
}
