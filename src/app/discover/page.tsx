import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverApp } from "@/components/discover/discover-app";
import { FEATURED_RECIPE_SLUGS, RECIPES, getRecipeSummaries, toSummary } from "@/data/recipes";
import { photoFirst } from "@/lib/images";

export const metadata: Metadata = {
  title: "Discover",
  description: "Personal meal ideas from your kitchen, fresh cooking videos and an assistant that knows what you have.",
  alternates: { canonical: "/discover" },
  // Personal, mostly client-rendered page – keep it out of search results.
  robots: { index: false, follow: true },
};

export default function DiscoverPage() {
  const recipes = getRecipeSummaries();
  const featured = photoFirst([
    ...FEATURED_RECIPE_SLUGS.map((s) => RECIPES.find((r) => r.slug === s)).filter((r) => r !== undefined),
    ...RECIPES.filter((r) => !FEATURED_RECIPE_SLUGS.includes(r.slug)),
  ].map(toSummary)).slice(0, 6);

  return (
    <div className="container-page pt-8 sm:pt-12">
      <Suspense fallback={<div className="h-96" />}>
        <DiscoverApp recipes={recipes} featured={featured} />
      </Suspense>
    </div>
  );
}
