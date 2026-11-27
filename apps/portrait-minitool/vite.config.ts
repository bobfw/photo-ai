import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig(({ command }) => ({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/main.tsx",
      fileName: () => "assets/main.js",
      cssFileName: "assets/style",
      formats: ["iife"],
      name: "PortraitMinitool",
    },
    target: ["es2017", "chrome61"],
  },
  // lib 模式默认保留 process.env.NODE_ENV；不定义会把 React 开发版打进 zip。
  define: command === "build" ? { "process.env.NODE_ENV": '"production"' } : undefined,
  plugins: [tanstackRouter({ autoCodeSplitting: false, target: "react" }), react()],
  preview: {
    host: "0.0.0.0",
    port: 5702,
  },
  server: {
    host: "0.0.0.0",
    port: 5702,
  },
}));
