/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#f3e9d2',
        gold: '#c9a227'
      }
    }
  },
  plugins: []
};
