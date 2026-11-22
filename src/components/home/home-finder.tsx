"use client";

import { ArrowRight, ChefHat, Refrigerator, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
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

export function HomeFinder({ recipes }: { recipes: RecipeSummary[] }) {
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

  const quickAdd = QUICK_ADD_IDS.filter((id) => !selected.includes(id)).slice(0, 10);
  const groups = results?.groups;
  const unsaved = searchedWith.filter((id) => !fridgeIds.includes(id));

  return (
    <>
      <div className="rounded-[1.75rem] border border-line bg-white/90 p-4 shadow-lift sm:p-6">
        <IngredientPicker
          label="What's in your fridge?"
          hideLabel
          size="lg"
          selected={selected}
          onAdd={add}
          onRemove={remove}
          inputId="hero-ingredients"
        />

        {selected.length < 3 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Quick add</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {quickAdd.map((id) => {
                const ing = getIngredient(id)!;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => add([id])}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-cream px-3 text-sm font-semibold text-ink transition-colors hover:border-forest hover:bg-forest-50"
                    >
                      <span className="size-2.5 rounded-full" style={{ background: ing.color }} aria-hidden />
                      {ing.name.replace(/ \(.*\)/, "")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => find()} disabled={selected.length === 0} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
            <ChefHat className="size-5" aria-hidden />
            Find recipes
          </button>
          {hydrated && fridgeIds.length > 0 && (
            <button type="button" onClick={useFridge} className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>
              <Refrigerator className="size-5" aria-hidden />
              Use ingredients from my fridge
            </button>
          )}
        </div>
        {selected.length === 0 && <p className="mt-3 text-sm text-muted">Add at least one ingredient to get started – no sign-up needed.</p>}
      </div>

      <div ref={resultsRef} className="scroll-mt-24">
        {results && groups && (
          <div className="mt-10" aria-live="polite">
            <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-forest-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-forest-800">
                {results.ranked.length > 0
                  ? `We found ${results.ranked.length} recipe${results.ranked.length === 1 ? "" : "s"} that use your ingredients.`
                  : "We couldn't find a close match yet."}
              </p>
              {unsaved.length > 0 && (
                <button type="button" onClick={saveToFridge} className={buttonClass("secondary", "sm")}>
                  <Save className="size-4" aria-hidden /> Save to My Fridge
                </button>
              )}
            </div>

            <details className="mb-8 rounded-2xl border border-line bg-white p-4">
              <summary className="cursor-pointer font-semibold text-ink">
                Got pantry basics like oil, salt or butter? <span className="text-forest underline">Tell us</span> for better matches.
              </summary>
              <div className="mt-3">
                <StaplesToggle />
                <button type="button" onClick={() => find(searchedWith)} className={buttonClass("soft", "sm", "mt-3")}>
                  Update results
                </button>
              </div>
            </details>

            {results.ranked.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line-strong bg-white p-8 text-center">
                <h2 className="text-xl font-semibold">We couldn&apos;t find a close match yet.</h2>
                <p className="mt-2 text-muted">Try adding more ingredients or relaxing your filters.</p>
                <Link href="/recipes" className={buttonClass("secondary", "md", "mt-4")}>
                  Browse all recipes
                </Link>
              </div>
            )}

            {groups.canMake.length > 0 && (
              <ResultSection
                id="can-make"
                title="You can make this now"
                description="All the essentials match. Ingredients typed here have no amounts yet, so each card tells you whether to check quantities."
                icon={<ChefHat className="size-5" aria-hidden />}
              >
                <RecipeGrid items={groups.canMake} recipes={recipeMap} limit={6} />
              </ResultSection>
            )}
            {groups.almost.length > 0 && (
              <ResultSection
                id="almost"
                title="Almost there"
                description="Just one or two ingredients away."
                icon={<Sparkles className="size-5" aria-hidden />}
              >
                <RecipeGrid items={groups.almost} recipes={recipeMap} limit={6} />
              </ResultSection>
            )}
            {groups.good.length > 0 && (
              <ResultSection id="good" title="Good matches" description="These use several of your ingredients.">
                <RecipeGrid items={groups.good} recipes={recipeMap} limit={3} />
              </ResultSection>
            )}

            {results.ranked.length > 0 && (
              <div className="mt-8 text-center">
                <Link href="/my-fridge" className={buttonClass("ghost", "md")}>
                  Manage quantities and dates in My Fridge <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
