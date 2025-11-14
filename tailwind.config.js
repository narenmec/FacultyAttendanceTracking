/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#f7fafc',
        'secondary': '#ffffff',
        'accent': '#e2e8f0',
        'highlight': '#38b2ac',
        'text-primary': '#2d3748',
        'text-secondary': '#718096',
      },
    },
  },
  plugins: [],
}
