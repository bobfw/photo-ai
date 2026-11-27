import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      borderColor: {
        DEFAULT: "var(--color-line)",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.04)",
        sheet: "0 -12px 40px rgba(0, 0, 0, 0.18)",
        stage: "0 8px 24px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        bg: "var(--color-bg)",
        brand: "var(--color-brand)",
        "brand-soft": "var(--color-brand-soft)",
        "brand-strong": "var(--color-brand-strong)",
        faint: "var(--color-faint)",
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        inverse: "var(--color-inverse)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        surface: "var(--color-surface)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
