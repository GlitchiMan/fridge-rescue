import { AccountInvite } from "@/components/account/account-invite";
import { KitchenGenerator } from "@/components/generate/kitchen-generator";
import { HeroVisual } from "@/components/home/hero-visual";
import { InspirationRail, type KitchenPhoto } from "@/components/home/inspiration-rail";
import { FEATURED_RECIPE_SLUGS, RECIPES, getRecipeSummaries, toSummary } from "@/data/recipes";
import { getRecipeImage, photoFirst } from "@/lib/images";

export default function HomePage() {
  const summaries = getRecipeSummaries();
  // Hand-picked favourites first, then everything else – photographed recipes lead.
  const ordered = [
    ...FEATURED_RECIPE_SLUGS.map((s) => RECIPES.find((r) => r.slug === s)).filter((r) => r !== undefined),
    ...RECIPES.filter((r) => !FEATURED_RECIPE_SLUGS.includes(r.slug)),
  ].map(toSummary);
  const featured = photoFirst(ordered).slice(0, 6);
  // The app's own photography, shown in the inspiration row until live videos are connected.
  const kitchen: KitchenPhoto[] = ordered.flatMap((r) => {
    const image = getRecipeImage(r.slug);
    return image ? [{ slug: r.slug, title: r.title, totalMinutes: r.totalMinutes, image }] : [];
  });

  return (
    <>
      <InspirationRail kitchen={kitchen} />
      <KitchenGenerator recipes={summaries} featured={featured} visual={<HeroVisual />} />
      <AccountInvite variant="home" />
    </>
  );
}
