"use client";

import { ArrowRight, CalendarDays, ChefHat, Flame, Heart, Lightbulb, Settings2, ShoppingBasket, Sparkles, Timer, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { StaplesToggle } from "@/components/ingredients/staples-toggle";
import { RecipeGrid } from "@/components/recipes/recipe-grid";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { getIngredient } from "@/data/ingredients";
import { useKitchen } from "@/hooks/use-kitchen";
import { suggestRecipesForInventory } from "@/lib/matching/engine";
import { getSoonToUseIngredients, todayIso } from "@/lib/matching/freshness";
import { formatShoppingItem } from "@/lib/shopping/merge";
import type { RecipeSummary } from "@/types";
import { FreshnessBadge, InventoryManager } from "./inventory-manager";

function greeting(hour: number) {
  if (hour < 5) return "Late-night snack?";
  if (hour < 12) return "Good morning!";
  if (hour < 18) return "Good afternoon!";
  return "Good evening!";
}

/** Deterministic daily pick: same suggestion all day, changes tomorrow. */
function dailyIndex(today: string, length: number) {
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return length ? h % length : 0;
}

function Panel({ id, title, icon, children, action }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2.5 text-2xl font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-forest-50 text-forest">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function FridgeDashboard({ recipes }: { recipes: RecipeSummary[] }) {
  const { data, hydrated } = useKitchen();
  const today = hydrated ? todayIso() : "";
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const result = useMemo(
    () => (hydrated ? suggestRecipesForInventory(recipes, data.inventory, data.preferences, { today, favorites: data.favorites }) : null),
    [hydrated, recipes, data.inventory, data.preferences, data.favorites, today],
  );
  const soon = useMemo(() => (hydrated ? getSoonToUseIngredients(data.inventory, today) : []), [hydrated, data.inventory, today]);

  // Start of the day six days ago (local) → "this week" = the last 7 days including today.
  const weekAgo = today ? new Date(`${today}T00:00:00`).getTime() - 6 * 86_400_000 : Number.POSITIVE_INFINITY;
  const cookedThisWeek = data.history.filter((h) => new Date(h.cookedAt).getTime() >= weekAgo);
  const differentRecipes = new Set(data.history.map((h) => h.recipeId)).size;
  const toBuy = data.shoppingList.filter((i) => !i.purchased);

  const cookTonight = result
    ? [...result.groups.canMake.filter((m) => recipeMap.get(m.recipeId)?.categories.includes("dinner")), ...result.groups.canMake].filter(
        (m, i, arr) => arr.findIndex((x) => x.recipeId === m.recipeId) === i,
      )
    : [];
  const maxMin = data.preferences.maxMinutes;
  const quick = result ? result.groups.quick.filter((m) => !maxMin || (recipeMap.get(m.recipeId)?.totalMinutes ?? 99) <= maxMin) : [];
  const oneAway = result ? result.groups.almost.filter((m) => m.missing.length === 1) : [];
  const inspirationPool = result ? [...result.groups.canMake, ...result.groups.almost] : [];
  const inspiration = inspirationPool.length ? inspirationPool[dailyIndex(today, inspirationPool.length)] : undefined;
  const recentCooked = data.history.filter((h, i, arr) => arr.findIndex((x) => x.recipeId === h.recipeId) === i).slice(0, 4);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My Fridge</p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{hydrated ? greeting(new Date().getHours()) : "Welcome back!"}</h1>
          <p className="mt-2 text-lg text-muted">Let&apos;s see what&apos;s cooking.</p>
        </div>
        <Link href="/preferences" className={buttonClass("secondary", "sm")}>
          <Settings2 className="size-4" aria-hidden /> Preferences
        </Link>
      </div>

      {/* Stats – all based on real entries */}
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "In your kitchen", value: data.inventory.length, icon: UtensilsCrossed },
          { label: "Use soon", value: soon.length, icon: Timer },
          { label: "Cooked this week", value: cookedThisWeek.length, icon: Flame },
          { label: "Recipes tried", value: differentRecipes, icon: ChefHat },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-white p-4">
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <Icon className="size-3.5" aria-hidden /> {label}
            </dt>
            <dd className="mt-1 font-display text-3xl font-semibold">{hydrated ? value : "–"}</dd>
          </div>
        ))}
      </dl>

      {!hydrated && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}

      {hydrated && soon.length > 0 && (
        <Panel id="use-soon" title="Use soon" icon={<Timer className="size-5" aria-hidden />}>
          <ul className="flex flex-wrap gap-2">
            {soon.map(({ item, freshness }) => (
              <li key={item.id} className="flex items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2">
                <span className="size-2.5 rounded-full" style={{ background: getIngredient(item.ingredientId)?.color }} aria-hidden />
                <span className="font-semibold">{item.displayName}</span>
                <FreshnessBadge info={freshness} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Based on the dates you entered. Storage and the food&apos;s condition matter too – check before eating.</p>
          {result && result.groups.useSoon.length > 0 ? (
            <div className="mt-5">
              <RecipeGrid items={result.groups.useSoon} recipes={recipeMap} limit={3} />
            </div>
          ) : (
            <p className="mt-4 text-muted">No close recipe matches for these yet – try adding a few more ingredients.</p>
          )}
        </Panel>
      )}

      {hydrated && inspiration && (
        <section aria-labelledby="inspiration" className="mt-10 overflow-hidden rounded-3xl bg-forest p-6 text-white sm:p-8" style={{ background: "linear-gradient(135deg,#245C45,#1D4B38)" }}>
          <p className="flex items-center gap-2 text-sm font-semibold text-orange">
            <Lightbulb className="size-4" aria-hidden /> Today&apos;s idea
          </p>
          <h2 id="inspiration" className="mt-2 text-3xl font-semibold text-white">{recipeMap.get(inspiration.recipeId)?.title}</h2>
          <p className="mt-2 max-w-xl text-white/85">{inspiration.explanation.slice(0, 3).join(" ")}</p>
          <Link href={`/recipes/${inspiration.slug}`} className={buttonClass("secondary", "md", "mt-5 border-transparent")}>
            Let&apos;s cook <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      )}

      {hydrated && data.inventory.length > 0 && (
        <>
          <Panel id="cook-tonight" title="Cook tonight" icon={<ChefHat className="size-5" aria-hidden />} action={<Link href="/recipes?canMake=1" className="text-sm font-semibold text-forest hover:underline">See all</Link>}>
            {cookTonight.length ? (
              <RecipeGrid items={cookTonight} recipes={recipeMap} limit={3} />
            ) : (
              <div className="rounded-2xl border border-dashed border-line-strong bg-white p-6">
                <p className="font-semibold">Nothing is fully ready yet.</p>
                <p className="mt-1 text-sm text-muted">Tell us which pantry basics you keep – it often unlocks more recipes.</p>
                <div className="mt-3"><StaplesToggle compact /></div>
              </div>
            )}
          </Panel>

          {quick.length > 0 && (
            <Panel id="quick-ideas" title={maxMin ? `Quick ideas (under ${maxMin} min)` : "Quick ideas"} icon={<Sparkles className="size-5" aria-hidden />}>
              <RecipeGrid items={quick} recipes={recipeMap} limit={3} />
            </Panel>
          )}

          {oneAway.length > 0 && (
            <Panel id="almost-there" title="Almost there" icon={<ShoppingBasket className="size-5" aria-hidden />}>
              <p className="-mt-2 mb-4 text-muted">You&apos;re only one ingredient away!</p>
              <RecipeGrid items={oneAway} recipes={recipeMap} limit={3} />
            </Panel>
          )}
        </>
      )}

      <div className="mt-10">
        <InventoryManager />
      </div>

      {hydrated && (
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section aria-labelledby="fav-preview" className="card p-5">
            <h2 id="fav-preview" className="flex items-center gap-2 text-xl font-semibold"><Heart className="size-5 text-coral" aria-hidden /> Your favourites</h2>
            {data.favorites.length ? (
              <ul className="mt-3 space-y-1">
                {data.favorites.slice(-5).reverse().map((id) => {
                  const r = recipeMap.get(id);
                  return r ? (
                    <li key={id}><Link href={`/recipes/${r.slug}`} className="block rounded-lg py-1.5 font-semibold hover:text-forest hover:underline">{r.title}</Link></li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No favourites yet. Save recipes you love to find them later.</p>
            )}
            <Link href="/saved" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">Saved recipes <ArrowRight className="size-3.5" aria-hidden /></Link>
          </section>

          <section aria-labelledby="shop-preview" className="card p-5">
            <h2 id="shop-preview" className="flex items-center gap-2 text-xl font-semibold"><ShoppingBasket className="size-5 text-forest" aria-hidden /> Shopping list</h2>
            {toBuy.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {toBuy.slice(0, 5).map((i) => <li key={i.id} className="py-0.5">• {formatShoppingItem(i)}</li>)}
                {toBuy.length > 5 && <li className="text-muted">+{toBuy.length - 5} more</li>}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">All stocked up! Your shopping list is empty.</p>
            )}
            <Link href="/shopping-list" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">Open list <ArrowRight className="size-3.5" aria-hidden /></Link>
          </section>

          <section aria-labelledby="recent" className="card p-5">
            <h2 id="recent" className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="size-5 text-forest" aria-hidden /> Cook it again</h2>
            {recentCooked.length ? (
              <ul className="mt-3 space-y-1">
                {recentCooked.map((h) => {
                  const r = recipeMap.get(h.recipeId);
                  return r ? (
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <Link href={`/recipes/${r.slug}`} className="py-1.5 font-semibold hover:text-forest hover:underline">{r.title}</Link>
                      <span className="text-xs text-muted">{new Date(h.cookedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Recipes you mark as cooked will appear here, so you can repeat a favourite meal quickly.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
