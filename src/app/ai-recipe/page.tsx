import type { Metadata } from "next";
import { Suspense } from "react";
import { AiRecipeView } from "@/components/generate/ai-recipe-view";
import { Skeleton } from "@/components/ui/empty-state";

// Personal AI recipes are private to the visitor and never indexed.
export const metadata: Metadata = {
  title: "Your AI recipe",
  description: "A recipe Fridge AI created from your ingredients.",
  robots: { index: false, follow: false },
};

export default function AiRecipePage() {
  return (
    <div className="container-page pb-16 pt-8 sm:pt-12">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <AiRecipeView />
      </Suspense>
    </div>
  );
}
