import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params._splat;
        if (!key) return new Response("Not Found", { status: 404 });

        const object = await env.BUCKET.get(key);
        if (!object) return new Response("Not Found", { status: 404 });

        return new Response(object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
