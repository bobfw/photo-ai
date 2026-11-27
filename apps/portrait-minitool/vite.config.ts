import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const root = fileURLToPath(new URL(".", import.meta.url));
const distribution = path.resolve(root, "dist");

// Tailwind 3 的任意色值仍会输出 rgb(r g b / a)，Chrome 61 只认 rgba(r,g,b,a)。
function makeChrome61Css(css: string) {
  const converted = css
    .replaceAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([^)]+)\)/g, "rgba($1, $2, $3, $4)")
    .replaceAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\)/g, "rgb($1, $2, $3)")
    .replaceAll(
      /hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\/\s*([^)]+)\)/g,
      "hsla($1, $2%, $3%, $4)",
    );

  if (
    converted.includes("oklch(") ||
    converted.includes("color-mix(") ||
    converted.includes("@layer") ||
    converted.includes("@property")
  ) {
    throw new Error("Tailwind CSS 包含 Chrome 61 不支持的语法");
  }

  return converted;
}

const minitoolAssets = {
  name: "minitool-assets",
  apply: "build" as const,
  closeBundle() {
    mkdirSync(path.resolve(distribution, "assets"), { recursive: true });
    copyFileSync(path.resolve(root, "src/index.html"), path.resolve(distribution, "index.html"));
    copyFileSync(
      path.resolve(root, "src/polyfills.js"),
      path.resolve(distribution, "assets/polyfills.js"),
    );

    execFileSync(
      path.resolve(root, "node_modules/.bin/tailwindcss"),
      [
        "-i",
        path.resolve(root, "src/style.css"),
        "-o",
        path.resolve(distribution, "assets/style.css"),
        "--minify",
      ],
      { cwd: root, stdio: "inherit" },
    );

    const cssPath = path.resolve(distribution, "assets/style.css");
    writeFileSync(cssPath, makeChrome61Css(readFileSync(cssPath, "utf8")));
  },
};

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: path.resolve(root, "src/main.tsx"),
      fileName: () => "assets/main.js",
      formats: ["iife"],
      name: "PortraitMinitool",
    },
    target: ["es2017", "chrome61"],
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  plugins: [tanstackRouter({ autoCodeSplitting: false, target: "react" }), react(), minitoolAssets],
  preview: {
    host: "0.0.0.0",
    port: 5702,
  },
});
