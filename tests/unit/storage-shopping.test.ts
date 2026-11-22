import { describe, expect, it } from "vitest";
import { getRecipeBySlug, toSummary } from "@/data/recipes";
import { applyInventoryDeduction, planInventoryDeduction } from "@/lib/matching/deduction";
import { compareRequiredIngredients, createMatchContext } from "@/lib/matching/engine";
import { daysBetween, getFreshness, getSoonToUseIngredients, isIsoDate } from "@/lib/matching/freshness";
import { getDietaryTagsForIngredients, getRecipeAllergens } from "@/lib/recipes/dietary";
import { formatShoppingItem, groupShoppingList, mergeIntoShoppingList, roundForShopping, shoppingListToText } from "@/lib/shopping/merge";
import { CURRENT_SCHEMA_VERSION, DEFAULT_PREFERENCES, createBackup, createEmptyState, migrate, parseBackupJson, parseStoredState } from "@/lib/storage/schema";
import { KitchenStore } from "@/lib/storage/kitchen-store";
import type { KitchenRepository } from "@/lib/storage/repository";
import type { InventoryItem, StorageSchema } from "@/types";

const TODAY = "2026-03-10";

describe("storage schema", () => {
  it("creates a valid empty state", () => {
    const s = createEmptyState();
    expect(s.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(parseStoredState(s).issues).toEqual([]);
  });

  it("never throws on garbage and resets it", () => {
    for (const bad of [null, 42, "x", [], { version: 999 }]) {
      const r = parseStoredState(bad);
      expect(r.ok).toBe(false);
      expect(r.state.inventory).toEqual([]);
    }
  });

  it("salvages valid entries and drops invalid ones", () => {
    const r = parseStoredState({
      version: 1,
      inventory: [
        { id: "a", ingredientId: "egg", displayName: "Eggs", quantity: 2, unit: "pcs", location: "fridge", addedAt: "2026-01-01T00:00:00Z" },
        { id: "b", ingredientId: "egg", displayName: "Eggs", quantity: -5, unit: "pcs", location: "fridge", addedAt: "2026-01-01T00:00:00Z" },
        { id: "c", ingredientId: "egg", displayName: "Eggs", quantity: 1, unit: "bucket", location: "fridge", addedAt: "2026-01-01T00:00:00Z" },
        { id: "d", ingredientId: "egg", displayName: "Eggs", quantity: 1, unit: "pcs", location: "fridge", useBy: "2026-02-31", addedAt: "2026-01-01T00:00:00Z" },
      ],
      preferences: { nonsense: true },
      favorites: ["a", "a", 7],
    });
    expect(r.ok).toBe(true);
    expect(r.state.inventory.map((i) => i.id)).toEqual(["a"]);
    expect(r.state.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(r.state.favorites).toEqual(["a"]);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("rejects data from a newer, unknown version", () => {
    expect(migrate({ version: CURRENT_SCHEMA_VERSION + 1 })).toBeNull();
  });

  it("round-trips a backup and rejects non-backups", () => {
    const s = createEmptyState();
    s.favorites = ["tomato-soup"];
    const back = parseBackupJson(createBackup(s));
    expect(back.ok).toBe(true);
    expect(back.state.favorites).toEqual(["tomato-soup"]);
    expect(parseBackupJson("{not json").ok).toBe(false);
    expect(parseBackupJson(JSON.stringify({ data: s })).ok).toBe(false);
    expect(parseBackupJson("x".repeat(3_000_000)).ok).toBe(false);
  });

  it("does not execute or keep unexpected properties", () => {
    const r = parseBackupJson(JSON.stringify({ app: "fridge-rescue", data: { version: 1, inventory: [], __proto__: { hacked: true }, script: "<script>alert(1)</script>" } }));
    expect(r.ok).toBe(true);
    expect((r.state as unknown as Record<string, unknown>).script).toBeUndefined();
  });
});

class MemoryRepo implements KitchenRepository {
  data: StorageSchema | null = null;
  isAvailable() { return true; }
  load() { return this.data ? parseStoredState(this.data) : null; }
  save(s: StorageSchema) { this.data = JSON.parse(JSON.stringify(s)); return true; }
  clear() { this.data = null; }
  onExternalChange() { return () => {}; }
}

describe("kitchen store (integration)", () => {
  it("adds, edits, combines, removes and restores inventory, persisting each change", () => {
    const repo = new MemoryRepo();
    const store = new KitchenStore(repo);
    const item = store.addInventoryItem({ ingredientId: "milk", quantity: 500, unit: "ml" });
    expect(repo.data?.inventory).toHaveLength(1);
    expect(store.combineInventoryItem(item.id, 1, "l")).toBe(true);
    expect(store.data.inventory[0]!.quantity).toBe(1500);
    expect(store.combineInventoryItem(item.id, 1, "pcs")).toBe(false);
    store.updateInventoryItem(item.id, { quantity: 250, location: "fridge", useBy: "2026-03-12" });
    expect(repo.data?.inventory[0]?.quantity).toBe(250);
    const removed = store.removeInventoryItem(item.id)!;
    expect(store.data.inventory).toHaveLength(0);
    store.restoreInventoryItem(removed.item, removed.index);
    expect(store.data.inventory).toHaveLength(1);
  });

  it("quick-add never creates duplicates", () => {
    const store = new KitchenStore(new MemoryRepo());
    store.quickAddIngredients(["egg", "milk"]);
    const r = store.quickAddIngredients(["egg", "rice"]);
    expect(r).toEqual({ added: ["rice"], skipped: ["egg"] });
    expect(store.data.inventory).toHaveLength(3);
  });

  it("handles favourites, meal plan, history and shopping", () => {
    const store = new KitchenStore(new MemoryRepo());
    expect(store.toggleFavorite("tomato-soup")).toBe(true);
    expect(store.toggleFavorite("tomato-soup")).toBe(false);
    const e = store.addMealPlanEntry("mon", "dinner", "tomato-soup", 2);
    store.moveMealPlanEntry(e.id, "wed", "lunch");
    expect(store.data.mealPlan[0]).toMatchObject({ day: "wed", slot: "lunch" });
    store.recordCooked("tomato-soup", 2, false);
    expect(store.data.history).toHaveLength(1);
    store.addToShoppingList([{ ingredientId: "onion", name: "Onions", quantity: 2, unit: "pcs" }]);
    const id = store.data.shoppingList[0]!.id;
    store.toggleShoppingPurchased(id);
    expect(store.movePurchasedToInventory()).toBe(1);
    expect(store.data.shoppingList).toHaveLength(0);
    expect(store.data.inventory[0]).toMatchObject({ ingredientId: "onion", quantity: 2 });
  });
});

describe("shopping list merge", () => {
  it("merges compatible units and avoids double-counting the same recipe", () => {
    let list = mergeIntoShoppingList([], [{ ingredientId: "cheese", name: "Cheese", quantity: 200, unit: "g", recipeId: "r1" }]);
    list = mergeIntoShoppingList(list, [{ ingredientId: "cheese", name: "Cheese", quantity: 0.1, unit: "kg", recipeId: "r2" }]);
    list = mergeIntoShoppingList(list, [{ ingredientId: "cheese", name: "Cheese", quantity: 200, unit: "g", recipeId: "r1" }]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ quantity: 300, unit: "g", sourceRecipeIds: ["r1", "r2"] });
  });

  it("keeps incompatible units separate and does not merge into purchased items", () => {
    let list = mergeIntoShoppingList([], [{ ingredientId: "chickpeas", name: "Chickpeas", quantity: 1, unit: "can" }]);
    list = mergeIntoShoppingList(list, [{ ingredientId: "chickpeas", name: "Chickpeas", quantity: 200, unit: "g" }]);
    expect(list).toHaveLength(2);
    list = list.map((i) => ({ ...i, purchased: true }));
    list = mergeIntoShoppingList(list, [{ ingredientId: "chickpeas", name: "Chickpeas", quantity: 1, unit: "can" }]);
    expect(list).toHaveLength(3);
  });

  it("rounds up to purchasable amounts", () => {
    expect(roundForShopping(1.33, "can")).toBe(2);
    expect(roundForShopping(6.7, "g")).toBe(7);
    expect(roundForShopping(151, "g")).toBe(155);
    expect(roundForShopping(0.25, "tbsp")).toBe(0.5);
  });

  it("formats, groups and exports as text", () => {
    const list = mergeIntoShoppingList([], [
      { ingredientId: "onion", name: "Onions", quantity: 2, unit: "pcs" },
      { ingredientId: "cheese", name: "Cheese (cheddar-style)", quantity: 200, unit: "g" },
      { ingredientId: null, name: "Kitchen roll", quantity: null, unit: null },
    ]);
    expect(formatShoppingItem(list[0]!)).toBe("2 onions");
    expect(formatShoppingItem(list[1]!)).toBe("200 g cheese");
    expect(groupShoppingList(list).map((g) => g.label)).toEqual(["Vegetables", "Dairy", "Other"]);
    const text = shoppingListToText(list);
    expect(text).toContain("[ ] 2 onions");
    expect(text).toContain("[ ] Kitchen roll");
  });
});

describe("freshness", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("tomorrow")).toBe(false);
  });

  it("classifies use-by and best-before dates conservatively", () => {
    expect(daysBetween(TODAY, "2026-03-12")).toBe(2);
    expect(getFreshness({ useBy: "2026-03-09" }, TODAY).status).toBe("past-use-by");
    expect(getFreshness({ useBy: "2026-03-10" }, TODAY).label).toBe("Use by today");
    expect(getFreshness({ bestBefore: "2026-03-09" }, TODAY).status).toBe("past-best-before");
    expect(getFreshness({ bestBefore: "2026-03-12" }, TODAY).status).toBe("best-before-soon");
    expect(getFreshness({}, TODAY).status).toBe("no-date");
    // use-by takes priority
    expect(getFreshness({ useBy: "2026-03-11", bestBefore: "2026-04-01" }, TODAY).status).toBe("use-soon");
  });

  it("lists soon-to-use items, most urgent first", () => {
    const mk = (id: string, extra: Partial<InventoryItem>): InventoryItem => ({ id, ingredientId: id, displayName: id, quantity: 1, unit: "pcs", location: "fridge", addedAt: "", ...extra });
    const soon = getSoonToUseIngredients([mk("a", { bestBefore: "2026-03-11" }), mk("b", { useBy: "2026-03-12" }), mk("c", {})], TODAY);
    expect(soon.map((s) => s.item.id)).toEqual(["b", "a"]);
  });
});

describe("dietary derivation", () => {
  it("derives labels from ingredients conservatively", () => {
    expect(getDietaryTagsForIngredients([{ ingredientId: "rice" }, { ingredientId: "black-beans" }])).toEqual(["vegetarian", "vegan", "dairy-free", "gluten-free"]);
    expect(getDietaryTagsForIngredients([{ ingredientId: "rice" }, { ingredientId: "soy-sauce" }])).not.toContain("gluten-free");
    expect(getDietaryTagsForIngredients([{ ingredientId: "egg" }])).toEqual(["vegetarian", "dairy-free", "gluten-free"]);
    expect(getDietaryTagsForIngredients([{ ingredientId: "honey" }])).not.toContain("vegan");
    expect(getDietaryTagsForIngredients([{ ingredientId: "unknown-thing" }])).toEqual([]);
  });

  it("separates allergens in optional ingredients", () => {
    const a = getRecipeAllergens(getRecipeBySlug("chickpea-salad")!);
    expect(a.contains).toEqual([]);
    expect(a.optionalOnly).toContain("milk");
  });
});

describe("inventory deduction", () => {
  it("plans deductions from the earliest-dated item first and handles unknowns", () => {
    const inv: InventoryItem[] = [
      { id: "e1", ingredientId: "egg", displayName: "Eggs", quantity: 2, unit: "pcs", location: "fridge", addedAt: "1", useBy: "2026-03-20" },
      { id: "e2", ingredientId: "egg", displayName: "Eggs", quantity: 6, unit: "pcs", location: "fridge", addedAt: "2", useBy: "2026-03-12" },
      { id: "c1", ingredientId: "cheese", displayName: "Cheese", quantity: null, unit: "g", location: "fridge", addedAt: "3" },
      { id: "b1", ingredientId: "butter", displayName: "Butter", quantity: 0.25, unit: "kg", location: "fridge", addedAt: "4" },
    ];
    const recipe = toSummary(getRecipeBySlug("classic-cheese-omelette")!);
    const matches = compareRequiredIngredients(recipe, createMatchContext(inv, { pantryStaples: [], excludedIngredients: [] }, TODAY));
    const lines = planInventoryDeduction(matches, inv, TODAY);
    expect(lines.find((l) => l.itemId === "e2")).toMatchObject({ before: 6, after: 3 });
    expect(lines.find((l) => l.itemId === "e1")).toBeUndefined();
    expect(lines.find((l) => l.itemId === "c1")?.uncertain).toBe(true);
    expect(lines.find((l) => l.itemId === "b1")).toMatchObject({ after: 0.24 });

    const after = applyInventoryDeduction(inv, lines);
    expect(after.find((i) => i.id === "e2")?.quantity).toBe(3);
    expect(after.find((i) => i.id === "c1")?.quantity).toBeNull();
  });

  it("removes items that are fully used and spans multiple items", () => {
    const inv: InventoryItem[] = [
      { id: "p1", ingredientId: "potato", displayName: "Potatoes", quantity: 300, unit: "g", location: "pantry", addedAt: "1" },
      { id: "p2", ingredientId: "potato", displayName: "Potatoes", quantity: 300, unit: "g", location: "pantry", addedAt: "2" },
    ];
    const recipe = toSummary(getRecipeBySlug("potato-and-egg-skillet")!);
    const matches = compareRequiredIngredients(recipe, createMatchContext(inv, { pantryStaples: [], excludedIngredients: [] }, TODAY));
    const after = applyInventoryDeduction(inv, planInventoryDeduction(matches, inv, TODAY));
    expect(after.map((i) => [i.id, i.quantity])).toEqual([["p2", 200]]);
  });
});
