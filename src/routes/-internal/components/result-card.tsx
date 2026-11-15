import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "#ui/button";
import { Card, CardContent } from "#ui/card";

import type { PublicImage } from "../services/wedding.ts";
import { editGeneratedImage } from "../services/wedding.ts";

interface ResultCardProperties {
  code: string;
  image: PublicImage;
}

export function ResultCard({ code, image }: ResultCardProperties) {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");

  const editMutation = useMutation({
    mutationFn: (text: string) =>
      editGeneratedImage({ data: { code, imageId: image.id, instruction: text } }),
    onSuccess: () => {
      setInstruction("");
      void queryClient.invalidateQueries({ queryKey: ["voucher", code] });
    },
  });

  const canEdit = image.remainingEdits > 0;

  return (
    <Card className="gap-0 py-0">
      <img alt="生成的婚纱照" className="w-full object-cover" src={image.url} />
      <CardContent className="space-y-2 py-3">
        <p className="text-muted-foreground text-xs">还可修改 {image.remainingEdits} 次</p>
        <textarea
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full resize-y rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canEdit || editMutation.isPending}
          onChange={(event) => {
            setInstruction(event.target.value);
          }}
          placeholder="描述想修改的地方，例如：把背景换成黄昏、头纱再长一点"
          value={instruction}
        />
        <Button
          disabled={!canEdit || instruction.trim().length === 0 || editMutation.isPending}
          onClick={() => {
            editMutation.mutate(instruction.trim());
          }}
          size="sm"
          type="button"
        >
          {editMutation.isPending ? "修改中…" : "修改这张"}
        </Button>
        {editMutation.error ? (
          <p className="text-destructive text-xs">{editMutation.error.message}</p>
        ) : undefined}
      </CardContent>
    </Card>
  );
}
