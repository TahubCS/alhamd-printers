export default function Loading() {
  return <div role="status" aria-live="polite" className="space-y-6"><span className="sr-only">Loading…</span><div className="h-10 w-64 animate-pulse rounded-lg bg-[var(--color-bg-hover)]"/><div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--color-bg-card)]"/>)}</div></div>;
}
