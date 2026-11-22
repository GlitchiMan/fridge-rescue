"use client";

import { Heart, History, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { RecipeCard } from "@/components/recipes/recipe-card";
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
        <h2 id="favs" className="flex items-center gap-2 text-2xl font-semibold"><Heart className="size-5 text-coral" aria-hidden /> Favourites</h2>
        <div className="mt-4">
          {favorites.length === 0 ? (
            <EmptyState icon={Heart} title="No favorites yet." action={<Link href="/recipes" className={buttonClass("primary", "md")}>Browse recipes</Link>}>
              Save recipes you love to find them later.
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((r) => (
                <li key={r.id} className="flex [&>article]:flex-1" data-testid="saved-recipe">
                  <RecipeCard recipe={r} match={matches.get(r.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="history" className="mt-14">
        <h2 id="history" className="flex items-center gap-2 text-2xl font-semibold"><History className="size-5 text-forest" aria-hidden /> Cooking history</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-muted">When you mark a recipe as cooked, it shows up here so you can repeat a meal in one tap.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
            {history.map((h) => {
              const r = map.get(h.recipeId);
              if (!r) return null;
              return (
                <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/recipes/${r.slug}`} className="font-semibold hover:text-forest hover:underline">{r.title}</Link>
                    <p className="text-xs text-muted">
                      {new Date(h.cookedAt).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · {h.servings} servings
                      {h.deductedInventory ? " · fridge updated" : ""}
                    </p>
                  </div>
                  <Link href={`/recipes/${r.slug}`} className={buttonClass("soft", "sm")}>
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
