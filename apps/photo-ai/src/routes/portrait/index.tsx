import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { CenteredMessage } from "#components/centered-message";
import { PhotoUploader } from "#components/photo-uploader";
import { RetryImage } from "#components/retry-image";
import { useResumeGeneration } from "#hooks/use-resume-generation";
import { CHECKERBOARD } from "#lib/checkerboard";
import { uploadPhoto } from "#lib/upload-photo";
import { waitForGeneration } from "#lib/wait-for-generation";
import { toast } from "#ui/toast";

import { usePortraitPhoto } from "./-internal/components/portrait-photo.tsx";
import { StylePicker, type StyleChoice } from "./-internal/components/style-picker.tsx";
import { generatePortraitImage, loadPortraitState } from "./-internal/services/portrait.ts";
import { findPortraitStyle } from "./-internal/services/styles.ts";

export const Route = createFileRoute("/portrait/")({
  validateSearch: z.object({ code: z.string().optional() }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ deps: { code } }) => loadPortraitState(code),
  pendingComponent: () => <CenteredMessage>正在验证凭证…</CenteredMessage>,
  component: PortraitPage,
});

const PHOTO_LABELS = ["正脸", "左侧脸", "右侧脸"];

function PortraitPage() {
  const { code, state } = Route.useLoaderData();
  const navigate = useNavigate();
  const { keys, photos, hasPhoto, setPhoto } = usePortraitPhoto();

  function openImage(imageId: number) {
    void navigate({
      to: "/portrait/result/$id",
      params: { id: String(imageId) },
      search: { code },
    });
  }

  const generateMutation = useMutation({
    mutationFn: async (choice: StyleChoice) => {
      const { taskId } = await generatePortraitImage({
        data: {
          code,
          clientToken: crypto.randomUUID(),
          style: choice.style,
          pose: choice.pose,
          composition: choice.composition,
          faces: keys,
          request: choice.request,
        },
      });
      return waitForGeneration(code, "portrait", taskId);
    },
    onSuccess: (image) => {
      toast.add({
        title: "生成完成",
        description: "可以换背景、调比例了",
        type: "success",
      });
      openImage(image.id);
    },
  });

  const resumeTask = state.activeTasks.find((task) => task.kind === "generate");
  const resume = useResumeGeneration(code, "portrait", resumeTask?.id, (image) => {
    openImage(image.id);
  });
  const isGenerating = generateMutation.isPending || resume.isResuming;
  const generatingTitle = generateMutation.isPending
    ? (findPortraitStyle(generateMutation.variables.style)?.title ?? "形象照")
    : (findPortraitStyle(resumeTask?.series ?? "")?.title ?? "形象照");

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-5 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold">出片 · 形象照</h1>
          <span className="bg-primary/10 text-primary shrink-0 rounded-full px-3 py-1 text-xs font-semibold tabular-nums">
            还可生成 {state.remaining} 张
          </span>
        </div>

        <section className="bg-muted mt-5 space-y-4 rounded-2xl p-4">
          <StepHeading
            index={1}
            title="上传照片"
            hint="建议上传同一个人的 3 张不同角度照片：正脸、左侧脸、右侧脸；至少 1 张，多角度能提升相似度。"
          />
          <div className="mx-auto grid max-w-80 grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-3">
            {PHOTO_LABELS.map((label, index) => (
              <PhotoUploader
                key={label}
                label={label}
                onChange={(value) => {
                  setPhoto(index, value);
                }}
                upload={(file) => uploadPhoto(code, "portrait", file)}
                value={photos[index]}
              />
            ))}
          </div>
          <p className="bg-primary/5 text-foreground flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-5 font-medium">
            <ShieldCheck className="text-primary size-4 shrink-0" strokeWidth={1.8} />
            隐私承诺：上传照片仅用于本次生成，24 小时内自动删除。
          </p>
        </section>

        <section className="bg-muted mt-4 space-y-4 rounded-2xl p-4">
          <StepHeading
            index={2}
            title="你的形象照"
            hint="选风格、姿势和构图，确认时可写补充要求；生成后可以换背景、调比例并保存。"
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
          {isGenerating || state.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {state.images.map((image) => (
                <button
                  aria-label={`打开${findPortraitStyle(image.series)?.title ?? image.series}形象照`}
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
                    style={{ aspectRatio: "3 / 4" }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                    {findPortraitStyle(image.series)?.title ?? image.series}
                  </span>
                </button>
              ))}
              {isGenerating ? <GeneratingTile title={generatingTitle} /> : undefined}
            </div>
          ) : undefined}
          <div className={isGenerating ? "hidden" : undefined}>
            <StylePicker
              actionDisabled={state.remaining === 0}
              onGenerate={(choice) => {
                generateMutation.mutate(choice);
              }}
              triggerDisabled={!hasPhoto}
              triggerHint={
                hasPhoto ? "选风格、姿势和构图，生成透明底形象照" : "请先上传至少一张本人照片"
              }
              triggerLabel={state.images.length === 0 ? "选风格、姿势和构图" : "再生成一张形象照"}
            />
            {generateMutation.error || resume.error ? (
              <p className="text-destructive mt-4 text-center text-sm" role="alert">
                {generateMutation.error?.message ?? resume.error}
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

function GeneratingTile({ title }: { title: string }) {
  return (
    <div
      aria-busy="true"
      className="border-border relative overflow-hidden rounded-xl border"
      style={{ aspectRatio: "3 / 4" }}
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
        <p className="text-[11px] font-medium">{title}</p>
        <p className="text-muted-foreground text-[10px] leading-3">约 20 秒–2 分钟</p>
      </div>
    </div>
  );
}
