import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
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
    <div className="container-page pt-10 sm:pt-16">
      <PageHeader eyebrow="Saved" title="Your recipes" description="Favourites and meals you've cooked – saved in this browser." />
      <div className="mt-10">
        <SavedRecipes recipes={getRecipeSummaries()} />
      </div>
    </div>
  );
}
