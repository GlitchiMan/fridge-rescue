import { NextResponse } from "next/server";
import { getIngredient } from "@/data/ingredients";
import { getRecipeBySlug } from "@/data/recipes";
import { burstLimit, clientKey } from "@/lib/server/rate-limit";
import { buildIngredientVideoQuery, buildRecipeVideoQuery, sanitizeQuery } from "@/lib/videos/model";
import { searchYouTube } from "@/lib/videos/youtube";

export const dynamic = "force-dynamic";

/**
 * GET /api/videos?recipe=<slug>
 * GET /api/videos?ingredients=egg,potato&maxMinutes=20&vegetarian=1
 * GET /api/videos?q=<dish name>   (dish names only, sanitised, max 80 chars)
 * Queries are built on the server from validated inputs. The user's inventory
 * is never sent to YouTube – only the few ingredient names chosen for the search.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const who = await clientKey(req.headers);
  if (!burstLimit(`videos:${who}`, 20, 60_000)) {
    return NextResponse.json({ status: "rate-limited", videos: [], message: "Too many searches – try again in a minute." }, { status: 429 });
  }

  let query = "";
  const slug = url.searchParams.get("recipe");
  const ingredients = url.searchParams.get("ingredients");
  const q = url.searchParams.get("q");
  if (slug) {
    const recipe = getRecipeBySlug(slug);
    if (!recipe) return NextResponse.json({ status: "empty", videos: [], message: "Unknown recipe." }, { status: 404 });
    query = buildRecipeVideoQuery(recipe);
  } else if (ingredients) {
    const names = ingredients
      .split(",")
      .slice(0, 5)
      .map((i) => getIngredient(i.trim())?.name)
      .filter((n): n is string => Boolean(n));
    const maxMinutes = Number(url.searchParams.get("maxMinutes")) || null;
    query = names.length ? buildIngredientVideoQuery(names, { maxMinutes, vegetarian: url.searchParams.get("vegetarian") === "1" }) : "";
  } else if (q) {
    const clean = sanitizeQuery(q);
    query = clean ? (/\brecipe\b/i.test(clean) ? clean : `${clean} recipe`) : "";
  }
  if (!query) return NextResponse.json({ status: "empty", videos: [], message: "Nothing to search for." }, { status: 400 });

  const result = await searchYouTube(query, { maxResults: 8 });
  return NextResponse.json(result, {
    headers: result.status === "ok" ? { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } : { "Cache-Control": "no-store" },
  });
}
