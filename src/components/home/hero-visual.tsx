import Image from "next/image";
import { getSiteImage } from "@/lib/images";

/**
 * Homepage hero photograph (public/images/hero-kitchen.*).
 * The ingredients fill the right half of the frame (basil → bread, eggs,
 * garlic and parmesan) on a sunlit stone counter, with empty counter to the
 * left. Every crop is anchored right so the food is never cut, and the
 * frame trims empty counter first.
 */
export function HeroVisual() {
  const src = getSiteImage("hero-kitchen");
  return (
    // Without the photo, small screens skip the visual so the search follows the headline.
    <figure className={src ? "bleed-right relative" : "bleed-right relative hidden lg:block"}>
      <div className="relative aspect-[16/9] overflow-hidden rounded-[1rem] bg-cream-deep sm:aspect-[2/1] lg:aspect-auto lg:h-[min(74dvh,42rem)] lg:rounded-l-[1.5rem] lg:rounded-r-none">
        {src ? (
          <Image
            src={src}
            alt="Vine tomatoes, red onions, basil, lemon, potatoes, a loaf of bread, eggs, garlic and parmesan on a sunlit stone kitchen counter"
            fill
            priority
            quality={85}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover object-[100%_45%]"
          />
        ) : (
          <HeroFallback />
        )}
      </div>
    </figure>
  );
}

/** Neutral stand-in until the photo is added: a quiet preview of the product. */
function HeroFallback() {
  const rows = [
    { name: "Potatoes", state: "In your fridge" },
    { name: "Eggs", state: "In your fridge" },
    { name: "Onion", state: "In your fridge" },
    { name: "Cooking oil", state: "Pantry staple" },
  ];
  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[0.875rem] border border-line bg-paper p-5 shadow-lift">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">35 min / Easy</p>
        <p className="mt-1.5 font-display text-2xl leading-tight">Potato and Egg Skillet</p>
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between py-2">
              <span>{r.name}</span>
              <span className="text-xs text-accent">{r.state}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-[0.375rem] bg-forest px-2 py-0.5 text-xs font-medium text-white">
          <span className="size-1.5 rounded-full bg-white" /> Ready to cook
        </p>
      </div>
    </div>
  );
}
