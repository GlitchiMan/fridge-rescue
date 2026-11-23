"use client";

import { ChefHat, ShoppingBasket, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { IngredientPicker } from "@/components/ingredients/ingredient-picker";
import { ReadinessBadge } from "@/components/recipes/recipe-card";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getIngredient } from "@/data/ingredients";
import { GENERAL_SUBSTITUTIONS } from "@/data/substitutions";
import { getRecipeSummaries } from "@/data/recipes";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { detectIngredients, similarRecipes } from "@/lib/discover/detect";
import { calculateRecipeMatch, createMatchContext } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import { formatQuantity } from "@/lib/quantities/units";
import type { IngredientMatch, RecipeSummary } from "@/types";

/**
 * "Can I make this?" for a video or idea we only know the title of.
 * 1. Ingredients guessed from the title – unverified, and the user can fix them.
 * 2. Closest verified Fridge Rescue recipe.
 * 3. Exact comparison with the saved kitchen: have / short / missing + swaps.
 * 4. Missing items → shopping list.
 */
export function VideoMatchPanel({ video, onClose }: { video: { title: string }; onClose: () => void }) {
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const assistant = useAssistant();
  const recipes = useMemo(() => getRecipeSummaries(), []);
  const [ingredients, setIngredients] = useState<string[]>(() => detectIngredients(video.title));
  const similar = useMemo(() => similarRecipes(video.title, recipes, 3, ingredients), [video.title, recipes, ingredients]);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const chosen: RecipeSummary | undefined = similar.find((s) => s.recipe.id === chosenId)?.recipe ?? similar[0]?.recipe;
  const owned = new Set(data.inventory.map((i) => i.ingredientId));

  const match = useMemo(() => {
    if (!hydrated || !chosen) return null;
    const ctx = createMatchContext(data.inventory, data.preferences, todayIso());
    return calculateRecipeMatch(chosen, ctx, { maxMinutes: null, favorites: new Set() });
  }, [hydrated, chosen, data.inventory, data.preferences]);

  const essentials = match?.matches.filter((m) => !m.optional) ?? [];
  const have = essentials.filter((m) => m.status === "enough" || m.status === "staple" || m.status === "unknown-quantity");
  const short = essentials.filter((m) => m.status === "insufficient");
  const missing = essentials.filter((m) => m.status === "missing");

  const swapsFor = (m: IngredientMatch) =>
    [...(chosen?.substitutions ?? []), ...GENERAL_SUBSTITUTIONS]
      .filter((s) => s.ingredientId === m.ingredientId)
      .slice(0, 2)
      .map((s) => `${getIngredient(s.substituteId)?.name.toLowerCase() ?? s.substituteId}${owned.has(s.substituteId) ? " (you have it)" : ""}`);

  const addMissing = () => {
    if (!chosen) return;
    const items = [...missing, ...short];
    kitchenStore.addToShoppingList(
      items.map((x) => {
        const q = x.status === "insufficient" && x.shortfall ? x.shortfall : x.required;
        return { ingredientId: x.ingredientId, name: getIngredient(x.ingredientId)?.name ?? x.name, quantity: q.quantity, unit: q.unit, recipeId: chosen.id };
      }),
    );
    toast.show(`Added ${items.length} item${items.length === 1 ? "" : "s"} to your shopping list`);
  };

  return (
    <div className="space-y-5">
      {/* 1 · Title-based guess, correctable */}
      <section className="rounded-[0.75rem] bg-cream-deep px-4 py-3">
        <p className="text-sm font-medium">Ingredients we spotted in the title</p>
        <p className="mt-0.5 text-xs text-muted">Unverified – the creator&apos;s full list isn&apos;t available. Remove or add to correct it.</p>
        {ingredients.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {ingredients.map((id) => (
              <li key={id} className="animate-chip-in">
                <span className={`inline-flex min-h-8 items-center gap-1 rounded-[0.5rem] py-0.5 pl-2.5 pr-0.5 text-[0.8125rem] font-medium ${owned.has(id) ? "bg-forest text-white" : "bg-paper text-ink"}`}>
                  {getIngredient(id)?.name}
                  {owned.has(id) && <span className="text-white/70">· have</span>}
                  <button type="button" onClick={() => setIngredients((s) => s.filter((x) => x !== id))} aria-label={`Remove ${getIngredient(id)?.name}`} className="inline-flex size-7 items-center justify-center rounded-[0.375rem] opacity-70 hover:opacity-100">
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2.5">
          <IngredientPicker label="Add an ingredient from the video" hideLabel showChips={false} selected={ingredients} onAdd={(ids) => setIngredients((s) => Array.from(new Set([...s, ...ids])))} placeholder="Add an ingredient you saw in the video" inputId="video-match-add" />
        </div>
      </section>

      {/* 2 · Closest verified recipe */}
      {similar.length === 0 ? (
        <p className="text-sm text-muted">No close recipe in our collection yet – try adding the main ingredients above.</p>
      ) : (
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Closest verified recipe</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {similar.map(({ recipe }) => (
              <button
                key={recipe.id}
                type="button"
                aria-pressed={chosen?.id === recipe.id}
                onClick={() => setChosenId(recipe.id)}
                className={`min-h-9 rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium transition-colors ${chosen?.id === recipe.id ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft hover:border-ink/40"}`}
              >
                {recipe.title}
              </button>
            ))}
          </div>

          {/* 3 · Exact comparison with the kitchen */}
          {chosen && match && (
            <div className="mt-4 rounded-[0.75rem] border border-line bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/recipes/${chosen.slug}`} onClick={onClose} className="font-display text-[1.25rem] hover:text-accent">{chosen.title}</Link>
                <ReadinessBadge match={match} />
              </div>
              <p className="mt-0.5 text-xs text-muted">{chosen.totalMinutes} min · you have {match.essentialHave} of {match.essentialTotal} ingredients</p>
              <dl className="mt-3 space-y-2 text-[0.875rem]">
                {have.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-accent">In your kitchen</dt>
                    <dd className="text-ink-soft">{have.map((m) => `${m.substitutedBy ? `${m.substitutedBy.name.toLowerCase()} (for ${m.name.toLowerCase()})` : m.name.toLowerCase()}${m.status === "unknown-quantity" ? " – check amount" : ""}${m.status === "staple" ? " – pantry" : ""}`).join(", ")}</dd>
                  </div>
                )}
                {short.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-orange-ink">Not quite enough</dt>
                    <dd className="text-ink-soft">{short.map((m) => `${m.name.toLowerCase()} – need ${m.shortfall ? formatQuantity(m.shortfall, getIngredient(m.ingredientId)) : "more"}`).join(", ")}</dd>
                  </div>
                )}
                {missing.length > 0 && (
                  <div>
                    <dt className="text-xs font-semibold text-coral-ink">Missing</dt>
                    <dd>
                      <ul className="space-y-0.5 text-ink-soft">
                        {missing.map((m) => {
                          const swaps = swapsFor(m);
                          return (
                            <li key={m.ingredientId}>
                              {formatQuantity(m.required, getIngredient(m.ingredientId))} {m.name.toLowerCase()}
                              {swaps.length > 0 && <span className="text-muted"> · or use {swaps.join(" / ")}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
              {!data.inventory.length && <p className="mt-3 text-xs text-muted">Your kitchen is empty – add ingredients in <Link href="/my-fridge" onClick={onClose} className="link">My Fridge</Link> for an exact check.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/recipes/${chosen.slug}`} onClick={onClose} className={buttonClass("primary", "sm")}>Cook this recipe</Link>
                {missing.length + short.length > 0 && (
                  <button type="button" onClick={addMissing} className={buttonClass("secondary", "sm")}>
                    <ShoppingBasket className="size-3.5" aria-hidden /> Add {missing.length + short.length} to shopping list
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button
          type="button"
          className={buttonClass("ghost", "sm")}
          onClick={() => {
            onClose();
            assistant.open({ message: `Make something like “${video.title}” with my ingredients`, videoTitle: video.title });
          }}
        >
          <ChefHat className="size-3.5" aria-hidden /> Ask Fridge AI to adapt it
        </button>
      </div>
    </div>
  );
}
