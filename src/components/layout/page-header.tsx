import type { ReactNode } from "react";

/** Consistent opening for every app page: eyebrow, serif title, short lede. */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-6 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-3">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[1rem] leading-relaxed text-muted sm:text-[1.0625rem]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
