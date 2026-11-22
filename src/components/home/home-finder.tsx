"use client";

import { ArrowRight, Refrigerator, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { IngredientPicker } from "@/components/ingredients/ingredient-picker";
import { StaplesToggle } from "@/components/ingredients/staples-toggle";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { DENSE_ITEM, DENSE_LIST, RecipeGrid, ResultSection } from "@/components/recipes/recipe-grid";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getIngredient, QUICK_ADD_IDS } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { suggestRecipesForInventory } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import type { InventoryItem, RecipeSummary } from "@/types";

const QUICK_LINKS = [
  { href: "/recipes?time=15", label: "Under 15 min" },
  { href: "/recipes?few=1", label: "5 ingredients or fewer" },
  { href: "/recipes?diet=vegetarian", label: "Vegetarian" },
  { href: "/recipes?category=budget", label: "Budget" },
  { href: "/recipes?noOven=1", label: "No oven" },
];

/**
 * Homepage: hero search + instant results.
 * Results update live as ingredients are added; "Find recipes" also commits
 * whatever is still typed and jumps to them.
 */
export function HomeFinder({
  recipes,
  featured,
  intro,
  visual,
}: {
  recipes: RecipeSummary[];
  featured: RecipeSummary[];
  intro: ReactNode;
  visual: ReactNode;
}) {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<{ commit: () => string[] } | null>(null);
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const fridgeIds = useMemo(() => Array.from(new Set(data.inventory.map((i) => i.ingredientId))), [data.inventory]);

  const results = useMemo(() => {
    if (selected.length === 0) return null;
    // Ingredients typed here have unknown quantities – the engine labels
    // matches "check quantities" rather than pretending they're ready.
    const fromFridge = new Map(data.inventory.map((i) => [i.ingredientId, i]));
    const inventory: InventoryItem[] = selected.map((id) => {
      const existing = fromFridge.get(id);
      if (existing) return existing;
      const ing = getIngredient(id)!;
      return { id: `home-${id}`, ingredientId: id, displayName: ing.name, quantity: null, unit: ing.defaultUnit, location: ing.defaultLocation, addedAt: "" };
    });
    // Include every fridge item for the selected ingredient (not just the first).
    const extra = data.inventory.filter((i) => selected.includes(i.ingredientId) && !inventory.includes(i));
    return suggestRecipesForInventory(recipes, [...inventory, ...extra], data.preferences, { today: todayIso(), favorites: data.favorites });
  }, [selected, data.inventory, data.preferences, data.favorites, recipes]);

  const add = (ids: string[]) => {
    setSelected((s) => Array.from(new Set([...s, ...ids])));
    track({ name: "ingredient_added", props: { source: "home" } });
  };
  const remove = (id: string) => setSelected((s) => s.filter((x) => x !== id));

  const showResults = (ids: string[]) => {
    if (ids.length === 0) {
      document.getElementById("hero-ingredients")?.focus();
      return;
    }
    track({ name: "recipe_search_completed", props: { resultCount: results?.ranked.length ?? 0, ingredientCount: ids.length } });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const find = () => {
    const typed = pickerRef.current?.commit() ?? [];
    showResults(Array.from(new Set([...selected, ...typed])));
  };

  const useFridge = () => {
    setSelected(fridgeIds);
    showResults(fridgeIds);
  };

  const saveToFridge = () => {
    const { added, skipped } = kitchenStore.quickAddIngredients(selected);
    toast.show(
      added.length
        ? `Added ${added.length} ingredient${added.length === 1 ? "" : "s"} to My Fridge${skipped.length ? ` (${skipped.length} already there)` : ""}`
        : "Those ingredients are already in My Fridge",
      { tone: added.length ? "success" : "info" },
    );
  };

  const quickAdd = QUICK_ADD_IDS.filter((id) => !selected.includes(id)).slice(0, 6);
  const groups = results?.groups;
  const unsaved = selected.filter((id) => !fridgeIds.includes(id));

  return (
    <>
      {/* ── Hero ──
          Phone: copy → photo → search. Tablet: copy → search → photo.
          Desktop: copy + search left, photo right. */}
      <section className="container-page grid gap-x-14 gap-y-6 pb-10 pt-6 [grid-template-areas:'intro'_'visual'_'search'] sm:gap-y-8 sm:pt-10 sm:[grid-template-areas:'intro'_'search'_'visual'] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-y-8 lg:pb-16 lg:pt-12 lg:[grid-template-areas:'intro_visual'_'search_visual'] xl:gap-x-20">
        <div className="[grid-area:intro] lg:self-end">{intro}</div>
        <div className="[grid-area:visual] lg:self-center">{visual}</div>

        <div className="[grid-area:search] lg:self-start" id="find">
          <IngredientPicker
            label="What's in your fridge?"
            hideLabel
            size="lg"
            selected={selected}
            onAdd={add}
            onRemove={remove}
            inputId="hero-ingredients"
            placeholder="Type an ingredient, e.g. eggs"
            onEnterEmpty={find}
            actionRef={pickerRef}
          />

          {selected.length < 3 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[0.8125rem] text-muted">Try</span>
              {quickAdd.map((id) => {
                const ing = getIngredient(id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => add([id])}
                    className="inline-flex min-h-9 items-center rounded-[0.5rem] border border-line bg-white/70 px-3 text-[0.8125rem] font-medium text-ink-soft transition-[background-color,border-color,color,transform] duration-150 hover:border-ink/30 hover:bg-white hover:text-ink active:scale-95"
                  >
                    + {ing.name.replace(/ \(.*\)/, "")}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <button type="button" onClick={find} className={buttonClass("primary", "lg", "w-full text-[1.0625rem] sm:w-auto sm:min-w-48")}>
              <Search className="size-[1.15rem]" aria-hidden strokeWidth={2.25} />
              Find recipes
            </button>
            {hydrated && fridgeIds.length > 0 && (
              <button type="button" onClick={useFridge} className={buttonClass("ghost", "lg", "w-full sm:w-auto")}>
                <Refrigerator className="size-[1.1rem]" aria-hidden strokeWidth={1.75} />
                Use my fridge ({fridgeIds.length})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Instant results / popular recipes ── */}
      <div ref={resultsRef} id="results" className="scroll-mt-20">
        <section aria-label={results ? "Recipe results" : "Popular recipes"} className="container-page pb-6">
          {!results || !groups ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-[1.875rem] leading-tight sm:text-[2.25rem]">Popular right now</h2>
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Quick filters">
                    {QUICK_LINKS.map((q) => (
                      <li key={q.href}>
                        <Link href={q.href} className="inline-flex min-h-8 items-center rounded-[0.5rem] bg-ink/[0.05] px-2.5 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-ink/[0.09] hover:text-ink">
                          {q.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/recipes" className={buttonClass("secondary", "md", "self-start sm:self-auto")}>
                  View all {recipes.length} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
              <ul className={`mt-6 ${DENSE_LIST}`}>
                {featured.map((r, i) => (
                  <li key={r.id} className={`animate-fade-up ${DENSE_ITEM}`} style={{ animationDelay: `${i * 35}ms` }}>
                    <RecipeCard recipe={r} priority={i < 3} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <p aria-live="polite" className="font-display text-[1.625rem] leading-tight tracking-[-0.02em] sm:text-[2.125rem]">
                  {results.ranked.length > 0
                    ? `We found ${results.ranked.length} recipe${results.ranked.length === 1 ? "" : "s"} that use your ingredients.`
                    : "We couldn't find a close match yet."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {unsaved.length > 0 && (
                    <button type="button" onClick={saveToFridge} className={buttonClass("secondary", "sm")}>
                      Save to My Fridge
                    </button>
                  )}
                  <Link href="/recipes" className={buttonClass("ghost", "sm")}>
                    View all recipes <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </div>

              <details className="group mt-5 rounded-[0.75rem] border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[0.875rem] sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="font-medium text-ink">Got pantry basics like oil, salt or butter?</span>{" "}
                    <span className="text-muted">Tell us for better matches.</span>
                  </span>
                  <span aria-hidden className="text-lg leading-none text-muted transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <StaplesToggle />
                  <button type="button" onClick={() => showResults(selected)} className={buttonClass("primary", "sm", "mt-4")}>
                    Update results
                  </button>
                </div>
              </details>

              <div className="mt-10">
                {results.ranked.length === 0 && (
                  <div className="rounded-[0.875rem] border border-line bg-white px-6 py-10 text-center">
                    <p className="font-display text-2xl">Try adding a few more ingredients.</p>
                    <p className="mt-2 text-muted">Or relax your preferences – results update as you type.</p>
                  </div>
                )}
                {groups.canMake.length > 0 && (
                  <ResultSection
                    id="can-make"
                    title="You can make this now"
                    description="All the essentials match – amounts typed here aren't known, so check quantities."
                    count={groups.canMake.length}
                  >
                    <RecipeGrid items={groups.canMake} recipes={recipeMap} limit={6} dense />
                  </ResultSection>
                )}
                {groups.almost.length > 0 && (
                  <ResultSection id="almost" title="Almost there" description="Just one or two ingredients away." count={groups.almost.length}>
                    <RecipeGrid items={groups.almost} recipes={recipeMap} limit={6} dense />
                  </ResultSection>
                )}
                {groups.good.length > 0 && (
                  <ResultSection id="good" title="Good matches" description="These use several of your ingredients." count={groups.good.length}>
                    <RecipeGrid items={groups.good} recipes={recipeMap} limit={3} dense />
                  </ResultSection>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
