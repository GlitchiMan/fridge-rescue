import { CATEGORY_LABELS, getIngredient } from "@/data/ingredients";
import { convertCompatibleUnits, formatQuantity, isCountUnit, normalizeForDisplay } from "@/lib/quantities/units";
import { createId } from "@/lib/utils/id";
import type { IngredientCategory, IngredientId, ShoppingListItem, Unit } from "@/types";

/**
 * Round a quantity up to something you can actually buy: whole cans/pieces,
 * and tidy metric amounts (never rounding down, so you don't end up short).
 */
export function roundForShopping(quantity: number, unit: Unit): number {
  if (isCountUnit(unit)) return Math.max(1, Math.ceil(quantity - 1e-9));
  if (unit === "g" || unit === "ml") {
    if (quantity < 10) return Math.max(1, Math.ceil(quantity - 1e-9));
    return Math.ceil(quantity / 5 - 1e-9) * 5;
  }
  if (unit === "tsp" || unit === "tbsp" || unit === "cup") return Math.ceil(quantity * 2 - 1e-9) / 2;
  return Math.ceil(quantity * 10 - 1e-9) / 10; // kg, l
}

export interface ShoppingAddition {
  ingredientId: IngredientId | null;
  name: string;
  quantity: number | null;
  unit: Unit | null;
  recipeId?: string;
}

/**
 * Merge additions into the list without double counting:
 * - Same ingredient + compatible units + not yet purchased → quantities add up.
 * - Adding the same recipe's ingredient twice is ignored (already counted).
 * - Unknown + known quantity → keeps the known amount.
 * - Incompatible units → kept as a separate line.
 */
export function mergeIntoShoppingList(
  list: ShoppingListItem[],
  additions: ShoppingAddition[],
  now: string = new Date().toISOString(),
): ShoppingListItem[] {
  const next = list.map((i) => ({ ...i, sourceRecipeIds: [...i.sourceRecipeIds] }));

  for (const add of additions) {
    const candidates = next.filter(
      (i) =>
        !i.purchased &&
        (add.ingredientId ? i.ingredientId === add.ingredientId : !i.ingredientId && i.name.toLowerCase() === add.name.trim().toLowerCase()),
    );

    // Already added for this recipe → don't double count.
    if (add.recipeId && candidates.some((c) => c.sourceRecipeIds.includes(add.recipeId!))) continue;

    let merged = false;
    for (const c of candidates) {
      if (add.quantity === null || add.unit === null) {
        if (add.recipeId) c.sourceRecipeIds.push(add.recipeId);
        merged = true;
        break;
      }
      if (c.quantity === null || c.unit === null) {
        c.quantity = roundForShopping(add.quantity, add.unit);
        c.unit = add.unit;
        if (add.recipeId) c.sourceRecipeIds.push(add.recipeId);
        merged = true;
        break;
      }
      const converted = convertCompatibleUnits(add.quantity, add.unit, c.unit);
      if (converted !== null) {
        const total = normalizeForDisplay({ quantity: c.quantity + converted, unit: c.unit });
        c.quantity = roundForShopping(total.quantity!, total.unit);
        c.unit = total.unit;
        if (add.recipeId) c.sourceRecipeIds.push(add.recipeId);
        merged = true;
        break;
      }
    }

    if (!merged) {
      next.push({
        id: createId("shop"),
        ingredientId: add.ingredientId,
        name: add.name.trim(),
        quantity: add.quantity === null || add.unit === null ? null : roundForShopping(add.quantity, add.unit),
        unit: add.quantity === null ? null : add.unit,
        purchased: false,
        sourceRecipeIds: add.recipeId ? [add.recipeId] : [],
        addedAt: now,
      });
    }
  }
  return next;
}

export function shoppingItemCategory(item: Pick<ShoppingListItem, "ingredientId">): IngredientCategory {
  return (item.ingredientId && getIngredient(item.ingredientId)?.category) || "other";
}

export function formatShoppingItem(item: Pick<ShoppingListItem, "ingredientId" | "name" | "quantity" | "unit">): string {
  if (item.quantity === null || item.unit === null) return item.name;
  const ing = item.ingredientId ? getIngredient(item.ingredientId) : undefined;
  const q = formatQuantity({ quantity: item.quantity, unit: item.unit }, ing);
  if (item.unit === "pcs" && ing?.noun) return q; // "2 onions"
  const name = item.name.replace(/\s*\((canned|uncooked|cheddar-style|vegetable)\)$/i, "");
  return `${q} ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

export function groupShoppingList(list: ShoppingListItem[]): { category: IngredientCategory; label: string; items: ShoppingListItem[] }[] {
  const groups = new Map<IngredientCategory, ShoppingListItem[]>();
  for (const item of list) {
    const cat = shoppingItemCategory(item);
    groups.set(cat, [...(groups.get(cat) ?? []), item]);
  }
  const order = Object.keys(CATEGORY_LABELS) as IngredientCategory[];
  return order
    .filter((c) => groups.has(c))
    .map((c) => ({
      category: c,
      label: CATEGORY_LABELS[c],
      items: groups.get(c)!.sort((a, b) => Number(a.purchased) - Number(b.purchased) || a.name.localeCompare(b.name)),
    }));
}

/** Plain-text version for copying/sharing. */
export function shoppingListToText(list: ShoppingListItem[]): string {
  const lines: string[] = ["Shopping list – Fridge Rescue", ""];
  for (const group of groupShoppingList(list)) {
    lines.push(group.label);
    for (const item of group.items) lines.push(`${item.purchased ? "[x]" : "[ ]"} ${formatShoppingItem(item)}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
