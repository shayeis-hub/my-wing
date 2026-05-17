/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wing: {
          bg: "#f8fbff",
          card: "#ffffff",
          accent: "#7dd3fc",
          primary: "#0ea5e9",
          soft: "#e0f2fe",
          muted: "#94a3b8",
          danger: "#f87171",
          success: "#34d399",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(14,165,233,0.08)",
        "card-hover": "0 4px 24px 0 rgba(14,165,233,0.14)",
      },
    },
  },
  plugins: [],
};
