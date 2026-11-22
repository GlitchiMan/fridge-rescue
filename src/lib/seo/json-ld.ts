import { getIngredient } from "@/data/ingredients";
import { getRecipeImage } from "@/lib/images";
import { formatQuantity } from "@/lib/quantities/units";
import type { Recipe } from "@/types";
import { SITE_NAME, absoluteUrl } from "./site";

/** Serialise JSON-LD safely for embedding in a <script> tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

const iso = (m: number) => `PT${Math.max(0, Math.round(m))}M`;

export function ingredientLine(ri: Recipe["ingredients"][number]): string {
  const ing = getIngredient(ri.ingredientId);
  const name = (ri.displayName ?? ing?.name ?? ri.ingredientId).toLowerCase();
  if (ri.toTaste) return `${ing?.name ?? name} to taste`;
  const amount = formatQuantity({ quantity: ri.quantity, unit: ri.unit }, ing);
  const base = ri.unit === "pcs" && ing?.noun && !ri.displayName ? amount : `${amount} ${name}`;
  return `${base}${ri.preparationNote ? `, ${ri.preparationNote}` : ""}${ri.optional ? " (optional)" : ""}`;
}

/**
 * schema.org/Recipe. Only facts that are visible on the page: no ratings,
 * reviews or nutrition. `image` is included only when a real photo of this
 * recipe exists in public/images/recipes.
 */
export function recipeJsonLd(recipe: Recipe) {
  const photo = getRecipeImage(recipe.slug);
  return {
    ...(photo ? { image: [absoluteUrl(photo)] } : {}),
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.shortDescription,
    url: absoluteUrl(`/recipes/${recipe.slug}`),
    author: { "@type": "Organization", name: SITE_NAME },
    prepTime: iso(recipe.prepMinutes),
    cookTime: iso(recipe.cookMinutes),
    totalTime: iso(recipe.totalMinutes),
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: recipe.categories[0],
    recipeCuisine: recipe.cuisine,
    keywords: recipe.categories.join(", "),
    recipeIngredient: recipe.ingredients.map(ingredientLine),
    recipeInstructions: recipe.instructions.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s.text })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
