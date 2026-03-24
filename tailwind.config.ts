import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Fraunces", "serif"],
        mono: ["DM Mono", "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#0c0c0a",
          2: "#111110",
          3: "#171715",
          4: "#1e1e1b",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          2: "rgba(255,255,255,0.13)",
        },
        accent: {
          DEFAULT: "#a8f07a",
          2: "#7af0b8",
        },
        nudge: {
          amber: "#f0c97a",
          red: "#f07a7a",
          blue: "#7ab8f0",
          muted: "#5a5650",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "pulse-dot": "pulseDot 2s infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
