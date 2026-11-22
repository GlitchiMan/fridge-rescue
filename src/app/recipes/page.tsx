import type { Metadata } from "next";
import { Suspense } from "react";
import { AdSlot } from "@/components/ads/ad-slot";
import { RecipeBrowser } from "@/components/recipes/recipe-browser";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { getRecipeSummaries } from "@/data/recipes";

export const metadata: Metadata = {
  title: "Recipes – cook with what you've got",
  description:
    "Browse original, easy recipes made from everyday ingredients. Filter by time, difficulty, diet and equipment, or match recipes against what's in your fridge.",
  alternates: { canonical: "/recipes" },
};

export default function RecipesPage() {
  const recipes = getRecipeSummaries();
  return (
    <div className="container-page py-8 sm:py-12">
      <p className="eyebrow">Discover</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Recipes</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        {recipes.length} original recipes built around everyday ingredients. Add ingredients to My Fridge and we&apos;ll show how close you are to each one.
      </p>
      <div className="mt-8">
        <Suspense
          fallback={
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((r) => (
                <li key={r.id} className="flex [&>article]:flex-1">
                  <RecipeCard recipe={r} />
                </li>
              ))}
            </ul>
          }
        >
          <RecipeBrowser recipes={recipes} />
        </Suspense>
      </div>
      <AdSlot slot="recipes-index" />
    </div>
  );
}
