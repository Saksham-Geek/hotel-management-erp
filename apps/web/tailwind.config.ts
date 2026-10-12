import type { Config } from 'tailwindcss';

// Design tokens. Hotel operations tool: cool, quiet surfaces so the room status colours do the talking.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: 'hsl(var(--background) / <alpha-value>)',
        surface: 'hsl(var(--card) / <alpha-value>)',
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        ink: 'hsl(var(--foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted-foreground) / <alpha-value>)',
        line: 'hsl(var(--border) / <alpha-value>)',
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
          accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        lagoon: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          dark: 'hsl(var(--accent-strong) / <alpha-value>)',
          tint: 'hsl(var(--accent-soft) / <alpha-value>)',
        },
        brass: 'hsl(var(--warning) / <alpha-value>)',
        status: {
          ready: 'hsl(var(--success) / <alpha-value>)',
          occupied: 'hsl(var(--info) / <alpha-value>)',
          cleaning: 'hsl(var(--warning) / <alpha-value>)',
          out: 'hsl(var(--status-muted) / <alpha-value>)',
        },
        danger: 'hsl(var(--destructive) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
