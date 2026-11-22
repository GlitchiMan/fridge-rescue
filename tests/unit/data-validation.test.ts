/**
 * Content validation for the recipe database. Run with `npm run validate:data`.
 */
import { describe, expect, it } from "vitest";
import { INGREDIENTS, getIngredient } from "@/data/ingredients";
import { RECIPES } from "@/data/recipes";
import { GENERAL_SUBSTITUTIONS } from "@/data/substitutions";
import { getRecipeDietaryTags } from "@/lib/recipes/dietary";
import { normalizeIngredientName } from "@/lib/matching/ingredient-search";
import { DIFFICULTIES, EQUIPMENT, INGREDIENT_CATEGORIES, RECIPE_CATEGORIES, UNITS } from "@/types";

describe("ingredient catalog", () => {
  it("has unique ids", () => {
    const ids = INGREDIENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("uses valid categories and units", () => {
    for (const i of INGREDIENTS) {
      expect(INGREDIENT_CATEGORIES).toContain(i.category);
      expect(UNITS).toContain(i.defaultUnit);
      expect(i.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
  it("does not give two ingredients the same canonical name", () => {
    const names = INGREDIENTS.map((i) => normalizeIngredientName(i.name));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("recipe database", () => {
  it("has at least 40 recipes", () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(40);
  });

  it("has unique ids and slugs", () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
    expect(new Set(RECIPES.map((r) => r.slug)).size).toBe(RECIPES.length);
  });

  for (const r of RECIPES) {
    describe(r.slug, () => {
      it("has valid metadata", () => {
        expect(r.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(r.title.length).toBeGreaterThan(3);
        expect(r.shortDescription.length).toBeGreaterThan(20);
        expect(r.fullDescription.length).toBeGreaterThan(60);
        expect(DIFFICULTIES).toContain(r.difficulty);
        expect(r.categories.length).toBeGreaterThan(0);
        for (const c of r.categories) expect(RECIPE_CATEGORIES).toContain(c);
        for (const e of r.equipment) expect(EQUIPMENT).toContain(e);
      });

      it("has sensible times and servings", () => {
        expect(r.servings).toBeGreaterThanOrEqual(1);
        expect(r.servings).toBeLessThanOrEqual(12);
        expect(r.prepMinutes).toBeGreaterThanOrEqual(0);
        expect(r.cookMinutes).toBeGreaterThanOrEqual(0);
        expect(r.totalMinutes).toBeGreaterThan(0);
        expect(r.totalMinutes).toBeGreaterThanOrEqual(r.prepMinutes);
        expect(r.totalMinutes).toBeLessThanOrEqual(240);
      });

      it("references valid ingredients with positive quantities", () => {
        expect(r.ingredients.filter((i) => !i.optional && !i.toTaste).length).toBeGreaterThan(0);
        const seen = new Set<string>();
        for (const ri of r.ingredients) {
          expect(getIngredient(ri.ingredientId), ri.ingredientId).toBeDefined();
          expect(seen.has(ri.ingredientId), `duplicate ${ri.ingredientId}`).toBe(false);
          seen.add(ri.ingredientId);
          expect(UNITS).toContain(ri.unit);
          if (ri.quantity === null) expect(ri.toTaste).toBe(true);
          else expect(ri.quantity).toBeGreaterThan(0);
        }
      });

      it("has non-empty instructions and tips", () => {
        expect(r.instructions.length).toBeGreaterThanOrEqual(2);
        for (const s of r.instructions) {
          expect(s.text.trim().length).toBeGreaterThan(10);
          if (s.timerMinutes !== undefined) expect(s.timerMinutes).toBeGreaterThan(0);
        }
        expect(r.tips.length).toBeGreaterThan(0);
      });

      it("has valid substitutions", () => {
        const ids = new Set(r.ingredients.map((i) => i.ingredientId));
        for (const s of r.substitutions) {
          expect(ids.has(s.ingredientId), `${s.ingredientId} not in recipe`).toBe(true);
          expect(getIngredient(s.substituteId), s.substituteId).toBeDefined();
          expect(s.substituteId).not.toBe(s.ingredientId);
          expect(s.ratio).toBeGreaterThan(0);
          if (s.unit) expect(UNITS).toContain(s.unit);
        }
      });

      it("has no broken related recipe references", () => {
        const slugs = new Set(RECIPES.map((x) => x.id));
        for (const rel of r.relatedRecipes) {
          expect(slugs.has(rel), rel).toBe(true);
          expect(rel).not.toBe(r.id);
        }
      });

      it("is labelled consistently with its category tags", () => {
        const tags = getRecipeDietaryTags(r);
        if (r.categories.includes("vegetarian")) expect(tags).toContain("vegetarian");
      });

      it("mentions every non-staple essential ingredient in its instructions", () => {
        const text = r.instructions.map((s) => s.text.toLowerCase()).join(" ");
        const genericWords: Record<string, string[]> = {
          "cooking-oil": ["oil"], "olive-oil": ["oil"], "cooked-rice": ["rice"], "egg-noodles": ["noodles"],
          "canned-tomatoes": ["tomatoes"], "chicken-breast": ["chicken"], "cooked-chicken": ["chicken"],
          "red-onion": ["onion"], "spring-onion": ["spring onion"], "frozen-mixed-veg": ["vegetables"],
          "black-beans": ["beans"], "kidney-beans": ["beans"], "red-lentils": ["lentils"], "canned-tuna": ["tuna"],
          "greek-yogurt": ["yogurt"], "chicken-stock": ["stock"], "brown-sugar": ["sugar"], "lemon-juice": ["lemon"],
          "baking-powder": ["baking powder"], "baking-soda": ["baking soda"], "curry-powder": ["curry powder"],
          "garam-masala": ["garam masala"], "dried-thyme": ["thyme"], "dried-oregano": ["oregano"],
          "chili-flakes": ["chilli"], "sour-cream": ["sour cream"], "bell-pepper": ["pepper"], "cherry-tomatoes": ["tomatoes"],
          "coconut-milk": ["coconut milk"], "soy-sauce": ["soy"], "sesame-oil": ["sesame"], "maple-syrup": ["syrup"],
          "cream-cheese": ["cream cheese"], "frozen-peas": ["peas"], cilantro: ["coriander"], tortillas: ["tortilla"],
          oats: ["oats"], potato: ["potato"], banana: ["banana"], celery: ["celery"], salsa: ["salsa"],
        };
        for (const ri of r.ingredients) {
          if (ri.optional || ri.toTaste) continue;
          const name = getIngredient(ri.ingredientId)!.name.toLowerCase();
          const words = genericWords[ri.ingredientId] ?? [ri.ingredientId.replace(/-/g, " "), name];
          const found = words.some((w) => text.includes(w.toLowerCase())) || text.includes(name.split(" ")[0]!.replace(/s$/, ""));
          expect(found, `${r.slug}: instructions never mention ${ri.ingredientId}`).toBe(true);
        }
      });
    });
  }
});

describe("general substitutions", () => {
  it("reference real ingredients", () => {
    for (const s of GENERAL_SUBSTITUTIONS) {
      expect(getIngredient(s.ingredientId)).toBeDefined();
      expect(getIngredient(s.substituteId)).toBeDefined();
    }
  });
});
