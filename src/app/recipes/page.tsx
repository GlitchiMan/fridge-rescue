import type { Metadata } from "next";
import { Suspense } from "react";
import { AdSlot } from "@/components/ads/ad-slot";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeBrowser } from "@/components/recipes/recipe-browser";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { recipeGridClass } from "@/components/recipes/recipe-grid";
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
    <div className="container-page pt-10 sm:pt-16">
      <PageHeader
        eyebrow="Discover"
        title="Recipes"
        description={<>{recipes.length} original recipes built around everyday ingredients. Add ingredients to My Fridge and we&apos;ll show how close you are to each one.</>}
      />
      <div className="mt-8">
        <Suspense
          fallback={
            <ul className={recipeGridClass()}>
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
