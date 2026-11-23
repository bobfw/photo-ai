import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { isStoredImage } from "#services/images";

const ARK_IMAGE_HOST = "ark-acg-cn-beijing.tos-cn-beijing.volces.com";
const CACHE_CONTROL = "private, max-age=7200";

export const Route = createFileRoute("/media/$")({
  server: {
    handlers: {
      // 生成图统一从同源路径转流一次；Ark 没有 CORS 头，canvas 无法直接导出跨域图。
      GET: async ({ params }) => {
        const encoded = params._splat;
        if (!encoded) return new Response("Not Found", { status: 404 });

        let source: string;
        try {
          source = Buffer.from(encoded, "base64url").toString("utf8");
        } catch {
          return new Response("Not Found", { status: 404 });
        }

        // 新图片存在 R2 的 temp_24h/，超过 24 小时被生命周期删掉，404 是预期结果。
        if (isStoredImage(source)) {
          const object = await env.BUCKET.get(source);
          if (!object) return new Response("Not Found", { status: 404 });
          return new Response(object.body, {
            headers: { "Content-Type": "image/png", "Cache-Control": CACHE_CONTROL },
          });
        }

        let target: URL;
        try {
          target = new URL(source);
        } catch {
          return new Response("Not Found", { status: 404 });
        }
        if (target.protocol !== "https:" || target.hostname !== ARK_IMAGE_HOST) {
          return new Response("Not Found", { status: 404 });
        }

        const upstream = await fetch(target);
        if (!upstream.ok || !upstream.body) {
          return new Response("Bad Gateway", { status: 502 });
        }

        return new Response(upstream.body, {
          headers: { "Content-Type": "image/png", "Cache-Control": CACHE_CONTROL },
        });
      },
    },
  },
});
