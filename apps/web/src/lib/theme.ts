'use client';

export type ColorThemeId = 'obsidian' | 'ruby' | 'amethyst' | 'emerald' | 'bronze' | 'slate';

export interface ColorThemeOption {
  id: ColorThemeId;
  name: string;
  tagline: string;
  icon: string;
  badge: string;
  colors: {
    primary: string;
    darkCanvas: string;
    darkCard: string;
    lightCanvas: string;
    accent: string;
  };
}

export const COLOR_THEMES: ColorThemeOption[] = [
  {
    id: 'obsidian',
    name: 'Modern Obsidian & Crimson',
    tagline: 'Deep neutral obsidian darks with radiant crimson buttons & accents. Zero blue tint.',
    icon: '⬛',
    badge: 'Recommended',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#09090b',
      darkCard: '#18181b',
      lightCanvas: '#fafafa',
      accent: '#f43f5e',
    },
  },
  {
    id: 'ruby',
    name: 'Imperial Ruby & Velvet Crimson',
    tagline: 'Deep velvet crimson darks with radiant royal ruby buttons & accents.',
    icon: '💎',
    badge: 'Imperial Red',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#14080a',
      darkCard: '#1f0d11',
      lightCanvas: '#fdf6f7',
      accent: '#f43f5e',
    },
  },
  {
    id: 'amethyst',
    name: 'Royal Velvet Violet & Amethyst',
    tagline: 'Regal velvet violet darks with luminous amethyst & lavender accents.',
    icon: '🔮',
    badge: 'Royal Boutique',
    colors: {
      primary: '#9333ea',
      darkCanvas: '#0c0714',
      darkCard: '#160e22',
      lightCanvas: '#faf7fd',
      accent: '#c084fc',
    },
  },
  {
    id: 'emerald',
    name: 'Royal Forest & Sage',
    tagline: 'Botanical luxury resort darks with muted emerald accents.',
    icon: '🌲',
    badge: 'Boutique Resort',
    colors: {
      primary: '#10b981',
      darkCanvas: '#09110d',
      darkCard: '#111c15',
      lightCanvas: '#f6f9f7',
      accent: '#34d399',
    },
  },
  {
    id: 'bronze',
    name: 'Warm Espresso & Bronze',
    tagline: 'Warm espresso taupe darks with heritage champagne & amber accents.',
    icon: '☕',
    badge: 'Heritage Luxury',
    colors: {
      primary: '#f59e0b',
      darkCanvas: '#130f0d',
      darkCard: '#1c1714',
      lightCanvas: '#fcfaf7',
      accent: '#fbbf24',
    },
  },
  {
    id: 'slate',
    name: 'Midnight Navy & Slate',
    tagline: 'Classic deep blue executive operations theme.',
    icon: '🌊',
    badge: 'Classic Blue',
    colors: {
      primary: '#3b82f6',
      darkCanvas: '#090d16',
      darkCard: '#0f172a',
      lightCanvas: '#f8fafc',
      accent: '#60a5fa',
    },
  },
];

export function getActiveColorTheme(): ColorThemeId {
  if (typeof window === 'undefined') return 'obsidian';
  try {
    const saved = localStorage.getItem('pms_color_theme') as ColorThemeId | null;
    if (saved && COLOR_THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {}
  return 'obsidian';
}

export function setActiveColorTheme(themeId: ColorThemeId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pms_color_theme', themeId);
    document.cookie = `pms_color_theme=${themeId}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.setAttribute('data-theme', themeId);
    // Dispatch a custom event so all open components update immediately
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { theme: themeId } }));
  } catch {}
}
