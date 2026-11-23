import { HeroVisual } from "@/components/home/hero-visual";
import { HomeFinder } from "@/components/home/home-finder";
import { AccountInvite } from "@/components/account/account-invite";
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
            <p className="eyebrow animate-fade-up text-champagne-ink">Your personal kitchen</p>
            <h1 className="mt-4 animate-fade-up text-[2.625rem] [animation-delay:60ms] sm:text-[4.25rem] lg:text-[3.75rem] xl:text-[4.75rem]">
              <span className="block">Your kitchen.</span>{" "}
              <span className="block">Your recipes.</span>{" "}
              <span className="block italic text-champagne-ink">Your way.</span>
            </h1>
            <p className="lede mt-4 max-w-md animate-fade-up [animation-delay:120ms]">Beautiful ideas for the ingredients you already have.<span className="hidden sm:inline"> Find your next favorite meal in seconds.</span></p>
          </>
        }
      />

      <div className="reveal pt-16 sm:pt-24">
        <WasteEditorial />
      </div>
      <AccountInvite variant="home" />
    </>
  );
}
