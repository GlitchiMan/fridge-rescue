import { getIngredient } from "@/data/ingredients";
import { approximateConvert, convertCompatibleUnits, formatQuantity } from "@/lib/quantities/units";
import type { IngredientMatch, InventoryItem } from "@/types";
import { getFreshness } from "./freshness";

export interface DeductionLine {
  itemId: string;
  name: string;
  /** Current quantity (item unit). */
  before: number | null;
  /** New quantity (item unit). 0 → item will be removed. null → unchanged (unknown). */
  after: number | null;
  unit: InventoryItem["unit"];
  approximate: boolean;
  /** Human-readable description of the change. */
  description: string;
  /** true = we can't calculate; the user should check this manually. */
  uncertain: boolean;
}

/**
 * Plan (but do not apply) how cooking a recipe changes the inventory.
 * - Uses the earliest-dated items first.
 * - Never guesses with unknown quantities – those are flagged "uncertain".
 * - Pantry staples are never deducted.
 */
export function planInventoryDeduction(matches: IngredientMatch[], inventory: InventoryItem[], today: string): DeductionLine[] {
  const lines: DeductionLine[] = [];
  const byId = new Map(inventory.map((i) => [i.id, i]));

  for (const m of matches) {
    if (m.status === "missing" || m.status === "staple") continue;
    if (m.required.quantity === null) continue; // "to taste"
    const ingredientId = m.substitutedBy?.ingredientId ?? m.ingredientId;
    const ingredient = getIngredient(ingredientId);
    const items = m.inventoryItemIds
      .map((id) => byId.get(id))
      .filter((i): i is InventoryItem => Boolean(i))
      .sort((a, b) => {
        const da = getFreshness(a, today).days ?? Number.POSITIVE_INFINITY;
        const db = getFreshness(b, today).days ?? Number.POSITIVE_INFINITY;
        return da - db || a.addedAt.localeCompare(b.addedAt) || a.id.localeCompare(b.id);
      });

    let remaining = m.required.quantity;
    for (const item of items) {
      if (remaining <= 1e-9) break;
      if (item.quantity === null) {
        lines.push({
          itemId: item.id,
          name: item.displayName,
          before: null,
          after: null,
          unit: item.unit,
          approximate: false,
          uncertain: true,
          description: `${item.displayName}: amount unknown – update it yourself if needed`,
        });
        continue;
      }
      // Required amount expressed in the item's unit.
      let approximate = false;
      let needInItemUnit = convertCompatibleUnits(remaining, m.required.unit, item.unit);
      if (needInItemUnit === null) {
        const approx = approximateConvert(remaining, m.required.unit, item.unit, ingredient);
        if (!approx) {
          lines.push({
            itemId: item.id,
            name: item.displayName,
            before: item.quantity,
            after: null,
            unit: item.unit,
            approximate: false,
            uncertain: true,
            description: `${item.displayName}: units differ – update it yourself if needed`,
          });
          continue;
        }
        needInItemUnit = approx.value;
        approximate = true;
      }
      const used = Math.min(item.quantity, needInItemUnit);
      const after = Math.max(0, Math.round((item.quantity - used) * 1000) / 1000);
      // Convert what we used back into the required unit to reduce `remaining`.
      const usedInReqUnit = needInItemUnit > 0 ? (used / needInItemUnit) * remaining : 0;
      remaining -= usedInReqUnit;
      lines.push({
        itemId: item.id,
        name: item.displayName,
        before: item.quantity,
        after,
        unit: item.unit,
        approximate,
        uncertain: false,
        description:
          after <= 0
            ? `${item.displayName}: use it all up (remove from fridge)`
            : `${item.displayName}: ${formatQuantity({ quantity: item.quantity, unit: item.unit }, ingredient)} → ${formatQuantity({ quantity: after, unit: item.unit }, ingredient)}${approximate ? " (estimated)" : ""}`,
      });
    }
  }
  return lines;
}

/** Apply previously planned (and user-confirmed) lines. */
export function applyInventoryDeduction(inventory: InventoryItem[], lines: DeductionLine[]): InventoryItem[] {
  const changes = new Map(lines.filter((l) => !l.uncertain && l.after !== null).map((l) => [l.itemId, l.after as number]));
  return inventory
    .map((item) => (changes.has(item.id) ? { ...item, quantity: changes.get(item.id)! } : item))
    .filter((item) => !(changes.has(item.id) && (item.quantity ?? 0) <= 0));
}
