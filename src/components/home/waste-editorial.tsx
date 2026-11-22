import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getSiteImage } from "@/lib/images";

/** Matches the stone surface in ingredients-editorial so photo and panel read as one. */
const STONE = "#55585A";

const POINTS = [
  { title: "Notice what needs using", text: "Enter the dates on the label and we surface those ingredients first." },
  { title: "Swap instead of shop", text: "Recipe-approved substitutions turn “missing one thing” into dinner." },
  { title: "Buy only the gaps", text: "Plan the week, then send just the missing items to your list." },
];

/**
 * Image-led section built on ingredients-editorial.*: the ingredients run
 * along the top of the frame and the lower half is clean stone, so the copy
 * sits in that empty space on large screens and below the photo on small ones.
 */
export function WasteEditorial() {
  const src = getSiteImage("ingredients-editorial");
  return (
    <section aria-labelledby="waste" className="container-page">
      <div className="relative overflow-hidden rounded-[1.25rem] text-white" style={{ background: STONE }}>
        {src && (
          <div className="relative aspect-[5/4] sm:aspect-[16/10] lg:aspect-[1.62]">
            <Image
              src={src}
              alt="Tomatoes, basil, mushrooms, eggs, flour, dried chillies and garlic laid out on a dark stone worktop"
              fill
              sizes="(min-width: 1440px) 1344px, 100vw"
              className="object-cover object-top"
            />
            {/* Blends the photo's stone into the panel below on small screens. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 lg:hidden" style={{ background: `linear-gradient(to bottom, transparent, ${STONE})` }} />
          </div>
        )}

        <div className={src ? "relative px-6 pb-10 sm:px-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:px-14 lg:pb-14" : "px-6 py-14 sm:px-10 lg:px-14 lg:py-20"}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-16">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/70">Why it matters</p>
              <h2 id="waste" className="mt-4 text-[2.25rem] leading-[1.02] tracking-[-0.028em] text-white sm:text-5xl xl:text-[3.75rem]">
                Less waste.
                <br />
                Better meals.
              </h2>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-white/85">Make the most of the ingredients you already have.</p>
              <Link href="/my-fridge" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-[0.625rem] bg-white px-4 text-[0.9375rem] font-medium text-ink transition-colors hover:bg-cream">
                Start with your fridge <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8">
              {POINTS.map((p) => (
                <li key={p.title} className="border-t border-white/25 pt-4">
                  <h3 className="font-sans text-[0.9375rem] font-medium tracking-normal text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/75">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
