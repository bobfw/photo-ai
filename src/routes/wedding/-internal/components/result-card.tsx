import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { Button } from "#ui/button";

import "yet-another-react-lightbox/styles.css";

import type { PublicImage } from "../services/wedding.ts";
import { editGeneratedImage } from "../services/wedding.ts";

interface ResultCardProperties {
  code: string;
  image: PublicImage;
}

export function ResultCard({ code, image }: ResultCardProperties) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const editMutation = useMutation({
    mutationFn: (text: string) =>
      editGeneratedImage({ data: { code, imageId: image.id, instruction: text } }),
    onSuccess: () => {
      setInstruction("");
      void router.invalidate();
    },
  });

  const canEdit = image.remainingEdits > 0;
  const extension = image.url.split(".").pop() ?? "jpg";
  const filename = `婚纱照-${image.id}.${extension}`;

  return (
    <div className="space-y-3">
      <button
        aria-label="查看大图"
        className="block w-full cursor-zoom-in overflow-hidden rounded-2xl"
        onClick={() => {
          setIsPreviewOpen(true);
        }}
        type="button"
      >
        <img alt="生成的婚纱照" className="w-full object-cover" src={image.url} />
      </button>
      <Lightbox
        carousel={{ finite: true }}
        close={() => {
          setIsPreviewOpen(false);
        }}
        open={isPreviewOpen}
        plugins={[Zoom]}
        slides={[{ src: image.url }]}
      />
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs tracking-wide">
          还可修改 {image.remainingEdits} 次
        </p>
        <textarea
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 bg-background min-h-20 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canEdit || editMutation.isPending}
          onChange={(event) => {
            setInstruction(event.target.value);
          }}
          placeholder="描述想修改的地方…"
          value={instruction}
        />
        <div className="flex justify-between gap-2">
          <Button
            className="h-11 rounded-full px-4"
            render={<a download={filename} href={image.url} />}
            variant="outline"
          >
            下载
          </Button>
          <Button
            className="h-11 rounded-full px-4"
            disabled={!canEdit || instruction.trim().length === 0 || editMutation.isPending}
            onClick={() => {
              editMutation.mutate(instruction.trim());
            }}
            type="button"
          >
            {editMutation.isPending ? "修改中…" : "修改这张"}
          </Button>
        </div>
        {editMutation.error ? (
          <p className="text-destructive text-xs">{editMutation.error.message}</p>
        ) : undefined}
      </div>
    </div>
  );
}
