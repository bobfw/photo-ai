import { createFileRoute, Outlet } from "@tanstack/react-router";

import { PortraitPhotoProvider } from "./-internal/components/portrait-photo.tsx";

export const Route = createFileRoute("/portrait")({
  component: PortraitLayout,
});

function PortraitLayout() {
  return (
    <PortraitPhotoProvider>
      <Outlet />
    </PortraitPhotoProvider>
  );
}
