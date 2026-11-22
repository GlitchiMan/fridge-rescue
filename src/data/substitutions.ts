import type { IngredientSubstitution } from "@/types";

/**
 * General substitutions that are safe in essentially every recipe in our
 * collection (near-identical ingredients). Anything more specific lives on the
 * individual recipe, because substitutions are recipe-aware.
 */
export const GENERAL_SUBSTITUTIONS: IngredientSubstitution[] = [
  { ingredientId: "cooking-oil", substituteId: "olive-oil", ratio: 1, note: "Olive oil works in place of neutral cooking oil." },
  { ingredientId: "olive-oil", substituteId: "cooking-oil", ratio: 1, note: "Any neutral cooking oil works in place of olive oil." },
  { ingredientId: "lemon-juice", substituteId: "lemon", ratio: 0.33, unit: "pcs", note: "Squeeze fresh lemon (about 3 tbsp juice per lemon)." },
  { ingredientId: "lemon-juice", substituteId: "lime", ratio: 0.5, unit: "pcs", note: "Fresh lime juice works in place of lemon juice." },
  { ingredientId: "greek-yogurt", substituteId: "yogurt", ratio: 1, note: "Plain yogurt works – it's a little thinner." },
  { ingredientId: "yogurt", substituteId: "greek-yogurt", ratio: 1, note: "Greek yogurt works – it's a little thicker." },
];
