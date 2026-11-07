'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress loop whenever the pathname or search parameters change
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 240);
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

  // Circle geometry: r = 16, C = 2 * PI * 16 = 100.53
  const circumference = 100.53;
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <aside
      aria-label="Loading indicator"
      aria-live="polite"
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/[0.04] backdrop-blur-[1px] transition-opacity duration-200 ${
        progress === 100 ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-wait'
      }`}
    >
      {/* Top Hairline Progress Bar in sleek executive slate */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[2px] bg-slate-900 shadow-[0_0_8px_rgba(15,23,42,0.3)] transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />

      {/* Production-Grade Minimal Luxury Center Capsule */}
      <div className="relative flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white/95 px-5 py-3.5 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 select-none">
        {/* Circular Progress Ring */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <svg className="h-10 w-10 -rotate-90 transform" viewBox="0 0 40 40">
            {/* Background Track in soft slate-100 */}
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="#e2e8f0"
              strokeWidth="3"
              fill="none"
            />

            {/* Smooth animated progress track in brand slate-900 */}
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeOffset,
                transition: 'stroke-dashoffset 140ms ease-out',
              }}
            />
          </svg>

          {/* Centered Counter / Completion Checkmark */}
          <div className="absolute inset-0 flex items-center justify-center">
            {progress === 100 ? (
              <svg
                className="h-4 w-4 text-emerald-600 animate-in zoom-in-50 duration-150"
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
              <span className="font-mono text-[10px] font-bold text-slate-700">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>

        {/* Status Text matching Aura PMS Executive theme */}
        <div className="min-w-0 pr-1">
          <p className="font-display text-xs font-bold text-slate-900 tracking-tight leading-tight">
            {progress === 100 ? 'Workspace Ready' : 'Loading Workspace…'}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500 leading-tight">
            {progress === 100 ? 'Rendering view' : 'Fetching latest records'}
          </p>
        </div>
      </div>
    </aside>
  );
}
