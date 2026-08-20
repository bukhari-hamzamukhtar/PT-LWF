/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        topi: {
          void: "#050406",
          black: "#0A0810",
          surface: "#121016",
          "surface-2": "#1B171F",
          "surface-3": "#242028",
          border: "#2C2730",
          "border-strong": "#3A333D",
          text: "#F5F1EA",
          muted: "#A79EA8",
          faint: "#6E6670",
          orange: {
            50: "#FFF3EB",
            100: "#FFE1CC",
            200: "#FFC199",
            300: "#FF9F5C",
            400: "#FF7E2E",
            500: "#FF5A0A",
            600: "#E8460A",
            700: "#C13508",
            800: "#8F2707",
            900: "#5F1B08",
            950: "#2E0D04",
          },
          amber: "#FFB020",
          danger: "#FF4D4D",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "topi-glow":
          "radial-gradient(60% 50% at 15% 10%, rgba(255,90,10,0.24) 0%, rgba(255,90,10,0) 60%), radial-gradient(45% 40% at 85% 0%, rgba(255,176,32,0.16) 0%, rgba(255,176,32,0) 60%), radial-gradient(80% 60% at 50% 100%, rgba(255,90,10,0.10) 0%, rgba(5,4,6,0) 60%)",
        "topi-grain":
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")",
        "topi-fade-down":
          "linear-gradient(180deg, rgba(5,4,6,0) 0%, #050406 100%)",
      },
      boxShadow: {
        "glow-orange": "0 0 0 1px rgba(255,90,10,0.35), 0 8px 30px -8px rgba(255,90,10,0.45)",
        "glow-orange-lg": "0 0 60px -10px rgba(255,90,10,0.55)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 24px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 3.5s ease-in-out infinite",
        "rise-in": "rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        shake: "shake 0.4s ease-in-out",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
