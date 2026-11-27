import { defineConfig } from "vite-plus";

import { deferOxlintConfig } from "./scripts/oxlint.rules.ts";

export default defineConfig({
  fmt: {
    sortImports: true,
    sortTailwindcss: true,
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "**/drizzle/**",
      "**/worker-configuration.d.ts",
      "**/.claude/**",
    ],
  },
  lint: {
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      ...deferOxlintConfig.jsPlugins,
    ],
    rules: { "vite-plus/prefer-vite-plus-imports": "error", ...deferOxlintConfig.rules },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: [
      "**/routeTree.gen.ts",
      "**/drizzle/**",
      "**/worker-configuration.d.ts",
      "**/.claude/**",
    ],
    overrides: [
      {
        // shadcn conventions require lib/utils.ts
        files: ["**/src/lib/utils.ts"],
        rules: { "unicorn-js/name-replacements": "off" },
      },
      {
        // shadcn/ui vendored components use their own naming and browser patterns
        files: ["**/src/components/ui/**", "**/src/hooks/**"],
        rules: {
          "no-unused-expressions": "off",
          "unicorn/max-nested-calls": "off",
          "unicorn/no-document-cookie": "off",
          "unicorn/no-null": "off",
          "unicorn/prefer-global-this": "off",
          "unicorn-js/consistent-boolean-name": "off",
          "unicorn-js/name-replacements": "off",
        },
      },
    ],
  },
  run: {
    cache: { scripts: false, tasks: true },
  },
});
