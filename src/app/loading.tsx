export default function Loading() {
  return (
    <div className="container-page pt-10 sm:pt-16" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-24 animate-pulse rounded bg-ink/[0.06]" />
      <div className="mt-5 h-12 w-72 max-w-full animate-pulse rounded-lg bg-ink/[0.06]" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="aspect-[4/3] animate-pulse rounded-[0.75rem] bg-ink/[0.05]" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-ink/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
