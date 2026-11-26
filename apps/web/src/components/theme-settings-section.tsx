'use client';

import { useState, useEffect } from 'react';
import {
  COLOR_THEMES,
  getActiveColorTheme,
  setActiveColorTheme,
  type ColorThemeId,
  ACCENT_COLORS,
  getActiveAccentColor,
  setActiveAccentColor,
} from '@/lib/theme';

export function ThemeSettingsSection() {
  const [activeTheme, setActiveTheme] = useState<ColorThemeId>('obsidian');
  const [activeAccent, setActiveAccent] = useState<string>('crimson');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setActiveTheme(getActiveColorTheme());
    setActiveAccent(getActiveAccentColor());
    setIsDark(document.documentElement.classList.contains('dark'));

    function onThemeChange(e: Event) {
      const custom = e as CustomEvent<{ theme: ColorThemeId }>;
      if (custom.detail?.theme) {
        setActiveTheme(custom.detail.theme);
      }
    }
    function onAccentChange(e: Event) {
      const custom = e as CustomEvent<{ accent: string }>;
      if (custom.detail?.accent) {
        setActiveAccent(custom.detail.accent);
      }
    }
    window.addEventListener('pms-theme-change', onThemeChange);
    window.addEventListener('pms-accent-change', onAccentChange);
    return () => {
      window.removeEventListener('pms-theme-change', onThemeChange);
      window.removeEventListener('pms-accent-change', onAccentChange);
    };
  }, []);

  const handleSelectTheme = (id: ColorThemeId) => {
    setActiveTheme(id);
    setActiveColorTheme(id);
  };

  const handleSelectAccent = (id: string) => {
    setActiveAccent(id);
    setActiveAccentColor(id);
  };

  const handleToggleMode = (targetDark: boolean) => {
    setIsDark(targetDark);
    if (targetDark) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('theme', 'dark');
        document.cookie = 'theme=dark; path=/; max-age=31536000; SameSite=Lax';
      } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('theme', 'light');
        document.cookie = 'theme=light; path=/; max-age=31536000; SameSite=Lax';
      } catch {}
    }
    // Re-apply accent token on mode switch
    const opt = ACCENT_COLORS.find((c) => c.id === activeAccent);
    if (opt) {
      setActiveAccentColor(activeAccent);
    }
  };

  if (!mounted) {
    return (
      <div className="h-48 rounded-3xl border border-border bg-card animate-pulse" />
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary font-extrabold text-sm">
              🎨
            </span>
            <h2 className="font-display text-xl font-bold text-foreground">
              Display &amp; Brand Accent Customizer
            </h2>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
              Live Customizer
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure your brand identity accent and surface aesthetics. Changes reflect instantly on all buttons, navigation pills, and cards.
          </p>
        </div>

        {/* Light vs Dark Mode Toggle Switch */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              !isDark
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>☀️</span>
            <span>Light Mode</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode(true)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              isDark
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>🌙</span>
            <span>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* Brand Accent Color Swatches (Point 7 feature) */}
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Primary Brand Accent Color
            </h3>
            <p className="text-xs text-muted-foreground">
              Buttons, active navigation, and highlights use this accent color with high-contrast white text.
            </p>
          </div>
          <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-card border border-border text-foreground">
            Current: {ACCENT_COLORS.find((c) => c.id === activeAccent)?.name || 'Crimson Red'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-1">
          {ACCENT_COLORS.map((accent) => {
            const isSelected = accent.id === activeAccent;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => handleSelectAccent(accent.id)}
                className={`flex flex-col items-center gap-2 rounded-xl p-3 border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-card shadow-sm scale-105 ring-2 ring-primary/20'
                    : 'border-border bg-card/60 hover:bg-card hover:border-muted-foreground/30'
                }`}
              >
                <span
                  className="h-6 w-6 rounded-full shadow-sm flex items-center justify-center text-white text-[11px] font-black"
                  style={{ backgroundColor: accent.hex }}
                >
                  {isSelected ? '✓' : ''}
                </span>
                <span className="text-[11px] font-bold text-foreground truncate w-full text-center">
                  {accent.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6 Atmosphere Palette Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Atmosphere Canvas Palettes
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {COLOR_THEMES.map((theme) => {
            const isSelected = theme.id === activeTheme;
            return (
              <div
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={`group relative flex flex-col justify-between rounded-2xl p-5 border-2 transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                    : 'border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{theme.icon}</span>
                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow-xs">
                          ✓ Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {theme.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="mt-3 font-display text-sm font-bold text-foreground">
                    {theme.name}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {theme.tagline}
                  </p>
                </div>

                {/* Color Swatch Preview Bar */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Canvas Tone
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
                      style={{ backgroundColor: theme.colors.darkCanvas }}
                      title="Canvas Tone"
                    />
                    <span
                      className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
                      style={{ backgroundColor: theme.colors.darkCard }}
                      title="Card Surface"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
