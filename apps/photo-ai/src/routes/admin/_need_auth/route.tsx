import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_need_auth")({
  head: () => {
    return {
      meta: [
        {
          title: "Admin",
        },
      ],
    };
  },
});
