import type { ReactNode } from "react";

/** Readable long-form layout for informational pages. */
export function ContentPage({ eyebrow, title, intro, children, updated }: { eyebrow: string; title: string; intro?: string; children: ReactNode; updated?: string }) {
  return (
    <article className="container-narrow pt-12 sm:pt-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 text-[2.5rem] sm:text-[3.5rem]">{title}</h1>
      {intro && <p className="lede mt-6">{intro}</p>}
      {updated && <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>}
      <div className="mt-10 space-y-5 border-t border-line pt-10 text-[1.0625rem] leading-[1.75] text-ink-soft [&_a:not([class*='inline-flex'])]:font-medium [&_a:not([class*='inline-flex'])]:text-forest [&_a:not([class*='inline-flex'])]:underline [&_a:not([class*='inline-flex'])]:decoration-forest/30 [&_a:not([class*='inline-flex'])]:underline-offset-[0.2em] [&_h2]:pt-6 [&_h2]:font-display [&_h2]:text-[1.75rem] [&_h2]:text-ink [&_h3]:pt-3 [&_h3]:font-display [&_h3]:text-[1.25rem] [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_li]:marker:text-faint [&_strong]:font-medium [&_strong]:text-ink [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
