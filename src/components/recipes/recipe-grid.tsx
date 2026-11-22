import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { RecipeMatch, RecipeSummary } from "@/types";
import { RecipeCard } from "./recipe-card";

/** Shared responsive grid for recipe cards. */
/**
 * Masonry-style columns: photo cards and compact text-first cards keep their
 * natural heights and stack without gaps – no stretched or empty boxes.
 */
export function recipeGridClass() {
  return "columns-1 gap-4 sm:columns-2 sm:gap-5 lg:columns-3 [&>li]:mb-4 [&>li]:break-inside-avoid sm:[&>li]:mb-5";
}

/**
 * `dense` rows (dashboard sections) swipe horizontally on phones so a page of
 * several sections stays short, and become a 2–3 column grid from tablet up.
 */
export const DENSE_LIST =
  "-mx-5 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:block sm:columns-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:columns-3 sm:[&>li]:mb-5 sm:[&>li]:break-inside-avoid";
export const DENSE_ITEM ="w-[80%] shrink-0 snap-start sm:w-auto";

export function RecipeGrid({
  items,
  recipes,
  limit,
  dense = false,
}: {
  items: RecipeMatch[];
  recipes: Map<string, RecipeSummary>;
  limit?: number;
  dense?: boolean;
}) {
  const list = limit ? items.slice(0, limit) : items;
  return (
    <ul className={dense ? DENSE_LIST : recipeGridClass()}>
      {list.map((m, i) => {
        const r = recipes.get(m.recipeId);
        if (!r) return null;
        return (
          <li key={m.recipeId} className={cn("animate-fade-up", dense && DENSE_ITEM)} style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
            <RecipeCard recipe={r} match={m} />
          </li>
        );
      })}
    </ul>
  );
}

export function ResultSection({
  id,
  title,
  description,
  children,
  count,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  count?: number;
}) {
  return (
    <section aria-labelledby={id} className="mt-12 first:mt-0">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id={id} className="section-title">
            {title}
          </h2>
          {description && <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-muted">{description}</p>}
        </div>
        {count !== undefined && <p className="text-sm tabular-nums text-muted">{count} {count === 1 ? "recipe" : "recipes"}</p>}
      </div>
      {children}
    </section>
  );
}
