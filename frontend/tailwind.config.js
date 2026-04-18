/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#f472b6",
          blue: "#60a5fa",
          purple: "#a78bfa",
          indigo: "#818cf8",
          orange: "#e85d26",
          green: "#a3e635",
        },
        // Semantic surface tokens (referenced in components via dark: prefix)
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f7f8fa",
          dark: "#1c1c1c",
          "dark-secondary": "#252525",
          page: "#edf0f7",
          "page-dark": "#0f0f0f",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(0,0,0,0.06)",
        "card-dark": "0 2px 12px 0 rgba(0,0,0,0.4)",
        glow: "0 0 40px 10px rgba(139,92,246,0.3)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
