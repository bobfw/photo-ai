import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { toast } from "#ui/toast";

import { CenteredMessage } from "./-internal/components/centered-message.tsx";
import { CHECKERBOARD } from "./-internal/components/checkerboard.ts";
import { PhotoUploader } from "./-internal/components/photo-uploader.tsx";
import { PosePicker, type PoseChoice } from "./-internal/components/pose-picker.tsx";
import { RetryImage } from "./-internal/components/retry-image.tsx";
import { useWeddingPhotos } from "./-internal/components/wedding-photos.tsx";
import { findPoseSeries } from "./-internal/services/poses.ts";
import { generatePoseImage, loadWeddingState } from "./-internal/services/wedding.ts";

export const Route = createFileRoute("/wedding/")({
  validateSearch: z.object({ code: z.string().optional() }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ deps: { code } }) => loadWeddingState(code),
  pendingComponent: () => <CenteredMessage>正在验证凭证…</CenteredMessage>,
  component: WeddingPage,
});

function WeddingPage() {
  const { code, state } = Route.useLoaderData();
  const navigate = useNavigate();
  const { hasPhotos, photoA, photoB, setPhotoA, setPhotoB } = useWeddingPhotos();

  function openImage(imageId: number) {
    void navigate({
      to: "/wedding/result/$id",
      params: { id: String(imageId) },
      search: { code },
    });
  }

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
      toast.add({
        title: "生成完成",
        description: "可以换背景、加贴纸了",
        type: "success",
      });
      openImage(image.id);
    },
  });

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-5 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">出片 · 婚纱照</h1>
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums">
            还可生成 {state.remaining} 张
          </span>
        </div>

        <section className="bg-muted mt-5 space-y-4 rounded-2xl p-4">
          <StepHeading
            index={1}
            title="上传照片"
            hint="请用正脸、光线均匀、无遮挡、自己 P 过且满意的单人照，男生照片尤其要先 P，出图质量会好很多。"
          />
          <div className="mx-auto grid max-w-80 grid-cols-2 gap-4">
            <PhotoUploader label="女生照片" onChange={setPhotoA} value={photoA} />
            <PhotoUploader label="男生照片" onChange={setPhotoB} value={photoB} />
          </div>
          <p className="bg-primary/5 text-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-5 font-medium">
            <ShieldCheck className="text-primary size-4 shrink-0" strokeWidth={1.8} />
            隐私承诺：不会保存你上传的照片，仅用于本次生成。
          </p>
        </section>

        <section className="bg-muted mt-4 space-y-4 rounded-2xl p-4">
          <StepHeading
            index={2}
            title="你们的婚纱照"
            hint="选一个系列和姿态，确认时可写补充要求；生成后进入编辑页换背景、加贴纸并保存。"
          />
          {state.images.length > 0 ? (
            <div className="flex items-end justify-between gap-4">
              <p className="text-muted-foreground text-[13px] leading-5">
                图片仅保留 24 小时，请及时保存。
              </p>
              <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
                {state.images.length} 张
              </span>
            </div>
          ) : undefined}
          {state.images.length > 0 || generateMutation.isPending ? (
            <div className="grid grid-cols-3 gap-2">
              {state.images.map((image) => (
                <button
                  aria-label={`打开${findPoseSeries(image.series)?.title ?? image.series}姿态 ${image.pose}`}
                  className="ease-out-strong border-border relative block overflow-hidden rounded-xl border transition duration-150 active:scale-[0.98]"
                  key={image.id}
                  onClick={() => {
                    openImage(image.id);
                  }}
                  style={CHECKERBOARD}
                  type="button"
                >
                  <RetryImage
                    alt=""
                    className="w-full object-contain"
                    src={image.url}
                    style={{ aspectRatio: image.ratio === "3:4" ? "3 / 4" : "2 / 3" }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                    姿态 {image.pose}
                  </span>
                </button>
              ))}
              {generateMutation.isPending ? (
                <GeneratingTile pose={generateMutation.variables.pose} />
              ) : undefined}
            </div>
          ) : undefined}
          <div className={generateMutation.isPending ? "hidden" : undefined}>
            <PosePicker
              actionDisabled={state.remaining === 0}
              actionLabel={actionLabel(state.remaining)}
              onGenerate={(choice) => {
                generateMutation.mutate(choice);
              }}
              triggerDisabled={!hasPhotos}
              triggerHint={hasPhotos ? "选系列和姿态，生成透明底婚纱照" : "请先上传两张人像照片"}
              triggerLabel={state.images.length === 0 ? "选一个姿态开始生成" : "再生成一张婚纱照"}
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

function StepHeading({ index, title, hint }: { index: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="bg-primary text-primary-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
        {index}
      </span>
      <div className="min-w-0 space-y-1">
        <h2 className="text-lg leading-tight font-bold text-balance">{title}</h2>
        <p className="text-muted-foreground text-[13px] leading-5">{hint}</p>
      </div>
    </div>
  );
}

function GeneratingTile({ pose }: { pose: number }) {
  return (
    <div
      aria-busy="true"
      className="border-border relative overflow-hidden rounded-xl border"
      style={{ aspectRatio: "2 / 3" }}
    >
      <div className="bg-secondary size-full" />
      <div
        className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-2 text-center backdrop-blur-sm"
        role="status"
      >
        <Loader2
          aria-hidden
          className="text-primary size-5 animate-spin motion-reduce:animate-none"
          strokeWidth={1.5}
        />
        <p className="text-[11px] font-medium">姿态 {pose}</p>
        <p className="text-muted-foreground text-[10px] leading-3">约 20 秒–2 分钟</p>
      </div>
    </div>
  );
}

function actionLabel(remaining: number) {
  return remaining === 0 ? "照片额度已用完" : "生成这张";
}
