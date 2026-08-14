/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './garden.html',
    './bloom.html',
    './meadow.html',
    './scene.html',
    './atelier.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: '#f2f9ee',
          100: '#e0f0d6',
          300: '#a7d78f',
          500: '#63a844',
          600: '#4d8a33',
          700: '#3c6b29',
        },
        bloom: { 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899' },
        soil: { 800: '#3a2e26', 900: '#241c17' },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: { sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
