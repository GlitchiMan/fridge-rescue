"use client";

import { Heart, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { recipeGridClass } from "@/components/recipes/recipe-grid";
import { buttonClass, iconButtonClass } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { calculateRecipeMatch, createMatchContext } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import type { RecipeSummary } from "@/types";

export function SavedRecipes({ recipes }: { recipes: RecipeSummary[] }) {
  const { data, hydrated } = useKitchen();
  const map = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const matches = useMemo(() => {
    if (!hydrated || !data.inventory.length) return new Map();
    const ctx = createMatchContext(data.inventory, data.preferences, todayIso());
    return new Map(recipes.map((r) => [r.id, calculateRecipeMatch(r, ctx, { maxMinutes: null, favorites: new Set() })]));
  }, [hydrated, data.inventory, data.preferences, recipes]);

  const favorites = [...data.favorites].reverse().map((id) => map.get(id)).filter((r): r is RecipeSummary => Boolean(r));
  const history = data.history.slice(0, 30);

  if (!hydrated) return <Skeleton className="h-72" />;

  return (
    <div>
      <section aria-labelledby="favs">
        <div className="mb-7 flex items-end justify-between border-b border-line pb-4">
          <h2 id="favs" className="section-title">Favourites</h2>
          {favorites.length > 0 && <p className="text-sm tabular-nums text-muted">{favorites.length} saved</p>}
        </div>
        {favorites.length === 0 ? (
          <EmptyState icon={Heart} title="No favorites yet." action={<Link href="/recipes" className={buttonClass("primary", "md")}>Browse recipes</Link>}>
            Save recipes you love to find them later.
          </EmptyState>
        ) : (
          <ul className={recipeGridClass()}>
            {favorites.map((r) => (
              <li key={r.id} data-testid="saved-recipe">
                <RecipeCard recipe={r} match={matches.get(r.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.generatedRecipes.length > 0 && (
        <section aria-labelledby="ai-saved" className="mt-20">
          <div className="mb-2 flex items-end justify-between border-b border-line pb-4">
            <div>
              <h2 id="ai-saved" className="section-title">Made with Fridge AI</h2>
              <p className="mt-1 text-[0.8125rem] text-muted">AI-generated recipes, not kitchen-tested.</p>
            </div>
            <p className="text-sm tabular-nums text-muted">{data.generatedRecipes.length} saved</p>
          </div>
          <ul className="divide-y divide-line">
            {data.generatedRecipes.map((r) => (
              <li key={r.id} data-testid="saved-ai-recipe" className="flex items-center justify-between gap-4 py-3.5">
                <Link href={`/ai-recipe?id=${encodeURIComponent(r.id)}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-medium text-ink">{r.title}</span>
                  <span className="text-xs text-muted">
                    {r.prepMinutes + r.cookMinutes} min · Serves {r.servings}
                    {r.cuisine && ` · ${r.cuisine}`}
                  </span>
                </Link>
                <button type="button" onClick={() => kitchenStore.removeGeneratedRecipe(r.id)} className="shrink-0 text-xs font-medium text-muted hover:text-ink" aria-label={`Remove ${r.title}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="history" className="mt-20">
        <div className="mb-2 border-b border-line pb-4">
          <h2 id="history" className="section-title">Cooking history</h2>
        </div>
        {history.length === 0 ? (
          <p className="mt-4 text-muted">When you mark a recipe as cooked, it shows up here so you can repeat a meal in one tap.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((h) => {
              const r = map.get(h.recipeId);
              if (!r) return null;
              return (
                <li key={h.id} className="flex items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${r.slug}`} className="font-display text-[1.25rem] leading-tight hover:text-accent">{r.title}</Link>
                    <p className="mt-0.5 text-[0.8125rem] text-muted">
                      {new Date(h.cookedAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {h.servings} servings
                      {h.deductedInventory ? " · fridge updated" : ""}
                    </p>
                  </div>
                  <Link href={`/recipes/${r.slug}`} className={buttonClass("secondary", "sm")}>
                    <RotateCcw className="size-3.5" aria-hidden /> Cook again
                  </Link>
                  <button type="button" className={iconButtonClass} aria-label={`Remove ${r.title} from history`} onClick={() => kitchenStore.removeHistoryEntry(h.id)}>
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
