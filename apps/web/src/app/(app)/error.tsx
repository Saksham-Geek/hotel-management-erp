'use client';

import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNetwork =
    error.message?.includes('unreachable') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('fetch failed');

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <section
        role="alert"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
            {isNetwork ? 'Connection Alert' : 'System Exception'}
          </p>
        </div>

        <h1 className="mt-3 font-display text-xl font-bold tracking-tight text-slate-900">
          {isNetwork ? 'API Service Temporarily Unreachable' : 'We Couldn’t Load This Workspace Page'}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {isNetwork
            ? 'The web application could not establish an active connection to the ERP API server on port 4000. Your operational database remains safe.'
            : error.message || 'An unexpected operational error occurred while rendering this interface. Your data was not modified.'}
        </p>

        {error.digest && (
          <p className="mt-3 rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-500">
            Reference digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
          >
            Retry Connection
          </button>
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Return to Front Desk
          </Link>
        </div>
      </section>
    </div>
  );
}
