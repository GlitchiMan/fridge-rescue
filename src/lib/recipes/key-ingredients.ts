import { getIngredient } from "@/data/ingredients";
import type { RecipeIngredient } from "@/types";

/** Pantry basics that don't characterise a dish. */
export const BACKGROUND_INGREDIENT_IDS = new Set([
  "salt", "black-pepper", "water", "cooking-oil", "olive-oil", "sugar", "baking-powder", "baking-soda", "vanilla", "flour", "butter",
]);

/** The few ingredients that define the dish (safe for server and client). */
export function keyIngredientNames(ingredients: RecipeIngredient[], max = 3): string[] {
  return ingredients
    .filter((i) => !i.optional && !i.toTaste && !BACKGROUND_INGREDIENT_IDS.has(i.ingredientId))
    .map((i) => (getIngredient(i.ingredientId)?.name ?? i.ingredientId).replace(/ \(.*\)/, ""))
    .slice(0, max);
}
