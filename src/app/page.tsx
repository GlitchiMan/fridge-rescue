import { HeroVisual } from "@/components/home/hero-visual";
import { HomeFinder } from "@/components/home/home-finder";
import { WasteEditorial } from "@/components/home/waste-editorial";
import { FEATURED_RECIPE_SLUGS, RECIPES, getRecipeSummaries, toSummary } from "@/data/recipes";
import { photoFirst } from "@/lib/images";

export default function HomePage() {
  const summaries = getRecipeSummaries();
  // Hand-picked favourites first, then everything else – photographed recipes lead.
  const ordered = [
    ...FEATURED_RECIPE_SLUGS.map((s) => RECIPES.find((r) => r.slug === s)).filter((r) => r !== undefined),
    ...RECIPES.filter((r) => !FEATURED_RECIPE_SLUGS.includes(r.slug)),
  ].map(toSummary);
  const featured = photoFirst(ordered).slice(0, 6);

  return (
    <>
      <HomeFinder
        recipes={summaries}
        featured={featured}
        visual={<HeroVisual />}
        intro={
          <>
            <p className="eyebrow">YOUR PERSONAL KITCHEN</p>
            <h1 className="mt-4 text-[3rem] sm:text-[4.25rem] lg:text-[4.5rem] xl:text-[5.5rem]">Your kitchen. Your recipes. Your way.</h1>
            <p className="lede mt-4 max-w-md">Beautiful ideas for the ingredients you already have. Find your next favorite meal in seconds.</p>
          </>
        }
      />

      <div className="reveal pt-16 sm:pt-24">
        <WasteEditorial />
      </div>
    </>
  );
}
