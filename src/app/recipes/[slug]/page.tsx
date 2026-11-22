import { ArrowLeftRight, ChevronRight, Clock, Flame, Gauge, Info, Lightbulb, ShieldCheck, Snowflake, Users, Utensils } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads/ad-slot";
import { RecipeArt } from "@/components/recipes/recipe-art";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { IngredientsPanel, RecipeActions, RecipeProvider } from "@/components/recipes/recipe-workspace";
import { StepTimer } from "@/components/recipes/step-timer";
import { getIngredient } from "@/data/ingredients";
import { RECIPES, getRecipeBySlug, toSummary } from "@/data/recipes";
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
  return {
    title: recipe.title,
    description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: { type: "article", title: recipe.title, description, url: `/recipes/${recipe.slug}` },
    twitter: { card: "summary", title: recipe.title, description },
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

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);
  if (!recipe) notFound();

  const tags = getRecipeDietaryTags(recipe);
  const allergens = getRecipeAllergens(recipe);
  const related = relatedFor(recipe);
  const substitutions = recipe.substitutions;

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
      <article className="container-page py-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="no-print text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-forest hover:underline">Home</Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden />
            <li>
              <Link href="/recipes" className="hover:text-forest hover:underline">Recipes</Link>
            </li>
            <ChevronRight className="size-3.5" aria-hidden />
            <li aria-current="page" className="font-semibold text-ink">{recipe.title}</li>
          </ol>
        </nav>

        <header className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow">{recipe.cuisine}</p>
            <h1 className="mt-2 text-4xl font-semibold leading-[1.05] sm:text-5xl">{recipe.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">{recipe.fullDescription}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Clock, label: "Prep", value: `${recipe.prepMinutes} min` },
                { icon: Flame, label: "Cook", value: recipe.cookMinutes ? `${recipe.cookMinutes} min` : "No cooking" },
                { icon: Users, label: "Serves", value: String(recipe.servings) },
                { icon: Gauge, label: "Difficulty", value: recipe.difficulty[0]!.toUpperCase() + recipe.difficulty.slice(1) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-line bg-white px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </dt>
                  <dd className="mt-0.5 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted">Total time: {recipe.totalMinutes} minutes</p>
            {tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Dietary information">
                {tags.map((t) => (
                  <li key={t} className="rounded-full bg-leaf-soft px-3 py-1 text-xs font-bold text-forest-800">{DIETARY_LABELS[t]}</li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <RecipeActions />
            </div>
          </div>
          <figure className="no-print overflow-hidden rounded-[1.75rem] border border-line shadow-soft">
            <RecipeArt slug={recipe.slug} categories={recipe.categories} ingredients={recipe.ingredients} className="aspect-[4/3] w-full" />
            <figcaption className="bg-white px-4 py-2 text-xs text-muted">Illustration inspired by the ingredients – not a photo of the finished dish.</figcaption>
          </figure>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <IngredientsPanel />
            {recipe.equipment.length > 0 && (
              <div className="mt-4 rounded-2xl border border-line bg-white p-4 text-sm">
                <h2 className="flex items-center gap-2 font-sans text-sm font-bold"><Utensils className="size-4" aria-hidden /> Equipment</h2>
                <p className="mt-1 text-muted">{recipe.equipment.map((e) => EQUIPMENT_LABEL[e]).join(", ")}</p>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <section aria-labelledby="method">
              <h2 id="method" className="text-2xl font-semibold">Method</h2>
              <ol className="mt-4 space-y-4">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="print-break-avoid flex gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest font-display text-lg font-semibold text-white" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="flex-1 pt-1">
                      <p className="text-[1.05rem] leading-relaxed"><span className="sr-only">Step {i + 1}: </span>{step.text}</p>
                      {step.timerMinutes && (
                        <div className="mt-2">
                          <StepTimer minutes={step.timerMinutes} label={`Step ${i + 1}`} />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {recipe.whyItWorks && (
              <section aria-labelledby="why" className="mt-10 rounded-2xl bg-surface p-5">
                <h2 id="why" className="text-xl font-semibold">Why it works</h2>
                <p className="mt-2 leading-relaxed text-ink/90">{recipe.whyItWorks}</p>
              </section>
            )}

            <AdSlot slot="recipe-mid" />

            <section aria-labelledby="tips" className="mt-10">
              <h2 id="tips" className="flex items-center gap-2 text-xl font-semibold"><Lightbulb className="size-5 text-orange-ink" aria-hidden /> Tips</h2>
              <ul className="mt-3 space-y-2">
                {recipe.tips.map((t) => (
                  <li key={t} className="flex gap-2 leading-relaxed"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-orange" aria-hidden />{t}</li>
                ))}
              </ul>
            </section>

            {substitutions.length > 0 && (
              <section aria-labelledby="subs" className="mt-10">
                <h2 id="subs" className="flex items-center gap-2 text-xl font-semibold"><ArrowLeftRight className="size-5 text-forest" aria-hidden /> Substitutions</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {substitutions.map((s) => (
                    <li key={`${s.ingredientId}-${s.substituteId}`} className="rounded-2xl border border-line bg-white p-4">
                      <p className="font-semibold">
                        {getIngredient(s.substituteId)?.name} <span className="font-normal text-muted">instead of</span> {getIngredient(s.ingredientId)?.name.toLowerCase()}
                      </p>
                      <p className="mt-1 text-sm text-muted">{s.note}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted">Substitutes can introduce different allergens – check before swapping.</p>
              </section>
            )}

            {recipe.storageNotes && (
              <section aria-labelledby="storage" className="mt-10">
                <h2 id="storage" className="flex items-center gap-2 text-xl font-semibold"><Snowflake className="size-5 text-forest" aria-hidden /> Storage</h2>
                <p className="mt-2 leading-relaxed">{recipe.storageNotes}</p>
              </section>
            )}

            <section aria-labelledby="allergens" className="mt-10 rounded-2xl border border-line bg-white p-5">
              <h2 id="allergens" className="flex items-center gap-2 text-xl font-semibold"><Info className="size-5 text-forest" aria-hidden /> Allergens</h2>
              {allergens.contains.length > 0 ? (
                <p className="mt-2">Contains: <strong>{allergens.contains.map((a) => ALLERGEN_LABELS[a]).join(", ")}</strong>.</p>
              ) : (
                <p className="mt-2">No common allergens in our ingredient list.</p>
              )}
              {allergens.optionalOnly.length > 0 && (
                <p className="mt-1 text-sm">Optional ingredients add: {allergens.optionalOnly.map((a) => ALLERGEN_LABELS[a]).join(", ")}.</p>
              )}
              {allergens.mayContainGluten.length > 0 && (
                <p className="mt-1 text-sm">May contain gluten depending on the brand: {allergens.mayContainGluten.map((id) => getIngredient(id)?.name.toLowerCase()).join(", ")}.</p>
              )}
              <p className="mt-2 text-sm text-muted">
                Allergen information is based on typical ingredients and isn&apos;t a guarantee. Always check product labels, and be aware of cross-contact in your kitchen.
              </p>
            </section>

            <section aria-labelledby="safety" className="mt-6 rounded-2xl bg-cream-deep p-5">
              <h2 id="safety" className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="size-5 text-forest" aria-hidden /> Food safety</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                {safetyNotes(recipe).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <section aria-labelledby="related" className="no-print mt-16">
          <h2 id="related" className="text-2xl font-semibold">You might also like</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <li key={r.id} className="flex [&>article]:flex-1">
                <RecipeCard recipe={toSummary(r)} />
              </li>
            ))}
          </ul>
        </section>
      </article>
    </RecipeProvider>
  );
}
