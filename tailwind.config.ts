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
        cream: "oklch(97% 0.012 75)",
        blush: {
          DEFAULT: "oklch(88% 0.055 10)",
          mid: "oklch(82% 0.075 12)",
        },
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
        playfair: ["var(--font-playfair)", "Georgia", "serif"],
        poppins: ["var(--font-poppins)", "system-ui", "sans-serif"],
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
