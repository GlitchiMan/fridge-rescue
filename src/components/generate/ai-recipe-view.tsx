"use client";

import { ArrowLeft, Bookmark, ChefHat, Clock, ExternalLink, PlayCircle, ShieldCheck, ShoppingBasket, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/components/account/account-provider";
import { VideoResults } from "@/components/discover/video-results";
import { CookingMode } from "@/components/recipes/cooking-mode";
import { buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { genSession, requestRecipe, useGenSession, type GenError } from "@/lib/generate/client";
import { TWEAK_LABEL, TWEAKS, type GeneratedIdea, type GeneratedRecipe, type Tweak } from "@/lib/generate/schema";
import { findIngredientByAlias } from "@/lib/matching/ingredient-search";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_LABEL } from "@/lib/videos/model";
import type { Unit } from "@/types";

const SOURCE_LABEL = { have: "You have", staple: "Pantry basics", buy: "To buy" } as const;

function amountText(i: GeneratedRecipe["ingredients"][number]) {
  if (i.unit === "to taste" || i.amount === null) return "To taste";
  return `${i.amount} ${i.unit}`;
}

/** Turn a recipe back into an idea, so it can be tweaked on the homepage. */
const asIdea = (r: GeneratedRecipe): GeneratedIdea => ({
  id: r.id,
  title: r.title,
  description: r.description.slice(0, 240) || r.title,
  minutes: Math.max(1, r.prepMinutes + r.cookMinutes),
  difficulty: r.difficulty,
  cuisine: r.cuisine,
  uses: r.ingredients.filter((i) => i.source === "have").map((i) => i.name.slice(0, 60)),
  missing: r.ingredients.filter((i) => i.source === "buy").map((i) => i.name.slice(0, 60)),
  staples: r.ingredients.filter((i) => i.source === "staple").map((i) => i.name.slice(0, 40)),
  highlight: "",
});

export function AiRecipeView() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, hydrated } = useKitchen();
  const session = useGenSession();
  const ideaId = params.get("idea");
  const savedId = params.get("id");
  const [error, setError] = useState<GenError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef<string | null>(null);

  const idea = ideaId ? session.ideas.find((i) => i.id === ideaId) ?? null : null;
  const recipe: GeneratedRecipe | null =
    (savedId && (data.generatedRecipes.find((r) => r.id === savedId) ?? Object.values(session.recipes).find((r) => r.id === savedId))) ||
    (ideaId ? session.recipes[ideaId] ?? null : null) ||
    null;

  // Write the full recipe for the chosen idea (once per idea and attempt).
  useEffect(() => {
    if (recipe || !idea || !session.request) return;
    const key = `${idea.id}:${attempt}`;
    if (started.current === key) return;
    started.current = key;
    const ctrl = new AbortController();
    setError(null);
    requestRecipe({ kind: "recipe", ...session.request, idea }, ctrl.signal).then((res) => {
      if (res.ok) genSession.update((s) => ({ recipes: { ...s.recipes, [idea.id]: res.data.recipe } }));
      else if (res.code !== "aborted") setError(res);
    });
  }, [recipe, idea, session.request, attempt]);

  if (!hydrated && !recipe) return <Skeleton className="h-96" />;

  if (!recipe && !idea) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-[2rem] leading-tight">This recipe isn&apos;t here anymore</h1>
        <p className="mt-3 text-muted">AI recipes you don&apos;t save are kept only in the tab where you made them. Save the ones you like to keep them.</p>
        <Link href="/#cook" className={buttonClass("primary", "md", "mt-6")}>
          <ChefHat className="size-4" aria-hidden /> Make new recipes
        </Link>
      </div>
    );
  }

  if (!recipe && idea) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink />
        <AiLabel />
        <h1 className="mt-3 text-[2.25rem] leading-[1.1] sm:text-[3rem]">{idea.title}</h1>
        <p className="lede mt-3">{idea.description}</p>
        {error ? (
          <div role="alert" className="mt-8 rounded-[0.875rem] border border-line bg-paper p-5">
            <p className="font-medium text-ink">{error.error}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!["disabled", "daily-limit", "budget"].includes(error.code) && (
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className={buttonClass("primary", "sm")}>
                  Try again
                </button>
              )}
              <Link href="/#cook" className={buttonClass("secondary", "sm")}>
                Back to ideas
              </Link>
              <Link href="/recipes" className={buttonClass("ghost", "sm")}>
                Tested recipes
              </Link>
            </div>
          </div>
        ) : (
          <div aria-busy="true" className="mt-8">
            <p role="status" className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-ink">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-champagne opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2.5 rounded-full bg-champagne" />
              </span>
              Writing your recipe – amounts, steps and safety checks…
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-[2fr_3fr]">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return <RecipeBody recipe={recipe!} saved={data.generatedRecipes.some((r) => r.id === recipe!.id)} onTweak={(t) => {
    genSession.update({ pendingTweak: { tweak: t, baseIdea: idea ?? asIdea(recipe!) } });
    router.push("/#cook");
  }} />;
}

function BackLink() {
  return (
    <Link href="/#cook" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Your ideas
    </Link>
  );
}

function AiLabel() {
  return (
    <p className="mt-5 flex w-fit items-center gap-1.5 rounded-[0.375rem] bg-champagne/15 px-2 py-1 text-xs font-medium text-champagne-ink">
      AI-generated recipe · not kitchen-tested
    </p>
  );
}

function RecipeBody({ recipe, saved, onTweak }: { recipe: GeneratedRecipe; saved: boolean; onTweak: (t: Tweak) => void }) {
  const toast = useToast();
  const account = useAccount();
  const [cooking, setCooking] = useState(false);
  const [videos, setVideos] = useState(false);
  const total = recipe.prepMinutes + recipe.cookMinutes;
  const toBuy = recipe.ingredients.filter((i) => i.source === "buy");
  const groups = (["have", "staple", "buy"] as const).map((s) => ({ source: s, items: recipe.ingredients.filter((i) => i.source === s) })).filter((g) => g.items.length);

  const save = () => {
    if (saved) {
      kitchenStore.removeGeneratedRecipe(recipe.id);
      toast.show("Removed from your recipes");
      return;
    }
    if (!kitchenStore.saveGeneratedRecipe(recipe)) {
      toast.show("You've saved 100 AI recipes. Remove one to save another.", { tone: "info" });
      return;
    }
    const invite = account.configured && account.status === "guest";
    toast.show(invite ? "Saved on this device. Create a free account to keep it everywhere." : "Saved to your recipes", { tone: "success" });
  };

  const addToShopping = () => {
    kitchenStore.addToShoppingList(
      toBuy.map((i) => {
        const known = i.unit !== "to taste" && i.amount !== null;
        return { ingredientId: findIngredientByAlias(i.name)?.id ?? null, name: i.name, quantity: known ? i.amount : null, unit: known ? (i.unit as Unit) : null, recipeId: `ai-${recipe.id}` };
      }),
    );
    toast.show(`Added ${toBuy.length} item${toBuy.length === 1 ? "" : "s"} to your shopping list`, { tone: "success" });
  };

  return (
    <article className="mx-auto max-w-5xl">
      <BackLink />
      <AiLabel />
      <h1 className="mt-3 text-[2.25rem] leading-[1.1] sm:text-[3rem]">{recipe.title}</h1>
      {recipe.description && <p className="lede mt-3 max-w-2xl">{recipe.description}</p>}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-soft">
        <li className="inline-flex items-center gap-1.5">
          <Clock className="size-4 text-muted" aria-hidden /> {total} min
          <span className="text-muted">({recipe.prepMinutes} prep, {recipe.cookMinutes} cook)</span>
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Users className="size-4 text-muted" aria-hidden /> Serves {recipe.servings}
        </li>
        <li className="capitalize">{recipe.difficulty}</li>
        {recipe.cuisine && <li>{recipe.cuisine}</li>}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setCooking(true)} className={buttonClass("primary", "md")}>
          <ChefHat className="size-4" aria-hidden /> Start cooking
        </button>
        <button type="button" onClick={save} aria-pressed={saved} className={buttonClass("secondary", "md")}>
          <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden /> {saved ? "Saved" : "Save recipe"}
        </button>
        {toBuy.length > 0 && (
          <button type="button" onClick={addToShopping} className={buttonClass("ghost", "md")}>
            <ShoppingBasket className="size-4" aria-hidden /> Add {toBuy.length} to shopping list
          </button>
        )}
        <button type="button" onClick={() => setVideos(true)} className={buttonClass("ghost", "md")}>
          <PlayCircle className="size-4" aria-hidden /> Find a cooking video
        </button>
      </div>

      {recipe.inspiration && (
        <p className="mt-5 max-w-2xl rounded-[0.75rem] border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
          Inspired by{" "}
          <a href={recipe.inspiration.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
            “{recipe.inspiration.title}” <ExternalLink className="size-3" aria-hidden />
          </a>{" "}
          by {recipe.inspiration.creator} on {PLATFORM_LABEL[recipe.inspiration.platform]}. This is Fridge AI&apos;s own estimated version, not the creator&apos;s recipe.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14">
        <section aria-labelledby="ing">
          <h2 id="ing" className="section-title">Ingredients</h2>
          {groups.map((g) => (
            <div key={g.source} className="mt-5">
              <h3 className={cn("text-[0.6875rem] font-semibold uppercase tracking-[0.12em]", g.source === "buy" ? "text-orange-ink" : "text-muted")}>{SOURCE_LABEL[g.source]}</h3>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {g.items.map((i) => (
                  <li key={i.name} className="flex items-baseline justify-between gap-4 py-2.5 text-[0.9375rem]">
                    <span>
                      <span className="text-ink">{i.name}</span>
                      {i.preparation && <span className="text-muted">, {i.preparation}</span>}
                      {i.source === "have" && <span className="block text-xs text-muted">{i.youHave ? `You have ${i.youHave}` : "Amount you have: not given"}</span>}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-soft">{amountText(i)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {recipe.quantityNotes.length > 0 && (
            <ul className="mt-5 space-y-1.5 rounded-[0.75rem] bg-ink/[0.04] p-4 text-[0.8125rem] text-ink-soft">
              {recipe.quantityNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {recipe.substitutions.length > 0 && (
            <div className="mt-8">
              <h3 className="text-base font-semibold text-ink">Swaps</h3>
              <ul className="mt-2 space-y-2 text-[0.875rem] text-ink-soft">
                {recipe.substitutions.map((s) => (
                  <li key={`${s.ingredient}-${s.swap}`}>
                    <span className="font-medium text-ink">{s.swap}</span> instead of {s.ingredient}
                    {s.note && <span className="text-muted"> – {s.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recipe.equipment.length > 0 && (
            <p className="mt-8 text-[0.875rem] text-ink-soft">
              <span className="font-semibold text-ink">Equipment:</span> {recipe.equipment.join(", ")}
            </p>
          )}
        </section>

        <section aria-labelledby="method">
          <h2 id="method" className="section-title">Method</h2>
          <ol className="mt-5 space-y-5">
            {recipe.steps.map((s, n) => (
              <li key={n} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[0.8125rem] font-semibold text-paper">{n + 1}</span>
                <p className="pt-0.5 text-[1rem] leading-relaxed text-ink">
                  {s.text}
                  {s.minutes && <span className="ml-1.5 whitespace-nowrap text-sm text-muted">· {s.minutes} min</span>}
                </p>
              </li>
            ))}
          </ol>
          {recipe.tips.length > 0 && (
            <div className="mt-8">
              <h3 className="text-base font-semibold text-ink">Tips</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.875rem] text-ink-soft">
                {recipe.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 rounded-[0.875rem] border border-line bg-paper p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <ShieldCheck className="size-4 text-accent" aria-hidden /> Food safety
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.875rem] text-ink-soft">
              {recipe.safety.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-3 text-[0.8125rem] text-muted">
              AI can make mistakes. If you&apos;re cooking for someone with an allergy, check every label yourself, including for cross-contact. This recipe has not been tested in a kitchen.
            </p>
          </div>
        </section>
      </div>

      <section aria-labelledby="change" className="mt-12 border-t border-line pt-8">
        <h2 id="change" className="text-[1.25rem] font-semibold">Change this recipe</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TWEAKS.filter((t) => t !== "more").map((t) => (
            <button key={t} type="button" onClick={() => onTweak(t)} className="inline-flex min-h-9 items-center rounded-[0.5rem] bg-ink/[0.05] px-3 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-ink/[0.09] hover:text-ink">
              {TWEAK_LABEL[t]}
            </button>
          ))}
        </div>
      </section>

      {videos && (
        <section aria-labelledby="vids" className="mt-12">
          <h2 id="vids" className="mb-4 text-[1.25rem] font-semibold">Cooking videos for this kind of dish</h2>
          <VideoResults params={`q=${encodeURIComponent(recipe.videoQuery)}`} fallbackQuery={recipe.videoQuery} limit={3} />
        </section>
      )}

      <CookingMode
        recipe={{ title: recipe.title, instructions: recipe.steps.map((s) => ({ text: s.text, timerMinutes: s.minutes ?? undefined })) }}
        open={cooking}
        onClose={() => setCooking(false)}
        onFinish={() => {
          setCooking(false);
          toast.show("Enjoy your meal", { tone: "success" });
        }}
      />
    </article>
  );
}
