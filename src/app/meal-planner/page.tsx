import type { Metadata } from "next";
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
    <div className="container-page py-8 sm:py-12">
      <p className="eyebrow">Plan</p>
      <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">This week&apos;s meals</h1>
      <p className="mt-2 text-lg text-muted">Plan around what you have, then add only what&apos;s missing to your list.</p>
      <div className="mt-8">
        <MealPlanner recipes={getRecipeSummaries()} />
      </div>
    </div>
  );
}
