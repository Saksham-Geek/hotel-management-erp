'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { describePageRoute, describeApiRoute, formatTelemetryLog } from '@/lib/telemetry';

declare global {
  interface Window {
    __erp_telemetry_installed__?: boolean;
    __erp_last_nav_start__?: number;
  }
}

export function TelemetryMonitor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // 1. Intercept client-side fetch calls (including Server Actions & client queries)
  useEffect(() => {
    if (typeof window === 'undefined' || window.__erp_telemetry_installed__) return;
    window.__erp_telemetry_installed__ = true;

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method || 'GET').toUpperCase();
      const isNextAction = Boolean(
        init?.headers &&
          ((init.headers as Record<string, string>)['Next-Action'] ||
            (init.headers as Record<string, string>)['next-action']),
      );

      const start = performance.now();
      let res: Response;
      try {
        res = await originalFetch(input, init);
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        console.warn(
          `%c[Network Error]%c ${method} ${url} (failed in ${duration}ms)`,
          'color: #ef4444; font-weight: bold;',
          'color: inherit;',
        );
        throw err;
      }

      const duration = Math.round(performance.now() - start);

      // Ignore HMR / webpack chunk internal pings
      if (url.includes('/_next/') && !isNextAction) {
        return res;
      }

      let desc = describeApiRoute(url, method);
      if (isNextAction) {
        const pageDesc = describePageRoute(window.location.pathname);
        desc = {
          page: pageDesc.page,
          feature: pageDesc.feature,
          operation: 'Execute Server Action',
        };
      }

      const dbHeader = res.headers.get('x-db-time');
      const dbMs = dbHeader ? parseFloat(dbHeader) : undefined;
      const dbSuffix = typeof dbMs === 'number' && !Number.isNaN(dbMs) ? ` | DB: ${Math.round(dbMs)}ms` : '';

      console.log(
        `%c[${desc.page}] - [${desc.feature}]%c ${desc.operation} %c(done in ${duration}ms${dbSuffix})`,
        'background: #0f172a; color: #38bdf8; font-weight: 700; padding: 2px 6px; border-radius: 4px;',
        'color: inherit; font-weight: 500;',
        'color: #10b981; font-weight: 700;',
      );

      return res;
    };

    // Listen to click on internal navigation links to record navigation start time
    const handleAnchorClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//') && !a.target && !e.ctrlKey && !e.metaKey) {
        window.__erp_last_nav_start__ = performance.now();
      }
    };

    document.addEventListener('click', handleAnchorClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
    };
  }, []);

  // 2. Track Page Navigation & Render Timings
  useEffect(() => {
    const fullUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;
    const desc = describePageRoute(pathname);

    if (isInitialMount.current) {
      isInitialMount.current = false;
      const navTiming = typeof performance !== 'undefined' ? performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming : null;
      const initDuration = navTiming ? Math.round(navTiming.domInteractive || navTiming.duration || 0) : 0;
      const durationStr = initDuration > 0 ? ` (done in ${initDuration}ms)` : '';

      console.log(
        `%c[${desc.page}] - [${desc.feature}]%c ${desc.operation} — Page Initial Load%c${durationStr}`,
        'background: #0f172a; color: #38bdf8; font-weight: 700; padding: 2px 6px; border-radius: 4px;',
        'color: inherit; font-weight: 500;',
        'color: #10b981; font-weight: 700;',
      );
      return;
    }

    const navStart = window.__erp_last_nav_start__ || performance.now();
    const duration = Math.max(1, Math.round(performance.now() - navStart));
    window.__erp_last_nav_start__ = undefined;

    console.log(
      `%c[${desc.page}] - [${desc.feature}]%c ${desc.operation} — Page Navigation%c (done in ${duration}ms)`,
      'background: #0f172a; color: #38bdf8; font-weight: 700; padding: 2px 6px; border-radius: 4px;',
      'color: inherit; font-weight: 500;',
      'color: #10b981; font-weight: 700;',
    );
  }, [pathname, searchParams]);

  return null;
}
