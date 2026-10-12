export default function AppLoading() {
  return (
    <div aria-label="Loading hotel workspace" role="status" className="animate-pulse space-y-6">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2"><div className="h-3 w-24 rounded bg-line/70" /><div className="h-8 w-52 rounded bg-line/70" /><div className="h-4 w-72 max-w-full rounded bg-line/50" /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-xl border border-line bg-surface" />)}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 rounded-xl border border-line bg-surface" />)}</div>
    </div>
  );
}
