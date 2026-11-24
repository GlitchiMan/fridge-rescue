"use client";

import { ArrowRight, Clapperboard, MessageSquareText, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { DENSE_ITEM, DENSE_LIST, RecipeGrid } from "@/components/recipes/recipe-grid";
import { buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { useKitchen } from "@/hooks/use-kitchen";
import { similarRecipes } from "@/lib/discover/detect";
import { discoverSettings, useDiscoverSettings } from "@/lib/discover/settings";
import { suggestRecipesForInventory } from "@/lib/matching/engine";
import { todayIso } from "@/lib/matching/freshness";
import { TREND_TOPICS, type TrendsResponse } from "@/lib/trends/model";
import { cn } from "@/lib/utils/cn";
import { PLATFORM_LABEL, VIDEO_PLATFORMS } from "@/lib/videos/model";
import type { RecipeSummary } from "@/types";
import { VideoCard } from "./video-card";
import { VideoResults } from "./video-results";

const TABS = [
  { id: "for-you", label: "For you" },
  { id: "fresh", label: "Fresh today" },
  { id: "watch", label: "Watch & cook" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Row({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {hint && <p className="mt-1 text-[0.9375rem] text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ago(iso: string) {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  return h < 1 ? "less than an hour ago" : h < 48 ? `${h} hour${h === 1 ? "" : "s"} ago` : new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/* ───────────── For you ───────────── */

function ForYou({ recipes, featured }: { recipes: RecipeSummary[]; featured: RecipeSummary[] }) {
  const { data, hydrated } = useKitchen();
  const settings = useDiscoverSettings();
  const assistant = useAssistant();
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const personal = settings.personalization;
  const result = useMemo(
    () => (hydrated && personal && data.inventory.length ? suggestRecipesForInventory(recipes, data.inventory, data.preferences, { today: todayIso(), favorites: data.favorites }) : null),
    [hydrated, personal, recipes, data.inventory, data.preferences, data.favorites],
  );
  const lastFav = personal ? [...data.favorites].reverse().map((id) => recipeMap.get(id)).find(Boolean) : undefined;
  const becauseSaved = lastFav ? similarRecipes(lastFav.title, recipes.filter((r) => r.id !== lastFav.id), 3, lastFav.ingredients.filter((i) => !i.optional).map((i) => i.ingredientId)).map((s) => s.recipe) : [];
  const byCuisine = personal && settings.cuisines.length ? recipes.filter((r) => settings.cuisines.includes(r.cuisine)).slice(0, 6) : [];

  if (!hydrated) return <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-56" /><Skeleton className="h-56" /><Skeleton className="h-56" /></div>;

  return (
    <div>
      {!personal && <p className="mb-6 rounded-[0.625rem] bg-cream-deep px-4 py-3 text-sm text-muted">Personalisation is off – showing everyone the same picks.</p>}
      {result ? (
        <>
          {result.groups.canMake.length > 0 && (
            <Row title="Cook tonight" hint="Everything you need is in your kitchen.">
              <RecipeGrid items={result.groups.canMake} recipes={recipeMap} limit={6} dense />
            </Row>
          )}
          {result.groups.useSoon.length > 0 && (
            <Row title="Use it up" hint="These use ingredients close to the dates you entered.">
              <RecipeGrid items={result.groups.useSoon} recipes={recipeMap} limit={3} dense />
            </Row>
          )}
          {result.groups.quick.length > 0 && (
            <Row title="Quick wins" hint="20 minutes or less.">
              <RecipeGrid items={result.groups.quick} recipes={recipeMap} limit={3} dense />
            </Row>
          )}
          {result.groups.almost.length > 0 && (
            <Row title="One shop away" hint="Just one or two ingredients missing.">
              <RecipeGrid items={result.groups.almost} recipes={recipeMap} limit={3} dense />
            </Row>
          )}
        </>
      ) : (
        <section className="mb-12 flex flex-col gap-5 rounded-[1rem] border border-line bg-paper p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-[1.625rem] leading-tight">Personal picks start with your kitchen.</h2>
            <p className="mt-1.5 text-muted">Add a few ingredients and this page fills with meals you can actually make.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/my-fridge" className={buttonClass("primary", "md")}>Add ingredients</Link>
            <button type="button" onClick={() => assistant.open()} className={buttonClass("secondary", "md")}>Ask Fridge AI</button>
          </div>
        </section>
      )}

      {becauseSaved.length > 0 && lastFav && (
        <Row title={`Because you saved ${lastFav.title}`}>
          <ul className={DENSE_LIST}>{becauseSaved.map((r) => <li key={r.id} className={DENSE_ITEM}><RecipeCard recipe={r} /></li>)}</ul>
        </Row>
      )}
      {byCuisine.length > 0 && (
        <Row title="Cuisines you like">
          <ul className={DENSE_LIST}>{byCuisine.map((r) => <li key={r.id} className={DENSE_ITEM}><RecipeCard recipe={r} /></li>)}</ul>
        </Row>
      )}
      {settings.savedIdeas.length > 0 && (
        <Row title="Saved video ideas">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {settings.savedIdeas.slice(0, 8).map((s) => (
              <li key={`${s.platform}:${s.id}`}>
                <VideoCard video={{ ...s, embeddable: s.platform === "youtube", source: "youtube-data-api", fetchedAt: s.savedAt }} />
              </li>
            ))}
          </ul>
        </Row>
      )}
      {!result && (
        <Row title="Popular right now" action={<Link href="/recipes" className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">All recipes <ArrowRight className="size-3.5" aria-hidden /></Link>}>
          <ul className={DENSE_LIST}>{featured.map((r) => <li key={r.id} className={DENSE_ITEM}><RecipeCard recipe={r} /></li>)}</ul>
        </Row>
      )}
    </div>
  );
}

/* ───────────── Fresh today / Trending ───────────── */

function Fresh() {
  const settings = useDiscoverSettings();
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [topic, setTopic] = useState<string>("all");
  // Badges are computed against a fixed "now" captured when the data arrives.
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/trends")
      .then((r) => r.json() as Promise<TrendsResponse>)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setNow(Date.now());
      })
      .catch(() => alive && setData({ status: "error", mode: "fresh", snapshot: null, trends: [] }));
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
        {[0, 1, 2].map((i) => <li key={i}><Skeleton className="aspect-video" /><Skeleton className="mt-3 h-4 w-2/3" /></li>)}
      </ul>
    );
  }
  if (!data.snapshot) {
    return (
      <EmptyState icon={Clapperboard} title={data.status === "disabled" ? "Fresh videos aren't connected yet." : "No fresh ideas yet today."}>
        <p>When live discovery is on, this page shows new cooking videos from YouTube every day – with real dates and view counts, never made-up trends.</p>
        <p className="mt-2 text-xs text-faint">
          {data.status === "disabled" ? "Site owner: add a YouTube Data API key and run the daily refresh – see docs/DISCOVER.md." : "Site owner: run `npm run trends:refresh` or wait for the scheduled refresh."}
        </p>
      </EmptyState>
    );
  }

  const trendingIds = new Set(data.trends.filter((t) => t.trending).map((t) => t.id));
  const topics = data.snapshot.topics.filter((t) => t.videos.length);
  const visible = (topic === "all" ? topics : topics.filter((t) => t.id === topic))
    .flatMap((t) => t.videos.slice(0, topic === "all" ? 3 : 12))
    .filter((v) => settings.platforms.includes(v.platform));

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="section-title">{data.mode === "trending" ? "Trending now" : "Fresh today"}</h2>
          <p className="mt-1 text-sm text-muted">
            {data.mode === "trending"
              ? "Topics whose recent videos are gaining views faster than in the previous snapshot."
              : "Recently published cooking videos. We'll mark trends once there's enough data to measure them."}
          </p>
        </div>
        <p className="text-xs text-muted">Source: {data.snapshot.sources.join(" + ")} · updated {ago(data.snapshot.takenAt)}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Topics">
        {[{ id: "all", label: "All" }, ...topics.map((t) => ({ id: t.id, label: TREND_TOPICS.find((x) => x.id === t.id)?.label ?? t.label }))].map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={topic === t.id}
            onClick={() => setTopic(t.id)}
            className={cn("min-h-9 rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium transition-colors", topic === t.id ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft hover:border-ink/40")}
          >
            {t.label}
            {trendingIds.has(t.id) && <span className={cn("ml-1.5 text-[0.6875rem]", topic === t.id ? "text-white/80" : "text-orange-ink")}>trending</span>}
          </button>
        ))}
      </div>

      {visible.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((v, i) => (
            <li key={`${v.platform}:${v.id}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
              <VideoCard video={v} now={now} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">No videos for this topic and your chosen platforms.</p>
      )}
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Recent = published in the last 7 days. Popular = over 100K views on the platform. Trending = a topic whose videos gained views faster than in the previous daily snapshot. Popularity isn&apos;t a safety or quality check.
      </p>
    </div>
  );
}

/* ───────────── Watch & cook ───────────── */

function Watch({ recipes, featured }: { recipes: RecipeSummary[]; featured: RecipeSummary[] }) {
  const { data, hydrated } = useKitchen();
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const choices = useMemo(() => {
    const favs = data.favorites.map((id) => recipeMap.get(id)).filter((r): r is RecipeSummary => Boolean(r));
    const seen = new Set<string>();
    return [...favs, ...featured].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).slice(0, 8);
  }, [data.favorites, featured, recipeMap]);
  const ingredientIds = Array.from(new Set(data.inventory.map((i) => i.ingredientId))).slice(0, 3);
  const [selected, setSelected] = useState<string>("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const current = selected || choices[0]?.slug || "";

  let params: string | null = null;
  let fallback = "easy dinner recipe";
  if (search) {
    params = `q=${encodeURIComponent(search)}`;
    fallback = search;
  } else if (current === "__kitchen" && ingredientIds.length) {
    params = `ingredients=${ingredientIds.join(",")}`;
    fallback = `${ingredientIds.join(" ")} recipe`;
  } else if (current) {
    params = `recipe=${encodeURIComponent(current)}`;
    fallback = `${recipes.find((r) => r.slug === current)?.title ?? ""} recipe`;
  }

  return (
    <div>
      <form
        className="relative max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim() ? q.trim().slice(0, 80) : null);
        }}
      >
        <label htmlFor="video-search" className="sr-only">Search cooking videos</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[1.1rem] -translate-y-1/2 text-muted" aria-hidden strokeWidth={1.75} />
        <input id="video-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a dish, e.g. creamy mushroom pasta" className="field min-h-12 pl-11 pr-24" maxLength={80} />
        <button type="submit" className={buttonClass("primary", "sm", "absolute right-1.5 top-1/2 -translate-y-1/2")}>Search</button>
      </form>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Or watch videos for</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {hydrated && ingredientIds.length > 0 && (
          <button type="button" aria-pressed={current === "__kitchen" && !search} onClick={() => { setSearch(null); setSelected("__kitchen"); }} className={cn("min-h-9 rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium", current === "__kitchen" && !search ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft hover:border-ink/40")}>
            My ingredients
          </button>
        )}
        {choices.map((r) => (
          <button key={r.id} type="button" aria-pressed={current === r.slug && !search} onClick={() => { setSearch(null); setSelected(r.slug); }} className={cn("min-h-9 rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium", current === r.slug && !search ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft hover:border-ink/40")}>
            {r.title}
          </button>
        ))}
      </div>

      {current && current !== "__kitchen" && !search && (
        <Link href={`/recipes/${current}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          Open the tested recipe <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      )}
      <div className="mt-6">
        <VideoResults params={params} fallbackQuery={fallback} />
      </div>
    </div>
  );
}

/* ───────────── Personalise ───────────── */

function PersonaliseDialog({ open, onClose, cuisines }: { open: boolean; onClose: () => void; cuisines: string[] }) {
  const s = useDiscoverSettings();
  const toggle = <T extends string>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const chip = (on: boolean) => cn("min-h-9 rounded-[0.5rem] border px-3 text-[0.8125rem] font-medium", on ? "border-forest bg-forest text-white" : "border-line-strong bg-paper text-ink-soft");
  return (
    <Dialog open={open} onClose={onClose} title="Personalise Discover" description="Saved in this browser only.">
      <label className="flex items-start gap-3 rounded-[0.625rem] border border-line p-3.5">
        <input type="checkbox" className="mt-0.5 size-[1.1rem] accent-forest" checked={s.personalization} onChange={(e) => discoverSettings.update({ personalization: e.target.checked })} />
        <span>
          <span className="font-medium">Personalised recommendations</span>
          <span className="block text-xs text-muted">Uses your kitchen, saved recipes and preferences – all on this device.</span>
        </span>
      </label>
      <p className="mt-5 text-sm font-medium">Cuisines you like</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cuisines.map((c) => <button key={c} type="button" aria-pressed={s.cuisines.includes(c)} onClick={() => discoverSettings.update({ cuisines: toggle(s.cuisines, c) })} className={chip(s.cuisines.includes(c))}>{c}</button>)}
      </div>
      <p className="mt-5 text-sm font-medium">Video platforms</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {VIDEO_PLATFORMS.map((p) => <button key={p} type="button" aria-pressed={s.platforms.includes(p)} onClick={() => { const next = toggle(s.platforms, p); discoverSettings.update({ platforms: next.length ? next : s.platforms }); }} className={chip(s.platforms.includes(p))}>{PLATFORM_LABEL[p]}</button>)}
      </div>
      <p className="mt-5 text-xs text-muted">
        Cooking time, diets, ingredients to avoid and equipment live in <Link href="/preferences" onClick={onClose} className="link">Preferences</Link> and apply here too.
      </p>
    </Dialog>
  );
}

export function DiscoverApp({ recipes, featured }: { recipes: RecipeSummary[]; featured: RecipeSummary[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const assistant = useAssistant();
  const [personalise, setPersonalise] = useState(false);
  const raw = params.get("tab");
  const tab: TabId = raw === "fresh" || raw === "trending" ? "fresh" : raw === "watch" ? "watch" : "for-you";
  const cuisines = useMemo(() => Array.from(new Set(recipes.map((r) => r.cuisine))).sort(), [recipes]);

  return (
    <div>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Discover</p>
          <h1 className="page-title mt-3">What should I cook today?</h1>
        </div>
        <button type="button" onClick={() => setPersonalise(true)} className={buttonClass("secondary", "sm", "self-start lg:self-auto")}>
          <SlidersHorizontal className="size-4" aria-hidden strokeWidth={1.75} /> Personalise
        </button>
      </header>

      {/* Ask bar – opens the assistant */}
      <button
        type="button"
        onClick={() => assistant.open()}
        className="group mt-6 flex w-full max-w-2xl items-center gap-3 rounded-[0.875rem] border border-line-strong bg-paper px-4 py-3.5 text-left transition-[border-color,box-shadow] hover:border-forest hover:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_22%,transparent)]"
      >
        <span className="flex size-8 items-center justify-center rounded-[0.5rem] bg-forest text-white"><MessageSquareText className="size-4" aria-hidden /></span>
        <span className="flex-1 text-[0.9375rem] text-faint group-hover:text-muted">Ask Fridge AI – “I have chicken, rice and eggs…”</span>
      </button>

      <div role="tablist" aria-label="Discover sections" className="mt-8 flex gap-6 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => router.replace(t.id === "for-you" ? pathname : `${pathname}?tab=${t.id}`, { scroll: false })}
            className={cn("relative -mb-px min-h-11 border-b-2 text-[0.9375rem] font-medium transition-colors", tab === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8" role="tabpanel">
        {tab === "for-you" && <ForYou recipes={recipes} featured={featured} />}
        {tab === "fresh" && <Fresh />}
        {tab === "watch" && <Watch recipes={recipes} featured={featured} />}
      </div>

      <PersonaliseDialog open={personalise} onClose={() => setPersonalise(false)} cuisines={cuisines} />
    </div>
  );
}
