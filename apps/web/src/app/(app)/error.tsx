'use client';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="mx-auto max-w-xl rounded-xl border border-danger/20 bg-surface p-6 shadow-sm sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-danger">Page unavailable</p>
      <h1 className="mt-2 font-display text-xl font-bold text-ink">We couldn’t load this page</h1>
      <p className="mt-2 text-sm leading-5 text-muted">Your data wasn’t changed. Try again, or return to the previous page.</p>
      <button type="button" onClick={() => reset()} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2">Try again</button>
    </section>
  );
}
