/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          600: "#0d6e8e",
          700: "#0e5a74",
        },
        coral: {
          500: "#ff6b4a",
        },
      },
    },
  },
  plugins: [],
};
