import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{html,ts,tsx}", "../../packages/portrait-editor/src/**/*.{ts,tsx}"],
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
        accent: "var(--color-brand-soft)",
        "accent-foreground": "var(--color-brand-strong)",
        background: "var(--color-bg)",
        bg: "var(--color-bg)",
        border: "var(--color-line)",
        brand: "var(--color-brand)",
        "brand-soft": "var(--color-brand-soft)",
        "brand-strong": "var(--color-brand-strong)",
        card: "var(--color-surface)",
        "card-foreground": "var(--color-ink)",
        destructive: "var(--color-brand-strong)",
        faint: "var(--color-faint)",
        foreground: "var(--color-ink)",
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        input: "var(--color-line)",
        inverse: "var(--color-inverse)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-ink-soft)",
        primary: "var(--color-brand)",
        "primary-foreground": "var(--color-inverse)",
        ring: "var(--color-brand)",
        secondary: "var(--color-muted)",
        "secondary-foreground": "var(--color-ink)",
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
