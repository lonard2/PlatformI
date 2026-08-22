import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        transit: {
          mrt: "#E11924",
          lrtJbCb: "#0055A5",
          lrtJbBk: "#009A44",
          lrtJkt: "#ED1B24",
          krlBogor: "#ED1C24",
          krlCikarang: "#0072CE",
          krlRangkas: "#00A651",
          krlTangerang: "#8B4513",
          krlTgPriok: "#E91E63",
          whoosh: "#C41230",
          airportRail: "#008080",
          intercityRail: "#DAA520",
          tjBrt: "#0055A5",
          tjNonBrt: "#FF7700",
          mikrotrans: "#00A39D",
          akapBus: "#6366F1",
          shuttle: "#06B6D4",
          aviation: "#0EA5E9",
          maritime: "#0284C7",
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
