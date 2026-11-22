/** Original decorative illustration: an open fridge full of colourful food. */
export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 420" className={className} aria-hidden>
      <defs>
        <linearGradient id="hf-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2C6B51" />
          <stop offset="1" stopColor="#1D4B38" />
        </linearGradient>
        <linearGradient id="hf-inside" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFDF7" />
          <stop offset="1" stopColor="#F4EDDD" />
        </linearGradient>
      </defs>
      <ellipse cx="185" cy="400" rx="150" ry="14" fill="#24332A" opacity="0.08" />
      {/* fridge body */}
      <rect x="70" y="20" width="200" height="370" rx="28" fill="url(#hf-body)" />
      <rect x="86" y="36" width="168" height="338" rx="18" fill="url(#hf-inside)" />
      {/* light glow */}
      <ellipse cx="170" cy="60" rx="70" ry="16" fill="#FFF3C9" opacity="0.7" />
      {/* shelves */}
      {[130, 220, 300].map((y) => (
        <rect key={y} x="92" y={y} width="156" height="5" rx="2.5" fill="#D8CDB4" />
      ))}
      {/* top shelf: milk, eggs carton */}
      <rect x="104" y="72" width="30" height="58" rx="6" fill="#FFFFFF" stroke="#E4DCC8" />
      <rect x="104" y="72" width="30" height="16" rx="6" fill="#6FAF7B" />
      <rect x="146" y="106" width="70" height="24" rx="6" fill="#E9D7B3" />
      {[156, 172, 188, 204].map((x) => (
        <ellipse key={x} cx={x} cy="104" rx="7" ry="9" fill="#F7E3B8" stroke="#E6CF9E" />
      ))}
      {/* middle: tomatoes, cheese, greens */}
      <circle cx="116" cy="204" r="15" fill="#E0473A" />
      <circle cx="140" cy="208" r="12" fill="#E8553F" />
      <path d="M112 190l4 4 4-4" stroke="#3F7D4A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M168 218l34-30h30v30z" fill="#F2B84B" />
      <circle cx="196" cy="208" r="3" fill="#E39E2E" />
      <circle cx="214" cy="200" r="2.5" fill="#E39E2E" />
      <path d="M226 218c-4-22 6-34 18-36 2 14-4 28-18 36z" fill="#3F7D4A" />
      {/* lower: carrots, leftovers box */}
      <path d="M104 296l40-30" stroke="#EE8A3C" strokeWidth="10" strokeLinecap="round" />
      <path d="M144 266l8-8M144 266l10-2" stroke="#6DAA4E" strokeWidth="3" strokeLinecap="round" />
      <rect x="166" y="262" width="70" height="38" rx="8" fill="#FFFFFF" stroke="#D9CFB8" />
      <rect x="166" y="262" width="70" height="10" rx="5" fill="#F2A65A" />
      <text x="201" y="292" textAnchor="middle" fontSize="11" fontFamily="system-ui, sans-serif" fontWeight="700" fill="#5B675F">
        LEFTOVERS
      </text>
      {/* crisper */}
      <rect x="96" y="314" width="148" height="50" rx="10" fill="#DCEEDD" opacity="0.9" />
      <circle cx="124" cy="338" r="12" fill="#7DB36B" />
      <circle cx="150" cy="342" r="10" fill="#D2463C" />
      <ellipse cx="196" cy="340" rx="20" ry="11" fill="#D9B47A" />
      <ellipse cx="226" cy="338" rx="10" ry="13" fill="#9B4F78" />
      {/* open door */}
      <path d="M270 34l62 22v318l-62 16z" fill="#245C45" />
      <path d="M280 70l42 12M280 170l42 8M280 270l42 4" stroke="#FFF9EF" strokeOpacity="0.5" strokeWidth="4" strokeLinecap="round" />
      <rect x="284" y="200" width="7" height="60" rx="3.5" fill="#FFF9EF" opacity="0.85" />
      {/* sparkles */}
      <path d="M48 96l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#F2A65A" />
      <path d="M318 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#E97762" />
      <path d="M30 250l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#6FAF7B" />
    </svg>
  );
}
