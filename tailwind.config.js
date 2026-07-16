/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './garden.html', './bloom.html', './meadow.html', './scene.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leaf: { 50:'#f2f9ee',100:'#e0f0d6',300:'#a7d78f',500:'#63a844',600:'#4d8a33',700:'#3c6b29' },
        bloom: { 300:'#f9a8d4',400:'#f472b6',500:'#ec4899' },
        soil: { 800:'#3a2e26',900:'#241c17' },
      },
      fontFamily: { sans: ['"Noto Sans TC"','system-ui','sans-serif'] },
    },
  },
  plugins: [],
};
