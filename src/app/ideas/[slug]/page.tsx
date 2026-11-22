import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { GuideFridgeButton } from "@/components/content/guide-fridge-button";
import { RecipeCard } from "@/components/recipes/recipe-card";
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

  return (
    <article className="container-page py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Ideas", path: "/ideas" }, { name: g.title, path: `/ideas/${g.slug}` }])) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="hover:underline">Home</Link></li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li><Link href="/ideas" className="hover:underline">Ideas</Link></li>
          <ChevronRight className="size-3.5" aria-hidden />
          <li aria-current="page" className="font-semibold text-ink">{g.title}</li>
        </ol>
      </nav>
      <div className="mx-auto max-w-3xl">
        <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">{g.title}</h1>
        {g.intro.map((p) => <p key={p} className="mt-4 text-lg leading-relaxed text-muted">{p}</p>)}
        <div className="mt-6 rounded-2xl bg-forest-50 p-4">
          <p className="font-semibold text-forest-800">Got {g.keyIngredients.map((id) => getIngredient(id)?.name.toLowerCase().replace(/ \(.*\)/, "")).join(", ")}?</p>
          <GuideFridgeButton ingredientIds={g.keyIngredients} />
        </div>
      </div>

      <section aria-labelledby="guide-recipes" className="mt-12">
        <h2 id="guide-recipes" className="text-2xl font-semibold">Recipes to try</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => <li key={r.id} className="flex [&>article]:flex-1"><RecipeCard recipe={r} /></li>)}
        </ul>
      </section>

      <div className="mx-auto mt-12 max-w-3xl">
        {g.sections.map((s) => (
          <section key={s.heading} className="mt-10 first:mt-0">
            <h2 className="text-2xl font-semibold">{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p} className="mt-3 leading-relaxed">{p}</p>)}
            {s.tips && (
              <ul className="mt-4 space-y-2 rounded-2xl border border-line bg-white p-5">
                {s.tips.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" aria-hidden />{t}</li>)}
              </ul>
            )}
          </section>
        ))}
        <AdSlot slot="guide-bottom" />
        <section aria-labelledby="more-guides" className="mt-12 border-t border-line pt-8">
          <h2 id="more-guides" className="text-xl font-semibold">More guides</h2>
          <ul className="mt-3 space-y-2">
            {others.map((o) => <li key={o.slug}><Link href={`/ideas/${o.slug}`} className="font-semibold text-forest hover:underline">{o.title}</Link></li>)}
          </ul>
        </section>
      </div>
    </article>
  );
}
