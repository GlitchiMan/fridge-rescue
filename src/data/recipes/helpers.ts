import type { Recipe, RecipeIngredient, RecipeStep, Unit } from "@/types";

type IngredientOpts = Partial<Pick<RecipeIngredient, "optional" | "toTaste" | "preparationNote" | "displayName">>;

/** Recipe ingredient shorthand. */
export function I(ingredientId: string, quantity: number, unit: Unit, opts: IngredientOpts = {}): RecipeIngredient {
  return { ingredientId, quantity, unit, ...opts };
}

/** "To taste" seasoning — no fixed quantity, never blocks readiness. */
export function taste(ingredientId: string, unit: Unit = "pinch", opts: IngredientOpts = {}): RecipeIngredient {
  return { ingredientId, quantity: null, unit, toTaste: true, ...opts };
}

export function S(text: string, timerMinutes?: number): RecipeStep {
  return timerMinutes ? { text, timerMinutes } : { text };
}

export type RecipeInput = Omit<Recipe, "id" | "totalMinutes"> & { totalMinutes?: number };

/** Fills in derived fields. totalMinutes defaults to prep + cook. */
export function defineRecipe(input: RecipeInput): Recipe {
  return {
    ...input,
    id: input.slug,
    totalMinutes: input.totalMinutes ?? input.prepMinutes + input.cookMinutes,
  };
}
