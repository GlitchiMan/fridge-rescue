"use client";

import { ArrowRight, Refrigerator, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { IngredientPicker } from "@/components/ingredients/ingredient-picker";
import { StaplesToggle } from "@/components/ingredients/staples-toggle";
import { RecipeGrid, ResultSection } from "@/components/recipes/recipe-grid";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getIngredient, QUICK_ADD_IDS } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { suggestRecipesForInventory, type SuggestionResult } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import type { InventoryItem, RecipeSummary } from "@/types";

/**
 * Homepage hero + ingredient search + results.
 * The hero copy and visual are passed in from the (server) page so the
 * search stays the one interactive island.
 */
export function HomeFinder({ recipes, intro, visual }: { recipes: RecipeSummary[]; intro: ReactNode; visual: ReactNode }) {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<SuggestionResult | null>(null);
  const [searchedWith, setSearchedWith] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const fridgeIds = useMemo(() => Array.from(new Set(data.inventory.map((i) => i.ingredientId))), [data.inventory]);

  const add = (ids: string[]) => {
    setSelected((s) => Array.from(new Set([...s, ...ids])));
    track({ name: "ingredient_added", props: { source: "home" } });
  };
  const remove = (id: string) => setSelected((s) => s.filter((x) => x !== id));

  const find = (ids = selected) => {
    if (ids.length === 0) return;
    // Ingredients typed here have unknown quantities – the engine labels
    // matches "check quantities" rather than pretending they're ready.
    const fromFridge = new Map(data.inventory.map((i) => [i.ingredientId, i]));
    const inventory: InventoryItem[] = ids.map((id) => {
      const existing = fromFridge.get(id);
      if (existing) return existing;
      const ing = getIngredient(id)!;
      return { id: `home-${id}`, ingredientId: id, displayName: ing.name, quantity: null, unit: ing.defaultUnit, location: ing.defaultLocation, addedAt: new Date().toISOString() };
    });
    // Include every fridge item for the selected ingredient (not just the first).
    const extra = data.inventory.filter((i) => ids.includes(i.ingredientId) && !inventory.includes(i));
    const res = suggestRecipesForInventory(recipes, [...inventory, ...extra], data.preferences, { today: todayIso(), favorites: data.favorites });
    setResults(res);
    setSearchedWith(ids);
    track({ name: "recipe_search_completed", props: { resultCount: res.ranked.length, ingredientCount: ids.length } });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const useFridge = () => {
    setSelected(fridgeIds);
    find(fridgeIds);
  };

  const saveToFridge = () => {
    const { added, skipped } = kitchenStore.quickAddIngredients(searchedWith);
    toast.show(
      added.length
        ? `Added ${added.length} ingredient${added.length === 1 ? "" : "s"} to My Fridge${skipped.length ? ` (${skipped.length} already there)` : ""}`
        : "Those ingredients are already in My Fridge",
      { tone: added.length ? "success" : "info" },
    );
  };

  const quickAdd = QUICK_ADD_IDS.filter((id) => !selected.includes(id)).slice(0, 7);
  const groups = results?.groups;
  const unsaved = searchedWith.filter((id) => !fridgeIds.includes(id));

  return (
    <>
      {/* ── Hero ──
          Phone: copy → photo → search (search still above the fold).
          Tablet: copy → search → photo, so the search isn't pushed below the fold.
          Desktop: copy + search left, photo right. */}
      <section className="container-page grid gap-x-14 gap-y-6 pb-16 pt-6 sm:gap-y-8 [grid-template-areas:'intro'_'visual'_'search'] sm:pt-12 sm:[grid-template-areas:'intro'_'search'_'visual'] lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:gap-y-9 lg:pb-24 lg:pt-14 lg:[grid-template-areas:'intro_visual'_'search_visual'] xl:gap-x-20">
        <div className="[grid-area:intro] lg:self-end">{intro}</div>
        <div className="[grid-area:visual] lg:self-center">{visual}</div>

        <div className="[grid-area:search] lg:self-start" id="find">
          <IngredientPicker
            label="What's in your fridge?"
            size="lg"
            selected={selected}
            onAdd={add}
            onRemove={remove}
            inputId="hero-ingredients"
            placeholder="Add an ingredient, e.g. eggs"
          />

          {selected.length < 3 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
              <span className="mr-2 text-[0.8125rem] text-muted">Try</span>
              {quickAdd.map((id) => {
                const ing = getIngredient(id)!;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => add([id])}
                    className="inline-flex min-h-8 items-center rounded-[0.5rem] border border-line bg-white/60 px-2.5 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:border-ink/30 hover:bg-white hover:text-ink"
                  >
                    {ing.name.replace(/ \(.*\)/, "")}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => find()} disabled={selected.length === 0} className={buttonClass("primary", "lg", "w-full sm:w-auto sm:min-w-44")}>
              <Search className="size-[1.1rem]" aria-hidden strokeWidth={2} />
              Find recipes
            </button>
            {hydrated && fridgeIds.length > 0 ? (
              <button type="button" onClick={useFridge} className={buttonClass("ghost", "lg", "w-full sm:w-auto")}>
                <Refrigerator className="size-[1.1rem]" aria-hidden strokeWidth={1.75} />
                Use my fridge ({fridgeIds.length})
              </button>
            ) : (
              <p className="text-[0.8125rem] text-muted sm:ml-2">
                {selected.length === 0 ? "Add at least one ingredient. No sign-up needed." : `${selected.length} ingredient${selected.length === 1 ? "" : "s"} added`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <div ref={resultsRef} className="scroll-mt-20">
        {results && groups && (
          <section aria-label="Recipe results" className="border-y border-line bg-white/50 py-14 sm:py-20" aria-live="polite">
            <div className="container-page">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="eyebrow">Your results</p>
                  <p className="mt-3 font-display text-[1.75rem] leading-tight tracking-[-0.02em] sm:text-[2.25rem]">
                    {results.ranked.length > 0
                      ? `We found ${results.ranked.length} recipe${results.ranked.length === 1 ? "" : "s"} that use your ingredients.`
                      : "We couldn't find a close match yet."}
                  </p>
                </div>
                {unsaved.length > 0 && (
                  <button type="button" onClick={saveToFridge} className={buttonClass("secondary", "md", "self-start lg:self-auto")}>
                    Save {unsaved.length === 1 ? "ingredient" : "ingredients"} to My Fridge
                  </button>
                )}
              </div>

              <details className="group mt-8 rounded-[0.75rem] border border-line bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[0.9375rem] [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="font-medium text-ink">Got pantry basics like oil, salt or butter?</span>{" "}
                    <span className="text-muted">Tell us for better matches.</span>
                  </span>
                  <span aria-hidden className="text-lg leading-none text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-line px-5 py-5">
                  <StaplesToggle />
                  <button type="button" onClick={() => find(searchedWith)} className={buttonClass("primary", "sm", "mt-4")}>
                    Update results
                  </button>
                </div>
              </details>

              <div className="mt-14">
                {results.ranked.length === 0 && (
                  <div className="rounded-[0.75rem] border border-line bg-white px-6 py-12 text-center">
                    <p className="font-display text-2xl">Try adding a few more ingredients.</p>
                    <p className="mt-2 text-muted">Or relax your preferences – then search again.</p>
                    <Link href="/recipes" className={buttonClass("secondary", "md", "mt-6")}>
                      Browse all recipes
                    </Link>
                  </div>
                )}

                {groups.canMake.length > 0 && (
                  <ResultSection
                    id="can-make"
                    title="You can make this now"
                    description="All the essentials match. Ingredients typed here have no amounts yet, so each card tells you whether to check quantities."
                    count={groups.canMake.length}
                  >
                    <RecipeGrid items={groups.canMake} recipes={recipeMap} limit={8} />
                  </ResultSection>
                )}
                {groups.almost.length > 0 && (
                  <ResultSection id="almost" title="Almost there" description="Just one or two ingredients away." count={groups.almost.length}>
                    <RecipeGrid items={groups.almost} recipes={recipeMap} limit={8} />
                  </ResultSection>
                )}
                {groups.good.length > 0 && (
                  <ResultSection id="good" title="Good matches" description="These use several of your ingredients." count={groups.good.length}>
                    <RecipeGrid items={groups.good} recipes={recipeMap} limit={4} />
                  </ResultSection>
                )}
              </div>

              {results.ranked.length > 0 && (
                <div className="mt-14 flex justify-center">
                  <Link href="/my-fridge" className={buttonClass("secondary", "md")}>
                    Manage quantities and dates in My Fridge <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
