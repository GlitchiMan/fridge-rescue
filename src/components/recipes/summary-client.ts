import { getRecipeDietaryTags } from "@/lib/recipes/dietary";
import type { Recipe, RecipeSummary } from "@/types";

/** Client-safe summary builder (avoids importing the full recipe database). */
export function toSummaryClient(recipe: Recipe): RecipeSummary {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    shortDescription: recipe.shortDescription,
    categories: recipe.categories,
    difficulty: recipe.difficulty,
    totalMinutes: recipe.totalMinutes,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    equipment: recipe.equipment,
    substitutions: recipe.substitutions,
    cuisine: recipe.cuisine,
    dietaryTags: getRecipeDietaryTags(recipe),
  };
}
