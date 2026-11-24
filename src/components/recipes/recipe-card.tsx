import { Clock } from "lucide-react";
import Link from "next/link";
import { getIngredient } from "@/data/ingredients";
import { IMAGE_SIZES, hasRecipeImage } from "@/lib/images";
import { cn } from "@/lib/utils/cn";
import type { Readiness, RecipeMatch, RecipeSummary } from "@/types";
import { FavoriteButton } from "./favorite-button";
import { keyIngredientNames } from "@/lib/recipes/key-ingredients";
import { RecipeImage } from "./recipe-image";

const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", advanced: "Advanced" } as const;

export function readinessLabel(m: Pick<RecipeMatch, "readiness" | "missing">): string {
  switch (m.readiness) {
    case "ready":
      return "Ready to cook";
    case "check-quantities":
      return "Ingredients match — check quantities";
    case "short":
      return "Need a little more";
    case "missing":
      return m.missing.length === 1 ? "You're only one ingredient away!" : `Missing ${m.missing.length} ingredients`;
  }
}

const READINESS_STYLE: Record<Readiness, { tag: string; dot: string; bar: string }> = {
  ready: { tag: "bg-forest text-white", dot: "bg-white", bar: "bg-forest" },
  "check-quantities": { tag: "bg-forest-50 text-accent", dot: "bg-forest", bar: "bg-forest" },
  short: { tag: "bg-orange-soft text-orange-ink", dot: "bg-orange", bar: "bg-orange" },
  missing: { tag: "bg-cream-deep text-ink-soft", dot: "bg-faint", bar: "bg-ink/40" },
};

export function ReadinessBadge({ match, className }: { match: Pick<RecipeMatch, "readiness" | "missing">; className?: string }) {
  const s = READINESS_STYLE[match.readiness];
  return (
    <span className={cn("tag", s.tag, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {readinessLabel(match)}
    </span>
  );
}

/** Ingredient match: a slim progress bar, count and what's missing. */
function MatchSummary({ match }: { match: RecipeMatch }) {
  const pct = match.essentialTotal ? Math.round((match.essentialHave / match.essentialTotal) * 100) : 0;
  const missing = match.missing.map((m) => m.name.toLowerCase());
  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden>
          <div className={cn("h-full rounded-full transition-[width] duration-500", READINESS_STYLE[match.readiness].bar)} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium tabular-nums text-ink-soft">
          {match.essentialHave}/{match.essentialTotal} ingredients
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <ReadinessBadge match={match} />
        {missing.length > 0 && (
          <span className="text-xs text-muted">
            Missing {missing.slice(0, 2).join(", ")}
            {missing.length > 2 ? ` +${missing.length - 2}` : ""}
          </span>
        )}
        {match.insufficient.length > 0 && missing.length === 0 && (
          <span className="text-xs text-muted">Need more {match.insufficient.map((m) => m.name.toLowerCase()).join(", ")}</span>
        )}
      </div>
    </div>
  );
}

function Meta({ recipe, className }: { recipe: RecipeSummary; className?: string }) {
  return (
    <p className={cn("flex items-center gap-1.5 text-[0.8125rem] text-muted", className)}>
      <Clock className="size-3.5" aria-hidden strokeWidth={1.75} />
      <span className="tabular-nums">{recipe.totalMinutes} min</span>
      <span aria-hidden className="text-faint">·</span>
      {DIFFICULTY_LABEL[recipe.difficulty]}
    </p>
  );
}

/**
 * Recipe card.
 * - With a photo (public/images/recipes/<slug>.*): compact, photo-led card.
 * - Without one: a slim text-first card – no empty image placeholder.
 * Shows only what helps choose: name, time, ingredient match, what's missing.
 */
export function RecipeCard({
  recipe,
  match,
  headingLevel = "h3",
  priority = false,
}: {
  recipe: RecipeSummary;
  match?: RecipeMatch;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
  /** @deprecated kept for compatibility; cards are one size now. */
  size?: "default" | "large";
}) {
  const Heading = headingLevel;
  const withPhoto = hasRecipeImage(recipe.slug);
  const soon = match && match.usesSoon.length > 0 ? match.usesSoon[0]!.toLowerCase() : null;

  const title = (
    <Heading className="font-display text-[1.25rem] leading-[1.18] tracking-[-0.015em] sm:text-[1.3125rem]">
      <Link
        href={`/recipes/${recipe.slug}`}
        prefetch={priority ? undefined : false}
        className="after:absolute after:inset-0 after:z-[1] after:content-[''] focus-visible:outline-none"
      >
        {recipe.title}
      </Link>
    </Heading>
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1rem] border border-line bg-paper transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_14px_32px_-18px_rgb(22_26_23_/_0.35)] has-[a:focus-visible]:outline has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-forest motion-reduce:hover:translate-y-0",
      )}
    >
      {withPhoto ? (
        <>
          <div className="relative">
            <RecipeImage
              slug={recipe.slug}
              title={recipe.title}
              ingredients={recipe.ingredients}
              sizes={IMAGE_SIZES.card}
              priority={priority}
              className="aspect-[3/2]"
              imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            />
            {soon && (
              <span className="tag absolute bottom-3 left-3 z-[2] bg-paper/95 text-orange-ink backdrop-blur">
                <span aria-hidden className="size-1.5 rounded-full bg-orange" />
                Uses your {soon}
              </span>
            )}
            <div className="absolute right-2.5 top-2.5 z-[2]">
              <FavoriteButton recipeId={recipe.id} title={recipe.title} />
            </div>
          </div>
          <div className="flex flex-1 flex-col p-4 sm:p-5">
            {title}
            <Meta recipe={recipe} className="mt-1.5" />
            {match && <MatchSummary match={match} />}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 pt-1.5" aria-hidden>
              {recipe.ingredients
                .filter((i) => !i.optional && !i.toTaste)
                .slice(0, 4)
                .map((i) => (
                  <span key={i.ingredientId} className="size-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: getIngredient(i.ingredientId)?.color }} />
                ))}
              <span className="ml-1 truncate font-display text-[0.875rem] italic text-muted">{keyIngredientNames(recipe.ingredients).join(" · ")}</span>
            </p>
            <div className="relative z-[2] -mr-1.5 -mt-1.5">
              <FavoriteButton recipeId={recipe.id} title={recipe.title} className="bg-cream" />
            </div>
          </div>
          <div className="mt-3">{title}</div>
          <Meta recipe={recipe} className="mt-1.5" />
          {soon && (
            <p className="mt-2 text-xs font-medium text-orange-ink">Uses your {soon}</p>
          )}
          {match && <MatchSummary match={match} />}
        </div>
      )}
    </article>
  );
}
