import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import type { RecipeMatch, RecipeSummary } from "@/types";
import { RecipeCard } from "./recipe-card";

/** Shared responsive grid for recipe cards. */
export function recipeGridClass() {
  return "grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
}

/**
 * `dense` rows (dashboard sections) swipe horizontally on phones so a page of
 * several sections stays short, and become a 2–3 column grid from tablet up.
 */
const DENSE_LIST =
  "-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3";
const DENSE_ITEM = "w-[78%] shrink-0 snap-start sm:w-auto";

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
          <li key={m.recipeId} className={cn("flex animate-fade-up [&>article]:flex-1", dense && DENSE_ITEM)} style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
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
    <section aria-labelledby={id} className="mt-16 first:mt-0">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line pb-4">
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
