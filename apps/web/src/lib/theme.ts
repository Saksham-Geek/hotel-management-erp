'use client';

export type ColorThemeId = 'bundled';

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
    id: 'bundled',
    name: 'Bundled Notes Minimalist',
    tagline: 'Clean paper-like light canvas and true deep AMOLED dark mode with customizable CTA accent buttons.',
    icon: '✨',
    badge: 'Bundled Notes',
    colors: {
      primary: '#dc2626',
      darkCanvas: '#09090b',
      darkCard: '#18181b',
      lightCanvas: '#f8f8f9',
      accent: '#dc2626',
    },
  },
];

export function getActiveColorTheme(): ColorThemeId {
  return 'bundled';
}

export function setActiveColorTheme(themeId: ColorThemeId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pms_color_theme', 'bundled');
    document.cookie = `pms_color_theme=bundled; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.setAttribute('data-theme', 'bundled');
    window.dispatchEvent(new CustomEvent('pms-theme-change', { detail: { theme: 'bundled' } }));
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
    id: 'coral',
    name: 'Sunset Coral',
    hex: '#ea580c',
    hslLight: '21 90% 48%',
    hslDark: '21 95% 58%',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    hex: '#d97706',
    hslLight: '38 92% 50%',
    hslDark: '38 95% 58%',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    hex: '#059669',
    hslLight: '160 84% 39%',
    hslDark: '160 84% 48%',
  },
  {
    id: 'teal',
    name: 'Teal Cyan',
    hex: '#0d9488',
    hslLight: '174 84% 32%',
    hslDark: '174 84% 42%',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    hex: '#0284c7',
    hslLight: '201 96% 41%',
    hslDark: '201 96% 52%',
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
    name: 'Electric Violet',
    hex: '#7c3aed',
    hslLight: '262 83% 58%',
    hslDark: '262 88% 66%',
  },
  {
    id: 'ruby',
    name: 'Ruby Rose',
    hex: '#e11d48',
    hslLight: '349 89% 50%',
    hslDark: '349 92% 60%',
  },
  {
    id: 'pink',
    name: 'Bubblegum Pink',
    hex: '#db2777',
    hslLight: '330 81% 50%',
    hslDark: '330 85% 60%',
  },
  {
    id: 'charcoal',
    name: 'Graphite Charcoal',
    hex: '#3f3f46',
    hslLight: '240 5% 34%',
    hslDark: '240 5% 55%',
  },
];

export function hexToHsl(hexInput: string): string {
  let hex = hexInput.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return '348 83% 47%';

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
  }

  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);
  return `${h} ${sPct}% ${lPct}%`;
}

export function getActiveAccentColor(): string {
  if (typeof window === 'undefined') return 'crimson';
  try {
    const customHex = localStorage.getItem('pms_custom_accent_hex');
    if (customHex) return customHex;
    const saved = localStorage.getItem('pms_accent_color');
    if (saved && ACCENT_COLORS.some((c) => c.id === saved)) {
      return saved;
    }
  } catch {}
  return 'crimson';
}

export function setActiveAccentColor(accentIdOrHex: string) {
  if (typeof window === 'undefined') return;

  try {
    if (accentIdOrHex.startsWith('#')) {
      // Custom hex color
      localStorage.setItem('pms_custom_accent_hex', accentIdOrHex);
      localStorage.setItem('pms_accent_color', 'custom');
      document.cookie = `pms_accent_color=custom; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `pms_custom_accent_hex=${encodeURIComponent(accentIdOrHex)}; path=/; max-age=31536000; SameSite=Lax`;
      const hsl = hexToHsl(accentIdOrHex);
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
      document.documentElement.style.setProperty('--accent', hsl);
      document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
      window.dispatchEvent(new CustomEvent('pms-accent-change', { detail: { accent: accentIdOrHex } }));
      return;
    }

    const opt = ACCENT_COLORS.find((c) => c.id === accentIdOrHex);
    if (!opt) return;

    localStorage.removeItem('pms_custom_accent_hex');
    localStorage.setItem('pms_accent_color', opt.id);
    document.cookie = `pms_accent_color=${opt.id}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `pms_custom_accent_hex=; path=/; max-age=0; SameSite=Lax`;
    applyAccentColorTokens(opt);
    window.dispatchEvent(new CustomEvent('pms-accent-change', { detail: { accent: opt.id } }));
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
