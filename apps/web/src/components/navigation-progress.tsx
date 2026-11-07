'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress whenever the pathname or search parameters change
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Global listener to catch all internal navigation clicks instantly (0ms)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const startProgress = () => {
      setLoading(true);
      setProgress(25);

      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) {
            if (interval) clearInterval(interval);
            return 88;
          }
          const step = (88 - prev) * 0.18;
          return Math.min(88, prev + Math.max(step, 1.5));
        });
      }, 100);
    };

    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Ignore external links, downloads, modified clicks, hash-only, or new tabs
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        targetAttr === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's an internal route that actually changes the path
      try {
        const url = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (url.origin === currentUrl.origin) {
          const isSamePage = url.pathname === currentUrl.pathname && url.search === currentUrl.search;
          if (!isSamePage) {
            // Instant 0ms trigger
            startProgress();
          }
        }
      } catch {
        // invalid URL
      }
    };

    // Also trigger on valid form submissions to prevent duplicate clicks
    const handleFormSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!form) return;
      startProgress();
    };

    document.addEventListener('click', handleAnchorClick, true);
    document.addEventListener('submit', handleFormSubmit, true);

    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
      document.removeEventListener('submit', handleFormSubmit, true);
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!loading && progress === 0) return null;

  const circumference = 150.8; // 2 * PI * 24
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <aside
      aria-label="Loading indicator"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-200 ${
        progress === 100 ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-wait'
      }`}
    >
      {/* Top micro progress accent line */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-teal-400 via-indigo-500 to-sky-400 shadow-[0_0_10px_rgba(45,212,191,0.8)] transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />

      {/* Centered Glassmorphism Loading Modal Card */}
      <div className="relative flex flex-col items-center justify-center gap-3.5 rounded-3xl border border-white/20 bg-slate-900/90 px-8 py-6 text-white shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 select-none">
        {/* Circular Progress Ring */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 60 60">
            <defs>
              <linearGradient id="nav-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              cx="30"
              cy="30"
              r="24"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="4"
              fill="none"
            />

            {/* Animated Loop Progress Track */}
            <circle
              cx="30"
              cy="30"
              r="24"
              stroke="url(#nav-ring-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeOffset,
                transition: 'stroke-dashoffset 150ms ease-out',
              }}
            />
          </svg>

          {/* Centered Percentage or Checkmark */}
          <div className="absolute inset-0 flex items-center justify-center">
            {progress === 100 ? (
              <svg
                className="h-6 w-6 text-teal-400 animate-in zoom-in-50 duration-150"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <span className="font-mono text-xs font-bold text-slate-200">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>

        {/* Text Status */}
        <div className="text-center">
          <p className="font-display text-sm font-bold tracking-tight text-white">
            {progress === 100 ? 'Workspace Ready' : 'Loading Workspace…'}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            {progress === 100 ? 'Transition complete' : 'Fetching latest stay & rack data'}
          </p>
        </div>
      </div>
    </aside>
  );
}
