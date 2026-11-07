export default function AppLoading() {
  return (
    <div aria-label="Loading hotel workspace" role="status" className="animate-pulse space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2.5">
        <div className="h-3.5 w-28 rounded-full bg-slate-200/80" />
        <div className="h-8 w-60 rounded-xl bg-slate-200/90" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-slate-200/60" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200/80 bg-white shadow-2xs" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200/80 bg-white shadow-2xs" />
        ))}
      </div>
    </div>
  );
}
