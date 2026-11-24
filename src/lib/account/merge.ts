import { DEFAULT_CONSENT, DEFAULT_PREFERENCES } from "@/lib/storage/schema";
import type { StorageSchema, UserPreferences } from "@/types";

/** Consent is a per-browser choice, so it is never stored in the cloud. */
export function toCloudState(state: StorageSchema): StorageSchema {
  return { ...state, consent: { ...DEFAULT_CONSENT } };
}

export function sameCloudState(a: StorageSchema, b: StorageSchema): boolean {
  return JSON.stringify(toCloudState(a)) === JSON.stringify(toCloudState(b));
}

export function hasKitchenData(s: StorageSchema): boolean {
  return Boolean(
    s.inventory.length || s.favorites.length || s.generatedRecipes.length || s.shoppingList.length || s.mealPlan.length || s.history.length || JSON.stringify(s.preferences) !== JSON.stringify(DEFAULT_PREFERENCES),
  );
}

/** Identifies a guest kitchen so an already-imported copy is not offered again. */
export function guestFingerprint(s: StorageSchema): string {
  const text = JSON.stringify(toCloudState(s));
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return `${text.length}:${h.toString(36)}`;
}

function mergeById<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const baseById = new Map(base.map((x) => [x.id, x]));
  const localById = new Map(local.map((x) => [x.id, x]));
  const out: T[] = [];
  for (const r of remote) {
    const l = localById.get(r.id);
    const b = baseById.get(r.id);
    if (!l) {
      // Deleted here and untouched remotely → stays deleted. A remote edit wins over a local delete.
      if (b && JSON.stringify(b) === JSON.stringify(r)) continue;
      out.push(r);
    } else {
      out.push(b && JSON.stringify(l) === JSON.stringify(b) ? r : l);
    }
  }
  const remoteIds = new Set(remote.map((x) => x.id));
  for (const l of local) {
    if (remoteIds.has(l.id)) continue;
    const b = baseById.get(l.id);
    // Deleted remotely and unchanged here → stays deleted.
    if (b && JSON.stringify(b) === JSON.stringify(l)) continue;
    out.push(l);
  }
  return out;
}

function mergeSet(base: string[], local: string[], remote: string[]): string[] {
  const removed = new Set([...base.filter((x) => !local.includes(x)), ...base.filter((x) => !remote.includes(x))]);
  return Array.from(new Set([...remote, ...local])).filter((x) => !removed.has(x));
}

/** Combine edits made on two devices since their last shared version. */
export function threeWayMerge(base: StorageSchema, local: StorageSchema, remote: StorageSchema): StorageSchema {
  const preferences = { ...remote.preferences } as UserPreferences;
  for (const key of Object.keys(preferences) as (keyof UserPreferences)[]) {
    if (JSON.stringify(local.preferences[key]) !== JSON.stringify(base.preferences[key])) {
      (preferences as unknown as Record<string, unknown>)[key] = local.preferences[key];
    }
  }
  return {
    ...remote,
    inventory: mergeById(base.inventory, local.inventory, remote.inventory),
    shoppingList: mergeById(base.shoppingList, local.shoppingList, remote.shoppingList),
    mealPlan: mergeById(base.mealPlan, local.mealPlan, remote.mealPlan),
    history: mergeById(base.history, local.history, remote.history),
    favorites: mergeSet(base.favorites, local.favorites, remote.favorites),
    generatedRecipes: mergeById(base.generatedRecipes, local.generatedRecipes, remote.generatedRecipes),
    preferences,
    consent: local.consent,
  };
}

function uniqueBy<T>(items: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Bring guest data into an account without losing either side. Exact duplicates
 * collapse; amounts are never added together because both lists may describe
 * the same food. Dietary rules and exclusions are combined, so a safety
 * preference from either side is always kept.
 */
export function mergeGuestIntoAccount(guest: StorageSchema, account: StorageSchema): StorageSchema {
  const accountIsDefault = JSON.stringify(account.preferences) === JSON.stringify(DEFAULT_PREFERENCES);
  const main = accountIsDefault ? guest.preferences : account.preferences;
  return {
    ...account,
    inventory: uniqueBy([...account.inventory, ...guest.inventory], (i) => JSON.stringify([i.ingredientId, i.quantity, i.unit, i.location, i.useBy ?? "", i.bestBefore ?? "", Boolean(i.isLeftover)])),
    favorites: Array.from(new Set([...account.favorites, ...guest.favorites])),
    generatedRecipes: uniqueBy([...account.generatedRecipes, ...guest.generatedRecipes], (r) => r.id),
    shoppingList: uniqueBy([...account.shoppingList, ...guest.shoppingList], (i) => JSON.stringify([i.ingredientId ?? i.name.toLowerCase(), i.quantity, i.unit, i.purchased])),
    mealPlan: uniqueBy([...account.mealPlan, ...guest.mealPlan], (m) => `${m.day}:${m.slot}:${m.recipeId}`),
    history: uniqueBy([...account.history, ...guest.history], (h) => `${h.recipeId}:${h.cookedAt}`).sort((a, b) => b.cookedAt.localeCompare(a.cookedAt)),
    preferences: {
      ...main,
      diets: Array.from(new Set([...account.preferences.diets, ...guest.preferences.diets])),
      excludedIngredients: Array.from(new Set([...account.preferences.excludedIngredients, ...guest.preferences.excludedIngredients])),
      pantryStaples: Array.from(new Set([...account.preferences.pantryStaples, ...guest.preferences.pantryStaples])),
    },
  };
}
