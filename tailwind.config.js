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
          // רקעים
          bg:       "#fbf4e6",
          surface:  "#ffffff",
          elevated: "#fef9ea",

          // טקסט
          ink:      "#1a1814",
          muted:    "#8a7e68",
          subtle:   "#a89878",

          // גבולות
          border:   "#ede5d0",
          divider:  "#f3ecd9",

          // מותג
          sunrise:  "#f5dd4b",
          coral:    "#ff6b47",
          heat:     "#d4541a",
          honey:    "#c79a00",

          // תפקוד
          success:  "#2f8d5f",
          warning:  "#d4541a",

          // legacycompat — בשימוש בקוד הקיים
          primary:  "#d4541a",
          soft:     "#fef9ea",
          accent:   "#f5dd4b",
          card:     "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Heebo", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl:   "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "none",
      },
    },
  },
  plugins: [],
};
