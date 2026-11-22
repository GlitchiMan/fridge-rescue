import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { MealPlanner } from "@/components/planner/meal-planner";
import { getRecipeSummaries } from "@/data/recipes";

export const metadata: Metadata = {
  title: "Meal Planner",
  description: "Plan breakfast, lunch and dinner for the week around what's already in your fridge.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/meal-planner" },
};

export default function MealPlannerPage() {
  return (
    <div className="container-page pt-10 sm:pt-16">
      <PageHeader eyebrow="Plan" title="This week's meals" description="Plan around what you have, then add only what's missing to your list." />
      <div className="mt-8">
        <MealPlanner recipes={getRecipeSummaries()} />
      </div>
    </div>
  );
}
