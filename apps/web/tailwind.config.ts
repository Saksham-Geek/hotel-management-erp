import type { Config } from 'tailwindcss';

// Design tokens. Hotel operations tool: cool, quiet surfaces so the room status colours do the talking.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#EDF0F2',
        surface: '#FFFFFF',
        ink: '#1C2B36',
        muted: '#5D6E7B',
        line: '#D5DCE1',
        lagoon: { DEFAULT: '#0E6A73', dark: '#0A545B', tint: '#E2F1F2' },
        brass: '#9C6B1F',
        status: { ready: '#2F7D5C', occupied: '#2B5DA8', cleaning: '#B98312', out: '#6B7885' },
        danger: '#A63A2B',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
