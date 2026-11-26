'use client';

import { useState, useEffect } from 'react';
import {
  ACCENT_COLORS,
  getActiveAccentColor,
  setActiveAccentColor,
} from '@/lib/theme';

export function ThemeSettingsSection() {
  const [activeAccent, setActiveAccent] = useState<string>('crimson');
  const [customHex, setCustomHex] = useState<string>('#dc2626');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const curr = getActiveAccentColor();
    setActiveAccent(curr);
    if (curr.startsWith('#')) {
      setCustomHex(curr);
    }
    setIsDark(document.documentElement.classList.contains('dark'));

    function onAccentChange(e: Event) {
      const custom = e as CustomEvent<{ accent: string }>;
      if (custom.detail?.accent) {
        setActiveAccent(custom.detail.accent);
        if (custom.detail.accent.startsWith('#')) {
          setCustomHex(custom.detail.accent);
        }
      }
    }
    window.addEventListener('pms-accent-change', onAccentChange);
    return () => {
      window.removeEventListener('pms-accent-change', onAccentChange);
    };
  }, []);

  const handleSelectAccent = (idOrHex: string) => {
    setActiveAccent(idOrHex);
    setActiveAccentColor(idOrHex);
    if (idOrHex.startsWith('#')) {
      setCustomHex(idOrHex);
    }
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
    setActiveAccentColor(activeAccent);
  };

  if (!mounted) {
    return (
      <div className="h-48 rounded-3xl border border-border bg-card animate-pulse" />
    );
  }

  const selectedPreset = ACCENT_COLORS.find((c) => c.id === activeAccent);
  const currentAccentHex = selectedPreset ? selectedPreset.hex : (activeAccent.startsWith('#') ? activeAccent : '#dc2626');

  return (
    <section className="space-y-6 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs text-card-foreground">
      {/* Top Header: Bundled Notes Theme & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary font-black text-lg">
              ✨
            </span>
            <div>
              <h2 className="font-display text-xl font-black text-foreground">
                Bundled Notes Theme &amp; Accent
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                Minimalist paper light mode &amp; true AMOLED deep dark mode with dynamic CTA accent color.
              </p>
            </div>
          </div>
        </div>

        {/* Light vs Dark Mode Toggle Switch */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-muted/40 p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
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

      {/* Brand Accent Color Customizer */}
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Primary Brand Accent &amp; CTA Buttons
            </h3>
            <p className="text-xs text-muted-foreground">
              All CTA action buttons, active navigation pills, and focus rings will reflect this color with crisp white text.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border border-black/20 shadow-2xs"
              style={{ backgroundColor: currentAccentHex }}
            />
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-xl bg-card border border-border text-foreground">
              {selectedPreset ? selectedPreset.name : `Custom (${customHex})`}
            </span>
          </div>
        </div>

        {/* Preset Swatches Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2.5 pt-1">
          {ACCENT_COLORS.map((accent) => {
            const isSelected = accent.id === activeAccent;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => handleSelectAccent(accent.id)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-2.5 border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-card shadow-sm scale-105 ring-2 ring-primary/25'
                    : 'border-border bg-card/60 hover:bg-card hover:border-muted-foreground/30'
                }`}
              >
                <span
                  className="h-7 w-7 rounded-full shadow-sm flex items-center justify-center text-white text-xs font-black transition-transform"
                  style={{ backgroundColor: accent.hex }}
                >
                  {isSelected ? '✓' : ''}
                </span>
                <span className="text-[10px] font-bold text-foreground truncate w-full text-center">
                  {accent.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Color Input */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">Custom Color:</span>
            <input
              type="color"
              value={customHex}
              onChange={(e) => {
                setCustomHex(e.target.value);
                handleSelectAccent(e.target.value);
              }}
              className="h-8 w-10 cursor-pointer rounded-lg border border-border bg-card p-0.5"
              title="Pick any custom hex color"
            />
            <input
              type="text"
              value={customHex}
              maxLength={7}
              onChange={(e) => {
                const val = e.target.value;
                setCustomHex(val);
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  handleSelectAccent(val);
                }
              }}
              placeholder="#dc2626"
              className="h-8 w-24 rounded-lg border border-border bg-card px-2.5 font-mono text-xs font-bold text-foreground uppercase outline-none focus:border-primary"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Changes apply instantly across all pages and persist automatically.
          </p>
        </div>
      </div>

      {/* Live Interactive Preview Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Live UI Component Preview
        </h3>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Sample Primary CTA Button */}
          <button
            type="button"
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>+</span>
            <span>New Booking CTA</span>
          </button>

          {/* Sample Active Segmented Tab */}
          <span className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs">
            Active Segment Tab
          </span>

          {/* Sample Inactive Segment Tab */}
          <span className="rounded-xl border border-border bg-muted/40 px-4 py-2 text-xs font-bold text-muted-foreground">
            Inactive Tab
          </span>

          {/* Sample Accent Badge */}
          <span className="rounded-full bg-primary/10 border border-primary/25 px-3 py-1 text-xs font-bold text-primary">
            ✓ Confirmed Reservation
          </span>

          {/* Sample Secondary Action */}
          <button
            type="button"
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted/40 transition-colors shadow-2xs cursor-pointer"
          >
            🖨️ Print Bill Slip
          </button>
        </div>
      </div>
    </section>
  );
}
