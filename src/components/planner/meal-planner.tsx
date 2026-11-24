"use client";

import { ArrowRightLeft, CalendarDays, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getRecipeImage } from "@/lib/images";
import { useMemo, useState } from "react";
import { ReadinessBadge } from "@/components/recipes/recipe-card";
import { buttonClass, iconButtonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { calculateRecipeMatch, compareMatches, createMatchContext } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import { normalizeIngredientName } from "@/lib/matching/ingredient-search";
import { computePlanNeeds } from "@/lib/planner/needs";
import { formatShoppingItem } from "@/lib/shopping/merge";
import { cn } from "@/lib/utils/cn";
import { MEAL_SLOTS, WEEKDAYS, type MealPlanEntry, type MealSlot, type RecipeSummary, type Weekday } from "@/types";

const DAY: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const SLOT: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export function MealPlanner({ recipes }: { recipes: RecipeSummary[] }) {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const [adding, setAdding] = useState<{ day: Weekday; slot: MealSlot } | null>(null);
  const [moving, setMoving] = useState<MealPlanEntry | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const todayKey = hydrated ? WEEKDAYS[(new Date().getDay() + 6) % 7] : null;

  const needs = useMemo(
    () => (hydrated ? computePlanNeeds(data.mealPlan, recipeMap, data.inventory, data.shoppingList, data.preferences, todayIso()) : []),
    [hydrated, data.mealPlan, recipeMap, data.inventory, data.shoppingList, data.preferences],
  );

  const addNeeds = () => {
    kitchenStore.addToShoppingList(needs);
    track({ name: "shopping_item_added", props: { count: needs.length } });
    toast.show(`Added ${needs.length} item${needs.length === 1 ? "" : "s"} to your shopping list`);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-[0.875rem] border border-line bg-paper p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-[1.375rem] leading-tight">{hydrated ? `${data.mealPlan.length} meal${data.mealPlan.length === 1 ? "" : "s"} planned this week` : "…"}</p>
          <p className="mt-1 text-sm text-muted">
            {needs.length > 0
              ? `You'll need ${needs.length} more ingredient${needs.length === 1 ? "" : "s"} (after checking your fridge and list).`
              : data.mealPlan.length
                ? "Your fridge and shopping list cover everything planned."
                : "Tap + on any meal to start planning."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass("primary", "md")} disabled={!needs.length} onClick={addNeeds}>
            <ShoppingBasket className="size-4" aria-hidden /> Add missing to list
          </button>
          {data.mealPlan.length > 0 && (
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setConfirmClear(true)}>
              <Trash2 className="size-4" aria-hidden /> Clear week
            </button>
          )}
        </div>
      </div>
      {needs.length > 0 && (
        <details className="group mt-3 rounded-[0.875rem] border border-line bg-paper text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 font-medium [&::-webkit-details-marker]:hidden">
            See what&apos;s missing
            <span aria-hidden className="text-lg leading-none text-muted transition-transform group-open:rotate-45">+</span>
          </summary>
          <ul className="grid gap-x-8 border-t border-line px-5 py-3 sm:grid-cols-2 lg:grid-cols-3">
            {needs.map((n) => <li key={n.ingredientId} className="border-b border-line py-2 last:border-0">{formatShoppingItem({ ...n, ingredientId: n.ingredientId })}</li>)}
          </ul>
        </details>
      )}

      <div className="mt-8 grid gap-px overflow-hidden rounded-[0.875rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {WEEKDAYS.map((day) => {
          const isToday = todayKey === day;
          return (
            <section key={day} aria-labelledby={`day-${day}`} className={cn("flex flex-col bg-paper", isToday && "bg-paper")}>
              <h2 id={`day-${day}`} className={cn("flex items-center justify-between border-b px-4 py-3 font-display text-[1.25rem] leading-tight", isToday ? "border-forest" : "border-line")}>
                {DAY[day]}
                {isToday && <span className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-accent">Today</span>}
              </h2>
              <div className="flex flex-1 flex-col divide-y divide-line">
                {MEAL_SLOTS.map((slot) => {
                  const entries = data.mealPlan.filter((m) => m.day === day && m.slot === slot);
                  return (
                    <div key={slot} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">{SLOT[slot]}</h3>
                        <button type="button" className={cn(iconButtonClass, "-mr-2 size-8")} aria-label={`Add ${SLOT[slot].toLowerCase()} on ${DAY[day]}`} onClick={() => setAdding({ day, slot })}>
                          <Plus className="size-4" aria-hidden strokeWidth={1.75} />
                        </button>
                      </div>
                      {!hydrated ? (
                        <Skeleton className="mt-1 h-8" />
                      ) : entries.length === 0 ? (
                        <p className="mt-0.5 text-[0.8125rem] text-faint">—</p>
                      ) : (
                        <ul className="mt-1 space-y-2">
                          {entries.map((e) => {
                            const r = recipeMap.get(e.recipeId);
                            return (
                              <li key={e.id} className="group/entry animate-chip-in overflow-hidden rounded-[0.625rem] bg-forest-50" data-testid="plan-entry">
                                {r && getRecipeImage(r.slug) && (
                                  <div className="relative aspect-[16/9] overflow-hidden">
                                    <Image src={getRecipeImage(r.slug)!} alt="" fill sizes="(min-width: 1280px) 180px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
                                  </div>
                                )}
                                <div className="px-2.5 py-2">
                                <Link href={`/recipes/${r?.slug ?? e.recipeId}`} className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-ink hover:text-accent">
                                  {r?.title ?? "Unknown recipe"}
                                </Link>
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-xs tabular-nums text-muted">{e.servings} serving{e.servings === 1 ? "" : "s"}</span>
                                  <span className="-mr-1.5 flex">
                                    <button type="button" className={cn(iconButtonClass, "size-7")} aria-label={`Move ${r?.title}`} onClick={() => setMoving(e)}>
                                      <ArrowRightLeft className="size-3.5" aria-hidden strokeWidth={1.75} />
                                    </button>
                                    <button type="button" className={cn(iconButtonClass, "size-7")} aria-label={`Remove ${r?.title}`} onClick={() => kitchenStore.removeMealPlanEntry(e.id)}>
                                      <X className="size-3.5" aria-hidden strokeWidth={1.75} />
                                    </button>
                                  </span>
                                </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <RecipePickerDialog
        target={adding}
        recipes={recipes}
        onClose={() => setAdding(null)}
        onPick={(recipeId) => {
          if (!adding) return;
          kitchenStore.addMealPlanEntry(adding.day, adding.slot, recipeId, data.preferences.servings);
          track({ name: "meal_planned" });
          toast.show(`Planned ${recipeMap.get(recipeId)?.title} for ${DAY[adding.day]}`);
          setAdding(null);
        }}
      />

      <MoveDialog entry={moving} title={moving ? recipeMap.get(moving.recipeId)?.title ?? "" : ""} onClose={() => setMoving(null)} />

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear this week's plan?"
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setConfirmClear(false)}>Cancel</button>
            <button type="button" className={buttonClass("primary", "md")} onClick={() => { kitchenStore.clearMealPlan(); setConfirmClear(false); toast.show("Meal plan cleared"); }}>Clear plan</button>
          </>
        }
      >
        <p className="text-muted">All planned meals will be removed. Your shopping list stays as it is.</p>
      </Dialog>
    </div>
  );
}

function RecipePickerDialog({ target, recipes, onClose, onPick }: { target: { day: Weekday; slot: MealSlot } | null; recipes: RecipeSummary[]; onClose: () => void; onPick: (id: string) => void }) {
  const { data } = useKitchen();
  const [q, setQ] = useState("");
  const lookup = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const list = useMemo(() => {
    if (!target) return [];
    const ctx = createMatchContext(data.inventory, data.preferences, todayIso());
    const opts = { maxMinutes: data.preferences.maxMinutes, favorites: new Set(data.favorites) };
    const needle = normalizeIngredientName(q);
    return recipes
      .filter((r) => !needle || normalizeIngredientName(r.title).includes(needle))
      .map((r) => ({ r, m: calculateRecipeMatch(r, ctx, opts) }))
      .sort((a, b) => {
        const slotFit = (x: RecipeSummary) => (x.categories.includes(target.slot) ? 0 : 1);
        return slotFit(a.r) - slotFit(b.r) || compareMatches(a.m, b.m, lookup);
      });
  }, [target, q, recipes, data.inventory, data.preferences, data.favorites, lookup]);

  return (
    <Dialog open={Boolean(target)} onClose={() => { setQ(""); onClose(); }} title={target ? `${SLOT[target.slot]} · ${DAY[target.day]}` : ""} description="Best matches for your fridge are shown first." size="lg">
      <label htmlFor="plan-search" className="sr-only">Search recipes</label>
      <input id="plan-search" type="search" className="field" placeholder="Search recipes…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-3 divide-y divide-line">
        {list.map(({ r, m }) => (
          <li key={r.id}>
            <button type="button" onClick={() => { setQ(""); onPick(r.id); }} className="flex w-full items-center justify-between gap-3 rounded-[0.5rem] px-2 py-3 text-left hover:bg-cream">
              <span>
                <span className="block font-medium">{r.title}</span>
                <span className="text-xs text-muted">{r.totalMinutes} min · {m.essentialHave}/{m.essentialTotal} ingredients</span>
              </span>
              {data.inventory.length > 0 && <ReadinessBadge match={m} className="shrink-0" />}
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function MoveDialog({ entry, title, onClose }: { entry: MealPlanEntry | null; title: string; onClose: () => void }) {
  return (
    <Dialog open={Boolean(entry)} onClose={onClose} title={`Move ${title}`}>
      {entry && <MoveForm key={entry.id} entry={entry} onClose={onClose} />}
    </Dialog>
  );
}

function MoveForm({ entry, onClose }: { entry: MealPlanEntry; onClose: () => void }) {
  const [day, setDay] = useState<Weekday>(entry.day);
  const [slot, setSlot] = useState<MealSlot>(entry.slot);
  return (
    <form onSubmit={(e) => { e.preventDefault(); kitchenStore.moveMealPlanEntry(entry.id, day, slot); onClose(); }}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="mv-day" className="label">Day</label>
          <select id="mv-day" className="field" value={day} onChange={(e) => setDay(e.target.value as Weekday)}>
            {WEEKDAYS.map((d) => <option key={d} value={d}>{DAY[d]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mv-slot" className="label">Meal</label>
          <select id="mv-slot" className="field" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
            {MEAL_SLOTS.map((s) => <option key={s} value={s}>{SLOT[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={buttonClass("ghost", "md")} onClick={onClose}>Cancel</button>
        <button type="submit" className={buttonClass("primary", "md")}><CalendarDays className="size-4" aria-hidden /> Move</button>
      </div>
    </form>
  );
}
