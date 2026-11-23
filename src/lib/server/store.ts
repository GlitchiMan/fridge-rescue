import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Shared server-side key/value store for public data (video metadata, trend
 * snapshots, quota and spend counters). Personal kitchen data never goes here.
 *
 * - Production (serverless): set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   (free tier is enough). Serverless file systems are not permanent.
 * - Local development: JSON files in ./.data (git-ignored).
 * - If neither works, an in-memory map (lost on restart) keeps the app running.
 */
export interface KeyValueStore {
  readonly kind: "upstash" | "file" | "memory";
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

interface Envelope<T> {
  v: T;
  exp: number | null;
}

class MemoryStore implements KeyValueStore {
  readonly kind = "memory" as const;
  private map = new Map<string, Envelope<unknown>>();
  async get<T>(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return e.v as T;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    this.map.set(key, { v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
  }
}

class FileStore implements KeyValueStore {
  readonly kind = "file" as const;
  private memory = new MemoryStore();
  constructor(private readonly dir: string) {}
  private path(key: string) {
    return join(this.dir, `${key.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 180)}.json`);
  }
  async get<T>(key: string) {
    const hit = await this.memory.get<T>(key);
    if (hit !== null) return hit;
    try {
      const e = JSON.parse(await readFile(this.path(key), "utf8")) as Envelope<T>;
      if (e.exp && e.exp < Date.now()) return null;
      await this.memory.set(key, e.v, e.exp ? Math.max(1, Math.round((e.exp - Date.now()) / 1000)) : undefined);
      return e.v;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    await this.memory.set(key, value, ttlSeconds);
    const env: Envelope<T> = { v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null };
    try {
      await mkdir(dirname(this.path(key)), { recursive: true });
      await writeFile(this.path(key), JSON.stringify(env));
    } catch {
      /* read-only file system – memory copy still serves this instance */
    }
  }
}

class UpstashStore implements KeyValueStore {
  readonly kind = "upstash" as const;
  constructor(private readonly url: string, private readonly token: string) {}
  private async call(command: unknown[]): Promise<unknown> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`Store error ${res.status}`);
    return ((await res.json()) as { result: unknown }).result;
  }
  async get<T>(key: string) {
    try {
      const raw = await this.call(["GET", key]);
      return typeof raw === "string" ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  async set<T>(key: string, value: T, ttlSeconds?: number) {
    const cmd: unknown[] = ["SET", key, JSON.stringify(value)];
    if (ttlSeconds) cmd.push("EX", Math.round(ttlSeconds));
    await this.call(cmd).catch(() => undefined);
  }
}

let instance: KeyValueStore | null = null;

export function getStore(): KeyValueStore {
  if (instance) return instance;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) instance = new UpstashStore(url, token);
  else if (process.env.VERCEL) instance = new MemoryStore();
  else instance = new FileStore(join(process.cwd(), ".data"));
  return instance;
}

/** UTC day key, e.g. "2026-11-22". */
export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** YouTube quota resets at midnight Pacific Time. */
export function pacificDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
