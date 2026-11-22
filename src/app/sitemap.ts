import type { MetadataRoute } from "next";
import { GUIDES } from "@/data/guides";
import { RECIPES } from "@/data/recipes";
import { absoluteUrl } from "@/lib/seo/site";

/** Public, indexable pages only. Personal pages (my-fridge, lists…) are excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/recipes", "/ideas", "/how-it-works", "/about", "/contact", "/privacy", "/terms"].map((p) => ({
    url: absoluteUrl(p),
    changeFrequency: p === "/" || p === "/recipes" ? ("weekly" as const) : ("monthly" as const),
    priority: p === "/" ? 1 : p === "/recipes" ? 0.9 : 0.5,
  }));
  return [
    ...staticPages,
    ...RECIPES.map((r) => ({ url: absoluteUrl(`/recipes/${r.slug}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/ideas/${g.slug}`), changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
