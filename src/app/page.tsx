import {
  ArrowRight,
  CalendarCheck,
  ChefHat,
  Clock,
  Leaf,
  ListChecks,
  PiggyBank,
  Recycle,
  Salad,
  Search,
  ShoppingBasket,
  Sparkles,
  Timer,
  UtensilsCrossed,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { HeroIllustration } from "@/components/home/hero-illustration";
import { HomeFinder } from "@/components/home/home-finder";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { buttonClass } from "@/components/ui/button";
import { FEATURED_RECIPE_SLUGS, getRecipeBySlug, getRecipeSummaries, toSummary } from "@/data/recipes";
import { SITE_SECONDARY_TAGLINE } from "@/lib/seo/site";

const QUICK_IDEAS = [
  { href: "/recipes?time=15", label: "Under 15 minutes", icon: Zap },
  { href: "/recipes?few=1", label: "Five ingredients or fewer", icon: ListChecks },
  { href: "/recipes?category=budget", label: "Budget-friendly", icon: Wallet },
  { href: "/recipes?noOven=1", label: "No oven required", icon: UtensilsCrossed },
  { href: "/recipes?diet=vegetarian&category=dinner", label: "Vegetarian dinners", icon: Salad },
  { href: "/recipes?category=leftovers", label: "Leftover-friendly", icon: Recycle },
];

const STEPS = [
  { icon: Search, title: "Add your ingredients", text: "Type what you've got or tap quick-add. Synonyms like capsicum or scallion just work." },
  { icon: ChefHat, title: "Discover meals you can make", text: "See what's ready now, what's one ingredient away, and exactly what's missing." },
  { icon: Leaf, title: "Cook, enjoy and waste less", text: "Follow step-by-step cooking mode, then update your fridge in one tap." },
];

export default function HomePage() {
  const summaries = getRecipeSummaries();
  const featured = FEATURED_RECIPE_SLUGS.map((s) => getRecipeBySlug(s)).filter(Boolean).map((r) => toSummary(r!));

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-40 size-[32rem] rounded-full bg-leaf-soft/70 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-40 size-[24rem] rounded-full bg-orange-soft/70 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 pb-12 pt-8 sm:pt-14 lg:grid-cols-[1.25fr_0.75fr] lg:pb-20">
          <div>
            <p className="eyebrow inline-flex items-center gap-2 rounded-full bg-forest-50 px-3 py-1.5">
              <Sparkles className="size-3.5" aria-hidden /> Free · No sign-up · Works on your phone
            </p>
            <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              What&apos;s in your <span className="relative whitespace-nowrap text-forest">fridge<svg aria-hidden viewBox="0 0 200 12" className="absolute -bottom-1 left-0 w-full text-orange" preserveAspectRatio="none"><path d="M2 9c50-7 140-8 196-3" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" /></svg></span>?
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
              Tell us what you&apos;ve got. We&apos;ll help you turn it into something delicious.
            </p>
            <div className="mt-7 max-w-2xl" id="find">
              <HomeFinder recipes={summaries} />
            </div>
            <p className="mt-4">
              <Link href="/how-it-works" className="inline-flex items-center gap-1 font-semibold text-forest hover:underline">
                See how it works <ArrowRight className="size-4" aria-hidden />
              </Link>
            </p>
          </div>
          <div className="hidden justify-center lg:flex">
            <HeroIllustration className="w-full max-w-sm drop-shadow-sm" />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section aria-labelledby="how" className="border-y border-line bg-white/70 py-16">
        <div className="container-page">
          <p className="eyebrow">How it works</p>
          <h2 id="how" className="mt-2 text-3xl font-semibold sm:text-4xl">
            Three steps from fridge to fork
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card relative p-6">
                <span className="absolute right-5 top-4 font-display text-5xl font-semibold text-forest-100">{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-forest text-white">
                  <s.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What's cooking ── */}
      <section aria-labelledby="cooking" className="py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">What&apos;s cooking?</p>
              <h2 id="cooking" className="mt-2 text-3xl font-semibold sm:text-4xl">
                Favourites made from everyday ingredients
              </h2>
            </div>
            <Link href="/recipes" className={buttonClass("secondary", "md")}>
              All recipes <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((r) => (
              <li key={r.id} className="flex [&>article]:flex-1">
                <RecipeCard recipe={r} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Use what you have / Save food ── */}
      <section className="pb-16">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden p-7 sm:p-9">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-leaf-soft text-forest">
              <ListChecks className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-3xl font-semibold">Use what you have</h2>
            <p className="mt-3 text-muted">
              Fridge Rescue starts from your ingredients, not from a recipe you then have to shop for. Every suggestion explains itself:
            </p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              {["“You have 5 of 6 ingredients.”", "“Missing: sour cream – or use Greek yogurt.”", "“Need another 150 g potatoes.”", "“Uses your spinach – use soon.”"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5 font-semibold text-forest-800">
                  <CheckIcon /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card overflow-hidden bg-forest p-7 text-white sm:p-9" style={{ background: "linear-gradient(145deg,#245C45,#1D4B38)" }}>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-orange">
              <PiggyBank className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-3xl font-semibold text-white">Save food, save money</h2>
            <p className="mt-3 text-white/85">
              Food you already bought is the cheapest food you&apos;ll ever cook. Fridge Rescue helps you notice what needs using, plan meals around it and only buy what&apos;s genuinely missing.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Timer, t: "Highlights items near the dates you enter" },
                { icon: ShoppingBasket, t: "Shopping lists with only what's missing" },
                { icon: CalendarCheck, t: "A simple weekly meal plan" },
                { icon: Clock, t: "Remembers your kitchen between visits" },
              ].map(({ icon: Icon, t }) => (
                <li key={t} className="flex items-start gap-2.5 rounded-xl bg-white/10 p-3 text-sm">
                  <Icon className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-white/70">{SITE_SECONDARY_TAGLINE}</p>
          </div>
        </div>
      </section>

      {/* ── Quick meal ideas ── */}
      <section aria-labelledby="quick" className="pb-16">
        <div className="container-page">
          <p className="eyebrow">Quick meal ideas</p>
          <h2 id="quick" className="mt-2 text-3xl font-semibold sm:text-4xl">
            In the mood for something specific?
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {QUICK_IDEAS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-4 font-semibold shadow-soft transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-orange-soft text-orange-ink">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="pb-4">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-[2rem] bg-orange-soft px-6 py-12 text-center sm:px-12">
            <div aria-hidden className="absolute -right-10 -top-10 size-48 rounded-full bg-orange/30 blur-2xl" />
            <h2 className="relative text-3xl font-semibold sm:text-4xl">Your next great meal is already in your fridge.</h2>
            <Link href="/#find" className={buttonClass("primary", "lg", "relative mt-7")}>
              Let&apos;s cook <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-forest" aria-hidden>
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.15" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
