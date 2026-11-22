import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[0.875rem] border border-dashed border-line-strong px-6 py-14 text-center">
      <Icon className="size-6 text-faint" aria-hidden strokeWidth={1.5} />
      <h3 className="mt-4 font-display text-[1.5rem] leading-tight">{title}</h3>
      {children && <div className="mt-2 max-w-md text-[0.9375rem] text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[0.75rem] bg-ink/[0.05] ${className}`} aria-hidden />;
}
