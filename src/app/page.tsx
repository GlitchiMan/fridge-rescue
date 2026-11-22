import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "@/components/home/hero-visual";
import { HomeFinder } from "@/components/home/home-finder";
import { WasteEditorial } from "@/components/home/waste-editorial";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { buttonClass } from "@/components/ui/button";
import { FEATURED_RECIPE_SLUGS, getRecipeBySlug, getRecipeSummaries, toSummary } from "@/data/recipes";

const STEPS = [
  { title: "Add what you have", text: "Type a few ingredients, or keep a running list in My Fridge. Synonyms like capsicum or scallion just work." },
  { title: "See what you can make", text: "Recipes are ranked by how close you are – with a plain-English note on exactly what's missing." },
  { title: "Cook, then update", text: "Step-by-step cooking mode with timers. When you're done, your fridge updates in one tap." },
];

const BROWSE = [
  { href: "/recipes?time=15", label: "Under 15 minutes", text: "Fast, honest weeknight food." },
  { href: "/recipes?few=1", label: "Five ingredients or fewer", text: "Short lists, real flavour." },
  { href: "/recipes?category=budget", label: "Budget-friendly", text: "Cheap staples, done well." },
  { href: "/recipes?noOven=1", label: "No oven required", text: "Stovetop, microwave or no-cook." },
  { href: "/recipes?diet=vegetarian&category=dinner", label: "Vegetarian dinners", text: "Meat-free, still filling." },
  { href: "/recipes?category=leftovers", label: "Leftover-friendly", text: "Second lives for cooked rice and more." },
];

const EXPLANATIONS = [
  { label: "You have 5 of 6 ingredients.", tone: "text-ink" },
  { label: "Missing: sour cream – or use Greek yogurt.", tone: "text-ink" },
  { label: "Need another 150 g potatoes.", tone: "text-orange-ink" },
  { label: "Uses your spinach – use soon.", tone: "text-orange-ink" },
];

export default function HomePage() {
  const summaries = getRecipeSummaries();
  const featured = FEATURED_RECIPE_SLUGS.map((s) => getRecipeBySlug(s))
    .filter(Boolean)
    .map((r) => toSummary(r!))
    .slice(0, 5);

  return (
    <>
      <HomeFinder
        recipes={summaries}
        visual={<HeroVisual />}
        intro={
          <>
            <p className="eyebrow">Free · No sign-up · Works on your phone</p>
            <h1 className="mt-5 max-w-[13ch] text-[2.75rem] sm:text-[3.75rem] lg:text-[3.5rem] xl:text-[4.5rem]">
              Good food starts with what you have.
            </h1>
            <p className="lede mt-5 max-w-md">Tell us what&apos;s in your kitchen. We&apos;ll find something delicious to make.</p>
          </>
        }
      />

      {/* ── How it works ── */}
      <section aria-labelledby="how" className="container-page border-t border-line pt-14 sm:pt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 id="how" className="mt-4 text-[2rem] sm:text-[2.5rem]">From fridge to table in three steps</h2>
          </div>
          <ol className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="font-display text-[0.9375rem] italic text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-sans text-[1.0625rem] font-medium tracking-[-0.01em]">{s.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Featured recipes ── */}
      <section aria-labelledby="cooking" className="container-page pt-24 sm:pt-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">From the kitchen</p>
            <h2 id="cooking" className="mt-4 text-[2rem] sm:text-[2.5rem]">Everyday ingredients, done properly</h2>
          </div>
          <Link href="/recipes" className={buttonClass("secondary", "md")}>
            All {summaries.length} recipes <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((r, i) => (
            <li key={r.id} className={i === 0 ? "flex sm:col-span-2 lg:row-span-2 [&>article]:flex-1" : "flex [&>article]:flex-1"}>
              <RecipeCard recipe={r} size={i === 0 ? "large" : "default"} />
            </li>
          ))}
        </ul>
      </section>

      {/* ── Editorial: waste ── */}
      <div className="pt-24 sm:pt-32">
        <WasteEditorial />
      </div>

      {/* ── Honest suggestions ── */}
      <section aria-labelledby="honest" className="container-page pt-24 sm:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">Honest by design</p>
            <h2 id="honest" className="mt-4 text-[2rem] sm:text-[2.5rem]">Every suggestion explains itself</h2>
            <p className="lede mt-5 max-w-lg">
              No mystery scores and nothing sponsored. Each recipe tells you what you have, what you&apos;re short of and what needs using – and it never
              pretends a recipe is ready when it isn&apos;t.
            </p>
            <Link href="/how-it-works" className="link mt-6 inline-flex items-center gap-1.5 text-[0.9375rem]">
              How matching works <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="rounded-[1rem] border border-line bg-white p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <p className="font-display text-2xl">Spinach &amp; Potato Hash</p>
              <p className="text-xs uppercase tracking-[0.1em] text-muted">Example</p>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {EXPLANATIONS.map((e) => (
                <li key={e.label} className={`py-3.5 text-[0.9375rem] ${e.tone}`}>
                  {e.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Browse by need ── */}
      <section aria-labelledby="quick" className="container-page pt-24 sm:pt-32">
        <p className="eyebrow">Browse by need</p>
        <h2 id="quick" className="mt-4 text-[2rem] sm:text-[2.5rem]">In the mood for something specific?</h2>
        <ul className="mt-10 grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {BROWSE.map((b) => (
            <li key={b.href} className="border-b border-r border-line">
              <Link href={b.href} className="group flex h-full items-start justify-between gap-4 p-6 transition-colors hover:bg-white sm:p-7">
                <span>
                  <span className="block font-display text-[1.375rem] leading-tight">{b.label}</span>
                  <span className="mt-1.5 block text-sm text-muted">{b.text}</span>
                </span>
                <ArrowUpRight className="mt-1 size-5 shrink-0 text-faint transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Closing ── */}
      <section className="container-page pt-24 sm:pt-32">
        <div className="flex flex-col items-start justify-between gap-8 border-t border-line pt-12 md:flex-row md:items-end">
          <h2 className="max-w-2xl text-[2rem] sm:text-[3rem]">Your next good meal is probably already in your kitchen.</h2>
          <Link href="/#find" className={buttonClass("primary", "lg", "shrink-0")}>
            Find recipes <ArrowRight className="size-[1.1rem]" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
