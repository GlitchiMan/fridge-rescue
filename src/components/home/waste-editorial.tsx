import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getSiteImage } from "@/lib/images";

/**
 * Sampled from the darker edge of the stone in ingredients-editorial so the
 * photo and the panel below it read as one surface. White text on it is ≥ 6:1.
 */
const STONE = "#5C6068";

/**
 * One benefit, image-led (ingredients-editorial.*): ingredients run along the
 * top of the frame and the lower half is clean stone, so the copy sits there
 * on large screens and directly below the photo on small ones.
 */
export function WasteEditorial() {
  const src = getSiteImage("ingredients-editorial");
  return (
    <section aria-labelledby="waste" className="container-page">
      <div className="relative overflow-hidden rounded-[1.25rem] text-white" style={{ background: STONE }}>
        {src && (
          <div className="relative aspect-[16/10] sm:aspect-[2/1] lg:aspect-[2.2]">
            <Image
              src={src}
              alt="Tomatoes, basil, mushrooms, eggs, flour, dried chillies and garlic laid out on a dark stone worktop"
              fill
              sizes="(min-width: 1440px) 1344px, 100vw"
              className="object-cover object-top"
            />
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 lg:hidden" style={{ background: `linear-gradient(to bottom, transparent, ${STONE})` }} />
            <div aria-hidden className="absolute inset-0 hidden lg:block" style={{ background: "linear-gradient(to top, rgb(24 26 30 / 0.66) 0%, rgb(24 26 30 / 0.4) 40%, transparent 70%)" }} />
          </div>
        )}

        <div className={src ? "relative -mt-6 px-6 pb-9 sm:px-10 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:px-14 lg:pb-12" : "px-6 py-14 sm:px-10 lg:px-14"}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="waste" className="text-[2.25rem] leading-[1.02] tracking-[-0.028em] text-white sm:text-[3rem] xl:text-[3.5rem]">
                Less waste. Better meals.
              </h2>
              <p className="mt-3 max-w-md text-[1.0625rem] leading-relaxed text-white/85">
                We flag what needs using first and turn it into dinner – so less ends up in the bin.
              </p>
            </div>
            <Link
              href="/my-fridge"
              className="inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-[0.625rem] bg-paper px-5 text-[0.9375rem] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-cream active:scale-[0.97] lg:self-auto"
            >
              Set up My Fridge <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
