import { describe, expect, it } from "vitest";
import { getIngredient } from "@/data/ingredients";
import { findIngredientByAlias, normalizeIngredientName, searchIngredients } from "@/lib/matching/ingredient-search";
import {
  approximateConvert,
  areUnitsCompatible,
  convertCompatibleUnits,
  formatQuantity,
  normalizeForDisplay,
  scaleQuantity,
} from "@/lib/quantities/units";

describe("ingredient normalisation & synonyms", () => {
  it("normalises case, accents and punctuation", () => {
    expect(normalizeIngredientName("  Crème   Fraîche! ")).toBe("creme fraiche");
  });

  it.each([
    ["capsicum", "bell-pepper"],
    ["bell pepper", "bell-pepper"],
    ["scallion", "spring-onion"],
    ["spring onion", "spring-onion"],
    ["garbanzo beans", "chickpeas"],
    ["Chickpeas", "chickpeas"],
    ["courgette", "zucchini"],
    ["Tomatoes", "tomato"],
    ["eggs", "egg"],
    ["cilantro", "cilantro"],
    ["minced beef", "ground-beef"],
  ])("%s → %s", (input, id) => {
    expect(findIngredientByAlias(input)?.id).toBe(id);
  });

  it("returns undefined for unknown text", () => {
    expect(findIngredientByAlias("unobtainium")).toBeUndefined();
    expect(findIngredientByAlias("")).toBeUndefined();
  });

  it("autocompletes 'tom' with tomato products", () => {
    const ids = searchIngredients("tom", 10).map((s) => s.ingredient.id);
    expect(ids[0]).toBe("tomato");
    expect(ids).toEqual(expect.arrayContaining(["tomato", "cherry-tomatoes", "tomato-paste", "canned-tomatoes", "passata"]));
  });

  it("can exclude already-selected ingredients", () => {
    const ids = searchIngredients("egg", 10, new Set(["egg"])).map((s) => s.ingredient.id);
    expect(ids).not.toContain("egg");
  });
});

describe("unit conversion", () => {
  it("converts within a dimension", () => {
    expect(convertCompatibleUnits(1000, "g", "kg")).toBe(1);
    expect(convertCompatibleUnits(1, "l", "ml")).toBe(1000);
    expect(convertCompatibleUnits(1, "tbsp", "tsp")).toBe(3);
  });

  it("refuses to convert across dimensions", () => {
    expect(areUnitsCompatible("g", "ml")).toBe(false);
    expect(convertCompatibleUnits(1, "pcs", "g")).toBeNull();
    expect(convertCompatibleUnits(1, "can", "pcs")).toBeNull();
  });

  it("only approximates pieces ↔ grams with an explicit rule", () => {
    expect(approximateConvert(2, "pcs", "g", getIngredient("egg"))).toEqual({ value: 100, approximate: true });
    expect(approximateConvert(2, "pcs", "g", getIngredient("garlic"))).toBeNull();
  });

  it("scales and formats readable quantities", () => {
    expect(formatQuantity(scaleQuantity({ quantity: 400, unit: "g" }, 3), getIngredient("potato"))).toBe("1.2 kg");
    expect(formatQuantity({ quantity: 2, unit: "pcs" }, getIngredient("egg"))).toBe("2 eggs");
    expect(formatQuantity({ quantity: 1, unit: "pcs" }, getIngredient("onion"))).toBe("1 onion");
    expect(formatQuantity({ quantity: 1.5, unit: "tbsp" })).toBe("1 ½ tbsp");
    expect(formatQuantity({ quantity: 0.5, unit: "tbsp" })).toBe("1 ½ tsp");
    expect(formatQuantity({ quantity: null, unit: "g" })).toBe("amount unknown");
    expect(formatQuantity({ quantity: 3, unit: "clove" })).toBe("3 cloves");
  });

  it("normalises large metric amounts", () => {
    expect(normalizeForDisplay({ quantity: 1500, unit: "ml" })).toEqual({ quantity: 1.5, unit: "l" });
  });
});
