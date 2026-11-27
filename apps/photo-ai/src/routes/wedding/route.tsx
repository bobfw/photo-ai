import { createFileRoute, Outlet } from "@tanstack/react-router";

import { WeddingPhotosProvider } from "./-internal/components/wedding-photos.tsx";

export const Route = createFileRoute("/wedding")({
  component: WeddingLayout,
});

function WeddingLayout() {
  return (
    <WeddingPhotosProvider>
      <Outlet />
    </WeddingPhotosProvider>
  );
}
