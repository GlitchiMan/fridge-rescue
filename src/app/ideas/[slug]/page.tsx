import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { GuideFridgeButton } from "@/components/content/guide-fridge-button";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { recipeGridClass } from "@/components/recipes/recipe-grid";
import { GUIDES, getGuide } from "@/data/guides";
import { getIngredient } from "@/data/ingredients";
import { getRecipeBySlug, toSummary } from "@/data/recipes";
import { breadcrumbJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/ideas/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description, url: `/ideas/${g.slug}` },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const recipes = g.recipeSlugs.map((s) => getRecipeBySlug(s)).filter((r) => r !== undefined).map(toSummary);
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);
  const names = g.keyIngredients.map((id) => getIngredient(id)?.name.toLowerCase().replace(/ \(.*\)/, ""));

  return (
    <article className="pt-6 sm:pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/ideas" }, { name: g.title, path: `/ideas/${g.slug}` }])) }}
      />
      <div className="container-page">
        <nav aria-label="Breadcrumb" className="text-[0.8125rem] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <ChevronRight className="size-3.5 text-faint" aria-hidden />
            <li><Link href="/ideas" className="hover:text-ink">Guides</Link></li>
            <ChevronRight className="size-3.5 text-faint" aria-hidden />
            <li aria-current="page" className="text-ink">{g.title}</li>
          </ol>
        </nav>
      </div>

      <header className="container-narrow mt-10 sm:mt-14">
        <p className="eyebrow">Guide</p>
        <h1 className="mt-4 text-[2.5rem] sm:text-[3.5rem]">{g.title}</h1>
        {g.intro.map((p) => <p key={p} className="lede mt-6">{p}</p>)}
        <div className="mt-8 flex flex-col gap-4 rounded-[0.875rem] border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-[1.25rem] leading-snug">Got {names.join(", ")}?</p>
          <GuideFridgeButton ingredientIds={g.keyIngredients} />
        </div>
      </header>

      <section aria-labelledby="guide-recipes" className="container-page mt-20">
        <div className="mb-7 border-b border-line pb-4">
          <h2 id="guide-recipes" className="section-title">Recipes to try</h2>
        </div>
        <ul className={recipeGridClass()}>
          {recipes.map((r) => <li key={r.id}><RecipeCard recipe={r} /></li>)}
        </ul>
      </section>

      <div className="container-narrow mt-20">
        {g.sections.map((s) => (
          <section key={s.heading} className="mt-14 first:mt-0">
            <h2 className="font-display text-[1.75rem] leading-tight">{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p} className="mt-4 text-[1.0625rem] leading-[1.75] text-ink-soft">{p}</p>)}
            {s.tips && (
              <ul className="mt-6 space-y-3 border-l-2 border-forest-200 pl-5">
                {s.tips.map((t) => <li key={t} className="text-[0.9375rem] leading-relaxed text-ink-soft">{t}</li>)}
              </ul>
            )}
          </section>
        ))}
        <AdSlot slot="guide-bottom" />
        <section aria-labelledby="more-guides" className="mt-16 border-t border-line pt-10">
          <h2 id="more-guides" className="eyebrow">More guides</h2>
          <ul className="mt-4 divide-y divide-line">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/ideas/${o.slug}`} className="block py-3 font-display text-[1.25rem] hover:text-forest">{o.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
