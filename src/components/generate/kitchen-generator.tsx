"use client";

import { ArrowRight, ChefHat, Clock, ExternalLink, Refrigerator, RotateCcw, Send, ShoppingBasket, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IngredientPicker } from "@/components/ingredients/ingredient-picker";
import { StaplesToggle } from "@/components/ingredients/staples-toggle";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { DENSE_ITEM, DENSE_LIST, RecipeGrid, ResultSection } from "@/components/recipes/recipe-grid";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getIngredient, QUICK_ADD_IDS } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { track } from "@/lib/analytics/events";
import { fetchAiEnabled, genSession, requestIdeas, useGenSession, type GenError } from "@/lib/generate/client";
import { GEN_MODE_LABEL, GEN_MODES, GEN_TAG_LABEL, GEN_TAGS, TWEAK_LABEL, TWEAKS, type GenMode, type GenTag, type GeneratedIdea, type RecipeRequest, type Tweak } from "@/lib/generate/schema";
import { suggestRecipesForInventory } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_LABEL } from "@/lib/videos/model";
import type { InventoryItem, RecipeSummary } from "@/types";

const LOADING_LINES = ["Reading your ingredients", "Pairing flavours", "Checking times and amounts", "Plating three ideas"];
const plainName = (name: string) => name.replace(/ \(.*\)/, "");

/**
 * Homepage generator: ingredients → three new AI meal ideas.
 * When AI is off (or unavailable) it says so and shows matches from the
 * tested recipe collection instead, so the page always works.
 */
export function KitchenGenerator({ recipes, featured, visual }: { recipes: RecipeSummary[]; featured: RecipeSummary[]; visual?: ReactNode }) {
  const router = useRouter();
  const { data, hydrated } = useKitchen();
  const toast = useToast();
  const session = useGenSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [tags, setTags] = useState<GenTag[]>([]);
  const [mode, setMode] = useState<GenMode>("have");
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ideas" | "collection">("idle");
  const [error, setError] = useState<GenError | null>(null);
  const [loadingLine, setLoadingLine] = useState(0);
  const [note, setNote] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<{ commit: () => string[] } | null>(null);
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const fridgeIds = useMemo(() => Array.from(new Set(data.inventory.map((i) => i.ingredientId))), [data.inventory]);

  useEffect(() => {
    if (phase !== "loading") return;
    const t = setInterval(() => setLoadingLine((n) => (n + 1) % LOADING_LINES.length), 2200);
    return () => clearInterval(t);
  }, [phase]);

  /* ── Collection matches (fallback and "tested recipes" view) ── */
  const results = useMemo(() => {
    if (selected.length === 0) return null;
    const fromFridge = new Map(data.inventory.map((i) => [i.ingredientId, i]));
    const inventory: InventoryItem[] = selected.map((id) => {
      const existing = fromFridge.get(id);
      if (existing) return existing;
      const ing = getIngredient(id)!;
      return { id: `home-${id}`, ingredientId: id, displayName: ing.name, quantity: null, unit: ing.defaultUnit, location: ing.defaultLocation, addedAt: "" };
    });
    const extra = data.inventory.filter((i) => selected.includes(i.ingredientId) && !inventory.includes(i));
    return suggestRecipesForInventory(recipes, [...inventory, ...extra], data.preferences, { today: todayIso(), favorites: data.favorites });
  }, [selected, data.inventory, data.preferences, data.favorites, recipes]);

  /** What the AI is told – only what the user entered or saved, nothing assumed. */
  const buildContext = (ids: string[], extras: string[]): Omit<RecipeRequest, "kind" | "idea"> => {
    const ingredients = ids.map((id) => {
      const ing = getIngredient(id)!;
      const items = data.inventory.filter((i) => i.ingredientId === id);
      const known = items.length > 0 && items.every((i) => i.quantity !== null);
      const sameUnit = known && items.every((i) => i.unit === items[0]!.unit);
      const quantity = !known ? null : sameUnit ? `${items.reduce((s, i) => s + (i.quantity ?? 0), 0)} ${items[0]!.unit}` : items.map((i) => `${i.quantity} ${i.unit}`).join(" + ");
      return { name: plainName(ing.name), quantity: quantity?.slice(0, 30) ?? null };
    });
    const names = (list: string[]) => list.map((id) => getIngredient(id)?.name).filter((n): n is string => Boolean(n)).map(plainName);
    return {
      ingredients: [...ingredients, ...extras.map((name) => ({ name, quantity: null }))].slice(0, 40),
      staples: names(data.preferences.pantryStaples).slice(0, 40),
      tags,
      mode,
      diets: data.preferences.diets,
      avoid: names(data.preferences.excludedIngredients).slice(0, 40),
      servings: Math.min(12, data.preferences.servings),
      maxMinutes: data.preferences.maxMinutes,
      inspiration: session.inspiration,
    };
  };

  const scrollToResults = () => requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const runIdeas = async (ctx: Omit<RecipeRequest, "kind" | "idea">, opts: { tweak: Tweak | null; note?: string; baseIdea?: GeneratedIdea | null; keepShown: boolean }) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setPhase("loading");
    setLoadingLine(0);
    scrollToResults();
    const previousTitles = opts.keepShown ? genSession.get().shownTitles.slice(-15) : [];
    const res = await requestIdeas({ kind: "ideas", ...ctx, tweak: opts.tweak, note: opts.note || undefined, previousTitles, baseIdea: opts.baseIdea ?? null }, ctrl.signal);
    if (ctrl.signal.aborted) return;
    if (res.ok) {
      genSession.update((s) => ({ request: ctx, ideas: res.data.ideas, shownTitles: [...(opts.keepShown ? s.shownTitles : []), ...res.data.ideas.map((i) => i.title)].slice(-30) }));
      setPhase("ideas");
      setNote("");
      return;
    }
    if (res.code === "aborted") {
      setPhase(genSession.get().ideas.length ? "ideas" : "idle");
      return;
    }
    if (res.code === "disabled") setAiEnabled(false);
    setError(res);
    setPhase("collection");
  };

  useEffect(() => {
    let alive = true;
    fetchAiEnabled().then((on) => {
      if (!alive) return;
      setAiEnabled(on);
      // A change requested from a recipe page ("Make it spicier") runs on arrival.
      const s = genSession.get();
      if (on && s.pendingTweak && s.request) {
        const { tweak, baseIdea } = s.pendingTweak;
        genSession.update({ pendingTweak: null });
        void runIdeas(s.request, { tweak, baseIdea, keepShown: true });
      }
    });
    return () => {
      alive = false;
    };
    // Runs once on mount; runIdeas reads fresh state from the session store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = () => {
    const typed = pickerRef.current?.commit() ?? [];
    const ids = Array.from(new Set([...selected, ...typed]));
    if (ids.length === 0 && custom.length === 0) {
      document.getElementById("hero-ingredients")?.focus();
      return;
    }
    track({ name: "recipe_search_completed", props: { resultCount: results?.ranked.length ?? 0, ingredientCount: ids.length + custom.length } });
    if (!aiEnabled) {
      setPhase("collection");
      scrollToResults();
      return;
    }
    void runIdeas(buildContext(ids, custom), { tweak: null, keepShown: false });
  };

  const tweak = (t: Tweak) => {
    const ctx = genSession.get().request;
    if (ctx) void runIdeas(ctx, { tweak: t, keepShown: true });
  };
  const ask = () => {
    const ctx = genSession.get().request;
    if (ctx && note.trim().length >= 2) void runIdeas(ctx, { tweak: null, note: note.trim(), keepShown: true });
  };

  const openIdea = (idea: GeneratedIdea) => router.push(`/ai-recipe?idea=${encodeURIComponent(idea.id)}`);

  const saveToFridge = () => {
    const { added, skipped } = kitchenStore.quickAddIngredients(selected);
    toast.show(
      added.length ? `Added ${added.length} ingredient${added.length === 1 ? "" : "s"} to My Fridge${skipped.length ? ` (${skipped.length} already there)` : ""}` : "Those ingredients are already in My Fridge",
      { tone: added.length ? "success" : "info" },
    );
  };

  const quickAdd = QUICK_ADD_IDS.filter((id) => !selected.includes(id)).slice(0, 5);
  const unsaved = selected.filter((id) => !fridgeIds.includes(id));
  const groups = results?.groups;
  const inspiration = session.inspiration;
  // Coming back from a recipe page shows this session's ideas again.
  const view = phase === "idle" && session.ideas.length > 0 ? "ideas" : phase;
  const restrictions = [...data.preferences.diets, ...data.preferences.excludedIngredients.map((id) => plainName(getIngredient(id)?.name ?? id))];

  return (
    <>
      <section id="cook" className="container-page scroll-mt-20 pb-10 pt-8 sm:pt-12 lg:pb-14">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center xl:gap-16">
          <div className="animate-fade-up">
            <p className="eyebrow text-champagne-ink">Fridge AI</p>
            <h1 className="mt-3 text-[2.375rem] leading-[1.05] sm:text-[3.25rem] xl:text-[3.75rem]">What are we cooking?</h1>
            <p className="lede mt-3 max-w-lg">Tell us what you have. Get something new and delicious, made for you.</p>

            {inspiration && (
              <div className="mt-6 flex items-start gap-3 rounded-[0.875rem] border border-line bg-paper p-3.5">
                <ChefHat className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-ink">Making something like “{inspiration.title}”</p>
                  <p className="mt-0.5 text-muted">
                    {inspiration.creator} on {PLATFORM_LABEL[inspiration.platform]}.{" "}
                    <a href={inspiration.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
                      Watch the original <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </p>
                </div>
                <button type="button" onClick={() => genSession.update({ inspiration: null })} className="rounded-[0.375rem] p-1 text-muted hover:bg-ink/[0.05] hover:text-ink" aria-label="Remove video inspiration">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            )}

            <div className="mt-6">
              <IngredientPicker
                label="What's in your fridge?"
                size="lg"
                selected={selected}
                onAdd={(ids) => {
                  setSelected((s) => Array.from(new Set([...s, ...ids])));
                  track({ name: "ingredient_added", props: { source: "home" } });
                }}
                onRemove={(id) => setSelected((s) => s.filter((x) => x !== id))}
                onAddCustom={aiEnabled ? (names) => setCustom((c) => Array.from(new Set([...c, ...names])).slice(0, 15)) : undefined}
                inputId="hero-ingredients"
                placeholder="Chicken, rice, cheese, tomatoes…"
                onEnterEmpty={generate}
                actionRef={pickerRef}
              />
              {custom.length > 0 && (
                <ul aria-label="Other ingredients" className="mt-2 flex flex-wrap gap-1.5">
                  {custom.map((c) => (
                    <li key={c} className="inline-flex min-h-8 items-center gap-1 rounded-[0.5rem] bg-ink/[0.05] pl-2.5 pr-1 text-[0.8125rem] font-medium text-ink">
                      {c}
                      <button type="button" onClick={() => setCustom((x) => x.filter((y) => y !== c))} className="rounded-[0.25rem] p-0.5 text-muted hover:text-ink" aria-label={`Remove ${c}`}>
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selected.length + custom.length < 3 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[0.8125rem] text-muted">Try</span>
                  {quickAdd.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelected((s) => [...s, id])}
                      className="inline-flex min-h-8 items-center rounded-[0.5rem] border border-line bg-paper/70 px-2.5 text-[0.8125rem] font-medium text-ink-soft transition-[background-color,border-color,color,transform] duration-150 hover:border-ink/30 hover:text-ink active:scale-95"
                    >
                      + {plainName(getIngredient(id)!.name)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {aiEnabled !== false && (
              <>
                <fieldset className="mt-6">
                  <legend className="label">Make it…</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {GEN_TAGS.map((t) => {
                      const on = tags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setTags((x) => (on ? x.filter((y) => y !== t) : x.length >= 4 ? x : [...x, t]))}
                          className={cn(
                            "inline-flex min-h-9 items-center rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
                            on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft hover:border-ink/30 hover:text-ink",
                          )}
                        >
                          {GEN_TAG_LABEL[t]}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div role="radiogroup" aria-label="Ingredients" className="mt-5 inline-grid grid-cols-2 rounded-[0.625rem] bg-ink/[0.05] p-1">
                  {GEN_MODES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                      className={cn("min-h-9 rounded-[0.5rem] px-3.5 text-[0.8125rem] font-medium transition-colors", mode === m ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink")}
                    >
                      {GEN_MODE_LABEL[m]}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  {mode === "have" ? "Uses only your ingredients and the pantry basics you've confirmed." : "Can add new ingredients, always listed as things to buy."}
                  {restrictions.length > 0 && <> Avoiding {restrictions.join(", ")}.</>}{" "}
                  <Link href="/preferences" className="font-medium text-accent hover:underline">
                    Preferences
                  </Link>
                </p>
              </>
            )}

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button type="button" onClick={generate} disabled={phase === "loading"} className={buttonClass("primary", "lg", "w-full text-[1.0625rem] sm:w-auto sm:min-w-56")}>
                <ChefHat className="size-[1.15rem]" aria-hidden strokeWidth={2} />
                Generate my recipes
              </button>
              {hydrated && fridgeIds.length > 0 && (
                <button type="button" onClick={() => setSelected(fridgeIds)} className={buttonClass("ghost", "lg", "w-full sm:w-auto")}>
                  <Refrigerator className="size-[1.1rem]" aria-hidden strokeWidth={1.75} />
                  Use my fridge ({fridgeIds.length})
                </button>
              )}
            </div>
            {aiEnabled === false && <p className="mt-3 text-xs text-muted">Fridge AI isn&apos;t switched on yet, so you&apos;ll get matches from our tested recipes.</p>}
          </div>
          {visual && <div className="hidden lg:block">{visual}</div>}
        </div>
      </section>

      <div ref={resultsRef} id="results" className="scroll-mt-20">
        {phase === "loading" && <IdeasLoading line={LOADING_LINES[loadingLine]!} onCancel={() => abortRef.current?.abort()} />}

        {view === "ideas" && session.ideas.length > 0 && (
          <section aria-label="Recipe ideas made for you" className="container-page pb-10">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-[1.75rem] leading-tight sm:text-[2.125rem]">Made for you</h2>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  AI-generated ideas, not kitchen-tested. Based on {session.request?.ingredients.map((i) => i.name.toLowerCase()).join(", ")}.
                </p>
              </div>
              <button type="button" onClick={() => tweak("more")} className={buttonClass("ghost", "sm", "self-start sm:self-auto")}>
                <RotateCcw className="size-3.5" aria-hidden /> 3 more ideas
              </button>
            </div>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {session.ideas.map((idea, i) => (
                <li key={idea.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <IdeaCard idea={idea} mode={session.request?.mode ?? "have"} onOpen={() => openIdea(idea)} ready={Boolean(session.recipes[idea.id])} />
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-[0.875rem] border border-line bg-paper p-4">
              <p className="text-sm font-medium text-ink">Change the ideas</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {TWEAKS.filter((t) => t !== "more").map((t) => (
                  <button key={t} type="button" onClick={() => tweak(t)} className="inline-flex min-h-8 items-center rounded-[0.5rem] bg-ink/[0.05] px-2.5 text-[0.8125rem] font-medium text-ink-soft transition-colors hover:bg-ink/[0.09] hover:text-ink">
                    {TWEAK_LABEL[t]}
                  </button>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask();
                }}
              >
                <label htmlFor="gen-note" className="sr-only">
                  Ask for a change
                </label>
                <input id="gen-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="Or ask: no oven, make it Korean, kid-friendly…" className="field min-h-10 flex-1" />
                <button type="submit" className={buttonClass("secondary", "md")} aria-label="Send">
                  <Send className="size-4" aria-hidden />
                </button>
              </form>
            </div>
          </section>
        )}

        {(view === "idle" || view === "collection") && (
          <section aria-label={phase === "collection" && results ? "Recipe results" : "Popular recipes"} className="container-page pb-6">
            {error && (
              <p role="status" className="mb-6 rounded-[0.75rem] border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
                {error.error} {error.code !== "disabled" && "Here are matches from our tested recipes instead."}
              </p>
            )}
            {phase === "collection" && results && groups ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <p aria-live="polite" className="font-display text-[1.625rem] leading-tight tracking-[-0.02em] sm:text-[2.125rem]">
                    {results.ranked.length > 0 ? `We found ${results.ranked.length} recipe${results.ranked.length === 1 ? "" : "s"} that use your ingredients.` : "We couldn't find a close match yet."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unsaved.length > 0 && (
                      <button type="button" onClick={saveToFridge} className={buttonClass("secondary", "sm")}>
                        Save to My Fridge
                      </button>
                    )}
                    <Link href="/recipes" className={buttonClass("ghost", "sm")}>
                      View all recipes <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
                <p className="mt-1 text-[0.8125rem] text-muted">From the Fridge Rescue collection of tested recipes.</p>

                <details className="group mt-5 rounded-[0.75rem] border border-line bg-paper">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[0.875rem] sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="font-medium text-ink">Got pantry basics like oil, salt or butter?</span> <span className="text-muted">Tell us for better matches.</span>
                    </span>
                    <span aria-hidden className="text-lg leading-none text-muted transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-t border-line px-4 py-4 sm:px-5">
                    <StaplesToggle />
                    <button type="button" onClick={scrollToResults} className={buttonClass("primary", "sm", "mt-4")}>
                      Update results
                    </button>
                  </div>
                </details>

                <div className="mt-10">
                  {results.ranked.length === 0 && (
                    <div className="rounded-[0.875rem] border border-line bg-paper px-6 py-10 text-center">
                      <p className="font-display text-2xl">Try adding a few more ingredients.</p>
                      <p className="mt-2 text-muted">Or relax your preferences – results update as you type.</p>
                    </div>
                  )}
                  {groups.canMake.length > 0 && (
                    <ResultSection id="can-make" title="You can make this now" description="All the essentials match – amounts typed here aren't known, so check quantities." count={groups.canMake.length}>
                      <RecipeGrid items={groups.canMake} recipes={recipeMap} limit={6} dense />
                    </ResultSection>
                  )}
                  {groups.almost.length > 0 && (
                    <ResultSection id="almost" title="Almost there" description="Just one or two ingredients away." count={groups.almost.length}>
                      <RecipeGrid items={groups.almost} recipes={recipeMap} limit={6} dense />
                    </ResultSection>
                  )}
                  {groups.good.length > 0 && (
                    <ResultSection id="good" title="Good matches" description="These use several of your ingredients." count={groups.good.length}>
                      <RecipeGrid items={groups.good} recipes={recipeMap} limit={3} dense />
                    </ResultSection>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[1.75rem] leading-tight sm:text-[2.125rem]">From our tested collection</h2>
                    <p className="mt-1 text-[0.8125rem] text-muted">Recipes written and checked by the Fridge Rescue team.</p>
                  </div>
                  <Link href="/recipes" className={buttonClass("secondary", "md", "shrink-0")}>
                    View all {recipes.length} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
                <ul className={`mt-6 ${DENSE_LIST}`}>
                  {featured.map((r, i) => (
                    <li key={r.id} className={`animate-fade-up ${DENSE_ITEM}`} style={{ animationDelay: `${i * 35}ms` }}>
                      <RecipeCard recipe={r} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function IdeasLoading({ line, onCancel }: { line: string; onCancel: () => void }) {
  return (
    <section aria-busy="true" aria-label="Creating recipe ideas" className="container-page pb-10">
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-ink">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-champagne opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-champagne" />
          </span>
          {line}…
        </p>
        <button type="button" onClick={onCancel} className={buttonClass("ghost", "sm")}>
          Stop
        </button>
      </div>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-56 animate-pulse rounded-[1rem] border border-line bg-paper motion-reduce:animate-none" style={{ animationDelay: `${i * 150}ms` }} />
        ))}
      </ul>
    </section>
  );
}

function IdeaCard({ idea, mode, onOpen, ready }: { idea: GeneratedIdea; mode: GenMode; onOpen: () => void; ready: boolean }) {
  return (
    <article className="group flex h-full flex-col rounded-[1rem] border border-line bg-paper p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_32px_-18px_rgb(22_26_23_/_0.35)] motion-reduce:hover:translate-y-0">
      <p className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted">
        {idea.cuisine && <span>{idea.cuisine}</span>}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" aria-hidden /> {idea.minutes} min
        </span>
        <span>{idea.difficulty}</span>
      </p>
      <h3 className="mt-2 font-display text-[1.375rem] leading-snug tracking-[-0.01em] text-ink">{idea.title}</h3>
      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-soft">{idea.description}</p>
      {idea.highlight && <p className="mt-2 text-[0.8125rem] font-medium text-champagne-ink">{idea.highlight}</p>}
      <div className="mt-auto pt-4">
        <p className="text-[0.8125rem] text-muted">
          <span className="font-medium text-accent">Uses {idea.uses.length} of yours</span>
          {idea.missing.length > 0 ? (
            <>
              {" · "}
              <span className={cn("inline-flex items-center gap-1", mode === "have" && "text-orange-ink")}>
                <ShoppingBasket className="size-3.5" aria-hidden /> {idea.missing.length} to buy
              </span>
            </>
          ) : (
            " · nothing to buy"
          )}
        </p>
        <button type="button" onClick={onOpen} className={buttonClass("primary", "md", "mt-3 w-full")}>
          {ready ? "Open recipe" : "Cook this"} <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}
