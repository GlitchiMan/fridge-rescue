import type { Metadata } from "next";
import { FridgeDashboard } from "@/components/inventory/fridge-dashboard";
import { getRecipeSummaries } from "@/data/recipes";

export const metadata: Metadata = {
  title: "My Fridge",
  description: "Your personal kitchen inventory and daily meal ideas.",
  // Personal, browser-only page – keep it out of search results.
  robots: { index: false, follow: true },
  alternates: { canonical: "/my-fridge" },
};

export default function MyFridgePage() {
  return (
    <div className="container-page pt-10 sm:pt-16">
      <FridgeDashboard recipes={getRecipeSummaries()} />
    </div>
  );
}
