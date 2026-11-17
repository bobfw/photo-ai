import { createLazyFileRoute, Navigate, Outlet } from "@tanstack/react-router";

import { getApiKey } from "./-internal/api-key.ts";

export const Route = createLazyFileRoute("/admin/_need_auth")({
  component: NeedAuthLayout,
});

function NeedAuthLayout() {
  if (getApiKey() === "") return <Navigate replace to="/admin/login" />;
  return <Outlet />;
}
