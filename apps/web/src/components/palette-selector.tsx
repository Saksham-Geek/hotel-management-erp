'use client';

import { useState, useRef, useEffect } from 'react';
import { COLOR_THEMES, getActiveColorTheme, setActiveColorTheme, type ColorThemeId } from '@/lib/theme';

export function PaletteSelector({ className = '' }: { className?: string }) {
  const [activeTheme, setActiveTheme] = useState<ColorThemeId>('obsidian');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTheme(getActiveColorTheme());
    function onThemeChange(e: Event) {
      const custom = e as CustomEvent<{ theme: ColorThemeId }>;
      if (custom.detail?.theme) {
        setActiveTheme(custom.detail.theme);
      }
    }
    window.addEventListener('pms-theme-change', onThemeChange);
    return () => window.removeEventListener('pms-theme-change', onThemeChange);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentThemeMeta = COLOR_THEMES.find((t) => t.id === activeTheme) || COLOR_THEMES[0];

  const handleSelect = (id: ColorThemeId) => {
    setActiveTheme(id);
    setActiveColorTheme(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Current Theme Palette: ${currentThemeMeta.name}. Click to change theme.`}
        title={`Theme Palette: ${currentThemeMeta.name}. Click to switch luxury color palette.`}
        className="group inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-white active:scale-95 cursor-pointer"
      >
        <span className="text-sm transition-transform group-hover:scale-110">
          {currentThemeMeta.icon}
        </span>
      </button>

      {/* Floating Theme Palette Picker Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-2.5 mb-2.5 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>🎨</span>
                <span>Luxury Color Palettes</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Switch
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
              Select your hotel aesthetic. Changes the sidebar and theme accents across light &amp; dark mode.
            </p>
          </div>

          <div className="space-y-1.5">
            {COLOR_THEMES.map((theme) => {
              const isSelected = theme.id === activeTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelect(theme.id)}
                  className={`w-full rounded-xl p-2.5 text-left transition flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10 ring-1 ring-slate-900/10'
                      : 'border border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl shrink-0">{theme.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {theme.name}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {theme.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-tight">
                      {theme.tagline}
                    </p>
                  </div>
                  {/* Color Swatch Dots */}
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-2xs"
                      style={{ backgroundColor: theme.colors.darkCanvas }}
                      title="Dark Canvas"
                    />
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-2xs"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Theme Accent"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
