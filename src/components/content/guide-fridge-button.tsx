"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { kitchenStore } from "@/hooks/use-kitchen";

export function GuideFridgeButton({ ingredientIds }: { ingredientIds: string[] }) {
  const toast = useToast();
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <button
        type="button"
        className={buttonClass("primary", "sm")}
        onClick={() => {
          const { added } = kitchenStore.quickAddIngredients(ingredientIds);
          toast.show(added.length ? `Added ${added.length} ingredient${added.length === 1 ? "" : "s"} to My Fridge` : "Already in My Fridge", { tone: added.length ? "success" : "info" });
        }}
      >
        <Plus className="size-4" aria-hidden /> Add them to My Fridge
      </button>
      <Link href="/my-fridge" className={buttonClass("secondary", "sm")}>See what I can make</Link>
    </div>
  );
}
