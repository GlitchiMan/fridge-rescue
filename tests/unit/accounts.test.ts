import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guestFingerprint, mergeGuestIntoAccount, threeWayMerge, toCloudState } from "@/lib/account/merge";
import { KitchenSync, type CloudKitchen, type SyncMeta, type SyncedStore } from "@/lib/account/sync";
import { createEmptyState } from "@/lib/storage/schema";
import { safeNextPath } from "@/lib/supabase/config";
import type { InventoryItem, StorageSchema } from "@/types";

const item = (id: string, ingredientId = "egg", quantity: number | null = 2): InventoryItem => ({ id, ingredientId, displayName: ingredientId, quantity, unit: "pcs", location: "fridge", addedAt: "2026-11-01T00:00:00.000Z" });
const state = (patch: Partial<StorageSchema> = {}): StorageSchema => ({ ...createEmptyState(), ...patch });

describe("safe redirects", () => {
  it("allows same-site paths only", () => {
    expect(safeNextPath("/account?x=1")).toBe("/account?x=1");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", null]) expect(safeNextPath(bad)).toBe("/my-fridge");
  });
});

describe("merging", () => {
  it("combines edits from two devices and honours deletes", () => {
    const base = state({ inventory: [item("a"), item("b")], favorites: ["x", "y"] });
    const local = state({ inventory: [item("a", "egg", 5), item("c")], favorites: ["x", "new-local"] });
    const remote = state({ inventory: [item("a"), item("b"), item("d")], favorites: ["x", "y", "new-remote"] });
    const m = threeWayMerge(base, local, remote);
    expect(m.inventory.map((i) => i.id).sort()).toEqual(["a", "c", "d"]);
    expect(m.inventory.find((i) => i.id === "a")!.quantity).toBe(5);
    expect(m.favorites.sort()).toEqual(["new-local", "new-remote", "x"]);
  });
  it("moves guest data without losing, doubling or weakening anything", () => {
    const guest = state({ inventory: [item("g1", "egg", 2), item("g2", "milk", 1)], favorites: ["soup"] });
    guest.preferences = { ...guest.preferences, excludedIngredients: ["peanut-butter"], diets: ["vegetarian"] };
    const account = state({ inventory: [item("a1", "egg", 2), item("a2", "egg", 6)], favorites: ["pasta"] });
    account.preferences = { ...account.preferences, maxMinutes: 30, excludedIngredients: ["mushrooms"] };
    const m = mergeGuestIntoAccount(guest, account);
    expect(m.inventory.map((i) => i.id)).toEqual(["a1", "a2", "g2"]);
    expect(m.favorites).toEqual(["pasta", "soup"]);
    expect(m.preferences.maxMinutes).toBe(30);
    expect(m.preferences.excludedIngredients.sort()).toEqual(["mushrooms", "peanut-butter"]);
    expect(m.preferences.diets).toEqual(["vegetarian"]);
  });
  it("recognises an already-imported guest kitchen", () => {
    const a = state({ favorites: ["soup"] });
    expect(guestFingerprint(a)).toBe(guestFingerprint({ ...a, consent: { ...a.consent, decided: true } }));
    expect(guestFingerprint(a)).not.toBe(guestFingerprint(state({ favorites: ["pasta"] })));
  });
  it("never sends browser consent to the cloud", () => {
    const s = state({ consent: { decided: true, analytics: true, advertising: true, updatedAt: "2026-11-01T00:00:00.000Z" } });
    expect(toCloudState(s).consent.advertising).toBe(false);
  });
});

function harness(initial: StorageSchema, remote: { data: StorageSchema; revision: number } | null = null) {
  const cloud = { row: remote, offline: false, pushes: 0 };
  const api: CloudKitchen = {
    async pull() {
      if (cloud.offline) throw new Error("offline");
      return cloud.row;
    },
    async push(data, expected) {
      if (cloud.offline) throw new Error("offline");
      cloud.pushes += 1;
      if ((cloud.row?.revision ?? null) !== expected) return { saved: false, revision: cloud.row?.revision ?? null };
      cloud.row = { data, revision: (expected ?? 0) + 1 };
      return { saved: true, revision: cloud.row.revision };
    },
  };
  const listeners = new Set<() => void>();
  const store: SyncedStore & { data: StorageSchema } = {
    data: initial,
    replaceAll(s) {
      this.data = s;
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  let meta: SyncMeta | null = null;
  const sync = new KitchenSync(api, store, { load: () => meta, save: (m) => { meta = m; }, clear: () => { meta = null; } }, () => {}, 60_000);
  return { cloud, store, sync };
}

describe("cloud sync", () => {
  it("loads an existing account on a new device", async () => {
    const h = harness(state(), { data: state({ favorites: ["soup"] }), revision: 3 });
    expect(await h.sync.start()).toBe(true);
    expect(h.store.data.favorites).toEqual(["soup"]);
    expect(h.cloud.pushes).toBe(0);
    h.sync.stop();
  });
  it("resolves a conflict without losing either device's change", async () => {
    const h = harness(state(), { data: state({ favorites: ["a"] }), revision: 1 });
    await h.sync.start();
    h.cloud.row = { data: state({ favorites: ["a", "other-device"] }), revision: 2 };
    h.store.replaceAll({ ...h.store.data, favorites: ["a", "this-device"] });
    expect(await h.sync.flush()).toBe(true);
    expect(h.cloud.row!.revision).toBe(3);
    expect([...h.cloud.row!.data.favorites].sort()).toEqual(["a", "other-device", "this-device"]);
    h.sync.stop();
  });
  it("reports failure while offline, then saves on retry", async () => {
    const h = harness(state(), { data: state(), revision: 1 });
    await h.sync.start();
    h.cloud.offline = true;
    h.store.replaceAll({ ...h.store.data, favorites: ["soup"] });
    expect(await h.sync.flush()).toBe(false);
    h.cloud.offline = false;
    expect(await h.sync.flush()).toBe(true);
    expect(h.cloud.row!.data.favorites).toEqual(["soup"]);
    h.sync.stop();
  });
});

describe("database security (real Postgres, Supabase-style roles)", () => {
  const A = "11111111-1111-1111-1111-111111111111";
  const B = "22222222-2222-2222-2222-222222222222";
  let db: PGlite;
  const as = async <T,>(role: "anon" | "authenticated", user: string | null, fn: () => Promise<T>) => {
    await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role;");
    }
  };
  const save = (data: object, rev: number | null) => db.query<{ saved: boolean; new_revision: number }>("select * from public.save_kitchen_state($1::jsonb, $2::bigint)", [JSON.stringify(data), rev]);

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.exec(readFileSync("supabase/migrations/20261123120000_accounts.sql", "utf8"));
    await db.query("insert into auth.users (id, raw_user_meta_data) values ($1, $2), ($3, '{}')", [A, JSON.stringify({ full_name: "Ann" }), B]);
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it("creates a profile for each new user", async () => {
    expect((await db.query("select id from public.profiles")).rows).toHaveLength(2);
  });
  it("isolates kitchens between users", async () => {
    await as("authenticated", A, () => save({ owner: "A" }, null));
    await as("authenticated", B, () => save({ owner: "B" }, null));
    const seen = await as("authenticated", A, () => db.query<{ user_id: string }>("select user_id from public.kitchen_states"));
    expect(seen.rows.map((r) => r.user_id)).toEqual([A]);
    const profiles = await as("authenticated", A, () => db.query<{ id: string }>("select id from public.profiles"));
    expect(profiles.rows.map((r) => r.id)).toEqual([A]);
  });
  it("blocks direct writes and anonymous access", async () => {
    await expect(as("authenticated", A, () => db.query("update public.kitchen_states set data = '{}'"))).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, () => db.query("delete from public.kitchen_states"))).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, () => db.query("select * from public.kitchen_states"))).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, () => save({}, null))).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, () => db.query("update public.profiles set id = $1", [B]))).rejects.toThrow(/permission denied/);
  });
  it("cannot change another user's profile", async () => {
    await as("authenticated", A, () => db.query("update public.profiles set display_name = 'hacked' where id = $1", [B]));
    expect((await db.query<{ display_name: string | null }>("select display_name from public.profiles where id = $1", [B])).rows[0]!.display_name).toBeNull();
  });
  it("stores valid appearance for the owner and rejects invalid values", async () => {
    await as("authenticated", A, () => db.query("update public.profiles set appearance = $1::jsonb where id = $2", [JSON.stringify({ palette: "sage", mode: "dark" }), A]));
    expect((await db.query<{ appearance: { palette: string } }>("select appearance from public.profiles where id = $1", [A])).rows[0]!.appearance.palette).toBe("sage");
    await expect(as("authenticated", A, () => db.query("update public.profiles set appearance = $1::jsonb where id = $2", [JSON.stringify({ palette: "neon", mode: "dark" }), A]))).rejects.toThrow(/check constraint/);
  });
  it("rejects oversized kitchens", async () => {
    await expect(as("authenticated", A, () => save({ blob: "x".repeat(2_000_001) }, 1))).rejects.toThrow(/check constraint/);
  });
  it("rejects stale saves", async () => {
    const r1 = await as("authenticated", A, () => save({ v: 2 }, 1));
    expect(r1.rows[0]).toMatchObject({ saved: true });
    const r2 = await as("authenticated", A, () => save({ v: "stale" }, 1));
    expect(r2.rows[0]!.saved).toBe(false);
  });
  it("deletes only the caller's account and data", async () => {
    await as("authenticated", B, () => db.query("select public.delete_my_account()"));
    expect((await db.query<{ id: string }>("select id from auth.users")).rows.map((r) => r.id)).toEqual([A]);
    expect((await db.query<{ user_id: string }>("select user_id from public.kitchen_states")).rows.map((r) => r.user_id)).toEqual([A]);
  });
});
