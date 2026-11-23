"use client";

import { useSyncExternalStore } from "react";
import { VIDEO_PLATFORMS, type SocialVideo, type VideoPlatform } from "@/lib/videos/model";

/**
 * Discover + assistant settings, stored only in this browser (like the
 * kitchen). Nothing here is sent anywhere unless the user turns it on.
 */
export interface SavedIdea {
  platform: VideoPlatform;
  id: string;
  url: string;
  title: string;
  creator: string;
  thumbnailUrl?: string;
  savedAt: string;
}

export interface DiscoverSettings {
  /** Use kitchen, favourites and preferences to personalise Discover. */
  personalization: boolean;
  cuisines: string[];
  platforms: VideoPlatform[];
  /** Assistant may include the kitchen list when asking the AI. */
  shareKitchen: boolean;
  /** Use AI answers (only offered when the site has AI enabled). */
  useAi: boolean;
  savedIdeas: SavedIdea[];
}

const KEY = "fridge-rescue:discover";
const DEFAULTS: DiscoverSettings = { personalization: true, cuisines: [], platforms: [...VIDEO_PLATFORMS], shareKitchen: false, useAi: false, savedIdeas: [] };

let snapshot: DiscoverSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): DiscoverSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof DiscoverSettings, unknown>>;
  const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);
  return {
    personalization: typeof r.personalization === "boolean" ? r.personalization : DEFAULTS.personalization,
    cuisines: strings(r.cuisines, 30),
    platforms: strings(r.platforms, 3).filter((p): p is VideoPlatform => (VIDEO_PLATFORMS as readonly string[]).includes(p)),
    shareKitchen: r.shareKitchen === true,
    useAi: r.useAi === true,
    savedIdeas: Array.isArray(r.savedIdeas)
      ? (r.savedIdeas as SavedIdea[]).filter((s) => s && typeof s.id === "string" && typeof s.url === "string" && typeof s.title === "string").slice(0, 200)
      : [],
  };
}

function load() {
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    snapshot = raw ? sanitize(JSON.parse(raw)) : DEFAULTS;
    if (!snapshot.platforms.length) snapshot = { ...snapshot, platforms: [...VIDEO_PLATFORMS] };
  } catch {
    snapshot = DEFAULTS;
  }
}

export const discoverSettings = {
  get(): DiscoverSettings {
    if (!loaded && typeof window !== "undefined") load();
    return snapshot;
  },
  update(patch: Partial<DiscoverSettings>) {
    snapshot = { ...this.get(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(snapshot));
    } catch {
      /* storage blocked – keep in memory */
    }
    listeners.forEach((l) => l());
  },
  toggleSaved(video: SocialVideo): boolean {
    const s = this.get();
    const exists = s.savedIdeas.some((x) => x.platform === video.platform && x.id === video.id);
    this.update({
      savedIdeas: exists
        ? s.savedIdeas.filter((x) => !(x.platform === video.platform && x.id === video.id))
        : [{ platform: video.platform, id: video.id, url: video.url, title: video.title, creator: video.creator, thumbnailUrl: video.thumbnailUrl, savedAt: new Date().toISOString() }, ...s.savedIdeas],
    });
    return !exists;
  },
};

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      load();
      listeners.forEach((x) => x());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDiscoverSettings(): DiscoverSettings {
  return useSyncExternalStore(subscribe, () => discoverSettings.get(), () => DEFAULTS);
}
