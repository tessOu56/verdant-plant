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
    './node_modules/@is_tess/components/dist/**/*.{js,mjs}',
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
        brand: {
          50: 'var(--surface-canvas, #f3faf4)',
          100: 'var(--surface-muted, #e2f0e6)',
          700: 'var(--accent-strong, #2a6438)',
        },
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
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: [
          'var(--type-display-size, 2.25rem)',
          {
            lineHeight: 'var(--type-display-leading, 1.25)',
            letterSpacing: 'var(--type-display-tracking, -0.01em)',
          },
        ],
        title: [
          'var(--type-title-size, 1.5rem)',
          {
            lineHeight: 'var(--type-title-leading, 1.4)',
            letterSpacing: 'var(--type-title-tracking, -0.01em)',
          },
        ],
        label: [
          'var(--type-label-size, 0.875rem)',
          {
            lineHeight: 'var(--type-label-leading, 1.4)',
            letterSpacing: 'var(--type-label-tracking, 0em)',
          },
        ],
      },
      spacing: {
        gutter: 'var(--space-gutter, 2.5rem)',
        stack: 'var(--space-stack, 1.25rem)',
        'stack-dense': 'var(--space-stack-dense, 0.75rem)',
      },
    },
  },
  plugins: [],
};
