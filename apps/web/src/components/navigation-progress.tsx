'use client';

import { useEffect, useState, useTransition } from 'react';
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
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Global click listener to catch all internal navigation clicks instantly (0ms)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const handleAnchorClick = (e: MouseEvent) => {
      // Find closest anchor tag
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
            // Instant trigger: 0ms
            setLoading(true);
            setProgress(25);

            if (interval) clearInterval(interval);
            interval = setInterval(() => {
              setProgress((prev) => {
                if (prev >= 85) {
                  if (interval) clearInterval(interval);
                  return 85;
                }
                const step = (85 - prev) * 0.15;
                return Math.min(85, prev + Math.max(step, 1.5));
              });
            }, 120);
          }
        }
      } catch {
        // invalid URL
      }
    };

    document.addEventListener('click', handleAnchorClick, true);

    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label="Navigating to page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] bg-transparent"
    >
      {/* Moving progress bar with glow */}
      <div
        className="h-full bg-gradient-to-r from-teal-400 via-indigo-500 to-sky-400 transition-all duration-200 ease-out shadow-[0_0_12px_rgba(56,189,248,0.8)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: 'width, opacity',
        }}
      />

      {/* Floating subtle pulse badge in top right corner */}
      <div
        className={`fixed top-3 right-3 flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-1 text-[11px] font-bold text-white shadow-xl backdrop-blur-md transition-opacity duration-200 ${
          progress === 100 ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
        <span className="tracking-wide">Loading workspace...</span>
      </div>
    </div>
  );
}
