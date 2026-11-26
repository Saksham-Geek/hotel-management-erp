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
    name: 'Signature Crimson & Obsidian',
    tagline: 'Signature brand Crimson Red buttons & accents with crisp white light mode and deep obsidian dark mode.',
    icon: '🔴',
    badge: 'Brand Identity',
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
    tagline: 'Regal velvet violet darks with universal Crimson Red action buttons & accents.',
    icon: '🔮',
    badge: 'Royal Boutique',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#0c0714',
      darkCard: '#160e22',
      lightCanvas: '#faf7fd',
      accent: '#f43f5e',
    },
  },
  {
    id: 'emerald',
    name: 'Royal Forest & Sage',
    tagline: 'Botanical luxury resort darks with universal Crimson Red action buttons & accents.',
    icon: '🌲',
    badge: 'Boutique Resort',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#09110d',
      darkCard: '#111c15',
      lightCanvas: '#f6f9f7',
      accent: '#f43f5e',
    },
  },
  {
    id: 'bronze',
    name: 'Warm Espresso & Bronze',
    tagline: 'Warm espresso taupe darks with universal Crimson Red action buttons & accents.',
    icon: '☕',
    badge: 'Heritage Luxury',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#130f0d',
      darkCard: '#1c1714',
      lightCanvas: '#fcfaf7',
      accent: '#f43f5e',
    },
  },
  {
    id: 'slate',
    name: 'Midnight Navy & Slate',
    tagline: 'Classic deep blue executive darks with universal Crimson Red action buttons & accents.',
    icon: '🌊',
    badge: 'Classic Slate',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#090d16',
      darkCard: '#0f172a',
      lightCanvas: '#f8fafc',
      accent: '#f43f5e',
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

export interface AccentColorOption {
  id: string;
  name: string;
  hex: string;
  hslLight: string;
  hslDark: string;
}

export const ACCENT_COLORS: AccentColorOption[] = [
  {
    id: 'crimson',
    name: 'Crimson Red',
    hex: '#dc2626',
    hslLight: '348 83% 47%',
    hslDark: '348 86% 56%',
  },
  {
    id: 'ruby',
    name: 'Ruby Rose',
    hex: '#e11d48',
    hslLight: '349 89% 50%',
    hslDark: '349 92% 60%',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    hex: '#4f46e5',
    hslLight: '243 75% 59%',
    hslDark: '243 85% 68%',
  },
  {
    id: 'violet',
    name: 'Regal Violet',
    hex: '#7c3aed',
    hslLight: '262 83% 58%',
    hslDark: '262 88% 66%',
  },
  {
    id: 'emerald',
    name: 'Emerald Forest',
    hex: '#059669',
    hslLight: '160 84% 39%',
    hslDark: '160 84% 48%',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    hex: '#d97706',
    hslLight: '38 92% 50%',
    hslDark: '38 95% 58%',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    hex: '#0284c7',
    hslLight: '201 96% 41%',
    hslDark: '201 96% 52%',
  },
  {
    id: 'coral',
    name: 'Sunset Coral',
    hex: '#ea580c',
    hslLight: '21 90% 48%',
    hslDark: '21 95% 58%',
  },
];

export function getActiveAccentColor(): string {
  if (typeof window === 'undefined') return 'crimson';
  try {
    const saved = localStorage.getItem('pms_accent_color');
    if (saved && ACCENT_COLORS.some((c) => c.id === saved)) {
      return saved;
    }
  } catch {}
  return 'crimson';
}

export function setActiveAccentColor(accentId: string) {
  if (typeof window === 'undefined') return;
  const opt = ACCENT_COLORS.find((c) => c.id === accentId);
  if (!opt) return;

  try {
    localStorage.setItem('pms_accent_color', accentId);
    document.cookie = `pms_accent_color=${accentId}; path=/; max-age=31536000; SameSite=Lax`;
    applyAccentColorTokens(opt);
    window.dispatchEvent(new CustomEvent('pms-accent-change', { detail: { accent: accentId } }));
  } catch {}
}

export function applyAccentColorTokens(opt: AccentColorOption) {
  if (typeof document === 'undefined') return;
  const isDark = document.documentElement.classList.contains('dark');
  const hsl = isDark ? opt.hslDark : opt.hslLight;
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  document.documentElement.style.setProperty('--accent', hsl);
  document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
}
