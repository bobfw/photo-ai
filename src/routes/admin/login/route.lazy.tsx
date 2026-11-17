import { useMutation } from "@tanstack/react-query";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "#ui/button";
import { Input } from "#ui/input";

import { setApiKey } from "../_need_auth/-internal/api-key.ts";
import { isUnauthorized } from "../_need_auth/-internal/auth.ts";
import { listVouchers } from "../_need_auth/-internal/services/admin.ts";

export const Route = createLazyFileRoute("/admin/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: async (key: string) => {
      await listVouchers({
        data: {
          key,
          page: 1,
          pageSize: 1,
          type: "all",
          distribution: "all",
          usage: "all",
        },
      });
      setApiKey(key);
      await navigate({ to: "/admin", replace: true });
    },
  });

  return (
    <main className="bg-background flex min-h-dvh flex-col">
      <form
        aria-labelledby="admin-login-title"
        className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6"
        onSubmit={(event) => {
          event.preventDefault();
          const key = new FormData(event.currentTarget).get("key");
          if (typeof key === "string") mutation.mutate(key);
        }}
      >
        <h1 className="font-heading text-center text-2xl" id="admin-login-title">
          凭证管理
        </h1>
        <label className="space-y-1.5" htmlFor="admin-api-key">
          <span className="text-muted-foreground text-xs">API Key</span>
          <Input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            autoFocus
            className="h-12 rounded-full px-5 font-mono text-base"
            enterKeyHint="done"
            id="admin-api-key"
            name="key"
            required
            spellCheck={false}
            type="password"
          />
        </label>
        <Button disabled={mutation.isPending} size="cta" type="submit">
          {mutation.isPending ? "验证中…" : "进入"}
        </Button>
        {mutation.error ? (
          <p className="text-destructive text-center text-sm" role="alert">
            {isUnauthorized(mutation.error) ? "API Key 不正确" : mutation.error.message}
          </p>
        ) : undefined}
      </form>
    </main>
  );
}
