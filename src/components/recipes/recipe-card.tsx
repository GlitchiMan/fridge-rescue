import Link from "next/link";
import { IMAGE_SIZES } from "@/lib/images";
import { cn } from "@/lib/utils/cn";
import type { Readiness, RecipeMatch, RecipeSummary } from "@/types";
import { FavoriteButton } from "./favorite-button";
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

const READINESS_STYLE: Record<Readiness, { tag: string; dot: string }> = {
  ready: { tag: "bg-forest text-white", dot: "bg-white" },
  "check-quantities": { tag: "bg-forest-50 text-forest", dot: "bg-forest" },
  short: { tag: "bg-orange-soft text-orange-ink", dot: "bg-orange" },
  missing: { tag: "bg-cream-deep text-ink-soft", dot: "bg-faint" },
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

export function RecipeCard({
  recipe,
  match,
  headingLevel = "h3",
  priority = false,
  size = "default",
}: {
  recipe: RecipeSummary;
  match?: RecipeMatch;
  headingLevel?: "h2" | "h3";
  priority?: boolean;
  size?: "default" | "large";
}) {
  const Heading = headingLevel;
  const large = size === "large";
  const missingNames = match?.missing.map((m) => m.name.toLowerCase()) ?? [];

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <RecipeImage
          slug={recipe.slug}
          title={recipe.title}
          ingredients={recipe.ingredients}
          sizes={large ? IMAGE_SIZES.cardLarge : IMAGE_SIZES.card}
          priority={priority}
          className={cn("rounded-[0.75rem]", large ? "aspect-[4/3] sm:aspect-[2/1] lg:aspect-[16/11]" : "aspect-[4/3]")}
          imageClassName="transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.025] motion-reduce:group-hover:scale-100"
        />
        {match && match.usesSoon.length > 0 && (
          <span className="tag absolute bottom-3 left-3 bg-white/95 text-orange-ink backdrop-blur">
            <span aria-hidden className="size-1.5 rounded-full bg-orange" />
            Uses your {match.usesSoon[0]!.toLowerCase()}
          </span>
        )}
        <div className="absolute right-2.5 top-2.5 z-10">
          <FavoriteButton recipeId={recipe.id} title={recipe.title} />
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-[0.75rem] font-medium uppercase tracking-[0.1em] text-muted">
          {recipe.totalMinutes} min <span aria-hidden className="mx-1 text-faint">/</span> {DIFFICULTY_LABEL[recipe.difficulty]}
        </p>
        <Heading className={cn("mt-1.5 font-display leading-[1.15] tracking-[-0.015em]", large ? "text-[1.75rem] sm:text-[2rem]" : "text-[1.3125rem]")}>
          <Link
            href={`/recipes/${recipe.slug}`}
            prefetch={priority ? undefined : false}
            className="decoration-ink/30 underline-offset-[0.18em] after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline group-has-[:focus-visible]:underline"
          >
            {recipe.title}
          </Link>
        </Heading>
        <p className={cn("mt-1.5 text-muted", large ? "max-w-xl text-[1rem] leading-relaxed" : "line-clamp-2 text-[0.875rem] leading-relaxed")}>
          {recipe.shortDescription}
        </p>

        {match && (
          <div className="mt-auto pt-4">
            <div className="hairline-top pt-3">
              <ReadinessBadge match={match} />
              <p className="mt-2 text-[0.8125rem] text-ink-soft">
                You have {match.essentialHave} of {match.essentialTotal} ingredients
                {missingNames.length > 0 && (
                  <span className="text-muted">
                    {" "}· missing {missingNames.slice(0, 3).join(", ")}
                    {missingNames.length > 3 ? ` +${missingNames.length - 3}` : ""}
                  </span>
                )}
                {match.insufficient.length > 0 && missingNames.length === 0 && (
                  <span className="text-muted"> · need more {match.insufficient.map((m) => m.name.toLowerCase()).join(", ")}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
