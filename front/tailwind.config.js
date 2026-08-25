/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // ── Colores EXACTOS originales del Login (NO MODIFICAR) ─────
        surface: "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-container": "#e5eeff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container-high": "#dce9ff",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#44474d",
        outline: "#74777e",
        "outline-variant": "#c4c6cd",
        primary: "#0b1d33",
        "on-primary": "#ffffff",
        "primary-container": "#0b1d33",
        secondary: "#964900",
        "secondary-container": "#ff8928",
        "on-secondary": "#ffffff",
        error: "#ba1a1a",
        background: "#f8f9ff",

        // ── Colores adicionales para el Dashboard (Stitch AI) ──────
        "sidebar-bg": "#051021",
        "income-green": "#16a34a",
        "expense-red": "#dc2626",
        "border-subtle": "#e0e3e5",
        "tertiary-fixed-dim": "#bbc7dd",
        "tertiary-text": "#505f77",
        "primary-orange": "#ff7a00",
      },
      fontFamily: {
        "headline-xl": ["Hanken Grotesk", "sans-serif"],
        "headline-lg": ["Hanken Grotesk", "sans-serif"],
        "headline-md": ["Hanken Grotesk", "sans-serif"],
        "headline-sm": ["Hanken Grotesk", "sans-serif"],
        "body-lg": ["Manrope", "sans-serif"],
        "body-md": ["Manrope", "sans-serif"],
        "body-sm": ["Manrope", "sans-serif"],
        "label-md": ["JetBrains Mono", "monospace"],
        inter: ["Inter", "sans-serif"],
      },
      spacing: {
        xs: "4px",
        sm: "12px",
        md: "24px",
        lg: "48px",
        xl: "80px",
        margin: "32px",
      },
    },
  },
  plugins: [],
};
