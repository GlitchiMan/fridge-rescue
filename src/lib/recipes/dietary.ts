import { getIngredient } from "@/data/ingredients";
import type { Allergen, DietaryTag, IngredientId, RecipeIngredient } from "@/types";

/**
 * Dietary labels are DERIVED from ingredient data, never hand-assigned.
 *
 * Conservative rules:
 * - All ingredients count, including optional ones. (A recipe whose optional
 *   feta topping contains dairy is not labelled dairy-free.)
 * - Any ingredient with gluten "maybe" (stock cubes, soy sauce, oats, sausages…)
 *   prevents the gluten-free label because many products contain gluten.
 * - Unknown ingredient ids prevent every label.
 */
export function getDietaryTagsForIngredients(ingredients: Pick<RecipeIngredient, "ingredientId">[]): DietaryTag[] {
  let vegetarian = true;
  let vegan = true;
  let dairyFree = true;
  let glutenFree = true;

  for (const ri of ingredients) {
    const ing = getIngredient(ri.ingredientId);
    if (!ing) return [];
    if (ing.animal === "meat" || ing.animal === "fish") vegetarian = false;
    if (ing.animal) vegan = false;
    if (ing.animal === "dairy" || ing.allergens?.includes("milk")) dairyFree = false;
    if (ing.gluten === true || ing.gluten === "maybe" || ing.allergens?.includes("gluten")) glutenFree = false;
  }
  if (!vegetarian) vegan = false;

  const tags: DietaryTag[] = [];
  if (vegetarian) tags.push("vegetarian");
  if (vegan) tags.push("vegan");
  if (dairyFree) tags.push("dairy-free");
  if (glutenFree) tags.push("gluten-free");
  return tags;
}

export function getRecipeDietaryTags(recipe: { ingredients: Pick<RecipeIngredient, "ingredientId">[] }): DietaryTag[] {
  return getDietaryTagsForIngredients(recipe.ingredients);
}

export interface AllergenInfo {
  /** Allergens present in required ingredients. */
  contains: Allergen[];
  /** Allergens only present in optional ingredients. */
  optionalOnly: Allergen[];
  /** Ingredients that may contain gluten depending on brand. */
  mayContainGluten: IngredientId[];
}

export function getRecipeAllergens(recipe: { ingredients: RecipeIngredient[] }): AllergenInfo {
  const req = new Set<Allergen>();
  const opt = new Set<Allergen>();
  const maybeGluten: IngredientId[] = [];
  for (const ri of recipe.ingredients) {
    const ing = getIngredient(ri.ingredientId);
    if (!ing) continue;
    for (const a of ing.allergens ?? []) (ri.optional ? opt : req).add(a);
    if (ing.gluten === "maybe") maybeGluten.push(ing.id);
  }
  for (const a of req) opt.delete(a);
  return { contains: [...req].sort(), optionalOnly: [...opt].sort(), mayContainGluten: maybeGluten };
}

export const DIETARY_LABELS: Record<DietaryTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "dairy-free": "Dairy-free",
  "gluten-free": "Gluten-free",
};

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  milk: "Milk",
  egg: "Egg",
  gluten: "Gluten (wheat)",
  fish: "Fish",
  shellfish: "Shellfish",
  soy: "Soy",
  peanuts: "Peanuts",
  "tree-nuts": "Tree nuts",
  sesame: "Sesame",
  mustard: "Mustard",
  celery: "Celery",
};
