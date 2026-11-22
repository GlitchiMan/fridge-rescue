import Image from "next/image";
import { getSiteImage } from "@/lib/images";

/**
 * Homepage hero photograph (public/images/hero-kitchen.*).
 * The food sits along the front of the counter and spans most of the frame,
 * so every crop keeps the lower-middle band – microgreens through to the
 * bread – and trims sky, window and cabinets first.
 */
export function HeroVisual() {
  const src = getSiteImage("hero-kitchen");
  return (
    // Without the photo, small screens skip the visual so the search follows the headline.
    <figure className={src ? "relative" : "relative hidden lg:block"}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-cream-deep sm:aspect-[16/10] lg:aspect-[7/5] lg:rounded-[1.25rem]">
        {src ? (
          <Image
            src={src}
            alt="Eggs, avocado, cherry tomatoes, microgreens, fresh bread and a cast-iron pan on a sunlit kitchen counter"
            fill
            priority
            quality={85}
            sizes="(min-width: 1440px) 820px, (min-width: 1024px) 56vw, 100vw"
            className="object-cover object-[60%_78%] sm:object-[62%_72%] lg:object-[66%_64%]"
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
      <div className="w-full max-w-sm rounded-[0.875rem] border border-line bg-white p-5 shadow-lift">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">35 min / Easy</p>
        <p className="mt-1.5 font-display text-2xl leading-tight">Potato and Egg Skillet</p>
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between py-2">
              <span>{r.name}</span>
              <span className="text-xs text-forest">{r.state}</span>
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
