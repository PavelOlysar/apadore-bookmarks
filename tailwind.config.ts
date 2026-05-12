import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#0A0A5C",
          muted: "#5a5a7a",
          faint: "#9999b0",
        },
        paper: {
          DEFAULT: "#F6F5EE",
          card: "#FFFEF8",
        },
        rule: "#dedccf",
      },
      letterSpacing: {
        wider: "0.08em",
        widest: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
