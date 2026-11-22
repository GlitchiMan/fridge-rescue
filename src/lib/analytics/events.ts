/**
 * Privacy-conscious analytics event layer.
 *
 * - No third-party analytics is loaded by default; `track()` is a no-op until
 *   a sink is registered AND the user consented to analytics.
 * - Event payloads are deliberately coarse: we never send inventory contents,
 *   ingredient names, notes, dates or any free text.
 */
export type AnalyticsEvent =
  | { name: "homepage_visited" }
  | { name: "ingredient_added"; props: { source: "home" | "fridge" | "quick-add" | "shopping" } }
  | { name: "recipe_search_completed"; props: { resultCount: number; ingredientCount: number } }
  | { name: "recipe_opened"; props: { slug: string } }
  | { name: "recipe_saved"; props: { slug: string } }
  | { name: "shopping_item_added"; props: { count: number } }
  | { name: "meal_planned" }
  | { name: "recipe_cooked"; props: { slug: string; deducted: boolean } };

export type AnalyticsSink = (event: AnalyticsEvent) => void;

let sink: AnalyticsSink | null = null;
let consentGranted = false;

/** Register a sink (e.g. a privacy-friendly analytics provider) – not done by default. */
export function registerAnalyticsSink(next: AnalyticsSink | null) {
  sink = next;
}

export function setAnalyticsConsent(granted: boolean) {
  consentGranted = granted;
}

export function track(event: AnalyticsEvent) {
  if (!sink || !consentGranted) return;
  try {
    sink(event);
  } catch {
    /* analytics must never break the app */
  }
}
