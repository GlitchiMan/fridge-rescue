import { getIngredient } from "@/data/ingredients";
import { GENERAL_SUBSTITUTIONS } from "@/data/substitutions";
import { calculateRecipeMatch, checkRecipeAgainstPreferences, compareMatches, createMatchContext } from "@/lib/matching/engine";
import { normalizeIngredientName } from "@/lib/matching/ingredient-search";
import type { InventoryItem, RecipeMatch, RecipeSummary, UserPreferences } from "@/types";
import { parseQuestion, type AssistantQuery } from "./intent";

/**
 * The assistant's deterministic engine. Every answer is built from real recipe
 * records and the existing matching engine – nothing is invented. The AI layer
 * (optional) can only re-word and choose among these candidates.
 */
export interface AssistantPick {
  recipeId: string;
  slug: string;
  title: string;
  totalMinutes: number;
  readiness: RecipeMatch["readiness"] | null;
  essentialHave: number | null;
  essentialTotal: number;
  missing: string[];
  usesSoon: string[];
  substitutions: { forName: string; useName: string; note: string }[];
  reason: string;
}

export interface AssistantDraft {
  title: string;
  assumptions: string[];
  ingredients: string[];
  steps: string[];
}

export interface AssistantAnswer {
  mode: "local" | "ai";
  text: string;
  picks: AssistantPick[];
  notes: string[];
  followUps: string[];
  /** Search phrase for videos when the user asked for them. */
  videoQuery: string | null;
  showTrending: boolean;
  /** AI-only: an unverified idea for a dish we don't have. */
  draft: AssistantDraft | null;
  usedKitchen: boolean;
}

export interface AssistantContext {
  recipes: RecipeSummary[];
  /** Only present when the user allowed the assistant to read their kitchen. */
  inventory: InventoryItem[] | null;
  preferences: Pick<UserPreferences, "diets" | "excludedIngredients" | "equipment" | "maxMinutes" | "pantryStaples">;
  favorites: string[];
  today: string;
}

const SPICY = new Set(["chili-flakes", "hot-sauce", "curry-powder", "garam-masala", "salsa"]);
const PROTEIN_CATEGORIES = new Set(["meat", "fish", "eggs", "legumes"]);
const PROTEIN_IDS = new Set(["chickpeas", "tuna", "greek-yogurt", "red-lentils", "black-beans", "kidney-beans", "tofu"]);

const essentials = (r: RecipeSummary) => r.ingredients.filter((i) => !i.optional && !i.toTaste);
const nameOf = (id: string) => (getIngredient(id)?.name ?? id).replace(/ \(.*\)/, "").toLowerCase();

function isHighProtein(r: RecipeSummary) {
  return essentials(r).some((i) => PROTEIN_IDS.has(i.ingredientId) || PROTEIN_CATEGORIES.has(getIngredient(i.ingredientId)?.category ?? ""));
}
function isSpicy(r: RecipeSummary) {
  return r.ingredients.some((i) => SPICY.has(i.ingredientId));
}

/** A recipe the question names directly ("make the tomato soup without milk"). */
export function findNamedRecipe(message: string, recipes: RecipeSummary[]): RecipeSummary | null {
  // Words after "without…" are exclusions, so they can't name the dish.
  const text = normalizeIngredientName(message.split(/\b(?:without|minus|skip|no)\b/i)[0] ?? "");
  let best: { r: RecipeSummary; hits: number } | null = null;
  for (const r of recipes) {
    const words = normalizeIngredientName(r.title).split(" ").filter((w) => w.length > 3 && !["easy", "simple", "quick", "classic", "style"].includes(w));
    if (!words.length) continue;
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits >= Math.min(2, words.length) && (!best || hits > best.hits)) best = { r, hits };
  }
  return best?.r ?? null;
}

function substitutionsFor(recipe: RecipeSummary, ingredientIds: string[], excluded: Set<string>) {
  const out: AssistantPick["substitutions"] = [];
  for (const id of ingredientIds) {
    const subs = [...recipe.substitutions.filter((s) => s.ingredientId === id), ...GENERAL_SUBSTITUTIONS.filter((s) => s.ingredientId === id)];
    for (const s of subs) {
      if (excluded.has(s.substituteId) || out.some((o) => o.useName === nameOf(s.substituteId) && o.forName === nameOf(id))) continue;
      out.push({ forName: nameOf(id), useName: nameOf(s.substituteId), note: s.note });
    }
  }
  return out.slice(0, 3);
}

function toPick(recipe: RecipeSummary, match: RecipeMatch | null, reason: string, excluded: Set<string>): AssistantPick {
  const missingIds = match ? match.missing.map((m) => m.ingredientId) : [];
  return {
    recipeId: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    totalMinutes: recipe.totalMinutes,
    readiness: match?.readiness ?? null,
    essentialHave: match ? match.essentialHave : null,
    essentialTotal: essentials(recipe).length,
    missing: match ? match.missing.map((m) => m.name.toLowerCase()) : [],
    usesSoon: match?.usesSoon ?? [],
    substitutions: substitutionsFor(recipe, missingIds, excluded),
    reason,
  };
}

function joinList(items: string[]) {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Candidate recipes for a question, best first (also feeds the AI layer). */
export function rankCandidates(query: AssistantQuery, ctx: AssistantContext, limit = 10) {
  const avoid = new Set([...ctx.preferences.excludedIngredients, ...query.avoid]);
  const prefs = {
    diets: Array.from(new Set([...ctx.preferences.diets, ...query.diets])),
    excludedIngredients: Array.from(avoid),
    equipment: ctx.preferences.equipment,
  };
  const mentioned: InventoryItem[] = query.ingredients
    .filter((id) => !ctx.inventory?.some((i) => i.ingredientId === id))
    .map((id) => {
      const ing = getIngredient(id)!;
      return { id: `ask-${id}`, ingredientId: id, displayName: ing.name, quantity: null, unit: ing.defaultUnit, location: ing.defaultLocation, addedAt: "" };
    });
  const inventory = [...(ctx.inventory ?? []), ...mentioned];
  const maxMinutes = query.maxMinutes ?? ctx.preferences.maxMinutes ?? null;

  const pool = ctx.recipes.filter((r) => {
    if (!checkRecipeAgainstPreferences(r, prefs).allowed) return false;
    if (query.noOven && r.equipment.includes("oven")) return false;
    if (query.maxMinutes && r.totalMinutes > query.maxMinutes) return false;
    if (query.fewIngredients && essentials(r).length > 5) return false;
    if (query.leftovers && !r.categories.includes("leftovers")) return false;
    if (query.highProtein && !isHighProtein(r)) return false;
    if (query.spicy && !isSpicy(r)) return false;
    if (query.meal && !r.categories.includes(query.meal)) return false;
    return true;
  });
  // Special occasions: favour the more involved dishes first.
  const effort = (r: RecipeSummary) => (query.special ? (r.difficulty === "easy" ? 1 : 0) : 0);

  const lookup = new Map(ctx.recipes.map((r) => [r.id, r]));
  if (inventory.length) {
    const mctx = createMatchContext(inventory, { pantryStaples: ctx.preferences.pantryStaples, excludedIngredients: Array.from(avoid) }, ctx.today);
    const favs = new Set(ctx.favorites);
    const scored = pool
      .map((r) => ({ r, m: calculateRecipeMatch(r, mctx, { maxMinutes, favorites: favs }, query.servings ?? r.servings) }))
      .filter(({ m }) => m.matches.some((x) => x.status !== "missing" && x.status !== "staple"))
      .sort((a, b) => effort(a.r) - effort(b.r) || compareMatches(a.m, b.m, lookup));
    return { scored: scored.slice(0, limit), inventoryUsed: inventory.length, avoid };
  }
  // No ingredients at all: favourites first, then fastest and easiest.
  const fav = new Set(ctx.favorites);
  const scored = [...pool]
    .sort((a, b) => effort(a) - effort(b) || Number(fav.has(b.id)) - Number(fav.has(a.id)) || (query.healthy ? Number(b.categories.includes("vegetarian")) - Number(a.categories.includes("vegetarian")) : 0) || a.totalMinutes - b.totalMinutes || a.title.localeCompare(b.title))
    .map((r) => ({ r, m: null as RecipeMatch | null }));
  return { scored: scored.slice(0, limit), inventoryUsed: 0, avoid };
}

export function answerLocally(message: string, ctx: AssistantContext, pickLimit = 4): AssistantAnswer {
  const query = parseQuestion(message);
  const notes: string[] = [];
  const base: Omit<AssistantAnswer, "text" | "picks"> = {
    mode: "local",
    notes,
    followUps: [],
    videoQuery: null,
    showTrending: query.wantsTrending,
    draft: null,
    usedKitchen: Boolean(ctx.inventory?.length),
  };

  // "How can I make <recipe> without <ingredient>?"
  const named = query.avoid.length ? findNamedRecipe(message, ctx.recipes) : null;
  if (named) {
    const excluded = new Set(ctx.preferences.excludedIngredients);
    const subs = substitutionsFor(named, query.avoid, excluded);
    const pick = toPick(named, null, subs.length ? "Swap suggestions below." : "No tested swap for that ingredient yet.", excluded);
    pick.substitutions = subs;
    const avoidNames = joinList(query.avoid.map(nameOf));
    return {
      ...base,
      text: subs.length
        ? `For ${named.title}, here's how to manage without ${avoidNames}:`
        : `We don't have a tested swap for ${avoidNames} in ${named.title}. Leaving it out may change the result – optional ingredients are safe to skip.`,
      picks: [pick],
      videoQuery: query.wantsVideos ? `${named.title} recipe` : null,
    };
  }

  const { scored, inventoryUsed, avoid } = rankCandidates(query, ctx, Math.max(6, pickLimit));
  const filters: string[] = [];
  if (query.maxMinutes) filters.push(`under ${query.maxMinutes} min`);
  if (query.diets.length) filters.push(query.diets.join(", "));
  if (query.noOven) filters.push("no oven");
  if (query.fewIngredients) filters.push("5 ingredients or fewer");
  if (query.highProtein) filters.push("high-protein");
  if (query.spicy) filters.push("with a kick");
  if (query.leftovers) filters.push("leftover-friendly");
  if (query.avoid.length) filters.push(`without ${joinList(query.avoid.map(nameOf))}`);
  if (query.meal) filters.push(query.meal);
  if (query.servings) filters.push(`for ${query.servings}`);
  if (query.special) filters.push("a little special");

  // "Surprise me": a random pick among the good matches (not always the top one).
  const ordered = query.surprise ? [...scored.slice(0, 8)].sort(() => Math.random() - 0.5) : scored;
  const wanted = Math.min(pickLimit, query.count ?? pickLimit);
  const picks = ordered.slice(0, wanted).map(({ r, m }) => {
    let reason: string;
    if (m) {
      reason =
        m.readiness === "ready"
          ? "You have everything."
          : m.readiness === "check-quantities"
            ? "Ingredients match – check amounts."
            : m.missing.length
              ? `Missing ${joinList(m.missing.map((x) => x.name.toLowerCase()))}.`
              : "A little short on quantities.";
      if (m.usesSoon.length) reason += ` Uses your ${m.usesSoon[0]!.toLowerCase()} first.`;
    } else {
      reason = ctx.favorites.includes(r.id) ? "One of your saved recipes." : `Ready in ${r.totalMinutes} minutes.`;
    }
    return toPick(r, m, reason, avoid);
  });

  const have = query.ingredients.map(nameOf);
  let text: string;
  if (!picks.length) {
    text = `I couldn't find a recipe${filters.length ? ` that's ${filters.join(", ")}` : ""}${have.length ? ` using ${joinList(have)}` : ""}. Try fewer filters or add more ingredients.`;
  } else if (inventoryUsed) {
    const source = ctx.inventory?.length ? (have.length ? `your kitchen plus ${joinList(have)}` : "your kitchen") : joinList(have);
    text = `Here's what works best with ${source}${filters.length ? ` (${filters.join(", ")})` : ""}:`;
  } else {
    text = `Here are good options${filters.length ? ` – ${filters.join(", ")}` : ""}. Add ingredients or let me read your kitchen for better matches.`;
  }

  if (avoid.size && query.avoid.length) notes.push(`Left out recipes that need ${joinList(query.avoid.map(nameOf))}.`);
  if (picks.some((p) => p.readiness === "check-quantities")) notes.push("Amounts typed into a question aren't known, so check quantities.");
  if (query.wantsTrending) notes.push("Live trends come from the Trending tab – they're measured, never invented.");
  if (query.mentionsSocial) notes.push("TikTok and Instagram don't allow open video search, so videos come from YouTube.");
  if (query.servings) notes.push(`Ingredient checks are scaled to ${query.servings} servings.`);

  return {
    ...base,
    text,
    picks,
    videoQuery: query.wantsVideos ? (picks[0] ? `${picks[0].title} recipe` : have.length ? `${have.slice(0, 3).join(" ")} recipe` : "easy dinner recipe") : null,
    followUps: [picks[0] && !query.wantsVideos ? "Show me a video for the first one" : null, !query.maxMinutes ? "Something under 20 minutes" : null, !query.diets.length ? "Make it vegetarian" : null].filter((f): f is string => Boolean(f)),
  };
}
