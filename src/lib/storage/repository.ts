import type { StorageSchema } from "@/types";
import { parseStoredState, type ParseResult } from "./schema";

/**
 * Data-access abstraction. The MVP uses the browser's localStorage; a cloud
 * implementation (e.g. Supabase) can implement the same interface later
 * without touching UI components.
 */
export interface KitchenRepository {
  /** Whether persistent storage is usable in this environment. */
  isAvailable(): boolean;
  load(): ParseResult | null;
  save(state: StorageSchema): boolean;
  clear(): void;
  /** Notify when another tab changed the data. Returns an unsubscribe fn. */
  onExternalChange(callback: () => void): () => void;
}

export const STORAGE_KEY = "fridge-rescue:data";

export class LocalStorageRepository implements KitchenRepository {
  constructor(private readonly key: string = STORAGE_KEY) {}

  private storage(): Storage | null {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null; // e.g. blocked third-party storage
    }
  }

  isAvailable(): boolean {
    const s = this.storage();
    if (!s) return false;
    try {
      const probe = `${this.key}:probe`;
      s.setItem(probe, "1");
      s.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  load(): ParseResult | null {
    const s = this.storage();
    if (!s) return null;
    let raw: string | null = null;
    try {
      raw = s.getItem(this.key);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      return parseStoredState(JSON.parse(raw));
    } catch {
      return { ...parseStoredState(null), issues: ["Saved data was corrupted and has been reset"] };
    }
  }

  save(state: StorageSchema): boolean {
    const s = this.storage();
    if (!s) return false;
    try {
      s.setItem(this.key, JSON.stringify(state));
      return true;
    } catch {
      return false; // quota exceeded or storage disabled
    }
  }

  clear(): void {
    try {
      this.storage()?.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }

  onExternalChange(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key === this.key || e.key === null) callback();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}
