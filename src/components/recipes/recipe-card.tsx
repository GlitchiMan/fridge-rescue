import { AlertCircle, CheckCircle2, CircleHelp, Clock, Gauge, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Readiness, RecipeMatch, RecipeSummary } from "@/types";
import { cn } from "@/lib/utils/cn";
import { FavoriteButton } from "./favorite-button";
import { RecipeArt } from "./recipe-art";

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

const READINESS_STYLE: Record<Readiness, string> = {
  ready: "bg-forest text-white",
  "check-quantities": "bg-leaf-soft text-forest-800",
  short: "bg-orange-soft text-orange-ink",
  missing: "bg-cream-deep text-ink",
};

const READINESS_ICON = {
  ready: CheckCircle2,
  "check-quantities": CircleHelp,
  short: AlertCircle,
  missing: AlertCircle,
};

export function ReadinessBadge({ match, className }: { match: Pick<RecipeMatch, "readiness" | "missing">; className?: string }) {
  const Icon = READINESS_ICON[match.readiness];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", READINESS_STYLE[match.readiness], className)}>
      <Icon className="size-3.5" aria-hidden />
      {readinessLabel(match)}
    </span>
  );
}

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
}) {
  const Heading = headingLevel;
  const missingNames = match?.missing.map((m) => m.name.toLowerCase()) ?? [];
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <RecipeArt
          slug={recipe.slug}
          categories={recipe.categories}
          ingredients={recipe.ingredients}
          className="size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
        />
        {match && <ReadinessBadge match={match} className="absolute left-3 top-3 shadow-soft" />}
        {match && match.usesSoon.length > 0 && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-orange px-2.5 py-1 text-xs font-bold text-ink shadow-soft">
            <Sparkles className="size-3.5" aria-hidden /> Uses {match.usesSoon[0]!.toLowerCase()}
          </span>
        )}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton recipeId={recipe.id} title={recipe.title} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Heading className="text-lg font-semibold leading-snug">
          <Link
            href={`/recipes/${recipe.slug}`}
            prefetch={priority ? undefined : false}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-has-[:focus-visible]:underline"
          >
            {recipe.title}
          </Link>
        </Heading>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{recipe.shortDescription}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden />
            {recipe.totalMinutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="size-4" aria-hidden />
            {DIFFICULTY_LABEL[recipe.difficulty]}
          </span>
        </div>
        {match && (
          <div className="mt-3 border-t border-line pt-3 text-sm">
            <p className="font-semibold text-ink">
              You have {match.essentialHave} of {match.essentialTotal} ingredients
            </p>
            {missingNames.length > 0 && (
              <p className="mt-0.5 text-muted">
                <span className="font-semibold text-coral-ink">Missing:</span> {missingNames.slice(0, 3).join(", ")}
                {missingNames.length > 3 ? ` +${missingNames.length - 3} more` : ""}
              </p>
            )}
            {match.insufficient.length > 0 && missingNames.length === 0 && (
              <p className="mt-0.5 text-muted">Need more {match.insufficient.map((m) => m.name.toLowerCase()).join(", ")}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
