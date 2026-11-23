import { findIngredientByAlias, normalizeIngredientName } from "@/lib/matching/ingredient-search";
import type { RecipeSummary } from "@/types";

const STOP = new Set([
  "the", "a", "an", "and", "with", "for", "of", "in", "on", "my", "your", "to", "how", "make", "recipe", "recipes", "easy", "best",
  "quick", "simple", "minute", "minutes", "min", "homemade", "ever", "you", "this", "that", "is", "it", "at", "i", "me", "can", "what",
  "under", "something", "some", "dinner", "lunch", "breakfast", "meal", "meals", "food", "cook", "cooking", "video", "videos", "shorts",
]);

/**
 * Find catalogue ingredients mentioned in free text (a question or a video
 * title) by trying 3-, 2- and 1-word phrases against the synonym index.
 * Returns ids in order of first appearance; never guesses beyond the index.
 */
export function detectIngredients(text: string, max = 12): string[] {
  const words = normalizeIngredientName(text).split(" ").filter(Boolean);
  const found: string[] = [];
  const used = new Set<number>();
  for (const size of [3, 2, 1]) {
    for (let i = 0; i + size <= words.length; i++) {
      if (Array.from({ length: size }, (_, k) => i + k).some((k) => used.has(k))) continue;
      const phrase = words.slice(i, i + size).join(" ");
      if (size === 1 && STOP.has(phrase)) continue;
      const ing = findIngredientByAlias(phrase);
      if (ing && !found.includes(ing.id)) {
        found.push(ing.id);
        for (let k = i; k < i + size; k++) used.add(k);
      }
    }
  }
  return found.slice(0, max);
}

export interface RecipeSimilarity {
  recipe: RecipeSummary;
  score: number;
  sharedIngredients: string[];
}

/**
 * Closest Fridge Rescue recipes to a dish name (e.g. a social video title).
 * Based only on the words in the title – it is an estimate, never a claim
 * about the creator's actual ingredient list.
 */
export function similarRecipes(text: string, recipes: RecipeSummary[], limit = 3, ingredientOverride?: string[]): RecipeSimilarity[] {
  // The user can correct the detected ingredients; their list wins.
  const ingredients = new Set(ingredientOverride ?? detectIngredients(text));
  const words = new Set(normalizeIngredientName(text).split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
  return recipes
    .map((recipe) => {
      const shared = recipe.ingredients.filter((ri) => !ri.optional && ingredients.has(ri.ingredientId)).map((ri) => ri.ingredientId);
      const titleWords = normalizeIngredientName(recipe.title).split(" ");
      const titleHits = titleWords.filter((w) => words.has(w) || words.has(`${w}s`) || words.has(w.replace(/s$/, ""))).length;
      // A title containing every distinctive word is the same dish ("chicken fried rice").
      const fullTitleMatch = words.size >= 2 && Array.from(words).every((w) => titleWords.includes(w) || titleWords.includes(`${w}s`) || titleWords.includes(w.replace(/s$/, "")));
      return { recipe, score: shared.length * 3 + titleHits * 2 + (fullTitleMatch ? 6 : 0), sharedIngredients: Array.from(new Set(shared)) };
    })
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score || a.recipe.totalMinutes - b.recipe.totalMinutes || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, limit);
}
