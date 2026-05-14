import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#0071e3',
          black: '#1d1d1f',
          gray: '#86868b',
          bg: '#f5f5f7',
          card: '#fbfbfd',
          line: 'rgba(29, 29, 31, 0.1)',
          green: '#248a3d',
          orange: '#b15b00',
          red: '#d70015',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        apple: 'var(--radius-card)',
        'apple-panel': 'var(--radius-panel)',
        'apple-hero': 'var(--radius-hero)',
        'apple-media': 'var(--radius-media)',
      },
      boxShadow: {
        apple: 'var(--shadow-card)',
        'apple-hover': 'var(--shadow-card-hover)',
        'apple-soft': 'var(--shadow-soft)',
      },
    },
  },
  plugins: [],
} satisfies Config
