/**
 * Fridge Rescue recommendation engine.
 *
 * Pure, deterministic functions – no React, no storage, no randomness.
 *
 * SCORING (max 100 before penalties)
 * ─────────────────────────────────
 *  Ingredient coverage ........ 45 × (essential ingredients you have ÷ essential total)
 *  Completeness ............... 20 ready · 12 quantities unknown · 6 short · 0 missing
 *  Use-soon bonus ............. up to 15 (8 per use-by-soon item, 5 per best-before-soon,
 *                               4 per leftover item used)
 *  Time fit ................... up to 10 (fits your max time, or faster = better)
 *  Preference fit ............. up to 10 (favourite +5, easy +3, +1 per optional extra you have)
 *  Penalties .................. −8 per missing essential, −3 per insufficient quantity
 *
 * Ties break on: fewer missing → shorter time → title (A–Z) → id. Fully stable.
 *
 * DEFINITIONS
 *  - Essential ingredient: not `optional` and not "to taste".
 *  - Pantry staples only count as available if the user opted in.
 *  - Items past an entered use-by date are never counted as available.
 *  - Unknown quantities never count as "enough": the recipe is labelled
 *    "Ingredients match — check quantities".
 */
import { getIngredient } from "@/data/ingredients";
import { GENERAL_SUBSTITUTIONS } from "@/data/substitutions";
import {
  approximateConvert,
  dimensionOf,
  formatQuantity,
  toBase,
} from "@/lib/quantities/units";
import type {
  Dimension,
  IngredientId,
  IngredientMatch,
  IngredientQuantity,
  IngredientSubstitution,
  InventoryItem,
  RecipeIngredient,
  RecipeMatch,
  RecipeSummary,
  Readiness,
  Unit,
  UserPreferences,
} from "@/types";
import { getFreshness, isExcludedFromMatching, type FreshnessInfo } from "./freshness";

/* ───────────────────────── Inventory index ───────────────────────── */

export interface InventoryEntry {
  ingredientId: IngredientId;
  /** Known amounts by dimension, in base units (g, ml, or the count unit). */
  known: Map<Dimension, number>;
  /** Number of usable items with unknown quantity. */
  unknownCount: number;
  itemIds: string[];
  soon: "use-by" | "best-before" | null;
  leftover: boolean;
}

export type InventoryIndex = Map<IngredientId, InventoryEntry>;

export function buildInventoryIndex(inventory: InventoryItem[], today: string): InventoryIndex {
  const index: InventoryIndex = new Map();
  for (const item of inventory) {
    const fresh: FreshnessInfo = getFreshness(item, today);
    if (isExcludedFromMatching(fresh.status)) continue;
    if (item.quantity !== null && item.quantity <= 0) continue;
    let entry = index.get(item.ingredientId);
    if (!entry) {
      entry = { ingredientId: item.ingredientId, known: new Map(), unknownCount: 0, itemIds: [], soon: null, leftover: false };
      index.set(item.ingredientId, entry);
    }
    entry.itemIds.push(item.id);
    if (item.isLeftover) entry.leftover = true;
    if (fresh.status === "use-soon") entry.soon = "use-by";
    else if (fresh.status === "best-before-soon" && entry.soon !== "use-by") entry.soon = "best-before";
    if (item.quantity === null) {
      entry.unknownCount += 1;
    } else {
      const dim = dimensionOf(item.unit);
      entry.known.set(dim, (entry.known.get(dim) ?? 0) + toBase(item.quantity, item.unit));
    }
  }
  return index;
}

/* ───────────────────────── Quantity checks ───────────────────────── */

export interface AvailabilityResult {
  status: "enough" | "insufficient" | "unknown-quantity" | "none";
  /** Available amount expressed in the required unit (known amounts only). */
  available: number;
  approximate: boolean;
}

/**
 * How much of an ingredient is available, compared with a required amount.
 * Compatible units are converted exactly; pieces ↔ grams only via the
 * ingredient's documented typical weight (flagged approximate).
 */
export function calculateAvailableQuantity(
  index: InventoryIndex,
  ingredientId: IngredientId,
  required: IngredientQuantity,
): AvailabilityResult {
  const entry = index.get(ingredientId);
  if (!entry) return { status: "none", available: 0, approximate: false };
  if (required.quantity === null) {
    return { status: "enough", available: 0, approximate: false };
  }

  const reqDim = dimensionOf(required.unit);
  let available = 0;
  let approximate = false;
  let incompatible = false;

  for (const [dim, baseAmount] of entry.known) {
    if (dim === reqDim) {
      available += baseAmount / toBase(1, required.unit);
      continue;
    }
    const baseUnit: Unit = dim === "mass" ? "g" : dim === "volume" ? "ml" : (dim.slice(6) as Unit);
    const approx = approximateConvert(baseAmount, baseUnit, required.unit, getIngredient(ingredientId));
    if (approx) {
      available += approx.value;
      approximate = true;
    } else {
      incompatible = true;
    }
  }

  const EPS = 1e-9;
  if (available + EPS >= required.quantity) return { status: "enough", available, approximate };
  if (entry.unknownCount > 0 || incompatible) return { status: "unknown-quantity", available, approximate };
  return { status: "insufficient", available, approximate };
}

/* ───────────────────────── Ingredient comparison ───────────────────────── */

export interface MatchContext {
  index: InventoryIndex;
  staples: Set<IngredientId>;
  excluded: Set<IngredientId>;
}

const STATUS_RANK: Record<AvailabilityResult["status"], number> = {
  enough: 0,
  "unknown-quantity": 1,
  insufficient: 2,
  none: 3,
};

function ingredientName(id: IngredientId, ri?: RecipeIngredient): string {
  if (ri?.displayName) return ri.displayName;
  return getIngredient(id)?.name ?? id;
}

function lower(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export function scaleRequired(ri: RecipeIngredient, factor: number): IngredientQuantity {
  return { quantity: ri.quantity === null ? null : ri.quantity * factor, unit: ri.unit };
}

function toMatch(
  ri: RecipeIngredient,
  required: IngredientQuantity,
  result: AvailabilityResult,
  ctx: MatchContext,
  ingredientId: IngredientId,
): IngredientMatch {
  const entry = ctx.index.get(ingredientId);
  const status: IngredientMatch["status"] =
    result.status === "none" ? "missing" : result.status === "unknown-quantity" ? "unknown-quantity" : result.status;
  const m: IngredientMatch = {
    ingredientId: ri.ingredientId,
    name: ingredientName(ri.ingredientId, ri),
    optional: Boolean(ri.optional || ri.toTaste),
    status,
    required,
    approximate: result.approximate || undefined,
    inventoryItemIds: entry?.itemIds ?? [],
    usesSoonItem: Boolean(entry?.soon) || undefined,
  };
  if (status === "insufficient" && required.quantity !== null) {
    m.shortfall = { quantity: Math.max(0, required.quantity - result.available), unit: required.unit };
  }
  return m;
}

/**
 * Compare every recipe ingredient with the inventory, trying recipe-approved
 * substitutions (and general near-identical swaps) when the original is
 * missing or short.
 */
export function compareRequiredIngredients(
  recipe: Pick<RecipeSummary, "ingredients" | "substitutions" | "servings">,
  ctx: MatchContext,
  servings: number = recipe.servings,
): IngredientMatch[] {
  const factor = recipe.servings > 0 && servings > 0 ? servings / recipe.servings : 1;
  return recipe.ingredients.map((ri) => {
    const required = scaleRequired(ri, factor);
    if (ctx.staples.has(ri.ingredientId)) {
      return {
        ingredientId: ri.ingredientId,
        name: ingredientName(ri.ingredientId, ri),
        optional: Boolean(ri.optional || ri.toTaste),
        status: "staple",
        required,
        inventoryItemIds: ctx.index.get(ri.ingredientId)?.itemIds ?? [],
      } satisfies IngredientMatch;
    }

    const direct = calculateAvailableQuantity(ctx.index, ri.ingredientId, required);
    if (direct.status === "enough") return toMatch(ri, required, direct, ctx, ri.ingredientId);

    // Try substitutions: recipe-specific first, then general ones.
    const subs: IngredientSubstitution[] = [
      ...recipe.substitutions.filter((s) => s.ingredientId === ri.ingredientId),
      ...GENERAL_SUBSTITUTIONS.filter(
        (g) => g.ingredientId === ri.ingredientId && !recipe.substitutions.some((s) => s.ingredientId === g.ingredientId && s.substituteId === g.substituteId),
      ),
    ];
    let best: { sub: IngredientSubstitution; result: AvailabilityResult; required: IngredientQuantity } | null = null;
    for (const sub of subs) {
      if (ctx.excluded.has(sub.substituteId)) continue; // never suggest an excluded/allergen ingredient
      const subRequired: IngredientQuantity = {
        quantity: required.quantity === null ? null : required.quantity * sub.ratio,
        unit: sub.unit ?? required.unit,
      };
      const res = ctx.staples.has(sub.substituteId)
        ? ({ status: "enough", available: 0, approximate: false } as AvailabilityResult)
        : calculateAvailableQuantity(ctx.index, sub.substituteId, subRequired);
      if (res.status === "none") continue;
      if (!best || STATUS_RANK[res.status] < STATUS_RANK[best.result.status]) best = { sub, result: res, required: subRequired };
    }

    if (best && STATUS_RANK[best.result.status] < STATUS_RANK[direct.status]) {
      const m = toMatch(ri, best.required, best.result, ctx, best.sub.substituteId);
      m.substitutedBy = {
        ingredientId: best.sub.substituteId,
        name: getIngredient(best.sub.substituteId)?.name ?? best.sub.substituteId,
        note: best.sub.note,
      };
      return m;
    }
    return toMatch(ri, required, direct, ctx, ri.ingredientId);
  });
}

export function getMissingIngredients(matches: IngredientMatch[]): IngredientMatch[] {
  return matches.filter((m) => !m.optional && m.status === "missing");
}

/* ───────────────────────── Recipe match & scoring ───────────────────────── */

export interface ScoreOptions {
  maxMinutes: number | null;
  favorites: Set<string>;
}

export function calculateRecipeMatch(
  recipe: RecipeSummary,
  ctx: MatchContext,
  opts: ScoreOptions,
  servings: number = recipe.servings,
): RecipeMatch {
  const matches = compareRequiredIngredients(recipe, ctx, servings);
  const essential = matches.filter((m) => !m.optional);
  const missing = essential.filter((m) => m.status === "missing");
  const insufficient = essential.filter((m) => m.status === "insufficient");
  const unknown = essential.filter((m) => m.status === "unknown-quantity");
  const essentialHave = essential.length - missing.length;
  const essentialTotal = essential.length;

  let readiness: Readiness = "ready";
  if (missing.length > 0) readiness = "missing";
  else if (insufficient.length > 0) readiness = "short";
  else if (unknown.length > 0) readiness = "check-quantities";

  const inInventory = matches.filter((m) => m.status !== "missing" && m.status !== "staple");
  const usesSoonMatches = inInventory.filter((m) => m.usesSoonItem);
  const usesSoon = usesSoonMatches.map((m) => m.substitutedBy?.name ?? m.name);

  // ── Score ──
  const coverage = essentialTotal > 0 ? essentialHave / essentialTotal : 0;
  const coveragePts = 45 * coverage;
  const completenessPts = { ready: 20, "check-quantities": 12, short: 6, missing: 0 }[readiness];

  let expiryPts = 0;
  for (const m of usesSoonMatches) {
    const entry = ctx.index.get(m.substitutedBy?.ingredientId ?? m.ingredientId);
    if (entry?.soon === "use-by") expiryPts += 8;
    else if (entry?.soon === "best-before") expiryPts += 5;
  }
  for (const m of inInventory) {
    if (ctx.index.get(m.substitutedBy?.ingredientId ?? m.ingredientId)?.leftover) expiryPts += 4;
  }
  expiryPts = Math.min(15, expiryPts);

  let timePts: number;
  if (opts.maxMinutes && opts.maxMinutes > 0) {
    timePts = recipe.totalMinutes <= opts.maxMinutes ? 10 : Math.max(0, 10 - (recipe.totalMinutes - opts.maxMinutes) / 3);
  } else {
    timePts = recipe.totalMinutes <= 15 ? 10 : recipe.totalMinutes <= 30 ? 8 : recipe.totalMinutes <= 45 ? 5 : 2;
  }

  const optionalHave = matches.filter((m) => m.optional && (m.status === "enough" || m.status === "unknown-quantity")).length;
  const prefPts = Math.min(
    10,
    (opts.favorites.has(recipe.id) ? 5 : 0) + (recipe.difficulty === "easy" ? 3 : 0) + Math.min(3, optionalHave),
  );

  const penalties = missing.length * 8 + insufficient.length * 3;
  const nothingMatched = inInventory.length === 0;
  const raw = nothingMatched ? 0 : coveragePts + completenessPts + expiryPts + timePts + prefPts - penalties;
  const score = Math.max(0, Math.round(raw * 10) / 10);

  return {
    recipeId: recipe.id,
    slug: recipe.slug,
    score,
    readiness,
    essentialTotal,
    essentialHave,
    missing,
    insufficient,
    matches,
    usesSoon,
    explanation: buildExplanation({ recipe, readiness, essentialHave, essentialTotal, missing, insufficient, matches, usesSoon }),
  };
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function buildExplanation(p: {
  recipe: RecipeSummary;
  readiness: Readiness;
  essentialHave: number;
  essentialTotal: number;
  missing: IngredientMatch[];
  insufficient: IngredientMatch[];
  matches: IngredientMatch[];
  usesSoon: string[];
}): string[] {
  const out: string[] = [];
  out.push(`You have ${p.essentialHave} of ${p.essentialTotal} ingredients.`);
  if (p.missing.length) out.push(`Missing: ${joinNames(p.missing.map((m) => lower(m.name)))}.`);
  for (const m of p.insufficient) {
    if (m.shortfall) {
      out.push(`Need another ${formatQuantity(m.shortfall, getIngredient(m.substitutedBy?.ingredientId ?? m.ingredientId))} ${lower(m.substitutedBy?.name ?? m.name)}.`);
    }
  }
  if (p.readiness === "check-quantities") out.push("Ingredients match — check quantities.");
  for (const m of p.matches) {
    if (m.substitutedBy && m.status !== "missing") out.push(`Using ${lower(m.substitutedBy.name)} instead of ${lower(m.name)}.`);
  }
  if (p.usesSoon.length) out.push(`Uses your ${joinNames(p.usesSoon.map(lower))} – use soon.`);
  if (p.matches.some((m) => m.approximate)) out.push("Some amounts estimated from typical sizes.");
  out.push(`Ready in ${p.recipe.totalMinutes} minutes.`);
  return out;
}

/* ───────────────────────── Filtering & ranking ───────────────────────── */

export interface PreferenceFilterResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Hard filters. Diet labels are derived from ingredient data. A recipe is
 * removed if any non-optional ingredient is excluded; optional excluded
 * ingredients are simply flagged to leave out.
 */
export function checkRecipeAgainstPreferences(
  recipe: Pick<RecipeSummary, "dietaryTags" | "ingredients" | "equipment">,
  prefs: Pick<UserPreferences, "diets" | "excludedIngredients" | "equipment">,
): PreferenceFilterResult {
  for (const diet of prefs.diets) {
    if (!recipe.dietaryTags.includes(diet)) return { allowed: false, reason: `Not ${diet}` };
  }
  const excluded = new Set(prefs.excludedIngredients);
  const blocked = recipe.ingredients.find((ri) => !ri.optional && !ri.toTaste && excluded.has(ri.ingredientId));
  if (blocked) return { allowed: false, reason: `Contains ${getIngredient(blocked.ingredientId)?.name ?? blocked.ingredientId}` };
  if (prefs.equipment.length > 0) {
    const missingEquipment = recipe.equipment.find((e) => !prefs.equipment.includes(e));
    if (missingEquipment) return { allowed: false, reason: `Needs ${missingEquipment}` };
  }
  return { allowed: true };
}

export function filterRecipesByPreferences<T extends Pick<RecipeSummary, "dietaryTags" | "ingredients" | "equipment">>(
  recipes: T[],
  prefs: Pick<UserPreferences, "diets" | "excludedIngredients" | "equipment">,
): T[] {
  return recipes.filter((r) => checkRecipeAgainstPreferences(r, prefs).allowed);
}

export function compareMatches(
  a: RecipeMatch,
  b: RecipeMatch,
  lookup: Map<string, Pick<RecipeSummary, "totalMinutes" | "title">>,
): number {
  const ra = lookup.get(a.recipeId);
  const rb = lookup.get(b.recipeId);
  return (
    b.score - a.score ||
    a.missing.length - b.missing.length ||
    (ra?.totalMinutes ?? 0) - (rb?.totalMinutes ?? 0) ||
    (ra?.title ?? "").localeCompare(rb?.title ?? "") ||
    a.recipeId.localeCompare(b.recipeId)
  );
}

export function rankRecipes(matches: RecipeMatch[], recipes: Pick<RecipeSummary, "id" | "totalMinutes" | "title">[]): RecipeMatch[] {
  const lookup = new Map(recipes.map((r) => [r.id, r]));
  return [...matches].sort((a, b) => compareMatches(a, b, lookup));
}

/* ───────────────────────── Top-level suggestion API ───────────────────────── */

export interface SuggestionOptions {
  today: string;
  favorites?: string[];
}

export interface SuggestionGroups {
  /** Ready, or all ingredients present with some quantities unknown. */
  canMake: RecipeMatch[];
  /** Missing only 1–2 essential ingredients (or a little short on quantity). */
  almost: RecipeMatch[];
  /** Uses several of your ingredients but needs more. */
  good: RecipeMatch[];
  /** Uses ingredients approaching their entered dates. */
  useSoon: RecipeMatch[];
  /** ≤ 20 minutes and close to ready. */
  quick: RecipeMatch[];
}

export interface SuggestionResult {
  ranked: RecipeMatch[];
  groups: SuggestionGroups;
  /** Recipes removed by hard preference filters. */
  filteredOut: number;
}

export function createMatchContext(inventory: InventoryItem[], prefs: Pick<UserPreferences, "pantryStaples" | "excludedIngredients">, today: string): MatchContext {
  return {
    index: buildInventoryIndex(inventory, today),
    staples: new Set(prefs.pantryStaples),
    excluded: new Set(prefs.excludedIngredients),
  };
}

export function suggestRecipesForInventory(
  recipes: RecipeSummary[],
  inventory: InventoryItem[],
  prefs: UserPreferences,
  opts: SuggestionOptions,
): SuggestionResult {
  const allowed = filterRecipesByPreferences(recipes, prefs);
  const ctx = createMatchContext(inventory, prefs, opts.today);
  const scoreOpts: ScoreOptions = { maxMinutes: prefs.maxMinutes, favorites: new Set(opts.favorites ?? []) };
  const lookup = new Map(recipes.map((r) => [r.id, r]));

  const all = allowed.map((r) => calculateRecipeMatch(r, ctx, scoreOpts));
  const relevant = all.filter((m) => m.matches.some((x) => x.status !== "missing" && x.status !== "staple"));
  const ranked = rankRecipes(relevant, recipes);

  const canMake = ranked.filter((m) => m.readiness === "ready" || m.readiness === "check-quantities");
  const almost = ranked.filter(
    (m) => (m.readiness === "missing" && m.missing.length <= 2) || m.readiness === "short",
  );
  const good = ranked.filter((m) => {
    if (m.readiness !== "missing" || m.missing.length <= 2) return false;
    const have = m.matches.filter((x) => !x.optional && x.status !== "missing" && x.status !== "staple").length;
    return have >= 2 && m.essentialHave / Math.max(1, m.essentialTotal) >= 0.4;
  });
  const useSoon = ranked.filter((m) => m.usesSoon.length > 0 && m.missing.length <= 2);
  const quick = ranked
    .filter((m) => (lookup.get(m.recipeId)?.totalMinutes ?? Infinity) <= 20 && m.missing.length <= 1)
    .sort((a, b) => (lookup.get(a.recipeId)!.totalMinutes - lookup.get(b.recipeId)!.totalMinutes) || compareMatches(a, b, lookup));

  return { ranked, groups: { canMake, almost, good, useSoon, quick }, filteredOut: recipes.length - allowed.length };
}
