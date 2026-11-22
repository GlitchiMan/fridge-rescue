"use client";

import { Check } from "lucide-react";
import { getIngredient } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { cn } from "@/lib/utils/cn";

export const STAPLE_SUGGESTIONS = ["salt", "black-pepper", "cooking-oil", "olive-oil", "butter", "sugar", "flour", "water"];

/** Lets users confirm pantry staples. Nothing is assumed unless they opt in. */
export function StaplesToggle({ compact = false }: { compact?: boolean }) {
  const { data } = useKitchen();
  const staples = data.preferences.pantryStaples;
  const toggle = (id: string) => {
    const next = staples.includes(id) ? staples.filter((s) => s !== id) : [...staples, id];
    kitchenStore.updatePreferences({ pantryStaples: next });
  };
  return (
    <fieldset>
      <legend className={cn("font-medium text-ink", compact ? "text-sm" : "text-[0.9375rem]")}>Pantry basics you always have</legend>
      {!compact && <p className="mt-0.5 text-sm text-muted">We only count these as available if you tick them.</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STAPLE_SUGGESTIONS.map((id) => {
          const ing = getIngredient(id);
          if (!ing) return null;
          const on = staples.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium transition-colors",
                on ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-ink-soft hover:border-ink/40 hover:text-ink",
              )}
            >
              {on && <Check className="size-3.5" aria-hidden strokeWidth={2.25} />}
              {ing.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
