/**
 * Core domain model for Fridge Rescue.
 *
 * Assumptions (documented on purpose):
 * - Ingredients are referenced everywhere by a stable canonical `IngredientId`
 *   (kebab-case slug). Display names are never used as identifiers.
 * - A quantity can be explicitly unknown (`quantity: null`). Unknown is never
 *   silently turned into a number.
 * - Units are only converted inside the same physical dimension (mass, volume)
 *   or within the same count unit. Piece → gram conversion is only done with an
 *   explicit per-ingredient approximation and is flagged as approximate.
 * - Dates are stored as ISO calendar dates (YYYY-MM-DD) exactly as the user
 *   entered them; we never fabricate expiry dates.
 */

export type IngredientId = string;
export type RecipeId = string;

/* ----------------------------------------------------------------------------
 * Units & quantities
 * ------------------------------------------------------------------------- */

export const MASS_UNITS = ["g", "kg"] as const;
export const VOLUME_UNITS = ["ml", "l", "tsp", "tbsp", "cup"] as const;
export const COUNT_UNITS = ["pcs", "clove", "slice", "can", "pinch"] as const;
export const UNITS = [...MASS_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS] as const;

export type MassUnit = (typeof MASS_UNITS)[number];
export type VolumeUnit = (typeof VOLUME_UNITS)[number];
export type CountUnit = (typeof COUNT_UNITS)[number];
export type Unit = (typeof UNITS)[number];

export type Dimension = "mass" | "volume" | `count:${CountUnit}`;

/** A quantity whose amount may be explicitly unknown. */
export interface IngredientQuantity {
  quantity: number | null;
  unit: Unit;
}

/* ----------------------------------------------------------------------------
 * Ingredient catalog
 * ------------------------------------------------------------------------- */

export const INGREDIENT_CATEGORIES = [
  "vegetables",
  "fruits",
  "meat",
  "fish",
  "dairy",
  "eggs",
  "grains",
  "legumes",
  "canned",
  "herbs-spices",
  "sauces-oils",
  "frozen",
  "other",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const ALLERGENS = [
  "milk",
  "egg",
  "gluten",
  "fish",
  "shellfish",
  "soy",
  "peanuts",
  "tree-nuts",
  "sesame",
  "mustard",
  "celery",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

/** What kind of animal product an ingredient is (drives diet labels). */
export type AnimalSource = "meat" | "fish" | "dairy" | "egg" | "honey";

export interface Ingredient {
  id: IngredientId;
  /** Display name, e.g. "Eggs". */
  name: string;
  /** Noun used with counts: { one: "egg", other: "eggs" }. */
  noun?: { one: string; other: string };
  aliases: string[];
  category: IngredientCategory;
  defaultUnit: Unit;
  defaultLocation: StorageLocation;
  animal?: AnimalSource;
  /** true = contains gluten; "maybe" = often contains gluten (e.g. soy sauce, oats, stock). */
  gluten?: boolean | "maybe";
  allergens?: Allergen[];
  /** Approximate weight of one piece (for clearly-labelled approximations only). */
  approxGramsPerPiece?: number;
  /** Shown as one-tap quick add. */
  quickAdd?: boolean;
  /** Commonly kept as a pantry staple. */
  stapleCandidate?: boolean;
  /** Colour used for the original recipe illustrations. */
  color: string;
}

/* ----------------------------------------------------------------------------
 * Inventory
 * ------------------------------------------------------------------------- */

export const STORAGE_LOCATIONS = ["fridge", "freezer", "pantry", "other"] as const;
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];

export type FoodDateType = "use-by" | "best-before";

export interface InventoryItem {
  id: string;
  ingredientId: IngredientId;
  displayName: string;
  quantity: number | null;
  unit: Unit;
  location: StorageLocation;
  /** ISO date (YYYY-MM-DD). Safety-related date printed on the label. */
  useBy?: string;
  /** ISO date (YYYY-MM-DD). Quality-related date printed on the label. */
  bestBefore?: string;
  /** ISO timestamp. */
  addedAt: string;
  notes?: string;
  isLeftover?: boolean;
}

export type FreshnessStatus =
  | "past-use-by"
  | "use-soon"
  | "past-best-before"
  | "best-before-soon"
  | "ok"
  | "no-date";

/* ----------------------------------------------------------------------------
 * Recipes
 * ------------------------------------------------------------------------- */

export const RECIPE_CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "soup",
  "salad",
  "one-pot",
  "pasta",
  "rice",
  "vegetarian",
  "budget",
  "quick",
  "leftovers",
] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export const DIFFICULTIES = ["easy", "medium", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EQUIPMENT = [
  "stovetop",
  "oven",
  "microwave",
  "air-fryer",
  "blender",
  "toaster",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const DIETARY_TAGS = ["vegetarian", "vegan", "dairy-free", "gluten-free"] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export interface RecipeIngredient {
  ingredientId: IngredientId;
  /** Optional override for how the ingredient is named in this recipe. */
  displayName?: string;
  /** `null` only allowed together with `toTaste: true`. */
  quantity: number | null;
  unit: Unit;
  optional?: boolean;
  toTaste?: boolean;
  preparationNote?: string;
}

export interface IngredientSubstitution {
  /** Ingredient being replaced. */
  ingredientId: IngredientId;
  substituteId: IngredientId;
  /** Amount of substitute per 1 unit of the original ingredient. */
  ratio: number;
  /** Unit of the substitute amount. Defaults to the original ingredient's unit. */
  unit?: Unit;
  note: string;
}

export interface RecipeStep {
  text: string;
  /** Optional suggested timer in minutes. */
  timerMinutes?: number;
}

export interface Recipe {
  id: RecipeId;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  categories: RecipeCategory[];
  cuisine: string;
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  equipment: Equipment[];
  substitutions: IngredientSubstitution[];
  tips: string[];
  storageNotes?: string;
  /** Why this recipe works – genuinely helpful content. */
  whyItWorks?: string;
  relatedRecipes: RecipeId[];
}

/** Lightweight recipe shape shipped to client components for matching. */
export type RecipeSummary = Pick<
  Recipe,
  | "id"
  | "slug"
  | "title"
  | "shortDescription"
  | "categories"
  | "difficulty"
  | "totalMinutes"
  | "servings"
  | "ingredients"
  | "equipment"
  | "substitutions"
  | "cuisine"
> & { dietaryTags: DietaryTag[] };

/* ----------------------------------------------------------------------------
 * Matching
 * ------------------------------------------------------------------------- */

export type IngredientMatchStatus =
  /** Have it, known quantity is enough. */
  | "enough"
  /** Have it, but known quantity is too little. */
  | "insufficient"
  /** Have it, quantity unknown. */
  | "unknown-quantity"
  /** User marked it as a pantry staple. */
  | "staple"
  /** Not available. */
  | "missing";

export interface IngredientMatch {
  ingredientId: IngredientId;
  name: string;
  optional: boolean;
  status: IngredientMatchStatus;
  /** Set when a recipe-approved substitute is what we found. */
  substitutedBy?: { ingredientId: IngredientId; name: string; note: string };
  /** Required amount (scaled). */
  required: IngredientQuantity;
  /** Shortfall when status is "insufficient". */
  shortfall?: IngredientQuantity;
  /** True when the comparison relied on a per-piece weight approximation. */
  approximate?: boolean;
  /** Inventory item ids involved (for deduction). */
  inventoryItemIds: string[];
  usesSoonItem?: boolean;
}

export type Readiness =
  /** Every essential ingredient is available in sufficient known quantity. */
  | "ready"
  /** Every essential ingredient is present but some quantities are unknown. */
  | "check-quantities"
  /** Present, but at least one known quantity is too low. */
  | "short"
  /** At least one essential ingredient is missing. */
  | "missing";

export interface RecipeMatch {
  recipeId: RecipeId;
  slug: string;
  score: number;
  readiness: Readiness;
  essentialTotal: number;
  essentialHave: number;
  missing: IngredientMatch[];
  insufficient: IngredientMatch[];
  matches: IngredientMatch[];
  usesSoon: string[];
  explanation: string[];
}

/* ----------------------------------------------------------------------------
 * User data
 * ------------------------------------------------------------------------- */

export type MeasurementPreference = "metric" | "us";

export interface UserPreferences {
  maxMinutes: number | null;
  servings: number;
  diets: DietaryTag[];
  excludedIngredients: IngredientId[];
  /** Empty array = "not specified" → do not filter by equipment. */
  equipment: Equipment[];
  pantryStaples: IngredientId[];
  measurement: MeasurementPreference;
}

export interface ShoppingListItem {
  id: string;
  ingredientId: IngredientId | null;
  name: string;
  quantity: number | null;
  unit: Unit | null;
  purchased: boolean;
  /** Recipe ids this item was added for. */
  sourceRecipeIds: RecipeId[];
  addedAt: string;
}

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface MealPlanEntry {
  id: string;
  day: Weekday;
  slot: MealSlot;
  recipeId: RecipeId;
  servings: number;
}

export interface CookingHistoryEntry {
  id: string;
  recipeId: RecipeId;
  cookedAt: string;
  servings: number;
  deductedInventory: boolean;
}

export interface ConsentSettings {
  /** Whether the user made an explicit choice. */
  decided: boolean;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string | null;
}

// Generated recipes are stored alongside kitchen data so they sync with accounts.
import type { GeneratedRecipe } from "@/lib/generate/schema";

export interface StorageSchemaV1 {
  version: 1;
  inventory: InventoryItem[];
  preferences: UserPreferences;
  favorites: RecipeId[];
  shoppingList: ShoppingListItem[];
  mealPlan: MealPlanEntry[];
  history: CookingHistoryEntry[];
  consent: ConsentSettings;
  /** AI recipes the user chose to save (optional field, added without a version bump). */
  generatedRecipes: GeneratedRecipe[];
}

export type StorageSchema = StorageSchemaV1;
