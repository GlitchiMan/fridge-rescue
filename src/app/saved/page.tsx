import type { Metadata } from "next";
import { SavedRecipes } from "@/components/saved/saved-recipes";
import { getRecipeSummaries } from "@/data/recipes";

export const metadata: Metadata = {
  title: "Saved Recipes",
  description: "Your favourite recipes and cooking history.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/saved" },
};

export default function SavedPage() {
  return (
    <div className="container-page py-8 sm:py-12">
      <p className="eyebrow">Saved</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Your recipes</h1>
      <p className="mt-2 text-lg text-muted">Favourites and meals you&apos;ve cooked – saved in this browser.</p>
      <div className="mt-8">
        <SavedRecipes recipes={getRecipeSummaries()} />
      </div>
    </div>
  );
}
