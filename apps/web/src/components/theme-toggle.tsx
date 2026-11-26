'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(hasDarkClass);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);

    if (nextIsDark) {
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

  // Keyboard shortcut listener: Alt+T or Ctrl+Shift+D to toggle theme
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.altKey && e.key.toLowerCase() === 't') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        toggleTheme();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDark]);

  if (!mounted) {
    return (
      <div
        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode (Alt+T)' : 'Switch to dark mode (Alt+T)'}
      title={isDark ? 'Switch to Light Mode (Alt+T)' : 'Switch to Dark Mode (Alt+T)'}
      className={`group relative inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-2xs transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-white active:scale-95 cursor-pointer ${className}`}
    >
      {isDark ? (
        <span className="flex items-center justify-center transition-transform duration-200 group-hover:rotate-12 text-amber-400 text-sm sm:text-base">
          ☀️
        </span>
      ) : (
        <span className="flex items-center justify-center transition-transform duration-200 group-hover:-rotate-12 text-indigo-600 text-sm sm:text-base">
          🌙
        </span>
      )}
    </button>
  );
}
