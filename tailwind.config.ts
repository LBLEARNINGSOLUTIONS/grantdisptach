import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0f",
        sand: "#f3efe8",
        clay: "#d9c7b8",
        moss: "#305c4d",
        sun: "#f4c430",
        ember: "#d1432e",
        cool: "#1f3c88"
      }
    }
  },
  plugins: []
} satisfies Config;
