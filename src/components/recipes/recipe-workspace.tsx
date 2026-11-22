"use client";

import {
  CalendarPlus,
  Check,
  CheckCircle2,
  ChefHat,
  CircleHelp,
  Minus,
  Plus,
  Printer,
  Share2,
  ShoppingBasket,
  Utensils,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getIngredient } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { planInventoryDeduction } from "@/lib/matching/deduction";
import { calculateRecipeMatch, createMatchContext } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import { formatQuantity, scaleQuantity } from "@/lib/quantities/units";
import { cn } from "@/lib/utils/cn";
import { MEAL_SLOTS, WEEKDAYS, type IngredientMatch, type MealSlot, type Recipe, type RecipeMatch, type Weekday } from "@/types";
import { CookingMode } from "./cooking-mode";
import { FavoriteButton } from "./favorite-button";
import { toSummaryClient } from "./summary-client";

interface Ctx {
  recipe: Recipe;
  servings: number;
  setServings: (n: number) => void;
  match: RecipeMatch | null;
  hydrated: boolean;
}
const RecipeContext = createContext<Ctx | null>(null);
function useRecipeCtx() {
  const c = useContext(RecipeContext);
  if (!c) throw new Error("Missing RecipeProvider");
  return c;
}

export function RecipeProvider({ recipe, children }: { recipe: Recipe; children: ReactNode }) {
  const [servings, setServingsRaw] = useState(recipe.servings);
  const { data, hydrated } = useKitchen();
  const setServings = (n: number) => setServingsRaw(Math.max(1, Math.min(24, Math.round(n))));
  const match = useMemo(() => {
    if (!hydrated) return null;
    const ctx = createMatchContext(data.inventory, data.preferences, todayIso());
    return calculateRecipeMatch(toSummaryClient(recipe), ctx, { maxMinutes: null, favorites: new Set() }, servings);
  }, [hydrated, data.inventory, data.preferences, recipe, servings]);
  return <RecipeContext.Provider value={{ recipe, servings, setServings, match, hydrated }}>{children}</RecipeContext.Provider>;
}

/* ───────────────────────── Ingredients panel ───────────────────────── */

const STATUS_META: Record<IngredientMatch["status"], { icon: typeof Check; cls: string; label: string }> = {
  enough: { icon: CheckCircle2, cls: "text-forest", label: "In your fridge" },
  staple: { icon: CheckCircle2, cls: "text-forest", label: "Pantry staple" },
  "unknown-quantity": { icon: CircleHelp, cls: "text-orange-ink", label: "In your fridge – check amount" },
  insufficient: { icon: AlertCircle, cls: "text-orange-ink", label: "Not enough" },
  missing: { icon: XCircle, cls: "text-coral-ink", label: "Missing" },
};

export function IngredientsPanel() {
  const { recipe, servings, setServings, match, hydrated } = useRecipeCtx();
  const { data } = useKitchen();
  const toast = useToast();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const factor = servings / recipe.servings;
  const hasInventory = hydrated && (data.inventory.length > 0 || data.preferences.pantryStaples.length > 1);
  const byId = new Map(match?.matches.map((m) => [m.ingredientId, m]));
  const excluded = new Set(data.preferences.excludedIngredients);

  const missingToBuy = (match?.matches ?? []).filter((m) => !m.optional && (m.status === "missing" || m.status === "insufficient"));

  const addMissing = () => {
    if (!missingToBuy.length) return;
    kitchenStore.addToShoppingList(
      missingToBuy.map((m) => {
        const q = m.status === "insufficient" && m.shortfall ? m.shortfall : m.required;
        const id = m.substitutedBy?.ingredientId ?? m.ingredientId;
        return { ingredientId: id, name: getIngredient(id)?.name ?? m.name, quantity: q.quantity, unit: q.unit, recipeId: recipe.id };
      }),
    );
    track({ name: "shopping_item_added", props: { count: missingToBuy.length } });
    toast.show(`Added ${missingToBuy.length} item${missingToBuy.length === 1 ? "" : "s"} to your shopping list`);
  };

  const addAll = () => {
    const essentials = recipe.ingredients.filter((i) => !i.optional && !i.toTaste);
    kitchenStore.addToShoppingList(
      essentials.map((ri) => {
        const q = scaleQuantity({ quantity: ri.quantity, unit: ri.unit }, factor);
        return { ingredientId: ri.ingredientId, name: getIngredient(ri.ingredientId)?.name ?? ri.ingredientId, quantity: q.quantity, unit: q.unit, recipeId: recipe.id };
      }),
    );
    track({ name: "shopping_item_added", props: { count: essentials.length } });
    toast.show(`Added ${essentials.length} ingredients to your shopping list`);
  };

  return (
    <section aria-labelledby="ingredients-heading" className="card p-5 print-break-avoid sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ingredients-heading" className="section-title">
          Ingredients
        </h2>
        <div className="no-print flex items-center rounded-[0.625rem] border border-line-strong bg-white" role="group" aria-label="Servings">
          <button type="button" onClick={() => setServings(servings - 1)} disabled={servings <= 1} aria-label="Fewer servings" className="inline-flex size-10 items-center justify-center rounded-l-[0.625rem] text-ink-soft hover:bg-ink/[0.05] disabled:opacity-35">
            <Minus className="size-4" aria-hidden />
          </button>
          <output aria-live="polite" className="min-w-[6rem] border-x border-line text-center text-[0.8125rem] font-medium tabular-nums leading-10">
            {servings} serving{servings === 1 ? "" : "s"}
          </output>
          <button type="button" onClick={() => setServings(servings + 1)} disabled={servings >= 24} aria-label="More servings" className="inline-flex size-10 items-center justify-center rounded-r-[0.625rem] text-ink-soft hover:bg-ink/[0.05] disabled:opacity-35">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <p className="mt-1 hidden text-sm text-muted print:block">Serves {servings}</p>
      {servings !== recipe.servings && (
        <p className="mt-3 text-xs text-muted">
          Scaled from {recipe.servings} servings. Cooking times may need adjusting for larger amounts.{" "}
          <button type="button" className="link" onClick={() => setServings(recipe.servings)}>
            Reset
          </button>
        </p>
      )}

      {hasInventory && match && (
        <div className="no-print mt-5 rounded-[0.625rem] bg-forest-50 px-4 py-3 text-sm">
          <p className="font-medium text-forest">
            You have {match.essentialHave} of {match.essentialTotal} ingredients
            {match.readiness === "ready" ? " – ready to cook!" : match.readiness === "check-quantities" ? " – check quantities." : "."}
          </p>
          {match.explanation
            .filter((e) => e.startsWith("Need another") || e.startsWith("Using") || e.startsWith("Some amounts"))
            .map((e) => (
              <p key={e} className="mt-0.5 text-muted">
                {e}
              </p>
            ))}
        </div>
      )}

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {recipe.ingredients.map((ri) => {
          const ing = getIngredient(ri.ingredientId);
          const q = scaleQuantity({ quantity: ri.quantity, unit: ri.unit }, factor);
          const m = byId.get(ri.ingredientId);
          const meta = hasInventory && m ? STATUS_META[m.status] : null;
          const isChecked = checked.has(ri.ingredientId);
          const name = ri.displayName ?? ing?.name ?? ri.ingredientId;
          const amount = ri.toTaste ? "to taste" : formatQuantity(q, ing);
          const pieceNoun = q.unit === "pcs" && ing?.noun && !ri.displayName;
          return (
            <li key={ri.ingredientId} className="py-3">
              <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem]">
                <input
                  type="checkbox"
                  className="no-print mt-0.5 size-[1.1rem] shrink-0 accent-forest"
                  checked={isChecked}
                  onChange={() =>
                    setChecked((s) => {
                      const n = new Set(s);
                      if (n.has(ri.ingredientId)) n.delete(ri.ingredientId);
                      else n.add(ri.ingredientId);
                      return n;
                    })
                  }
                />
                <span className={cn("flex-1", isChecked && "text-muted line-through")}>
                  <span className="font-medium tabular-nums">{pieceNoun ? amount : <>{amount} </>}</span>
                  {!pieceNoun && <span>{ri.toTaste ? `– ${name}` : name.toLowerCase()}</span>}
                  {ri.preparationNote && <span className="text-muted">, {ri.preparationNote}</span>}
                  {ri.optional && <span className="tag ml-1.5 bg-cream-deep text-muted">optional</span>}
                  {excluded.has(ri.ingredientId) && <span className="tag ml-1.5 bg-coral-soft text-coral-ink">excluded – leave out</span>}
                  {meta && m && !ri.toTaste && (
                    <span className={cn("no-print mt-1 flex items-center gap-1 text-xs font-medium", meta.cls)}>
                      <meta.icon className="size-3.5" aria-hidden />
                      {m.substitutedBy ? `Using your ${m.substitutedBy.name.toLowerCase()}` : meta.label}
                      {m.status === "insufficient" && m.shortfall && ` – need ${formatQuantity(m.shortfall, ing)} more`}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="no-print mt-5 flex flex-col gap-2">
        {hasInventory && missingToBuy.length > 0 && (
          <button type="button" onClick={addMissing} className={buttonClass("primary", "md")}>
            <ShoppingBasket className="size-4" aria-hidden /> Add {missingToBuy.length} missing to shopping list
          </button>
        )}
        <button type="button" onClick={addAll} className={buttonClass(hasInventory && missingToBuy.length ? "secondary" : "primary", "md")}>
          <ShoppingBasket className="size-4" aria-hidden /> Add all ingredients to shopping list
        </button>
      </div>
    </section>
  );
}

/* ───────────────────────── Actions bar ───────────────────────── */

const DAY_LABELS: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const SLOT_LABELS: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export function RecipeActions() {
  const { recipe, servings, match } = useRecipeCtx();
  const { data } = useKitchen();
  const toast = useToast();
  const [cooking, setCooking] = useState(false);
  const [cookedOpen, setCookedOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const [day, setDay] = useState<Weekday>(WEEKDAYS[todayIdx] ?? "mon");
  const [slot, setSlot] = useState<MealSlot>(recipe.categories.includes("breakfast") ? "breakfast" : "dinner");

  const lines = useMemo(
    () => (cookedOpen && match ? planInventoryDeduction(match.matches, data.inventory, todayIso()) : []),
    [cookedOpen, match, data.inventory],
  );

  const share = async () => {
    const url = window.location.href.split("?")[0]!;
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, text: recipe.shortDescription, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.show("Link copied to clipboard");
    } catch {
      toast.show("Couldn't copy automatically – copy the address from your browser bar.", { tone: "info" });
    }
  };

  const markCooked = (deduct: boolean) => {
    if (deduct) kitchenStore.applyDeduction(lines);
    kitchenStore.recordCooked(recipe.id, servings, deduct && lines.some((l) => !l.uncertain));
    track({ name: "recipe_cooked", props: { slug: recipe.slug, deducted: deduct } });
    setCookedOpen(false);
    toast.show(deduct ? "Enjoy! Marked as cooked and your fridge is updated." : "Enjoy! Marked as cooked.");
  };

  const lastCooked = data.history.find((h) => h.recipeId === recipe.id);

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        <button type="button" onClick={() => setCooking(true)} className={buttonClass("primary", "md")}>
          <ChefHat className="size-4" aria-hidden /> Start cooking
        </button>
        <FavoriteButton recipeId={recipe.id} title={recipe.title} variant="button" />
        <button type="button" onClick={() => setPlanOpen(true)} className={buttonClass("secondary", "md")}>
          <CalendarPlus className="size-4" aria-hidden /> Plan
        </button>
        <button type="button" onClick={() => setCookedOpen(true)} className={buttonClass("secondary", "md")}>
          <Utensils className="size-4" aria-hidden /> Mark as cooked
        </button>
        <button type="button" onClick={share} className={buttonClass("ghost", "md")} aria-label="Share recipe">
          <Share2 className="size-4" aria-hidden /> Share
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass("ghost", "md")} aria-label="Print recipe">
          <Printer className="size-4" aria-hidden /> Print
        </button>
      </div>
      {lastCooked && (
        <p className="no-print mt-2 text-sm text-muted">
          You last cooked this on {new Date(lastCooked.cookedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}.
        </p>
      )}

      <CookingMode recipe={recipe} open={cooking} onClose={() => setCooking(false)} onFinish={() => setCookedOpen(true)} />

      <Dialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Add to meal plan"
        description={`${recipe.title} · ${servings} servings`}
        footer={
          <>
            <button type="button" className={buttonClass("ghost", "md")} onClick={() => setPlanOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={buttonClass("primary", "md")}
              onClick={() => {
                kitchenStore.addMealPlanEntry(day, slot, recipe.id, servings);
                track({ name: "meal_planned" });
                setPlanOpen(false);
                toast.show(`Planned for ${DAY_LABELS[day]} ${SLOT_LABELS[slot].toLowerCase()}`);
              }}
            >
              Add to plan
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="plan-day" className="label">
              Day
            </label>
            <select id="plan-day" className="field" value={day} onChange={(e) => setDay(e.target.value as Weekday)}>
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="plan-slot" className="label">
              Meal
            </label>
            <select id="plan-slot" className="field" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
              {MEAL_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={cookedOpen}
        onClose={() => setCookedOpen(false)}
        title="Nice work! Mark as cooked"
        description="Should we update your fridge too? Nothing changes unless you confirm."
        footer={
          <>
            <button type="button" className={buttonClass("secondary", "md")} onClick={() => markCooked(false)}>
              Just mark as cooked
            </button>
            {lines.some((l) => !l.uncertain) && (
              <button type="button" className={buttonClass("primary", "md")} onClick={() => markCooked(true)}>
                Mark cooked &amp; update fridge
              </button>
            )}
          </>
        }
      >
        {lines.length === 0 ? (
          <p className="text-muted">None of this recipe&apos;s ingredients are tracked in My Fridge, so there&apos;s nothing to update.</p>
        ) : (
          <>
            <p className="text-sm text-muted">For {servings} servings, we&apos;d make these changes:</p>
            <ul className="mt-3 space-y-2">
              {lines.map((l) => (
                <li key={l.itemId} className={cn("rounded-[0.625rem] p-3 text-sm", l.uncertain ? "bg-orange-soft text-orange-ink" : "bg-white border border-line")}>
                  {l.description}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Pantry staples aren&apos;t deducted. Amounts marked “estimated” use typical sizes.</p>
          </>
        )}
      </Dialog>
    </>
  );
}
