/**
 * Original Fridge Rescue mark: a rounded fridge silhouette with a fresh leaf
 * growing from the door handle and a small "rescue" spark.
 */
export function LogoMark({ className = "size-9", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect x="9" y="4" width="30" height="40" rx="9" fill="#245C45" />
      <rect x="9" y="4" width="30" height="40" rx="9" fill="url(#fr-sheen)" />
      <path d="M9 20.5h30" stroke="#FFF9EF" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <rect x="14" y="10" width="3" height="6.5" rx="1.5" fill="#FFF9EF" />
      <rect x="14" y="25" width="3" height="11" rx="1.5" fill="#FFF9EF" />
      <path d="M24.5 37c0-7 3.5-12 11-13.5-.5 7.5-4.5 12-11 13.5z" fill="#6FAF7B" />
      <path d="M25 36.5c2.5-3.5 5-6.5 9-10" stroke="#245C45" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M34 7.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" fill="#F2A65A" />
      <defs>
        <linearGradient id="fr-sheen" x1="9" y1="4" x2="39" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.35rem] font-semibold leading-none tracking-tight text-ink">
        Fridge<span className="text-forest"> Rescue</span>
      </span>
    </span>
  );
}
