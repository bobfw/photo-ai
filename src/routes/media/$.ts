import { createFileRoute } from "@tanstack/react-router";

const ARK_IMAGE_HOST = "ark-acg-cn-beijing.tos-cn-beijing.volces.com";
const CACHE_CONTROL = "private, max-age=7200";

export const Route = createFileRoute("/media/$")({
  server: {
    handlers: {
      // Ark 图片没有 CORS 头，canvas 无法导出；用同源路径转流一次。
      GET: async ({ request, params }) => {
        const encoded = params._splat;
        if (!encoded) return new Response("Not Found", { status: 404 });

        let target: URL;
        try {
          target = new URL(Buffer.from(encoded, "base64url").toString("utf8"));
        } catch {
          return new Response("Not Found", { status: 404 });
        }
        if (target.protocol !== "https:" || target.hostname !== ARK_IMAGE_HOST) {
          return new Response("Not Found", { status: 404 });
        }

        // Ark 地址不会变，按代理路径生成 ETag；命中时不必回源下载整张图。
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(encoded));
        const etag = `"${Buffer.from(digest).toString("base64url")}"`;
        const cacheHeaders = { ETag: etag, "Cache-Control": CACHE_CONTROL };
        if (request.headers.get("if-none-match") === etag) {
          return new Response(undefined, { status: 304, headers: cacheHeaders });
        }

        const upstream = await fetch(target);
        if (!upstream.ok || !upstream.body) {
          return new Response("Bad Gateway", { status: 502 });
        }

        return new Response(upstream.body, {
          headers: { ...cacheHeaders, "Content-Type": "image/png" },
        });
      },
    },
  },
});
