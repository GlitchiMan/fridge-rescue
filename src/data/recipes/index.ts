import type { Recipe, RecipeSummary } from "@/types";
import { getRecipeDietaryTags } from "@/lib/recipes/dietary";
import { EGG_AND_BREAKFAST_RECIPES } from "./eggs-breakfast";
import { PASTA_AND_RICE_RECIPES } from "./pasta-rice";
import { POTATO_AND_SIDE_RECIPES } from "./potatoes-sides";
import { SANDWICH_AND_BAKING_RECIPES } from "./sandwiches-baking";
import { SOUP_AND_CURRY_RECIPES } from "./soups-curries";

export const RECIPES: Recipe[] = [
  ...EGG_AND_BREAKFAST_RECIPES,
  ...PASTA_AND_RICE_RECIPES,
  ...SOUP_AND_CURRY_RECIPES,
  ...POTATO_AND_SIDE_RECIPES,
  ...SANDWICH_AND_BAKING_RECIPES,
];

const BY_SLUG = new Map(RECIPES.map((r) => [r.slug, r]));
const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return BY_SLUG.get(slug);
}

export function getRecipeById(id: string): Recipe | undefined {
  return BY_ID.get(id);
}

export function toSummary(recipe: Recipe): RecipeSummary {
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

/** Summaries for client-side matching (no instructions/tips → smaller payload). */
export function getRecipeSummaries(): RecipeSummary[] {
  return RECIPES.map(toSummary);
}

export const FEATURED_RECIPE_SLUGS = [
  "potato-and-egg-skillet",
  "red-lentil-curry",
  "egg-fried-rice",
  "shakshuka-style-baked-eggs",
  "creamy-mushroom-pasta",
  "banana-bread",
];
