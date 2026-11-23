import "server-only";
import { dayKey, getStore } from "./store";

/** Short-window limiter per instance (burst protection). */
const windows = new Map<string, number[]>();

export function burstLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    windows.set(key, hits);
    return false;
  }
  hits.push(now);
  windows.set(key, hits);
  if (windows.size > 5_000) windows.clear(); // bounded memory
  return true;
}

/** Daily counter in the shared store (per user key or global). */
export async function dailyCount(name: string, increment = 0): Promise<number> {
  const store = getStore();
  const key = `count:${name}:${dayKey()}`;
  const current = (await store.get<number>(key)) ?? 0;
  if (increment) await store.set(key, current + increment, 60 * 60 * 26);
  return current + increment;
}

/** Best-effort client identifier. Never stored in clear text. */
export async function clientKey(headers: Headers): Promise<string> {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  const data = new TextEncoder().encode(`fr:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}
