'use client';

import { useState, useEffect } from 'react';
import { COLOR_THEMES, getActiveColorTheme, setActiveColorTheme, type ColorThemeId } from '@/lib/theme';

export function ThemeSettingsSection() {
  const [activeTheme, setActiveTheme] = useState<ColorThemeId>('obsidian');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setActiveTheme(getActiveColorTheme());
    setIsDark(document.documentElement.classList.contains('dark'));

    function onThemeChange(e: Event) {
      const custom = e as CustomEvent<{ theme: ColorThemeId }>;
      if (custom.detail?.theme) {
        setActiveTheme(custom.detail.theme);
      }
    }
    window.addEventListener('pms-theme-change', onThemeChange);
    return () => window.removeEventListener('pms-theme-change', onThemeChange);
  }, []);

  const handleSelectTheme = (id: ColorThemeId) => {
    setActiveTheme(id);
    setActiveColorTheme(id);
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
  };

  if (!mounted) {
    return (
      <div className="h-48 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 animate-pulse" />
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-sm">
              🎨
            </span>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Display &amp; Luxury Color Palettes
            </h2>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              Live Customizer
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose your hotel aesthetic. Controls sidebar style, dark mode canvas, and card borders across the entire PMS.
          </p>
        </div>

        {/* Light vs Dark Mode Toggle Switch */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              !isDark
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <span>🌙</span>
            <span>Dark Mode</span>
          </button>
        </div>
      </div>

      {/* 6 Luxury Palette Cards */}
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
                  : 'border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm'
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
                      <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {theme.badge}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-3 font-display text-sm font-bold text-slate-900 dark:text-white">
                  {theme.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {theme.tagline}
                </p>
              </div>

              {/* Color Swatch Preview Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Palette Tone
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
                  <span
                    className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
                    style={{ backgroundColor: theme.colors.primary }}
                    title="Accent Highlight"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
