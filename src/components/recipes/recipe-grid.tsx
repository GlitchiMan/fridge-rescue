import type { ReactNode } from "react";
import type { RecipeMatch, RecipeSummary } from "@/types";
import { RecipeCard } from "./recipe-card";

export function RecipeGrid({
  items,
  recipes,
  limit,
}: {
  items: RecipeMatch[];
  recipes: Map<string, RecipeSummary>;
  limit?: number;
}) {
  const list = limit ? items.slice(0, limit) : items;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((m) => {
        const r = recipes.get(m.recipeId);
        if (!r) return null;
        return (
          <li key={m.recipeId} className="flex animate-fade-up [&>article]:flex-1">
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
  icon,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <div className="mb-4 flex items-start gap-3">
        {icon && <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest">{icon}</span>}
        <div>
          <h2 id={id} className="text-2xl font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
