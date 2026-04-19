import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05070d",
          900: "#0a0f1d",
          800: "#111827",
          700: "#1f2937"
        },
        accent: {
          400: "#8b5cf6",
          500: "#7c3aed",
          600: "#6d28d9"
        }
      },
      boxShadow: {
        glow: "0 0 60px rgba(124, 58, 237, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
