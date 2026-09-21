import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0B090B", 900: "#151015" },
        plum: { 900: "#241620", 800: "#4B2237", 700: "#743B57" },
        rose: { 500: "#A95D7C", 300: "#DCAFC0" },
        cream: "#F6EEF2",
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          "system-ui",
          "sans-serif",
        ],
      },
      letterSpacing: { tightest: "-0.05em" },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
        cine: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      boxShadow: {
        soft: "0 24px 60px -24px rgba(0,0,0,0.65)",
        glow: "0 0 80px -10px rgba(169,93,124,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
