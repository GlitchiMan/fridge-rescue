/**
 * Fridge Rescue mark: an abstract fridge – a solid tile split by one door
 * line, with a single handle. Geometric and quiet, so it works at 16px.
 */
export function LogoMark({ className = "size-7", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect x="4" y="2" width="24" height="28" rx="6" fill="var(--color-forest, #183C31)" />
      <path d="M4 13h24" stroke="#F5F0E8" strokeWidth="1.5" />
      <rect x="8.5" y="6" width="2" height="4" rx="1" fill="#F5F0E8" />
      <rect x="8.5" y="16.5" width="2" height="7" rx="1" fill="#F5F0E8" />
      <circle cx="22" cy="22" r="2.25" fill="#BD9475" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="text-[1.0625rem] font-semibold leading-none tracking-[-0.025em] text-ink">Fridge Rescue</span>
    </span>
  );
}
