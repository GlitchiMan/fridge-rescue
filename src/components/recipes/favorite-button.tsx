"use client";

import { Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { cn } from "@/lib/utils/cn";

export function FavoriteButton({
  recipeId,
  title,
  variant = "icon",
  className,
}: {
  recipeId: string;
  title: string;
  variant?: "icon" | "button";
  className?: string;
}) {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const saved = hydrated && data.favorites.includes(recipeId);

  const toggle = () => {
    const nowSaved = kitchenStore.toggleFavorite(recipeId);
    if (nowSaved) track({ name: "recipe_saved", props: { slug: recipeId } });
    toast.show(nowSaved ? `Saved “${title}”` : `Removed “${title}” from saved`, {
      action: { label: "Undo", onClick: () => kitchenStore.toggleFavorite(recipeId) },
    });
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
          saved ? "border-coral/50 bg-coral-soft text-coral-ink" : "border-line-strong bg-white text-ink hover:border-forest",
          className,
        )}
      >
        <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
        {saved ? "Saved" : "Save recipe"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved recipes` : `Save ${title}`}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full bg-white/95 shadow-soft transition-transform hover:scale-105",
        saved ? "text-coral" : "text-muted hover:text-coral",
        className,
      )}
    >
      <Heart className={cn("size-5", saved && "fill-current")} aria-hidden />
    </button>
  );
}
