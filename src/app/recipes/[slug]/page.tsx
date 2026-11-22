import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { recipeGridClass } from "@/components/recipes/recipe-grid";
import { RecipeImage } from "@/components/recipes/recipe-image";
import { IngredientsPanel, RecipeActions, RecipeProvider } from "@/components/recipes/recipe-workspace";
import { StepTimer } from "@/components/recipes/step-timer";
import { getIngredient } from "@/data/ingredients";
import { RECIPES, getRecipeBySlug, toSummary } from "@/data/recipes";
import { IMAGE_SIZES, getRecipeImage } from "@/lib/images";
import { ALLERGEN_LABELS, DIETARY_LABELS, getRecipeAllergens, getRecipeDietaryTags } from "@/lib/recipes/dietary";
import { breadcrumbJsonLd, recipeJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import type { Recipe } from "@/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return {};
  const description = `${recipe.shortDescription} Ready in ${recipe.totalMinutes} minutes, serves ${recipe.servings}.`;
  const photo = getRecipeImage(recipe.slug);
  return {
    title: recipe.title,
    description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: { type: "article", title: recipe.title, description, url: `/recipes/${recipe.slug}`, ...(photo ? { images: [photo] } : {}) },
    twitter: { card: photo ? "summary_large_image" : "summary", title: recipe.title, description },
  };
}

const EQUIPMENT_LABEL: Record<string, string> = {
  stovetop: "Stovetop", oven: "Oven", microwave: "Microwave", "air-fryer": "Air fryer", blender: "Blender", toaster: "Toaster",
};

function relatedFor(recipe: Recipe): Recipe[] {
  const chosen = recipe.relatedRecipes.map((id) => getRecipeBySlug(id)).filter((r): r is Recipe => Boolean(r));
  if (chosen.length >= 3) return chosen.slice(0, 3);
  // Fill with recipes sharing the most ingredients (deterministic).
  const mine = new Set(recipe.ingredients.map((i) => i.ingredientId));
  const extra = RECIPES.filter((r) => r.id !== recipe.id && !chosen.includes(r))
    .map((r) => ({ r, shared: r.ingredients.filter((i) => mine.has(i.ingredientId)).length }))
    .sort((a, b) => b.shared - a.shared || a.r.slug.localeCompare(b.r.slug));
  return [...chosen, ...extra.map((e) => e.r)].slice(0, 3);
}

function safetyNotes(recipe: Recipe): string[] {
  const ids = new Set(recipe.ingredients.map((i) => i.ingredientId));
  const kinds = new Set(recipe.ingredients.map((i) => getIngredient(i.ingredientId)?.animal));
  const notes: string[] = [];
  if (ids.has("chicken-breast") || ids.has("chicken-thighs") || ids.has("ground-beef")) {
    notes.push("Cook poultry and minced meat all the way through. A food thermometer is the most reliable check – follow your local food safety authority's guidance for target temperatures.");
    notes.push("Keep raw meat away from ready-to-eat food, and wash hands, boards and knives after handling it.");
  }
  if (ids.has("cooked-chicken") || ids.has("cooked-rice")) {
    notes.push("Only use leftovers that were cooled quickly and kept in the fridge. Reheat until piping hot throughout, and don't reheat more than once.");
  }
  if (kinds.has("egg")) notes.push("If you're cooking for anyone pregnant, very young, elderly or with a weakened immune system, cook eggs until whites and yolks are firm.");
  if (kinds.has("fish")) notes.push("Keep fish chilled and use it by the date on the pack.");
  notes.push("Dates on food labels are a guide: use-by dates are about safety, best-before dates are about quality. If something looks, smells or feels wrong, don't eat it.");
  return notes;
}

function SideHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted">
      {children}
    </h2>
  );
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);
  if (!recipe) notFound();

  const tags = getRecipeDietaryTags(recipe);
  const allergens = getRecipeAllergens(recipe);
  const related = relatedFor(recipe);
  const substitutions = recipe.substitutions;
  const hasPhoto = Boolean(getRecipeImage(recipe.slug));

  const facts = [
    { label: "Prep", value: `${recipe.prepMinutes} min` },
    { label: "Cook", value: recipe.cookMinutes ? `${recipe.cookMinutes} min` : "No cooking" },
    { label: "Total", value: `${recipe.totalMinutes} min` },
    { label: "Serves", value: String(recipe.servings) },
    { label: "Difficulty", value: recipe.difficulty[0]!.toUpperCase() + recipe.difficulty.slice(1) },
  ];

  return (
    <RecipeProvider recipe={recipe}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(recipeJsonLd(recipe)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Recipes", path: "/recipes" },
              { name: recipe.title, path: `/recipes/${recipe.slug}` },
            ]),
          ),
        }}
      />
      <article className="container-page pt-6 sm:pt-10">
        <nav aria-label="Breadcrumb" className="no-print text-[0.8125rem] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-ink">Home</Link>
            </li>
            <ChevronRight className="size-3.5 text-faint" aria-hidden />
            <li>
              <Link href="/recipes" className="hover:text-ink">Recipes</Link>
            </li>
            <ChevronRight className="size-3.5 text-faint" aria-hidden />
            <li aria-current="page" className="text-ink">{recipe.title}</li>
          </ol>
        </nav>

        {/* ── Header ── */}
        <header className={hasPhoto ? "mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16" : "mt-6 max-w-4xl lg:mt-8"}>
          {/* Photo first on small screens so the dish is the first thing you see. */}
          {hasPhoto && (
            <figure className="no-print lg:order-2">
              <RecipeImage
                slug={recipe.slug}
                title={recipe.title}
                ingredients={recipe.ingredients}
                sizes={IMAGE_SIZES.recipeHero}
                priority
                className="aspect-[4/3] rounded-[1rem] lg:aspect-[5/4] lg:rounded-[1.25rem]"
              />
              <figcaption className="mt-2 text-xs text-muted">Serving suggestion</figcaption>
            </figure>
          )}
          <div>
            <p className="eyebrow">{recipe.cuisine}</p>
            <h1 className="mt-3 text-[2.375rem] sm:text-[3.25rem] xl:text-[4rem]">{recipe.title}</h1>
            <p className="lede mt-4 max-w-xl">{recipe.shortDescription}</p>

            <dl className="mt-6 grid grid-cols-3 gap-y-4 border-y border-line py-4 sm:grid-cols-5">
              {facts.map(({ label, value }) => (
                <div key={label} className="pr-3">
                  <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
                  <dd className="mt-1 font-display text-[1.25rem] leading-tight">{value}</dd>
                </div>
              ))}
            </dl>

            {tags.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Dietary information">
                {tags.map((t) => (
                  <li key={t} className="tag border border-forest-200 text-forest">{DIETARY_LABELS[t]}</li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <RecipeActions />
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="mt-10 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-16 xl:gap-24">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <IngredientsPanel />
            {recipe.equipment.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <SideHeading id="equipment">Equipment</SideHeading>
                <p className="mt-2 text-[0.9375rem]">{recipe.equipment.map((e) => EQUIPMENT_LABEL[e]).join(", ")}</p>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <section aria-labelledby="method">
              <h2 id="method" className="section-title">Method</h2>
              <ol className="mt-6 border-t border-line">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="print-break-avoid grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-b border-line py-6 sm:grid-cols-[4rem_minmax(0,1fr)]">
                    <span className="font-display text-[1.75rem] leading-none text-faint sm:text-[2.25rem]" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[1.0625rem] leading-[1.7] text-ink-soft sm:text-[1.125rem]"><span className="sr-only">Step {i + 1}: </span>{step.text}</p>
                      {step.timerMinutes && (
                        <div className="mt-3">
                          <StepTimer minutes={step.timerMinutes} label={`Step ${i + 1}`} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {recipe.whyItWorks && (
              <section aria-labelledby="why" className="mt-12">
                <p className="eyebrow" id="why">Why it works</p>
                <p className="mt-3 max-w-2xl font-display text-[1.25rem] leading-[1.45] tracking-[-0.01em] sm:text-[1.375rem]">{recipe.whyItWorks}</p>
                <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{recipe.fullDescription}</p>
              </section>
            )}
            {!recipe.whyItWorks && <p className="mt-12 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{recipe.fullDescription}</p>}

            <AdSlot slot="recipe-mid" />

            <div className="mt-14 grid gap-12 xl:grid-cols-2 xl:gap-10">
              <section aria-labelledby="tips">
                <h2 id="tips" className="font-display text-[1.375rem]">Tips</h2>
                <ul className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {recipe.tips.map((t) => (
                    <li key={t} className="flex gap-3"><span className="mt-[0.7em] h-px w-3 shrink-0 bg-ink/40" aria-hidden />{t}</li>
                  ))}
                </ul>
              </section>

              {recipe.storageNotes && (
                <section aria-labelledby="storage">
                  <h2 id="storage" className="font-display text-[1.375rem]">Storage</h2>
                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">{recipe.storageNotes}</p>
                </section>
              )}
            </div>

            {substitutions.length > 0 && (
              <section aria-labelledby="subs" className="mt-14">
                <h2 id="subs" className="font-display text-[1.375rem]">Substitutions</h2>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {substitutions.map((s) => (
                    <li key={`${s.ingredientId}-${s.substituteId}`} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6">
                      <p className="font-medium">
                        {getIngredient(s.substituteId)?.name} <span className="font-normal text-muted">for</span> {getIngredient(s.ingredientId)?.name.toLowerCase()}
                      </p>
                      <p className="text-[0.9375rem] text-muted">{s.note}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">Substitutes can introduce different allergens – check before swapping.</p>
              </section>
            )}

            <div className="mt-14 grid gap-6 xl:grid-cols-2">
              <section aria-labelledby="allergens" className="rounded-[0.875rem] border border-line bg-white p-6">
                <h2 id="allergens" className="font-display text-[1.25rem]">Allergens</h2>
                {allergens.contains.length > 0 ? (
                  <p className="mt-3 text-[0.9375rem]">Contains: <strong className="font-medium">{allergens.contains.map((a) => ALLERGEN_LABELS[a]).join(", ")}</strong>.</p>
                ) : (
                  <p className="mt-3 text-[0.9375rem]">No common allergens in our ingredient list.</p>
                )}
                {allergens.optionalOnly.length > 0 && (
                  <p className="mt-1.5 text-sm">Optional ingredients add: {allergens.optionalOnly.map((a) => ALLERGEN_LABELS[a]).join(", ")}.</p>
                )}
                {allergens.mayContainGluten.length > 0 && (
                  <p className="mt-1.5 text-sm">May contain gluten depending on the brand: {allergens.mayContainGluten.map((id) => getIngredient(id)?.name.toLowerCase()).join(", ")}.</p>
                )}
                <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
                  Allergen information is based on typical ingredients and isn&apos;t a guarantee. Always check product labels, and be aware of cross-contact in your kitchen.
                </p>
              </section>

              <section aria-labelledby="safety" className="rounded-[0.875rem] bg-cream-deep p-6">
                <h2 id="safety" className="font-display text-[1.25rem]">Food safety</h2>
                <ul className="mt-3 space-y-2 text-[0.875rem] leading-relaxed text-ink-soft">
                  {safetyNotes(recipe).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>

        <section aria-labelledby="related" className="no-print mt-24 border-t border-line pt-14">
          <h2 id="related" className="section-title">You might also like</h2>
          <ul className={`mt-6 ${recipeGridClass()}`}>
            {related.map((r) => (
              <li key={r.id}>
                <RecipeCard recipe={toSummary(r)} />
              </li>
            ))}
          </ul>
        </section>
      </article>
    </RecipeProvider>
  );
}
