export default function Loading() {
  return (
    <div className="container-page py-12" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-2xl bg-line/60" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-[var(--radius-card)] bg-line/50" />)}
      </div>
    </div>
  );
}
