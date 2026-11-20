import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { z } from "zod";

import { Input } from "#ui/input";
import { toast } from "#ui/toast";

import { PhotoUploader } from "./-internal/components/photo-uploader.tsx";
import { ReferencePicker } from "./-internal/components/reference-picker.tsx";
import { ResultCard } from "./-internal/components/result-card.tsx";
import { REFERENCE_GROUPS, type ReferenceChoice } from "./-internal/services/references.ts";
import { DEFAULT_RETOUCH } from "./-internal/services/retouch.ts";
import {
  generateWedding,
  getVoucherState,
  regenerateWedding,
} from "./-internal/services/wedding.ts";

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
  const [reference, setReference] = useState<ReferenceChoice>();
  const [photoA, setPhotoA] = useState("");
  const [photoB, setPhotoB] = useState("");
  const [bodyA, setBodyA] = useStoredBodyDraft("wedding_body_a");
  const [bodyB, setBodyB] = useStoredBodyDraft("wedding_body_b");
  const hasPhotos = photoA !== "" && photoB !== "";
  const selectedImageUrl = reference?.kind === "custom" ? reference.dataUrl : reference?.url;

  const generateMutation = useMutation({
    mutationFn: async (referenceChoice: ReferenceChoice) => {
      if (!hasPhotos) {
        throw new Error("请上传女生和男生的照片");
      }
      await generateWedding({
        data: {
          code,
          reference: toServerReference(referenceChoice),
          faces: [photoA, photoB],
          bodySizes: [toBodySize(bodyA), toBodySize(bodyB)],
          retouch: DEFAULT_RETOUCH,
        },
      });
    },
    onSuccess: () => {
      setReference(undefined);
      toast.add({
        title: "生成完成",
        description: "已放进你们的婚纱照",
        type: "success",
      });
    },
    onSettled: () => {
      void router.invalidate();
    },
  });

  // 造型在发起生成时锁定，生成期间不允许更换。
  function handleGenerate(referenceChoice: ReferenceChoice) {
    setReference(referenceChoice);
    generateMutation.mutate(referenceChoice);
  }

  const regenerateMutation = useMutation({
    mutationFn: async (imageId: number) => {
      if (!hasPhotos) {
        throw new Error("请先上传人像照片");
      }
      await regenerateWedding({
        data: {
          code,
          imageId,
          faces: [photoA, photoB],
          bodySizes: [toBodySize(bodyA), toBodySize(bodyB)],
          retouch: DEFAULT_RETOUCH,
        },
      });
    },
    onSuccess: () => {
      toast.add({
        description: "已添加一个新版本",
        title: "重新生成完成",
        type: "success",
      });
    },
    onError: (error) => {
      toast.add({ title: error.message, type: "error" });
    },
    onSettled: () => {
      void router.invalidate();
    },
  });

  return (
    <main className="bg-background min-h-dvh">
      <div className="mx-auto w-full max-w-xl px-6 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading text-2xl">出片 · 婚纱照</h1>
          <span className="text-muted-foreground shrink-0 text-xs tracking-[0.15em] tabular-nums">
            还可生成 {state.remaining} 张
          </span>
        </div>

        <section className="border-border/60 mt-6 space-y-4 border-t pt-6">
          <StepHeading index="01" title="上传照片" hint="请使用正脸、光线均匀、无遮挡的单人照。" />
          <div className="mx-auto grid max-w-80 grid-cols-2 gap-4">
            <PhotoUploader label="女生照片" onChange={setPhotoA} value={photoA} />
            <PhotoUploader label="男生照片" onChange={setPhotoB} value={photoB} />
          </div>
          <div className="mx-auto max-w-80 space-y-2">
            <p className="text-muted-foreground text-xs">
              身高体重（选填，只为让身形更像你们自己）
            </p>
            <BodySizeFields label="女生" onChange={setBodyA} value={bodyA} />
            <BodySizeFields label="男生" onChange={setBodyB} value={bodyB} />
          </div>
          <p className="border-border/60 text-foreground flex items-center gap-2 border-t pt-3 text-[13px] leading-5 font-medium">
            <ShieldCheck className="text-primary size-4 shrink-0" strokeWidth={1.5} />
            隐私承诺：不会保存你上传的照片，仅用于本次生成。
          </p>
        </section>

        <section className="border-border/60 mt-8 space-y-4 border-t pt-6">
          <StepHeading
            index="02"
            title="你们的婚纱照"
            hint="选一张喜欢的造型，确认后生成；新的照片会出现在这里。"
          />
          {state.images.length > 0 ? (
            <div className="flex items-end justify-between gap-4">
              <p className="text-muted-foreground text-[13px] leading-5">
                图片仅保留 24 小时，请及时保存。
              </p>
              <span className="text-muted-foreground shrink-0 text-xs tracking-[0.15em] tabular-nums">
                {state.images.length} 张
              </span>
            </div>
          ) : undefined}
          {state.images.length > 0 || generateMutation.isPending ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.images.map((image) => (
                <ResultCard
                  canRegenerate={hasPhotos && state.remaining > 0 && !regenerateMutation.isPending}
                  code={code}
                  image={image}
                  isRegenerating={
                    regenerateMutation.isPending && regenerateMutation.variables === image.id
                  }
                  key={image.id}
                  onRegenerate={() => {
                    regenerateMutation.mutate(image.id);
                  }}
                  regenerateHint={regenerateHintLabel(hasPhotos, state.remaining)}
                />
              ))}
              {generateMutation.isPending ? (
                <GeneratingCard imageUrl={selectedImageUrl} />
              ) : undefined}
            </div>
          ) : undefined}
          <div className={generateMutation.isPending ? "hidden" : undefined}>
            <ReferencePicker
              actionDisabled={!hasPhotos || state.remaining === 0}
              actionLabel={previewActionLabel(state.remaining, hasPhotos)}
              groups={REFERENCE_GROUPS}
              onGenerate={handleGenerate}
              triggerLabel={state.images.length === 0 ? "生成第一张婚纱照" : "再生成一张婚纱照"}
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

function GeneratingCard({ imageUrl }: { imageUrl: string | undefined }) {
  return (
    <div aria-busy="true" className="w-full">
      <div className="border-border relative aspect-3/4 overflow-hidden rounded-2xl border">
        {imageUrl ? (
          <img alt="" className="size-full object-cover" src={imageUrl} />
        ) : (
          <div className="bg-secondary size-full" />
        )}
        <div
          className="bg-background/60 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-sm"
          role="status"
        >
          <Loader2
            aria-hidden
            className="text-primary size-7 animate-spin motion-reduce:animate-none"
            strokeWidth={1.5}
          />
          <p className="font-heading text-xl">正在生成这一张</p>
          <p className="text-muted-foreground text-[13px] leading-5">
            预计 1–3 分钟，请稍等一会儿。
          </p>
        </div>
      </div>
    </div>
  );
}

function previewActionLabel(remaining: number, hasPhotos: boolean) {
  if (remaining === 0) return "照片额度已用完";
  if (!hasPhotos) return "请先上传人像照片";
  return "生成这张婚纱照";
}

function regenerateHintLabel(hasPhotos: boolean, remaining: number) {
  if (!hasPhotos) return "请先上传人像照片";
  if (remaining === 0) return "照片额度已用完";
  return "将消耗 1 张额度";
}

function toServerReference(reference: ReferenceChoice) {
  if (reference.kind === "custom") {
    return { kind: "custom" as const, dataUrl: reference.dataUrl };
  }
  return { kind: "curated" as const, key: reference.key };
}

interface BodyDraft {
  height: string;
  weight: string;
}

const EMPTY_BODY_DRAFT: BodyDraft = { height: "", weight: "" };

// 身高体重存进 sessionStorage，刷新页面不用重填；其他信息不落盘。
function useStoredBodyDraft(key: string) {
  const [value, setValue] = useState<BodyDraft>(() => readBodyDraft(key));
  function update(next: BodyDraft) {
    setValue(next);
    writeBodyDraft(key, next);
  }
  return [value, update] as const;
}

function readBodyDraft(key: string): BodyDraft {
  if (typeof sessionStorage === "undefined") return EMPTY_BODY_DRAFT;
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (typeof parsed === "object" && parsed !== null) {
      const { height, weight } = parsed as Partial<BodyDraft>;
      if (typeof height === "string" && typeof weight === "string") return { height, weight };
    }
  } catch {
    // 存储内容损坏时按空值处理
  }
  return EMPTY_BODY_DRAFT;
}

function writeBodyDraft(key: string, value: BodyDraft) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

function BodySizeFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BodyDraft;
  onChange: (value: BodyDraft) => void;
}) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <Input
        aria-label={`${label}身高（厘米）`}
        className="h-11"
        inputMode="numeric"
        max={250}
        min={100}
        onChange={(event) => {
          onChange({ ...value, height: event.target.value });
        }}
        placeholder="身高 cm"
        step={1}
        type="number"
        value={value.height}
      />
      <Input
        aria-label={`${label}体重（公斤）`}
        className="h-11"
        inputMode="decimal"
        max={200}
        min={30}
        onChange={(event) => {
          onChange({ ...value, weight: event.target.value });
        }}
        placeholder="体重 kg"
        step={0.1}
        type="number"
        value={value.weight}
      />
    </div>
  );
}

function toBodySize({ height, weight }: BodyDraft) {
  return { height: parseBodyValue(height), weight: parseBodyValue(weight) };
}

function parseBodyValue(value: string) {
  if (value.trim() === "") return;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center gap-3 px-6">
      <span className="font-heading text-2xl tracking-[0.3em]">出片</span>
      <p className="text-muted-foreground text-sm">{children}</p>
    </main>
  );
}
