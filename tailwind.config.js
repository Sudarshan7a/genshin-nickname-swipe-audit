/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        dim: 'var(--dim)',
        ember: 'var(--ember)',
        gold: 'var(--gold)',
        heard: 'var(--heard)',
        never: 'var(--never)',
        unsure: 'var(--unsure)',
        rule: 'var(--rule)',
      },
      fontFamily: {
        shout: ['Anton', 'system-ui', 'sans-serif'],
        whisper: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: { rule: '2px', stamp: '10px', sheet: '14px' },
    },
  },
  plugins: [],
};
