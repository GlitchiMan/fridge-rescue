import { z } from "zod";
import { generatedRecipeSchema, MAX_SAVED_AI_RECIPES } from "@/lib/generate/schema";
import { isIsoDate } from "@/lib/matching/freshness";
import {
  DIETARY_TAGS,
  EQUIPMENT,
  MEAL_SLOTS,
  STORAGE_LOCATIONS,
  UNITS,
  WEEKDAYS,
  type StorageSchema,
  type UserPreferences,
  type ConsentSettings,
} from "@/types";

export const CURRENT_SCHEMA_VERSION = 1 as const;

const id = z.string().min(1).max(200);
const isoDate = z.string().refine(isIsoDate, "Invalid date");
const isoTimestamp = z.string().min(10).max(40);
const shortText = (max: number) => z.string().max(max);

export const inventoryItemSchema = z.object({
  id,
  ingredientId: id,
  displayName: shortText(120).min(1),
  quantity: z.number().finite().nonnegative().max(1_000_000).nullable(),
  unit: z.enum(UNITS),
  location: z.enum(STORAGE_LOCATIONS),
  useBy: isoDate.optional(),
  bestBefore: isoDate.optional(),
  addedAt: isoTimestamp,
  notes: shortText(500).optional(),
  isLeftover: z.boolean().optional(),
});

export const preferencesSchema = z.object({
  maxMinutes: z.number().int().positive().max(600).nullable(),
  servings: z.number().int().min(1).max(20),
  diets: z.array(z.enum(DIETARY_TAGS)).max(DIETARY_TAGS.length),
  excludedIngredients: z.array(id).max(200),
  equipment: z.array(z.enum(EQUIPMENT)).max(EQUIPMENT.length),
  pantryStaples: z.array(id).max(200),
  measurement: z.enum(["metric", "us"]),
});

export const shoppingItemSchema = z.object({
  id,
  ingredientId: id.nullable(),
  name: shortText(120).min(1),
  quantity: z.number().finite().nonnegative().max(1_000_000).nullable(),
  unit: z.enum(UNITS).nullable(),
  purchased: z.boolean(),
  sourceRecipeIds: z.array(id).max(100),
  addedAt: isoTimestamp,
});

export const mealPlanEntrySchema = z.object({
  id,
  day: z.enum(WEEKDAYS),
  slot: z.enum(MEAL_SLOTS),
  recipeId: id,
  servings: z.number().int().min(1).max(20),
});

export const historyEntrySchema = z.object({
  id,
  recipeId: id,
  cookedAt: isoTimestamp,
  servings: z.number().int().min(1).max(50),
  deductedInventory: z.boolean(),
});

export const consentSchema = z.object({
  decided: z.boolean(),
  analytics: z.boolean(),
  advertising: z.boolean(),
  updatedAt: isoTimestamp.nullable(),
});

export const DEFAULT_PREFERENCES: UserPreferences = {
  maxMinutes: null,
  servings: 2,
  diets: [],
  excludedIngredients: [],
  equipment: [],
  // Tap water is assumed by default; users can switch this off in Preferences.
  pantryStaples: ["water"],
  measurement: "metric",
};

export const DEFAULT_CONSENT: ConsentSettings = {
  decided: false,
  analytics: false,
  advertising: false,
  updatedAt: null,
};

export function createEmptyState(): StorageSchema {
  return {
    version: CURRENT_SCHEMA_VERSION,
    inventory: [],
    preferences: { ...DEFAULT_PREFERENCES, pantryStaples: [...DEFAULT_PREFERENCES.pantryStaples] },
    favorites: [],
    shoppingList: [],
    mealPlan: [],
    history: [],
    consent: { ...DEFAULT_CONSENT },
    generatedRecipes: [],
  };
}

const LIMITS = { inventory: 1000, favorites: 1000, shoppingList: 1000, mealPlan: 500, history: 2000 };

/** Validate an array leniently: keep valid entries, drop invalid ones. */
function salvageArray<T>(value: unknown, schema: z.ZodType<T>, max: number, issues: string[], label: string): T[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) issues.push(`${label}: not a list – reset`);
    return [];
  }
  const out: T[] = [];
  let dropped = 0;
  for (const entry of value.slice(0, max)) {
    const r = schema.safeParse(entry);
    if (r.success) out.push(r.data);
    else dropped += 1;
  }
  if (dropped) issues.push(`${label}: ${dropped} invalid entr${dropped === 1 ? "y" : "ies"} skipped`);
  if (value.length > max) issues.push(`${label}: truncated to ${max} entries`);
  return out;
}

export interface ParseResult {
  state: StorageSchema;
  issues: string[];
  /** false when the input was unusable / unsupported. */
  ok: boolean;
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations from version N to N+1. Add entries here when the schema changes,
 * e.g. `1: (d) => ({ ...d, version: 2, newField: [] })`.
 */
export const MIGRATIONS: Record<number, Migration> = {};

export function migrate(data: Record<string, unknown>): Record<string, unknown> | null {
  let current = data;
  let version = typeof current.version === "number" ? current.version : 1;
  if (version > CURRENT_SCHEMA_VERSION) return null; // created by a newer app version
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    current = step(current);
    version += 1;
  }
  return current;
}

/**
 * Parse untrusted data (localStorage or an imported backup) into a valid state.
 * Never throws. Invalid sections are reset; invalid entries are skipped.
 */
export function parseStoredState(raw: unknown): ParseResult {
  const issues: string[] = [];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { state: createEmptyState(), issues: ["Data is not a Fridge Rescue backup"], ok: false };
  }
  const migrated = migrate(raw as Record<string, unknown>);
  if (!migrated) {
    return { state: createEmptyState(), issues: ["Unsupported data version"], ok: false };
  }
  const base = createEmptyState();

  const prefs = preferencesSchema.safeParse(migrated.preferences);
  if (!prefs.success && migrated.preferences !== undefined) issues.push("preferences: invalid – reset to defaults");
  const consent = consentSchema.safeParse(migrated.consent);
  if (!consent.success && migrated.consent !== undefined) issues.push("consent: invalid – reset");

  const favorites = salvageArray(migrated.favorites, id, LIMITS.favorites, issues, "favorites");

  return {
    ok: true,
    issues,
    state: {
      version: CURRENT_SCHEMA_VERSION,
      inventory: salvageArray(migrated.inventory, inventoryItemSchema, LIMITS.inventory, issues, "inventory"),
      preferences: prefs.success ? prefs.data : base.preferences,
      favorites: Array.from(new Set(favorites)),
      shoppingList: salvageArray(migrated.shoppingList, shoppingItemSchema, LIMITS.shoppingList, issues, "shopping list"),
      mealPlan: salvageArray(migrated.mealPlan, mealPlanEntrySchema, LIMITS.mealPlan, issues, "meal plan"),
      history: salvageArray(migrated.history, historyEntrySchema, LIMITS.history, issues, "cooking history"),
      consent: consent.success ? consent.data : base.consent,
      // Older data has no saved AI recipes – an empty list is the right default.
      generatedRecipes: salvageArray(migrated.generatedRecipes ?? [], generatedRecipeSchema, MAX_SAVED_AI_RECIPES, issues, "saved AI recipes"),
    },
  };
}

/** Strictly parse a JSON backup string. */
export function parseBackupJson(text: string, maxBytes = 2_000_000): ParseResult {
  if (text.length > maxBytes) {
    return { state: createEmptyState(), issues: ["File is too large"], ok: false };
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { state: createEmptyState(), issues: ["File is not valid JSON"], ok: false };
  }
  if (!data || typeof data !== "object" || (data as { app?: unknown }).app !== "fridge-rescue") {
    return { state: createEmptyState(), issues: ["This file doesn't look like a Fridge Rescue backup"], ok: false };
  }
  return parseStoredState((data as { data?: unknown }).data);
}

export function createBackup(state: StorageSchema, now = new Date()): string {
  return JSON.stringify({ app: "fridge-rescue", exportedAt: now.toISOString(), data: state }, null, 2);
}
