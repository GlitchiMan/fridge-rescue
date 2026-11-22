import { INGREDIENTS, getIngredient } from "@/data/ingredients";
import type { Ingredient } from "@/types";

/**
 * Normalise free text for matching: lowercase, strip accents and punctuation,
 * collapse whitespace.
 */
export function normalizeIngredientName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Very small singulariser for search tolerance ("tomatoes" → "tomato"). */
function singular(word: string): string {
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

interface IndexEntry {
  ingredient: Ingredient;
  terms: string[];
}

const INDEX: IndexEntry[] = INGREDIENTS.map((ingredient) => {
  const raw = [ingredient.name, ingredient.id.replace(/-/g, " "), ...ingredient.aliases];
  if (ingredient.noun) raw.push(ingredient.noun.one, ingredient.noun.other);
  const terms = Array.from(new Set(raw.map(normalizeIngredientName).filter(Boolean)));
  return { ingredient, terms };
});

const ALIAS_MAP = new Map<string, Ingredient>();
for (const entry of INDEX) {
  for (const term of entry.terms) {
    // First writer wins → catalog order defines precedence for shared aliases.
    if (!ALIAS_MAP.has(term)) ALIAS_MAP.set(term, entry.ingredient);
    const s = singular(term);
    if (!ALIAS_MAP.has(s)) ALIAS_MAP.set(s, entry.ingredient);
  }
}
// Canonical names always win for their own exact name.
for (const entry of INDEX) {
  ALIAS_MAP.set(normalizeIngredientName(entry.ingredient.name), entry.ingredient);
}

/** Exact lookup by id, name or alias (synonym aware). */
export function findIngredientByAlias(input: string): Ingredient | undefined {
  const direct = getIngredient(input);
  if (direct) return direct;
  const n = normalizeIngredientName(input);
  if (!n) return undefined;
  return ALIAS_MAP.get(n) ?? ALIAS_MAP.get(singular(n));
}

export interface IngredientSuggestion {
  ingredient: Ingredient;
  /** The alias that matched, if it differs from the display name. */
  matchedAlias?: string;
  score: number;
}

/**
 * Ranked autocomplete. Prefix matches beat word-prefix matches beat substring
 * matches; ties broken by catalog order (stable and deterministic).
 */
export function searchIngredients(query: string, limit = 8, exclude: Set<string> = new Set()): IngredientSuggestion[] {
  const q = normalizeIngredientName(query);
  if (!q) return [];
  const qs = singular(q);
  const results: (IngredientSuggestion & { order: number })[] = [];

  INDEX.forEach((entry, order) => {
    if (exclude.has(entry.ingredient.id)) return;
    let best = 0;
    let matched: string | undefined;
    for (const term of entry.terms) {
      let s = 0;
      if (term === q || term === qs) s = 100;
      else if (term.startsWith(q)) s = 80 - Math.min(term.length - q.length, 20) * 0.5;
      else if (term.split(" ").some((w) => w.startsWith(q))) s = 60;
      else if (q.length >= 3 && term.includes(q)) s = 40;
      if (s > best) {
        best = s;
        matched = term;
      }
    }
    if (best > 0) {
      const name = normalizeIngredientName(entry.ingredient.name);
      const idTerm = entry.ingredient.id.replace(/-/g, " ");
      // Small boost when the canonical name or id itself matched.
      if (matched === name || matched === idTerm) best += 5;
      results.push({
        ingredient: entry.ingredient,
        matchedAlias: matched !== name ? matched : undefined,
        score: best,
        order,
      });
    }
  });

  results.sort((a, b) => b.score - a.score || a.order - b.order);
  return results.slice(0, limit).map(({ ingredient, matchedAlias, score }) => ({ ingredient, matchedAlias, score }));
}
