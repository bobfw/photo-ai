import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";

  return {
    // The Cloudflare plugin starts the Workers runtime, which crashes Vitest.
    plugins: isTest
      ? []
      : [
          cloudflare({ viteEnvironment: { name: "ssr" } }),
          tanstackStart({ spa: { enabled: true } }),
          react(),
          tailwindcss(),
        ],
    server: {
      port: 5701,
      host: "0.0.0.0",
    },
    test: {
      // Tests run in Node, so provide the Worker bindings they import.
      alias: {
        "cloudflare:workers": fileURLToPath(
          new URL("src/test/cloudflare-workers.ts", import.meta.url),
        ),
      },
    },
  };
});
