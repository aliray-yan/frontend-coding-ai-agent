/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./apps/desktop/src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#11100e",
          900: "#171613",
          850: "#1e1c18",
          800: "#26231e"
        },
        brass: "#d8ad57",
        fern: "#54c18a",
        tide: "#58b8c9",
        coral: "#e47f6a"
      },
      boxShadow: {
        soft: "0 22px 80px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
};
