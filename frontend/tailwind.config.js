/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'nba-orange': '#f97316',
        'court-dark': '#0f1117',
        'court-gray': '#1a1d27',
        'court-card': '#1e2130',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
