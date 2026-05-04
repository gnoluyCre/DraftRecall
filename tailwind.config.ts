import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        paper: "var(--color-paper)",
        line: "var(--color-line)",
        signal: "var(--color-signal)",
        moss: "var(--color-moss)",
        amber: "var(--color-amber)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        hairline: "inset 0 0 0 1px rgba(23,23,23,.08)"
      }
    }
  },
  plugins: []
};

export default config;
