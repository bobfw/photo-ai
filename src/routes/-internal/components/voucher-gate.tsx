import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#ui/button";
import { Card, CardContent } from "#ui/card";
import { Input } from "#ui/input";

interface VoucherGateProperties {
  error?: string;
}

export function VoucherGate({ error }: VoucherGateProperties) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-16">
      <header className="mb-8 space-y-3 text-center">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">上相</h1>
        <p className="text-muted-foreground text-sm">AI 婚纱照 · 上传照片，生成属于你们的婚纱照</p>
      </header>
      <Card>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const value = code.trim();
              if (value) void navigate({ to: "/", search: { code: value } });
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">凭证码</span>
              <Input
                autoComplete="off"
                autoFocus
                onChange={(event) => {
                  setCode(event.target.value);
                }}
                placeholder="输入购买后收到的凭证码"
                value={code}
              />
            </label>
            {error ? <p className="text-destructive text-sm">{error}</p> : undefined}
            <Button className="w-full" disabled={code.trim().length === 0} type="submit">
              开始生成
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-muted-foreground mt-6 text-center text-xs">
        凭证可在网店购买，一个凭证可生成多张婚纱照。
      </p>
    </main>
  );
}
