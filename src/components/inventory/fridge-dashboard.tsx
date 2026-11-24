"use client";

import { ArrowRight, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AccountInvite } from "@/components/account/account-invite";
import { useAccount } from "@/components/account/account-provider";
import { StaplesToggle } from "@/components/ingredients/staples-toggle";
import { RecipeGrid } from "@/components/recipes/recipe-grid";
import { RecipeImage } from "@/components/recipes/recipe-image";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { getIngredient } from "@/data/ingredients";
import { useKitchen } from "@/hooks/use-kitchen";
import { suggestRecipesForInventory } from "@/lib/matching/engine";
import { getSoonToUseIngredients, todayIso } from "@/lib/matching/freshness";
import { hasRecipeImage } from "@/lib/images";
import { formatShoppingItem } from "@/lib/shopping/merge";
import { cn } from "@/lib/utils/cn";
import type { RecipeSummary } from "@/types";
import { FreshnessBadge, InventoryManager } from "./inventory-manager";

function greeting(hour: number, name: string | null) {
  const who = name ? `, ${name}` : "";
  if (hour < 5) return `Late-night snack${who}?`;
  if (hour < 12) return `Good morning${who}.`;
  if (hour < 18) return `Good afternoon${who}.`;
  return `Good evening${who}.`;
}

/** Deterministic daily pick: same suggestion all day, changes tomorrow. */
function dailyIndex(today: string, length: number) {
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return length ? h % length : 0;
}

function Panel({ id, title, description, children, action }: { id: string; title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-16 first:mt-0">
      <div className="mb-7 flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 id={id} className="section-title">
            {title}
          </h2>
          {description && <p className="mt-1.5 text-[0.9375rem] text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SmallLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
      {children} <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

export function FridgeDashboard({ recipes }: { recipes: RecipeSummary[] }) {
  const { data, hydrated } = useKitchen();
  const account = useAccount();
  const firstName = account.status === "signed-in" ? (account.name?.trim().split(/\s+/)[0] ?? null) : null;
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
  const empty = hydrated && data.inventory.length === 0;

  const cookTonight = result
    ? [...result.groups.canMake.filter((m) => recipeMap.get(m.recipeId)?.categories.includes("dinner")), ...result.groups.canMake].filter(
        (m, i, arr) => arr.findIndex((x) => x.recipeId === m.recipeId) === i,
      )
    : [];
  const maxMin = data.preferences.maxMinutes;
  const quick = result ? result.groups.quick.filter((m) => !maxMin || (recipeMap.get(m.recipeId)?.totalMinutes ?? 99) <= maxMin) : [];
  const oneAway = result ? result.groups.almost.filter((m) => m.missing.length === 1) : [];
  const matchedIdeas = result ? [...result.groups.canMake, ...result.groups.almost] : [];
  const photographedIdeas = matchedIdeas.filter((m) => hasRecipeImage(m.slug));
  const inspirationPool = photographedIdeas.length ? photographedIdeas : matchedIdeas;
  const inspiration = inspirationPool.length ? inspirationPool[dailyIndex(today, inspirationPool.length)] : undefined;
  const inspirationRecipe = inspiration ? recipeMap.get(inspiration.recipeId) : undefined;
  const recentCooked = data.history.filter((h, i, arr) => arr.findIndex((x) => x.recipeId === h.recipeId) === i).slice(0, 4);

  const stats = [
    { label: "In your kitchen", value: data.inventory.length },
    { label: "Use soon", value: soon.length },
    { label: "Cooked this week", value: cookedThisWeek.length },
    { label: "Recipes tried", value: differentRecipes },
  ];

  return (
    <div>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow text-champagne-ink">{firstName ? "Your kitchen" : "My Fridge"}</p>
          <h1 className="page-title mt-4">{hydrated ? greeting(new Date().getHours(), firstName) : "Welcome back."}</h1>
          <p className="lede mt-4">Here&apos;s what your kitchen can make today.</p>
        </div>
        <Link href="/preferences" className={buttonClass("secondary", "sm", "self-start lg:self-auto")}>
          <Settings2 className="size-4" aria-hidden strokeWidth={1.75} /> Preferences
        </Link>
      </header>

      {/* Stats – all based on real entries */}
      <dl className="mt-10 grid grid-cols-2 border-y border-line sm:grid-cols-4">
        {stats.map(({ label, value }, i) => (
          <div key={label} className={cn("py-5 sm:px-6 sm:first:pl-0", i % 2 === 1 && "pl-5 sm:pl-6", i > 0 && "sm:border-l sm:border-line", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line sm:border-t-0")}>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
            <dd className={cn("mt-2 font-display text-[2.5rem] leading-none tabular-nums", label === "Use soon" && value > 0 && "text-orange-ink")}>{hydrated ? value : "–"}</dd>
          </div>
        ))}
      </dl>

      <AccountInvite variant="fridge" />

      <div className="mt-14 grid gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] xl:gap-16">
        {/* ── Suggestions ── */}
        <div className="min-w-0">
          {!hydrated && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          )}

          {empty && (
            <section aria-labelledby="getting-started" className="rounded-[1rem] border border-line bg-paper p-7 sm:p-10">
              <p className="eyebrow">Getting started</p>
              <h2 id="getting-started" className="mt-4 max-w-lg font-display text-[2rem] leading-tight">Add a few ingredients and we&apos;ll do the rest.</h2>
              <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                {[
                  ["Add what you have", "Use the search or one-tap add. Amounts and dates are optional."],
                  ["See what you can cook", "Recipes appear here, ranked by how close you are."],
                  ["Waste less", "Enter label dates and we'll flag what to use first."],
                ].map(([t, d], i) => (
                  <li key={t} className="border-t border-line pt-4">
                    <span className="font-display text-sm italic text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <p className="mt-2 font-medium">{t}</p>
                    <p className="mt-1 text-sm text-muted">{d}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {hydrated && inspiration && inspirationRecipe && (
            <section aria-labelledby="inspiration" className="mt-16 first:mt-0">
              <Link
                href={`/recipes/${inspiration.slug}`}
                className={cn(
                  "group grid overflow-hidden rounded-[1rem] bg-forest text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
                  hasRecipeImage(inspirationRecipe.slug) && "sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]",
                )}
              >
                {hasRecipeImage(inspirationRecipe.slug) && (
                  <RecipeImage
                    slug={inspirationRecipe.slug}
                    title={inspirationRecipe.title}
                    ingredients={inspirationRecipe.ingredients}
                    sizes="(min-width: 640px) 360px, 100vw"
                    className="aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-56"
                    imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                )}
                <div className="flex flex-col justify-center p-7 sm:p-9">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white">Today&apos;s idea</p>
                  <h2 id="inspiration" className="mt-3 text-[1.75rem] leading-tight text-white sm:text-[2.125rem]">{inspirationRecipe.title}</h2>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-white">{inspiration.explanation.slice(0, 3).join(" ")}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-white">
                    Let&apos;s cook <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </div>
              </Link>
            </section>
          )}

          {hydrated && soon.length > 0 && (
            <Panel id="use-soon" title="Use soon" description="Based on the dates you entered. Storage and the food's condition matter too – check before eating.">
              <ul className="flex flex-wrap gap-2">
                {soon.map(({ item, freshness }) => (
                  <li key={item.id} className="flex items-center gap-2.5 rounded-[0.625rem] border border-line bg-paper py-2 pl-3 pr-2 text-[0.9375rem]">
                    <span className="size-2 rounded-full" style={{ background: getIngredient(item.ingredientId)?.color }} aria-hidden />
                    <span className="font-medium">{item.displayName}</span>
                    <FreshnessBadge info={freshness} />
                  </li>
                ))}
              </ul>
              {result && result.groups.useSoon.length > 0 ? (
                <div className="mt-8">
                  <RecipeGrid items={result.groups.useSoon} recipes={recipeMap} limit={3} dense />
                </div>
              ) : (
                <p className="mt-5 text-muted">No close recipe matches for these yet – try adding a few more ingredients.</p>
              )}
            </Panel>
          )}

          {hydrated && data.inventory.length > 0 && (
            <>
              <Panel id="cook-tonight" title="Cook tonight" action={<SmallLink href="/recipes?canMake=1">See all</SmallLink>}>
                {cookTonight.length ? (
                  <RecipeGrid items={cookTonight} recipes={recipeMap} limit={3} dense />
                ) : (
                  <div className="rounded-[0.875rem] border border-dashed border-line-strong p-6">
                    <p className="font-medium">Nothing is fully ready yet.</p>
                    <p className="mt-1 text-sm text-muted">Tell us which pantry basics you keep – it often unlocks more recipes.</p>
                    <div className="mt-4">
                      <StaplesToggle compact />
                    </div>
                  </div>
                )}
              </Panel>

              {quick.length > 0 && (
                <Panel id="quick-ideas" title={maxMin ? `Quick ideas, under ${maxMin} min` : "Quick ideas"}>
                  <RecipeGrid items={quick} recipes={recipeMap} limit={3} dense />
                </Panel>
              )}

              {oneAway.length > 0 && (
                <Panel id="almost-there" title="Almost there" description="You're only one ingredient away!">
                  <RecipeGrid items={oneAway} recipes={recipeMap} limit={3} dense />
                </Panel>
              )}
            </>
          )}
        </div>

        {/* ── Inventory ── (first on small screens when the kitchen is empty) */}
        <aside className={cn("min-w-0", empty && "-order-1 xl:order-none")}>
          <InventoryManager />
        </aside>
      </div>

      {hydrated && (
        <div className="mt-20 grid gap-10 border-t border-line pt-12 md:grid-cols-3 md:gap-8">
          <section aria-labelledby="fav-preview">
            <h2 id="fav-preview" className="font-display text-[1.375rem]">Your favourites</h2>
            {data.favorites.length ? (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {data.favorites
                  .slice(-5)
                  .reverse()
                  .map((id) => {
                    const r = recipeMap.get(id);
                    return r ? (
                      <li key={id}>
                        <Link href={`/recipes/${r.slug}`} className="block py-2.5 text-[0.9375rem] hover:text-accent">
                          {r.title}
                        </Link>
                      </li>
                    ) : null;
                  })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No favourites yet. Save recipes you love to find them later.</p>
            )}
            <div className="mt-4">
              <SmallLink href="/saved">Saved recipes</SmallLink>
            </div>
          </section>

          <section aria-labelledby="shop-preview">
            <h2 id="shop-preview" className="font-display text-[1.375rem]">Shopping list</h2>
            {toBuy.length ? (
              <ul className="mt-4 divide-y divide-line border-y border-line text-[0.9375rem]">
                {toBuy.slice(0, 5).map((i) => (
                  <li key={i.id} className="py-2.5">
                    {formatShoppingItem(i)}
                  </li>
                ))}
                {toBuy.length > 5 && <li className="py-2.5 text-muted">+{toBuy.length - 5} more</li>}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">All stocked up! Your shopping list is empty.</p>
            )}
            <div className="mt-4">
              <SmallLink href="/shopping-list">Open list</SmallLink>
            </div>
          </section>

          <section aria-labelledby="recent">
            <h2 id="recent" className="font-display text-[1.375rem]">Cook it again</h2>
            {recentCooked.length ? (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {recentCooked.map((h) => {
                  const r = recipeMap.get(h.recipeId);
                  return r ? (
                    <li key={h.id} className="flex items-center justify-between gap-3">
                      <Link href={`/recipes/${r.slug}`} className="py-2.5 text-[0.9375rem] hover:text-accent">
                        {r.title}
                      </Link>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{new Date(h.cookedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Recipes you mark as cooked will appear here, so you can repeat a favourite meal quickly.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
