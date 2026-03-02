import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // Include workspace UI package source so Tailwind sees all class names
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Andaman teal — matches AndamanBazaar theme tokens
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#0d9e8a",
          600: "#0d6e8e",
          700: "#0e5a74",
          800: "#134e62",
          900: "#144356",
          950: "#092a38",
        },
        coral: {
          50: "#fff4f2",
          100: "#ffe5df",
          500: "#ff6b4a",
          600: "#f04830",
          700: "#cb3420",
        },
        sandy: {
          400: "#f5c842",
          500: "#eaaa15",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
