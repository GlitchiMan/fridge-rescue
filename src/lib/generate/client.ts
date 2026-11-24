"use client";
// Browser helpers for AI generation: API calls plus the current session
// (ideas and recipes shown in this tab). Nothing here holds secrets.
import { useSyncExternalStore } from "react";
import type { GeneratedIdea, GeneratedRecipe, IdeasRequest, Inspiration, RecipeRequest, Tweak } from "./schema";

export type GenError = { code: string; error: string };
export type GenResult<T> = { ok: true; data: T } | ({ ok: false } & GenError);

async function post<T>(body: IdeasRequest | RecipeRequest, signal?: AbortSignal): Promise<GenResult<T>> {
  try {
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const json = (await res.json().catch(() => ({}))) as T & Partial<GenError>;
    if (!res.ok) return { ok: false, code: json.code ?? "unavailable", error: json.error ?? "Fridge AI is unavailable right now." };
    return { ok: true, data: json };
  } catch (e) {
    if ((e as Error).name === "AbortError") return { ok: false, code: "aborted", error: "Stopped." };
    return { ok: false, code: "offline", error: "You seem to be offline. Check your connection and try again." };
  }
}

export const requestIdeas = (body: IdeasRequest, signal?: AbortSignal) => post<{ ideas: GeneratedIdea[] }>(body, signal);
export const requestRecipe = (body: RecipeRequest, signal?: AbortSignal) => post<{ recipe: GeneratedRecipe }>(body, signal);

let statusPromise: Promise<boolean> | null = null;
/** Whether the server has AI generation switched on (asked once per page load). */
export function fetchAiEnabled(): Promise<boolean> {
  statusPromise ??= fetch("/api/generate", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ aiEnabled?: boolean }>) : { aiEnabled: false }))
    .then((j) => Boolean(j.aiEnabled))
    .catch(() => false);
  return statusPromise;
}

/* ───────────── Session (sessionStorage, this tab only) ───────────── */

export interface GenSession {
  /** Latest request context, so the recipe page can generate the full recipe. */
  request: Omit<RecipeRequest, "kind" | "idea"> | null;
  ideas: GeneratedIdea[];
  /** Every title shown this session – new rounds avoid repeating them. */
  shownTitles: string[];
  /** Full recipes generated this session, by idea id. */
  recipes: Record<string, GeneratedRecipe>;
  inspiration: Inspiration | null;
  /** A change requested from a recipe page, run when the generator mounts. */
  pendingTweak: { tweak: Tweak; baseIdea: GeneratedIdea } | null;
}

const KEY = "fridge-rescue:ai-session";
const EMPTY: GenSession = { request: null, ideas: [], shownTitles: [], recipes: {}, inspiration: null, pendingTweak: null };
let cache: GenSession | null = null;
const listeners = new Set<() => void>();

function read(): GenSession {
  if (cache) return cache;
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(KEY) : null;
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<GenSession>) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

export const genSession = {
  get: read,
  update(patch: Partial<GenSession> | ((s: GenSession) => Partial<GenSession>)) {
    const current = read();
    cache = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
    // Keep the session small: only the latest 12 full recipes.
    const ids = Object.keys(cache.recipes);
    if (ids.length > 12) cache.recipes = Object.fromEntries(ids.slice(-12).map((id) => [id, cache!.recipes[id]!]));
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
      /* storage full or blocked – the in-memory copy still works */
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useGenSession(): GenSession {
  return useSyncExternalStore(genSession.subscribe, read, () => EMPTY);
}

/** Start a generation inspired by a video, from anywhere in the app. */
export function setInspiration(inspiration: Inspiration | null) {
  genSession.update({ inspiration });
}
