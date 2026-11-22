import type { FreshnessStatus, InventoryItem } from "@/types";

/** Days before a use-by date we start highlighting an item. */
export const USE_BY_WARNING_DAYS = 2;
/** Days before a best-before date we start highlighting an item. */
export const BEST_BEFORE_WARNING_DAYS = 3;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Local calendar date as YYYY-MM-DD (client side). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole calendar days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export interface FreshnessInfo {
  status: FreshnessStatus;
  /** Days until the relevant date (negative = past). */
  days: number | null;
  /** Neutral, accurate label for the UI. */
  label: string;
}

/**
 * Freshness is based ONLY on dates the user entered. We never claim an item is
 * safe; use-by (safety) dates take priority over best-before (quality) dates.
 */
export function getFreshness(item: Pick<InventoryItem, "useBy" | "bestBefore">, today: string): FreshnessInfo {
  if (item.useBy && isIsoDate(item.useBy)) {
    const days = daysBetween(today, item.useBy);
    if (days < 0) return { status: "past-use-by", days, label: "Past its use-by date" };
    if (days <= USE_BY_WARNING_DAYS) {
      const label = days === 0 ? "Use by today" : days === 1 ? "Use by tomorrow" : `Use within ${days} days`;
      return { status: "use-soon", days, label };
    }
    if (!item.bestBefore) return { status: "ok", days, label: `Use by ${formatShortDate(item.useBy)}` };
  }
  if (item.bestBefore && isIsoDate(item.bestBefore)) {
    const days = daysBetween(today, item.bestBefore);
    if (days < 0) return { status: "past-best-before", days, label: "Past best-before – check quality" };
    if (days <= BEST_BEFORE_WARNING_DAYS) {
      const label = days === 0 ? "Best before today" : `Best before in ${days} day${days === 1 ? "" : "s"}`;
      return { status: "best-before-soon", days, label };
    }
    return { status: "ok", days, label: `Best before ${formatShortDate(item.bestBefore)}` };
  }
  if (item.useBy && isIsoDate(item.useBy)) {
    return { status: "ok", days: daysBetween(today, item.useBy), label: `Use by ${formatShortDate(item.useBy)}` };
  }
  return { status: "no-date", days: null, label: "No date added" };
}

export function formatShortDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function isUseSoon(status: FreshnessStatus): boolean {
  return status === "use-soon" || status === "best-before-soon";
}

/** Items not usable in recommendations (past a safety date). */
export function isExcludedFromMatching(status: FreshnessStatus): boolean {
  return status === "past-use-by";
}

export interface SoonItem {
  item: InventoryItem;
  freshness: FreshnessInfo;
}

/** Items approaching an entered date, most urgent first. Leftovers without dates are not included. */
export function getSoonToUseIngredients(inventory: InventoryItem[], today: string): SoonItem[] {
  return inventory
    .map((item) => ({ item, freshness: getFreshness(item, today) }))
    .filter(({ freshness }) => isUseSoon(freshness.status))
    .sort((a, b) => {
      const rank = (s: FreshnessStatus) => (s === "use-soon" ? 0 : 1);
      return (
        rank(a.freshness.status) - rank(b.freshness.status) ||
        (a.freshness.days ?? 0) - (b.freshness.days ?? 0) ||
        a.item.displayName.localeCompare(b.item.displayName) ||
        a.item.id.localeCompare(b.item.id)
      );
    });
}
