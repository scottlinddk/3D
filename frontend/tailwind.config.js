/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette matching the gradient screenshot aesthetic
        brand: {
          pink: "#f472b6",
          blue: "#60a5fa",
          purple: "#a78bfa",
          indigo: "#818cf8",
        },
        surface: {
          DEFAULT: "rgba(255,255,255,0.85)",
          dark: "#0a0a0f",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh":
          "linear-gradient(135deg, #fce7f3 0%, #dbeafe 50%, #ede9fe 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px 0 rgba(0,0,0,0.06)",
        glow: "0 0 40px 10px rgba(139,92,246,0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
