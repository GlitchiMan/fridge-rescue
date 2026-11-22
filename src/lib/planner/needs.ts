import { compareRequiredIngredients, createMatchContext } from "@/lib/matching/engine";
import { convertCompatibleUnits } from "@/lib/quantities/units";
import type { InventoryItem, MealPlanEntry, RecipeIngredient, RecipeSummary, ShoppingListItem, UserPreferences } from "@/types";
import type { ShoppingAddition } from "@/lib/shopping/merge";
import { getIngredient } from "@/data/ingredients";

/**
 * Work out what to buy for a meal plan:
 *  1. Sum every planned recipe's essential ingredients (scaled to planned servings).
 *  2. Compare the total against the fridge AND items already on the shopping list,
 *     so the same need is never added twice.
 */
export function computePlanNeeds(
  entries: MealPlanEntry[],
  recipes: Map<string, RecipeSummary>,
  inventory: InventoryItem[],
  shoppingList: ShoppingListItem[],
  prefs: UserPreferences,
  today: string,
): ShoppingAddition[] {
  const totals: RecipeIngredient[] = [];
  for (const e of entries) {
    const r = recipes.get(e.recipeId);
    if (!r) continue;
    const factor = e.servings / r.servings;
    for (const ri of r.ingredients) {
      if (ri.optional || ri.toTaste || ri.quantity === null) continue;
      const qty = ri.quantity * factor;
      const existing = totals.find((t) => t.ingredientId === ri.ingredientId && convertCompatibleUnits(1, ri.unit, t.unit) !== null);
      if (existing) existing.quantity = (existing.quantity ?? 0) + convertCompatibleUnits(qty, ri.unit, existing.unit)!;
      else totals.push({ ingredientId: ri.ingredientId, quantity: qty, unit: ri.unit });
    }
  }
  if (!totals.length) return [];

  // Items already on the (unpurchased) list count as "will have".
  const virtual: InventoryItem[] = shoppingList
    .filter((s) => !s.purchased && s.ingredientId && s.quantity !== null && s.unit !== null)
    .map((s) => ({ id: `list-${s.id}`, ingredientId: s.ingredientId!, displayName: s.name, quantity: s.quantity, unit: s.unit!, location: "other", addedAt: s.addedAt }));
  const onListUnknown = new Set(shoppingList.filter((s) => !s.purchased && s.ingredientId && s.quantity === null).map((s) => s.ingredientId!));

  const ctx = createMatchContext([...inventory, ...virtual], prefs, today);
  const matches = compareRequiredIngredients({ ingredients: totals, substitutions: [], servings: 1 }, ctx, 1);

  return matches
    .filter((m) => (m.status === "missing" || m.status === "insufficient") && !onListUnknown.has(m.ingredientId))
    .map((m) => {
      const q = m.status === "insufficient" && m.shortfall ? m.shortfall : m.required;
      return { ingredientId: m.ingredientId, name: getIngredient(m.ingredientId)?.name ?? m.ingredientId, quantity: q.quantity, unit: q.unit };
    });
}
