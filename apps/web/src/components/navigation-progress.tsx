'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Production-Grade Top Navigation Progress Bar
 * Similar to GitHub, Vercel, and Linear:
 * - 0ms instant visual response on internal link clicks
 * - Silky smooth CSS cubic-bezier animation (no rapid React interval re-renders)
 * - Zero UI shift, zero modal popup, zero blocking of page elements
 * - Built-in watchdog timer to guarantee it never gets stuck
 */
export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Complete and fade out whenever the route finishes mounting
  useEffect(() => {
    if (active) {
      setProgress(100);
      const fadeTimer = setTimeout(() => {
        setVisible(false);
        const resetTimer = setTimeout(() => {
          setActive(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(resetTimer);
      }, 200);

      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      return () => clearTimeout(fadeTimer);
    }
  }, [pathname, searchParams]);

  // Catch internal navigation clicks
  useEffect(() => {
    let t1: NodeJS.Timeout | null = null;
    let t2: NodeJS.Timeout | null = null;

    const handleAnchorClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');

      // Ignore external links, mailto, tel, downloads, or modified clicks (new tab / window)
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        targetAttr === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0 // only primary left click
      ) {
        return;
      }

      // Check if it's an internal route that actually changes the path or query
      try {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin === currentUrl.origin) {
          const isSameUrl =
            targetUrl.pathname === currentUrl.pathname &&
            targetUrl.search === currentUrl.search;

          if (!isSameUrl) {
            // Start smooth progress
            if (t1) clearTimeout(t1);
            if (t2) clearTimeout(t2);
            if (watchdogRef.current) clearTimeout(watchdogRef.current);

            setActive(true);
            setVisible(true);
            setProgress(28);

            // Staged progression with natural deceleration
            t1 = setTimeout(() => {
              setProgress((p) => (p < 65 ? 65 : p));
            }, 250);

            t2 = setTimeout(() => {
              setProgress((p) => (p < 85 ? 85 : p));
            }, 600);

            // Watchdog fallback: auto-clear after 6 seconds to prevent stuck state
            watchdogRef.current = setTimeout(() => {
              setProgress(100);
              setTimeout(() => {
                setVisible(false);
                setActive(false);
                setProgress(0);
              }, 250);
            }, 6000);
          }
        }
      } catch {
        // Invalid URL, do nothing
      }
    };

    document.addEventListener('click', handleAnchorClick, true);

    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  if (!active && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page navigation progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] h-[3px] select-none"
    >
      {/* Background track (transparent) */}
      <div
        className="relative h-full bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-600 shadow-[0_0_12px_rgba(14,165,233,0.7)]"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          transition:
            progress === 100
              ? 'width 180ms ease-out, opacity 250ms ease-in 100ms'
              : 'width 350ms cubic-bezier(0.1, 0.8, 0.2, 1), opacity 150ms ease',
          willChange: 'width, opacity',
        }}
      >
        {/* Glowing Head Point */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-sky-300 blur-[3px] shadow-[0_0_8px_rgba(56,189,248,1)]" />
      </div>
    </div>
  );
}
