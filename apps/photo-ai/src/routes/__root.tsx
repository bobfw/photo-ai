import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "#ui/button";
import { Toaster } from "#ui/toast";

import "../styles/globals.css";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  shellComponent: RootDocument,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <link href="/favicon.png" rel="icon" type="image/png" />
        <meta content="width=device-width, initial-scale=1.0, viewport-fit=cover" name="viewport" />
        <meta content="#ffffff" name="theme-color" />
        <meta content="light" name="color-scheme" />
        <title>出片 · AI</title>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">页面不存在</h1>
        <p className="text-muted-foreground text-sm">这个地址没有对应的页面，请检查后重试。</p>
      </header>
      <Button className="w-full max-w-xs" nativeButton={false} render={<Link to="/" />} size="cta">
        回首页
      </Button>
    </main>
  );
}

function ErrorPage({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">出了点问题</h1>
        <p className="text-muted-foreground text-sm">页面没能正常加载，请稍后重试。</p>
        {import.meta.env.DEV ? (
          <p className="text-muted-foreground/70 text-xs">{message}</p>
        ) : undefined}
      </header>
      <div className="flex w-full gap-2">
        <Button className="h-11 flex-1" onClick={reset}>
          重试
        </Button>
        <Button
          className="h-11 flex-1"
          nativeButton={false}
          render={<Link to="/" />}
          variant="outline"
        >
          回首页
        </Button>
      </div>
    </main>
  );
}
