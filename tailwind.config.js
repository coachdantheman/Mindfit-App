/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — theme automatically via CSS vars in globals.css
        page: 'rgb(var(--bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
        },
        edge: {
          DEFAULT: 'var(--border)',
          muted: 'var(--border-muted)',
        },
        fg: {
          1: 'rgb(var(--fg-1) / <alpha-value>)',
          2: 'rgb(var(--fg-2) / <alpha-value>)',
          3: 'rgb(var(--fg-3) / <alpha-value>)',
          4: 'rgb(var(--fg-4) / <alpha-value>)',
          inverse: 'rgb(var(--fg-inverse) / <alpha-value>)',
        },
        cta: 'rgb(var(--cta-rgb) / <alpha-value>)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
          6: 'var(--chart-6)',
        },
        brand: {
          50:  '#f9f7e8',
          100: '#f0ebcc',
          500: '#9A8B00',
          600: 'rgb(var(--cta-hover-rgb) / <alpha-value>)',
          700: '#7a6e00',
          900: '#3d3700',
        },
        mindfit: {
          bg: 'rgb(var(--bg) / <alpha-value>)',
          gold: '#9A8B00',
          'gold-bright': '#C4B400',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
