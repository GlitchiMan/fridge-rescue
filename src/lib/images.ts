import { IMAGE_MANIFEST } from "@/data/image-manifest";

/** Site-level photography placed in public/images. */
export type SiteImageName = "hero-kitchen" | "ingredients-editorial";

export function getSiteImage(name: SiteImageName): string | null {
  return IMAGE_MANIFEST.site[name] ?? null;
}

/**
 * Photo of the finished recipe, if one has been added as
 * public/images/recipes/<slug>.<ext>. Never substitutes another image.
 */
export function getRecipeImage(slug: string): string | null {
  return IMAGE_MANIFEST.recipes[slug] ?? null;
}

export function hasRecipeImage(slug: string): boolean {
  return Boolean(IMAGE_MANIFEST.recipes[slug]);
}

/** Stable reorder that puts recipes with real photos first (order otherwise kept). */
export function photoFirst<T extends { slug: string }>(list: T[]): T[] {
  return [...list.filter((r) => hasRecipeImage(r.slug)), ...list.filter((r) => !hasRecipeImage(r.slug))];
}

/** Responsive `sizes` presets matching the layouts that use them. */
export const IMAGE_SIZES = {
  card: "(min-width: 1440px) 440px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw",
  cardLarge: "(min-width: 1280px) 46vw, (min-width: 640px) 92vw, 92vw",
  recipeHero: "(min-width: 1024px) 50vw, 100vw",
  thumb: "96px",
} as const;
