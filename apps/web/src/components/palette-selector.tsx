'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ACCENT_COLORS,
  getActiveAccentColor,
  setActiveAccentColor,
} from '@/lib/theme';

export function PaletteSelector({ className = '' }: { className?: string }) {
  const [activeAccent, setActiveAccent] = useState<string>('crimson');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveAccent(getActiveAccentColor());
    function onAccentChange(e: Event) {
      const custom = e as CustomEvent<{ accent: string }>;
      if (custom.detail?.accent) {
        setActiveAccent(custom.detail.accent);
      }
    }
    window.addEventListener('pms-accent-change', onAccentChange);
    return () => window.removeEventListener('pms-accent-change', onAccentChange);
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

  const selectedPreset = ACCENT_COLORS.find((c) => c.id === activeAccent);
  const currentHex = selectedPreset ? selectedPreset.hex : (activeAccent.startsWith('#') ? activeAccent : '#dc2626');

  const handleSelect = (id: string) => {
    setActiveAccent(id);
    setActiveAccentColor(id);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`Current Accent: ${selectedPreset?.name || activeAccent}. Click to change accent color.`}
        title={`Accent Color: ${selectedPreset?.name || activeAccent}. Click to switch button and highlight accent.`}
        className="group inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-2xs transition-all duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 cursor-pointer"
      >
        <span
          className="h-4 w-4 rounded-full shadow-xs transition-transform group-hover:scale-110"
          style={{ backgroundColor: currentHex }}
        />
      </button>

      {/* Floating Accent Color Picker Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-card-foreground">
          <div className="border-b border-border pb-2.5 mb-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>🎨</span>
                <span>CTA Accent Color</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Live Switch
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
              Select your primary action accent color. Reflects across all buttons and active tabs.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 pb-2">
            {ACCENT_COLORS.slice(0, 8).map((accent) => {
              const isSelected = accent.id === activeAccent;
              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => handleSelect(accent.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/30'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/60'
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full shadow-2xs flex items-center justify-center text-white text-[10px] font-black"
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

          <div className="border-t border-border pt-2 text-center">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>More colors &amp; custom hex in Settings →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
