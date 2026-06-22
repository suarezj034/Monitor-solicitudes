import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edf7f2",
          100: "#d2ebe0",
          200: "#a6d7c1",
          300: "#6fbb9c",
          400: "#3ba076",
          500: "#1c855c",
          600: "#157a52",
          700: "#0f5e3f",
          800: "#0c4b33",
          900: "#093b28",
        },
      },
    },
  },
  plugins: [],
};

export default config;
