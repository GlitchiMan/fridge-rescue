import type { ReactNode } from "react";

/** Readable long-form layout for informational pages. */
export function ContentPage({ eyebrow, title, intro, children, updated }: { eyebrow: string; title: string; intro?: string; children: ReactNode; updated?: string }) {
  return (
    <article className="container-page max-w-3xl py-10 sm:py-14">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
      {updated && <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>}
      <div className="mt-8 space-y-5 leading-relaxed [&_a]:font-semibold [&_a]:text-forest [&_a]:underline [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
