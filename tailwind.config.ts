import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand (Fase 1) ────────────────────────────
        onyx:   '#0A0A0A',
        cream:  '#F6F2EC',
        sand:   '#ECE6DC',
        silver: '#C9C4BC',
        blush:  '#B89A8F',
        // ── Legacy (mantido pra compatibilidade) ──────
        gold: {
          DEFAULT: "oklch(72% 0.115 75)",
          light: "oklch(88% 0.07 80)",
        },
        mauve: {
          DEFAULT: "oklch(36% 0.06 340)",
          dark: "oklch(24% 0.05 340)",
        },
        ink: {
          DEFAULT: "oklch(22% 0.04 340)",
          mid: "oklch(50% 0.04 340)",
          light: "oklch(72% 0.025 340)",
        },
        parchment: "oklch(99% 0.005 75)",
        rim: "oklch(90% 0.02 75)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        italic:  ["var(--font-italic)", "Georgia", "serif"],
        // legacy aliases
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        poppins:  ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
