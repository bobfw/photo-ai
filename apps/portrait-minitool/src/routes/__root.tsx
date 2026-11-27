import { createRootRoute, Outlet } from "@tanstack/react-router";

import { PortraitSessionProvider } from "../portrait-session.tsx";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <PortraitSessionProvider>
      <Outlet />
    </PortraitSessionProvider>
  );
}
