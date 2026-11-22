import { describe, expect, it } from "vitest";
import { getRecipeBySlug, getRecipeSummaries, toSummary } from "@/data/recipes";
import {
  buildInventoryIndex,
  calculateAvailableQuantity,
  calculateRecipeMatch,
  checkRecipeAgainstPreferences,
  createMatchContext,
  filterRecipesByPreferences,
  getMissingIngredients,
  rankRecipes,
  suggestRecipesForInventory,
} from "@/lib/matching/engine";
import { DEFAULT_PREFERENCES } from "@/lib/storage/schema";
import type { InventoryItem, RecipeSummary, Unit, UserPreferences } from "@/types";

const TODAY = "2026-03-10";
let n = 0;
function item(ingredientId: string, quantity: number | null, unit: Unit, extra: Partial<InventoryItem> = {}): InventoryItem {
  n += 1;
  return { id: `i${n}`, ingredientId, displayName: ingredientId, quantity, unit, location: "fridge", addedAt: "2026-03-01T00:00:00Z", ...extra };
}
function prefs(p: Partial<UserPreferences> = {}): UserPreferences {
  return { ...DEFAULT_PREFERENCES, pantryStaples: [], ...p };
}
const skillet = toSummary(getRecipeBySlug("potato-and-egg-skillet")!);
const opts = { maxMinutes: null, favorites: new Set<string>() };

const SPEC_INVENTORY = [
  item("egg", 4, "pcs"),
  item("milk", 500, "ml"),
  item("cheese", 200, "g"),
  item("potato", 600, "g"),
  item("onion", 2, "pcs"),
];

describe("spec example: potato and egg skillet", () => {
  it("shows cooking oil as missing when it is not a confirmed staple", () => {
    const ctx = createMatchContext(SPEC_INVENTORY, prefs(), TODAY);
    const m = calculateRecipeMatch(skillet, ctx, opts);
    expect(m.readiness).toBe("missing");
    expect(m.missing.map((x) => x.ingredientId)).toEqual(["cooking-oil"]);
    expect(m.explanation).toContain("Missing: cooking oil.");
    expect(m.explanation[0]).toBe("You have 3 of 4 ingredients.");
  });

  it("is ready when cooking oil is a confirmed pantry staple", () => {
    const ctx = createMatchContext(SPEC_INVENTORY, prefs({ pantryStaples: ["cooking-oil"] }), TODAY);
    const m = calculateRecipeMatch(skillet, ctx, opts);
    expect(m.readiness).toBe("ready");
    expect(m.missing).toHaveLength(0);
  });

  it("accepts olive oil as a general substitute and says so", () => {
    const ctx = createMatchContext([...SPEC_INVENTORY, item("olive-oil", 500, "ml")], prefs(), TODAY);
    const m = calculateRecipeMatch(skillet, ctx, opts);
    expect(m.readiness).toBe("ready");
    expect(m.explanation.some((e) => e.includes("Using olive oil instead of cooking oil"))).toBe(true);
  });
});

describe("quantities", () => {
  it("reports insufficient quantity with an exact shortfall", () => {
    const inv = [item("egg", 4, "pcs"), item("potato", 250, "g"), item("onion", 1, "pcs")];
    const ctx = createMatchContext(inv, prefs({ pantryStaples: ["cooking-oil"] }), TODAY);
    const m = calculateRecipeMatch(skillet, ctx, opts);
    expect(m.readiness).toBe("short");
    expect(m.insufficient[0]?.shortfall).toEqual({ quantity: 150, unit: "g" });
    expect(m.explanation).toContain("Need another 150 g potatoes.");
  });

  it("never treats unknown quantities as ready", () => {
    const inv = [item("egg", null, "pcs"), item("potato", null, "g"), item("onion", null, "pcs")];
    const ctx = createMatchContext(inv, prefs({ pantryStaples: ["cooking-oil"] }), TODAY);
    const m = calculateRecipeMatch(skillet, ctx, opts);
    expect(m.readiness).toBe("check-quantities");
    expect(m.explanation).toContain("Ingredients match — check quantities.");
    expect(m.insufficient).toHaveLength(0);
  });

  it("converts compatible units (kg → g)", () => {
    const index = buildInventoryIndex([item("potato", 0.5, "kg")], TODAY);
    expect(calculateAvailableQuantity(index, "potato", { quantity: 400, unit: "g" }).status).toBe("enough");
  });

  it("sums duplicate inventory entries", () => {
    const index = buildInventoryIndex([item("potato", 200, "g"), item("potato", 250, "g")], TODAY);
    const r = calculateAvailableQuantity(index, "potato", { quantity: 400, unit: "g" });
    expect(r.status).toBe("enough");
    expect(r.available).toBe(450);
  });

  it("uses labelled approximations for pieces vs grams", () => {
    const index = buildInventoryIndex([item("potato", 3, "pcs")], TODAY);
    const r = calculateAvailableQuantity(index, "potato", { quantity: 400, unit: "g" });
    expect(r.status).toBe("enough");
    expect(r.approximate).toBe(true);
  });

  it("does not convert incompatible units without a rule", () => {
    const index = buildInventoryIndex([item("chickpeas", 400, "g")], TODAY);
    const r = calculateAvailableQuantity(index, "chickpeas", { quantity: 1, unit: "can" });
    expect(r.status).toBe("unknown-quantity");
  });

  it("scales requirements with servings", () => {
    const inv = [item("egg", 3, "pcs"), item("potato", 600, "g"), item("onion", 2, "pcs")];
    const ctx = createMatchContext(inv, prefs({ pantryStaples: ["cooking-oil"] }), TODAY);
    expect(calculateRecipeMatch(skillet, ctx, opts, 2).readiness).toBe("ready");
    const four = calculateRecipeMatch(skillet, ctx, opts, 4);
    expect(four.readiness).toBe("short");
    expect(four.insufficient.map((x) => x.ingredientId).sort()).toEqual(["egg", "potato"]);
  });
});

describe("dates and freshness", () => {
  it("ignores items past their use-by date", () => {
    const index = buildInventoryIndex([item("spinach", 200, "g", { useBy: "2026-03-08" })], TODAY);
    expect(index.has("spinach")).toBe(false);
  });

  it("still counts items past best-before (quality date)", () => {
    const index = buildInventoryIndex([item("yogurt", 200, "g", { bestBefore: "2026-03-08" })], TODAY);
    expect(index.has("yogurt")).toBe(true);
  });

  it("boosts recipes that use soon-to-expire ingredients", () => {
    const base = [item("egg", 6, "pcs"), item("milk", 500, "ml"), item("cheese", 200, "g"), item("bell-pepper", 2, "pcs")];
    const withSoon = [...base, item("spinach", 100, "g", { useBy: "2026-03-11" })];
    const muffins = toSummary(getRecipeBySlug("egg-muffins")!);
    const p = prefs({ pantryStaples: ["cooking-oil"] });
    const a = calculateRecipeMatch(muffins, createMatchContext([...base, item("spinach", 100, "g")], p, TODAY), opts);
    const b = calculateRecipeMatch(muffins, createMatchContext(withSoon, p, TODAY), opts);
    expect(b.score).toBeGreaterThan(a.score);
    expect(b.usesSoon).toContain("Spinach");
  });
});

describe("preferences", () => {
  it("hard-filters by derived diet labels", () => {
    const all = getRecipeSummaries();
    const vegan = filterRecipesByPreferences(all, { diets: ["vegan"], excludedIngredients: [], equipment: [] });
    expect(vegan.length).toBeGreaterThan(0);
    for (const r of vegan) expect(r.dietaryTags).toContain("vegan");
    expect(vegan.find((r) => r.slug === "classic-cheese-omelette")).toBeUndefined();
  });

  it("removes recipes with excluded essential ingredients", () => {
    expect(checkRecipeAgainstPreferences(skillet, { diets: [], excludedIngredients: ["egg"], equipment: [] }).allowed).toBe(false);
    // Optional ingredient excluded → recipe stays (user can leave it out)
    expect(checkRecipeAgainstPreferences(skillet, { diets: [], excludedIngredients: ["cheese"], equipment: [] }).allowed).toBe(true);
  });

  it("filters by available equipment when specified", () => {
    const banana = toSummary(getRecipeBySlug("banana-bread")!);
    expect(checkRecipeAgainstPreferences(banana, { diets: [], excludedIngredients: [], equipment: ["stovetop"] }).allowed).toBe(false);
    expect(checkRecipeAgainstPreferences(banana, { diets: [], excludedIngredients: [], equipment: [] }).allowed).toBe(true);
  });

  it("never suggests an excluded ingredient as a substitute", () => {
    const ctx = createMatchContext([...SPEC_INVENTORY, item("olive-oil", 100, "ml")], prefs({ excludedIngredients: ["olive-oil"] }), TODAY);
    const m = calculateRecipeMatch(skillet, ctx, opts);
    expect(m.readiness).toBe("missing");
  });
});

describe("suggestions & ranking", () => {
  const recipes = getRecipeSummaries();

  it("returns nothing for an empty inventory", () => {
    const r = suggestRecipesForInventory(recipes, [], prefs(), { today: TODAY });
    expect(r.ranked).toHaveLength(0);
    expect(r.groups.canMake).toHaveLength(0);
  });

  it("finds sensible recipes for eggs, cheese, potatoes, onion and milk", () => {
    const r = suggestRecipesForInventory(recipes, SPEC_INVENTORY, prefs({ pantryStaples: ["cooking-oil", "butter", "salt"] }), { today: TODAY });
    const canMake = r.groups.canMake.map((m) => m.slug);
    expect(canMake).toContain("potato-and-egg-skillet");
    expect(canMake).toContain("classic-cheese-omelette");
    // 600 g potatoes < 1 kg required → correctly "short", not ready.
    expect(canMake).not.toContain("cheesy-mashed-potatoes");
    const mash = r.ranked.find((m) => m.slug === "cheesy-mashed-potatoes");
    expect(mash?.readiness).toBe("short");
    expect(mash?.explanation).toContain("Need another 400 g potatoes.");
  });

  it("is deterministic and stable", () => {
    const a = suggestRecipesForInventory(recipes, SPEC_INVENTORY, prefs(), { today: TODAY }).ranked.map((m) => m.slug);
    const b = suggestRecipesForInventory([...recipes].reverse(), SPEC_INVENTORY, prefs(), { today: TODAY }).ranked.map((m) => m.slug);
    expect(a).toEqual(b);
  });

  it("puts recipes missing one or two ingredients in 'almost'", () => {
    const r = suggestRecipesForInventory(recipes, SPEC_INVENTORY, prefs(), { today: TODAY });
    for (const m of r.groups.almost) {
      expect(m.readiness === "short" || (m.missing.length >= 1 && m.missing.length <= 2)).toBe(true);
    }
    expect(r.groups.almost.map((m) => m.slug)).toContain("potato-and-egg-skillet");
  });

  it("ranks by score, then fewer missing, then time", () => {
    const ctx = createMatchContext(SPEC_INVENTORY, prefs(), TODAY);
    const matches = recipes.map((rec) => calculateRecipeMatch(rec, ctx, opts));
    const ranked = rankRecipes(matches, recipes);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
  });

  it("handles recipes with no matches and never produces NaN", () => {
    const ctx = createMatchContext([item("salmon", 2, "pcs")], prefs(), TODAY);
    for (const rec of recipes) {
      const m = calculateRecipeMatch(rec, ctx, opts);
      expect(Number.isFinite(m.score)).toBe(true);
    }
  });

  it("treats optional ingredients as non-blocking", () => {
    const omelette = toSummary(getRecipeBySlug("classic-cheese-omelette")!);
    const ctx = createMatchContext([item("egg", 3, "pcs"), item("cheese", 30, "g"), item("butter", 10, "g")], prefs(), TODAY);
    const m = calculateRecipeMatch(omelette, ctx, opts);
    expect(m.readiness).toBe("ready");
    expect(getMissingIngredients(m.matches)).toHaveLength(0);
  });

  it("uses recipe-specific substitutions (raw rice for cooked rice)", () => {
    const friedRice = toSummary(getRecipeBySlug("egg-fried-rice")!);
    const ctx = createMatchContext(
      [item("rice", 1000, "g"), item("egg", 6, "pcs"), item("spring-onion", 4, "pcs")],
      prefs({ pantryStaples: ["soy-sauce", "cooking-oil"] }),
      TODAY,
    );
    const m = calculateRecipeMatch(friedRice, ctx, opts);
    expect(m.readiness).toBe("ready");
    expect(m.matches.find((x) => x.ingredientId === "cooked-rice")?.substitutedBy?.ingredientId).toBe("rice");
  });

  it("leftover items get a small priority boost", () => {
    const fr = toSummary(getRecipeBySlug("chicken-fried-rice")!) as RecipeSummary;
    const p = prefs({ pantryStaples: ["cooking-oil"] });
    const inv = [item("cooked-rice", 500, "g"), item("cooked-chicken", 200, "g"), item("egg", 4, "pcs")];
    const a = calculateRecipeMatch(fr, createMatchContext(inv, p, TODAY), opts);
    const b = calculateRecipeMatch(fr, createMatchContext(inv.map((i) => ({ ...i, isLeftover: true })), p, TODAY), opts);
    expect(b.score).toBeGreaterThan(a.score);
  });
});
