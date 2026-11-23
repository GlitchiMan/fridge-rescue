"use client";

import { ArrowUp, ExternalLink, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RecipeImage } from "@/components/recipes/recipe-image";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { getRecipeSummaries } from "@/data/recipes";
import { getIngredient } from "@/data/ingredients";
import { kitchenStore, useKitchen } from "@/hooks/use-kitchen";
import { answerLocally, type AssistantAnswer, type AssistantPick } from "@/lib/assistant/local";
import { discoverSettings, useDiscoverSettings } from "@/lib/discover/settings";
import { hasRecipeImage } from "@/lib/images";
import { todayIso } from "@/lib/matching/freshness";
import { cn } from "@/lib/utils/cn";
import { youTubeSearchUrl, type VideoSearchResult } from "@/lib/videos/model";
import type { AssistantOpenOptions } from "./assistant-provider";
import { VideoCard } from "@/components/discover/video-card";

const QUICK = ["What can I make?", "Something quick", "Surprise me", "Use my leftovers", "Find cooking videos", "What's popular?"];

interface Turn {
  id: number;
  question: string;
  answer: AssistantAnswer | null;
  pending: boolean;
  aiPending: boolean;
  notice?: string;
  videos?: VideoSearchResult | null;
}

const READINESS: Record<string, { label: string; cls: string }> = {
  ready: { label: "Ready to cook", cls: "bg-forest text-white" },
  "check-quantities": { label: "Check quantities", cls: "bg-forest-50 text-forest" },
  short: { label: "Need a little more", cls: "bg-orange-soft text-orange-ink" },
  missing: { label: "Missing some", cls: "bg-cream-deep text-ink-soft" },
};

function PickRow({ pick, onNavigate }: { pick: AssistantPick; onNavigate: () => void }) {
  const toast = useToast();
  const recipe = useMemo(() => getRecipeSummaries().find((r) => r.id === pick.recipeId), [pick.recipeId]);
  const addMissing = () => {
    const additions = pick.missing.length && recipe
      ? recipe.ingredients
          .filter((ri) => !ri.optional && !ri.toTaste && pick.missing.includes((ri.displayName ?? getIngredient(ri.ingredientId)?.name ?? "").toLowerCase()))
          .map((ri) => ({ ingredientId: ri.ingredientId, name: getIngredient(ri.ingredientId)?.name ?? ri.ingredientId, quantity: ri.quantity, unit: ri.unit, recipeId: recipe.id }))
      : [];
    if (!additions.length) return;
    kitchenStore.addToShoppingList(additions);
    toast.show(`Added ${additions.length} item${additions.length === 1 ? "" : "s"} to your shopping list`);
  };
  return (
    <li className="flex gap-3 rounded-[0.75rem] border border-line bg-white p-3">
      {recipe && hasRecipeImage(recipe.slug) && (
        <RecipeImage slug={recipe.slug} title={recipe.title} ingredients={recipe.ingredients} sizes="72px" compact className="size-[4.5rem] shrink-0 rounded-[0.5rem]" />
      )}
      <div className="min-w-0 flex-1">
        <Link href={`/recipes/${pick.slug}`} onClick={onNavigate} className="font-display text-[1.125rem] leading-tight hover:text-forest">
          {pick.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted">
          {pick.totalMinutes} min{pick.essentialHave !== null && ` · ${pick.essentialHave}/${pick.essentialTotal} ingredients`}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-snug text-ink-soft">{pick.reason}</p>
        {pick.substitutions.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted">
            {pick.substitutions.map((s) => (
              <li key={`${s.forName}-${s.useName}`}>
                <span className="font-medium text-ink-soft">Swap:</span> {s.useName} for {s.forName} – {s.note}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {pick.readiness && <span className={cn("tag", READINESS[pick.readiness]?.cls)}>{READINESS[pick.readiness]?.label}</span>}
          {pick.missing.length > 0 && (
            <button type="button" onClick={addMissing} className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:underline">
              <ShoppingBasket className="size-3.5" aria-hidden /> Add missing to list
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function AssistantSheet({ open, request, onClose }: { open: boolean; request: AssistantOpenOptions & { nonce: number }; onClose: () => void }) {
  const { data, hydrated } = useKitchen();
  const settings = useDiscoverSettings();
  const recipes = useMemo(() => getRecipeSummaries(), []);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [videoTitle, setVideoTitle] = useState<string | undefined>();
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const lastNonce = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d: { aiEnabled?: boolean }) => alive && setAiAvailable(Boolean(d.aiEnabled)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const ask = async (question: string, title?: string) => {
    const q = question.trim().slice(0, 500);
    if (!q) return;
    const id = nextId.current++;
    const kitchen = settings.shareKitchen && hydrated ? data.inventory : null;
    const local = answerLocally(q, {
      recipes,
      inventory: kitchen,
      preferences: data.preferences,
      favorites: data.favorites,
      today: todayIso(),
    });
    const useAi = aiAvailable && settings.useAi;
    setTurns((t) => [...t, { id, question: q, answer: local, pending: false, aiPending: useAi, videos: local.videoQuery ? null : undefined }]);
    setInput("");
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));

    if (local.videoQuery) {
      fetch(`/api/videos?q=${encodeURIComponent(local.videoQuery)}`)
        .then((r) => r.json() as Promise<VideoSearchResult>)
        .then((v) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, videos: v } : x))))
        .catch(() => setTurns((t) => t.map((x) => (x.id === id ? { ...x, videos: { status: "error", videos: [], query: local.videoQuery! } } : x))));
    }

    if (useAi) {
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: q,
            inventory: kitchen?.map((i) => ({ ingredientId: i.ingredientId, quantity: i.quantity, unit: i.unit, useBy: i.useBy, bestBefore: i.bestBefore, isLeftover: i.isLeftover })) ?? null,
            preferences: {
              diets: data.preferences.diets,
              excludedIngredients: data.preferences.excludedIngredients,
              equipment: data.preferences.equipment,
              maxMinutes: data.preferences.maxMinutes,
              pantryStaples: data.preferences.pantryStaples,
            },
            favorites: data.favorites,
            videoTitle: title,
          }),
        });
        const body = (await res.json()) as { answer?: AssistantAnswer; fallback?: string; error?: string };
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer: body.answer ?? x.answer, aiPending: false, notice: body.fallback ?? body.error } : x)));
      } catch {
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, aiPending: false, notice: "AI is unavailable right now – showing smart matches." } : x)));
      }
    }
  };

  // Handle a new open request (e.g. "Make it with my ingredients" from a video).
  useEffect(() => {
    if (!open || request.nonce === lastNonce.current) return;
    lastNonce.current = request.nonce;
    setVideoTitle(request.videoTitle);
    if (request.message) void ask(request.message, request.videoTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request.nonce]);

  const kitchenCount = hydrated ? data.inventory.length : 0;

  return (
    <Dialog open={open} onClose={onClose} title="Ask Fridge AI" description="Recipes from our tested collection, matched to what you have." size="full">
      <div className="flex min-h-[60dvh] flex-col">
        {/* Privacy & mode controls */}
        <div className="flex flex-wrap gap-2 border-b border-line pb-3">
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[0.5rem] border border-line bg-white px-3 text-[0.8125rem]">
            <input type="checkbox" className="size-4 accent-forest" checked={settings.shareKitchen} onChange={(e) => discoverSettings.update({ shareKitchen: e.target.checked })} />
            Use my kitchen{kitchenCount ? ` (${kitchenCount} items)` : ""}
          </label>
          {aiAvailable && (
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[0.5rem] border border-line bg-white px-3 text-[0.8125rem]">
              <input type="checkbox" className="size-4 accent-forest" checked={settings.useAi} onChange={(e) => discoverSettings.update({ useAi: e.target.checked })} />
              AI answers
            </label>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {aiAvailable && settings.useAi
            ? `Your question${settings.shareKitchen ? " and kitchen list" : ""} go to our server and to Anthropic (Claude) to write the answer. Recipes always come from our database.`
            : "Answers are worked out in your browser from our recipe database – nothing is sent anywhere."}
        </p>

        {/* Conversation */}
        <div ref={listRef} className="mt-4 flex-1 space-y-6 overflow-y-auto" aria-live="polite">
          {turns.length === 0 && (
            <div className="py-4">
              <p className="font-display text-[1.5rem] leading-tight">What should we cook?</p>
              <p className="mt-1 text-sm text-muted">Ask in your own words – ingredients, time, diet, “no oven”, “without milk”…</p>
              {videoTitle && <p className="mt-3 text-sm text-ink-soft">About the video: “{videoTitle}”</p>}
            </div>
          )}
          {turns.map((t) => (
            <div key={t.id} className="animate-fade-up">
              <p className="ml-auto w-fit max-w-[85%] rounded-[0.875rem] rounded-br-[0.25rem] bg-forest px-3.5 py-2 text-[0.9375rem] text-white">{t.question}</p>
              {t.answer && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("tag", t.answer.mode === "ai" ? "bg-ink text-white" : "bg-cream-deep text-ink-soft")}>{t.answer.mode === "ai" ? "AI answer" : "Smart match"}</span>
                    {t.aiPending && <span className="text-xs text-muted">Asking the AI…</span>}
                  </div>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed">{t.answer.text}</p>
                  {t.notice && <p className="mt-1 text-xs text-muted">{t.notice}</p>}
                  {t.answer.picks.length > 0 && (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {t.answer.picks.map((p) => (
                        <PickRow key={p.recipeId} pick={p} onNavigate={onClose} />
                      ))}
                    </ul>
                  )}
                  {t.answer.draft && (
                    <div className="mt-3 rounded-[0.75rem] border border-dashed border-orange/60 bg-orange-soft/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-orange-ink">AI draft – not a tested Fridge Rescue recipe</p>
                      <p className="mt-1 font-display text-[1.25rem]">{t.answer.draft.title}</p>
                      {t.answer.draft.assumptions.length > 0 && (
                        <p className="mt-1 text-xs text-muted">Assumes: {t.answer.draft.assumptions.join("; ")}</p>
                      )}
                      <p className="mt-2 text-sm"><span className="font-medium">You&apos;d need:</span> {t.answer.draft.ingredients.join(", ")}</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                        {t.answer.draft.steps.map((s) => <li key={s}>{s}</li>)}
                      </ol>
                      <p className="mt-2 text-xs text-muted">Use your own judgement on cooking times and food safety.</p>
                    </div>
                  )}
                  {t.answer.notes.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-muted">{t.answer.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
                  {t.answer.showTrending && (
                    <Link href="/discover?tab=trending" onClick={onClose} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">
                      Open Trending <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  )}
                  {t.videos === null && <p className="mt-3 text-xs text-muted">Looking for videos…</p>}
                  {t.videos && t.videos.status === "ok" && (
                    <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                      {t.videos.videos.slice(0, 3).map((v) => (
                        <li key={v.id}><VideoCard video={v} compact /></li>
                      ))}
                    </ul>
                  )}
                  {t.videos && t.videos.status !== "ok" && t.answer.videoQuery && (
                    <a href={youTubeSearchUrl(t.answer.videoQuery)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">
                      Search YouTube for “{t.answer.videoQuery}” <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  {t.answer.followUps.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.answer.followUps.map((f) => (
                        <button key={f} type="button" onClick={() => void ask(f, videoTitle)} className="min-h-8 rounded-[0.5rem] bg-ink/[0.05] px-2.5 text-[0.8125rem] text-ink-soft hover:bg-ink/[0.09] hover:text-ink">
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Composer – thumb-reachable at the bottom on phones */}
        <div className="sticky bottom-0 mt-4 border-t border-line bg-cream pt-3">
          {turns.length === 0 && (
            <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => void ask(q, videoTitle)} className="min-h-9 shrink-0 rounded-[0.5rem] border border-line bg-white px-3 text-[0.8125rem] text-ink-soft hover:border-ink/30 hover:text-ink">
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input, videoTitle);
            }}
            className="flex items-center gap-2 rounded-[0.875rem] border border-line-strong bg-white p-1.5 pl-4 focus-within:border-forest"
          >
            <label htmlFor="assistant-input" className="sr-only">Ask Fridge AI</label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              autoComplete="off"
              placeholder="I have eggs, rice and cheese…"
              className="min-w-0 flex-1 bg-transparent py-2 text-[1rem] outline-none placeholder:text-faint"
            />
            <button type="submit" disabled={!input.trim()} aria-label="Send" className="inline-flex size-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-forest text-white transition-[transform,opacity] active:scale-95 disabled:opacity-40">
              <ArrowUp className="size-5" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
