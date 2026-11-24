'use client';

import { useEffect, useState, useRef } from 'react';

export interface BannerProps {
  error?: string | null;
  ok?: string | null;
  /** Auto-dismiss duration in milliseconds. Defaults to 5000ms. Set 0 to disable. */
  duration?: number;
  /** Whether to strip ?ok= and ?error= from the browser URL address bar immediately. Defaults to true. */
  clearUrlParams?: boolean;
  className?: string;
}

export function Banner({
  error,
  ok,
  duration = 5000,
  clearUrlParams = true,
  className = '',
}: BannerProps) {
  const [visible, setVisible] = useState(Boolean(error || ok));
  const [isDismissing, setIsDismissing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const currentMsg = error ?? ok;
  const isError = Boolean(error);

  // 1. Immediately clean up ?ok=... and ?error=... from the browser URL address bar
  // This ensures the parameter is not persistent in the address bar and won't reappear if the user
  // navigates away and returns via browser back/forward or link navigation.
  useEffect(() => {
    if (!clearUrlParams || typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      let changed = false;

      if (url.searchParams.has('ok')) {
        url.searchParams.delete('ok');
        changed = true;
      }
      if (url.searchParams.has('error')) {
        url.searchParams.delete('error');
        changed = true;
      }

      if (changed) {
        const remainingQuery = url.searchParams.toString();
        const cleanUrl =
          url.pathname + (remainingQuery ? `?${remainingQuery}` : '') + url.hash;
        window.history.replaceState(window.history.state, '', cleanUrl);
      }
    } catch {
      // Ignore if running in unsupported browser environments
    }
  }, [clearUrlParams, error, ok]);

  // 2. Automatically dismiss the banner after duration ms (with pause on hover)
  useEffect(() => {
    if (!error && !ok) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setIsDismissing(false);

    if (duration <= 0) return;

    let remaining = duration;
    const interval = 100;
    const timer = setInterval(() => {
      if (isPausedRef.current) return;
      remaining -= interval;
      if (remaining <= 0) {
        clearInterval(timer);
        setIsDismissing(true);
        setTimeout(() => {
          setVisible(false);
        }, 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [error, ok, duration]);

  if (!visible || !currentMsg) return null;

  const handleManualDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setVisible(false);
    }, 250);
  };

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative mb-6 flex items-start justify-between gap-3.5 rounded-2xl border p-4.5 text-sm font-medium shadow-xs transition-all duration-300 ease-in-out ${
        isDismissing
          ? 'opacity-0 -translate-y-2 max-h-0 py-0 my-0 overflow-hidden border-transparent'
          : 'opacity-100 translate-y-0 max-h-48'
      } ${
        isError
          ? 'border-rose-200 bg-rose-50/95 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
          : 'border-emerald-200 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
      } ${className}`}
    >
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <span
          aria-hidden
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black select-none ${
            isError
              ? 'bg-rose-200 text-rose-950 dark:bg-rose-900/80 dark:text-rose-100'
              : 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100'
          }`}
        >
          {isError ? '!' : '✓'}
        </span>
        <div className="flex-1 leading-6 break-words">
          <strong className="font-bold">{isError ? 'Error: ' : 'Success: '}</strong>
          <span>{currentMsg}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleManualDismiss}
        aria-label="Dismiss notification"
        className={`shrink-0 rounded-lg p-1 text-xs font-bold transition-colors cursor-pointer select-none ml-2 ${
          isError
            ? 'text-rose-600 hover:bg-rose-200/60 hover:text-rose-950 dark:text-rose-400 dark:hover:bg-rose-900/40 dark:hover:text-rose-100'
            : 'text-emerald-600 hover:bg-emerald-200/60 hover:text-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-100'
        }`}
        title="Dismiss (or auto-dismisses automatically)"
      >
        <span aria-hidden className="text-base leading-none">×</span>
      </button>
    </div>
  );
}
