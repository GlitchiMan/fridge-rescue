"use client";

import { useEffect, useSyncExternalStore } from "react";
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, parseAppearance, resolveMode, type Appearance } from "./appearance";

let current: Appearance = DEFAULT_APPEARANCE;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Appearance {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    return (raw && parseAppearance(JSON.parse(raw))) || DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE; // private browsing or blocked storage
  }
}

function paint(a: Appearance) {
  const root = document.documentElement;
  root.dataset.palette = a.palette;
  root.dataset.mode = resolveMode(a.mode, window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export const appearanceStore = {
  get(): Appearance {
    if (!loaded && typeof window !== "undefined") {
      loaded = true;
      current = read();
    }
    return current;
  },
  set(next: Appearance) {
    current = next;
    loaded = true;
    try {
      window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
    } catch {
      /* still applies for this visit */
    }
    paint(next);
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      appearanceStore.subscribe(l);
      return () => void listeners.delete(l);
    },
    () => appearanceStore.get(),
    () => DEFAULT_APPEARANCE,
  );
}

/** Keeps "system" in step with the OS and other tabs. */
export function ThemeWatcher() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => paint(appearanceStore.get());
    const onStorage = (e: StorageEvent) => {
      if (e.key === APPEARANCE_KEY) appearanceStore.set(read());
    };
    media.addEventListener("change", onSystem);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
