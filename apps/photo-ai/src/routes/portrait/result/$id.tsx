import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, History, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { CenteredMessage } from "#components/centered-message";
import { RetryImage } from "#components/retry-image";
import { useImageSource } from "#hooks/use-image-source";
import { proxyImageUrl } from "#lib/image-proxy";
import { cn } from "#lib/utils";
import { Button } from "#ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "#ui/dialog";

import { editPortraitImage, loadPortraitState } from "../-internal/services/portrait.ts";
import { findPortraitStyle } from "../-internal/services/styles.ts";
import { PortraitPhotoEditor } from "./-internal/editor/portrait-editor.tsx";

/* oxlint-disable typescript/only-throw-error -- TanStack Router 的 redirect 必须 throw */

export const Route = createFileRoute("/portrait/result/$id")({
  validateSearch: z.object({ code: z.string().optional() }),
  loaderDeps: ({ search }) => ({ code: search.code }),
  loader: async ({ params, deps: { code } }) => {
    const { code: validCode, state } = await loadPortraitState(code);
    const imageId = z.coerce.number().int().positive().safeParse(params.id);
    const image = imageId.success
      ? state.images.find((item) => item.id === imageId.data)
      : undefined;
    if (!image) {
      throw redirect({ to: "/portrait", search: { code: validCode } });
    }
    return { code: validCode, image };
  },
  pendingComponent: () => <CenteredMessage>正在读取照片…</CenteredMessage>,
  component: PortraitResultPage,
});

function PortraitResultPage() {
  const { code, image: initialImage } = Route.useLoaderData();
  const navigate = useNavigate();
  const [image, setImage] = useState(initialImage);
  const styleTitle = findPortraitStyle(image.series)?.title ?? image.series;
  // 展示和 canvas 都走 CORS 代理；Ark 没有 CORS 头，canvas 无法直接导出
  const rawImageSource = proxyImageUrl(image.sourceUrl ?? image.url);
  const { image: source, error: sourceError, retry } = useImageSource(rawImageSource);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const bannerError = error || (source ? sourceError : "");
  const isShowSourceRetry = !error && Boolean(sourceError) && Boolean(source);

  useEffect(() => {
    setError("");
  }, [rawImageSource]);

  const handleEditorError = useCallback((value: unknown) => {
    setError(value instanceof Error ? value.message : "操作失败，请重试");
  }, []);

  const editMutation = useMutation({
    mutationFn: (text: string) =>
      editPortraitImage({ data: { code, imageId: image.id, url: image.url, instruction: text } }),
    onSuccess: (updated) => {
      setInstruction("");
      setImage(updated);
      setIsModifyOpen(false);
    },
  });

  const isModifying = editMutation.isPending;
  const editDisabled = isModifying || image.remainingEdits === 0 || instruction.trim() === "";

  function goBack() {
    void navigate({ to: "/portrait", search: { code }, replace: true });
  }

  function selectVersion(url: string, sourceUrl: string | undefined) {
    setImage({ ...image, url, sourceUrl });
    setIsModifyOpen(false);
  }

  return (
    <main className="editor-dark bg-background text-foreground flex h-dvh flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-xl shrink-0 items-center gap-1 px-2 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <Button
          aria-label="返回"
          className="size-11"
          onClick={goBack}
          size="icon-lg"
          type="button"
          variant="ghost"
        >
          <ArrowLeft aria-hidden />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base leading-tight font-semibold">
          形象照 · {styleTitle}
        </h1>
        <Button
          aria-label="历史版本与修改"
          className="h-11 shrink-0 gap-1.5 rounded-full px-3 text-xs"
          onClick={() => {
            setIsModifyOpen(true);
          }}
          type="button"
          variant="outline"
        >
          <History aria-hidden className="size-4" />
          版本
        </Button>
      </header>

      <div className="mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto">
        <div className="px-4 pt-1 pb-[max(1rem,var(--safe-bottom))]">
          {bannerError ? (
            <div
              className="border-border bg-card text-destructive mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
              role="alert"
            >
              <span className="min-w-0">{bannerError}</span>
              {isShowSourceRetry ? (
                <button
                  className="bg-muted text-foreground inline-flex min-h-11 shrink-0 items-center rounded-full px-4 font-medium"
                  onClick={retry}
                  type="button"
                >
                  重试
                </button>
              ) : undefined}
            </div>
          ) : undefined}

          {source ? (
            <PortraitPhotoEditor
              onError={handleEditorError}
              source={source}
              styleTitle={styleTitle}
            />
          ) : (
            <div
              className="text-muted-foreground flex min-h-64 flex-col items-center justify-center gap-3 text-sm"
              role={sourceError ? "alert" : "status"}
            >
              {sourceError ? (
                <>
                  <p className="text-destructive m-0 text-sm">{sourceError}</p>
                  <button
                    className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold"
                    onClick={retry}
                    type="button"
                  >
                    重新加载
                  </button>
                </>
              ) : (
                <>
                  <Loader2 aria-hidden className="size-6 animate-spin motion-reduce:animate-none" />
                  <span>正在读取照片…</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog
        disablePointerDismissal={isModifying}
        onOpenChange={(open) => {
          setIsModifyOpen(open);
          // 请求还在跑时保留状态，否则关掉弹窗后按钮会重新可点，重复扣次数
          if (open || isModifying) {
            return;
          }

          editMutation.reset();
        }}
        open={isModifyOpen}
      >
        <DialogContent className="editor-dark max-h-[calc(100dvh_-_2rem)] overflow-y-auto">
          <DialogTitle>版本与修改</DialogTitle>
          <DialogClose
            render={
              <Button
                aria-label="关闭"
                className="absolute top-2 right-2 size-11"
                size="icon-lg"
                type="button"
                variant="ghost"
              />
            }
          >
            <X aria-hidden />
          </DialogClose>
          <DialogDescription>
            切换历史版本，或写提示词微调；每次修改都会生成一个新版本。
          </DialogDescription>

          {image.versions.length > 1 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">历史版本</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {image.versions.map((version, index) => {
                  const isCurrent = version.url === image.url;
                  return (
                    <button
                      aria-label={`切换到第 ${index + 1} 版`}
                      aria-pressed={isCurrent}
                      className={cn(
                        "border-border relative w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border",
                        isCurrent && "inset-ring-primary inset-ring-2",
                      )}
                      disabled={isModifying}
                      key={version.url}
                      onClick={() => {
                        selectVersion(version.url, version.sourceUrl);
                      }}
                      type="button"
                    >
                      <RetryImage
                        alt={`第 ${index + 1} 版`}
                        className="w-full"
                        src={version.sourceUrl ? proxyImageUrl(version.sourceUrl) : version.url}
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                        {isCurrent ? "当前" : `第${index + 1}版`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : undefined}

          {isModifying ? (
            <div
              aria-live="polite"
              className="bg-secondary/60 flex items-start gap-2 rounded-xl p-3 text-[13px] leading-5"
              role="status"
            >
              <Loader2
                aria-hidden
                className="text-primary mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none"
              />
              <span>
                正在修改这张图…
                <span className="text-muted-foreground block">
                  预计 20 秒–2 分钟，请勿刷新页面。
                </span>
              </span>
            </div>
          ) : undefined}
          <div className="space-y-2">
            <p className="text-sm font-medium">调整细节（写提示词）</p>
            <textarea
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isModifying || image.remainingEdits === 0}
              maxLength={500}
              onChange={(event) => {
                setInstruction(event.target.value);
              }}
              placeholder="例如：笑容再自然一点、领带换个颜色、脸不要修得太尖"
              value={instruction}
            />
            <Button
              className="h-11 w-full"
              disabled={editDisabled}
              onClick={() => {
                editMutation.mutate(instruction.trim());
              }}
              type="button"
            >
              {editMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  修改中…
                </span>
              ) : (
                "修改这张图"
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">{modifyHintText(image.remainingEdits)}</p>
          {editMutation.error ? (
            <p className="text-destructive text-[13px] leading-5" role="alert">
              {editMutation.error.message}
            </p>
          ) : undefined}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function modifyHintText(remainingEdits: number) {
  if (remainingEdits === 0) return "修改次数已用完。";
  return `还可修改 ${remainingEdits} 次，每次修改都会生成一个新版本。`;
}
