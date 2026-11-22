"use client";

import Image from "next/image";
import { useState } from "react";
import { getIngredient } from "@/data/ingredients";
import { getRecipeImage } from "@/lib/images";
import { BACKGROUND_INGREDIENT_IDS as BACKGROUND_IDS, keyIngredientNames } from "@/lib/recipes/key-ingredients";
import { cn } from "@/lib/utils/cn";
import type { RecipeIngredient } from "@/types";

interface Props {
  slug: string;
  title: string;
  ingredients: RecipeIngredient[];
  sizes: string;
  priority?: boolean;
  /** Hide the ingredient caption on very small renderings. */
  compact?: boolean;
  className?: string;
  imageClassName?: string;
}

/**
 * Recipe photo with a consistent frame. The parent sets the aspect ratio.
 * - Real photo (public/images/recipes/<slug>.*): optimised by next/image and
 *   faded in over a neutral tone, so loading never shifts layout.
 * - No photo: an honest, neutral typographic panel – never a stand-in image.
 */
export function RecipeImage({ slug, title, ingredients, sizes, priority = false, compact = false, className, imageClassName }: Props) {
  const src = getRecipeImage(slug);
  const [loaded, setLoaded] = useState(false);
  const names = keyIngredientNames(ingredients);
  // A barely-there tint from the defining ingredient keeps placeholders from feeling identical.
  const key = ingredients.find((i) => !i.optional && !i.toTaste && !BACKGROUND_IDS.has(i.ingredientId));
  const tint = (key && getIngredient(key.ingredientId)?.color) || "#EFECE5";

  return (
    <div
      className={cn("relative overflow-hidden bg-cream-deep", className)}
      style={src ? undefined : { backgroundColor: `color-mix(in oklab, ${tint} 13%, #EFECE5)` }}
    >
      {src ? (
        <Image
          src={src}
          alt={`${title}, served`}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          className={cn("object-cover transition-opacity duration-500 ease-out", loaded ? "opacity-100" : "opacity-0", imageClassName)}
        />
      ) : (
        <div aria-hidden className={cn("absolute inset-0 flex flex-col justify-end p-4 sm:p-5", imageClassName)}>
          <span className="absolute inset-3 rounded-[0.5rem] border border-ink/[0.06]" />
          {!compact && names.length > 0 && (
            <span className="relative font-display text-[0.95rem] italic leading-snug text-ink/45">{names.join(" · ")}</span>
          )}
        </div>
      )}
    </div>
  );
}
