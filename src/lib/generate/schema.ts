// Shapes for AI recipe generation (safe on server and client, no secrets).
import { z } from "zod";
import { DIETARY_TAGS } from "@/types";

/* ───────────── Choices offered in the UI ───────────── */

export const GEN_TAGS = ["quick", "high-protein", "healthy", "budget", "comfort", "adventurous", "viral", "surprise"] as const;
export type GenTag = (typeof GEN_TAGS)[number];
export const GEN_TAG_LABEL: Record<GenTag, string> = {
  quick: "Quick and easy",
  "high-protein": "High protein",
  healthy: "Healthy",
  budget: "Budget",
  comfort: "Comfort food",
  adventurous: "Something adventurous",
  viral: "Inspired by viral food",
  surprise: "Surprise me",
};

export const GEN_MODES = ["have", "shop"] as const;
export type GenMode = (typeof GEN_MODES)[number];
export const GEN_MODE_LABEL: Record<GenMode, string> = { have: "Only what I have", shop: "Shopping is okay" };

export const TWEAKS = ["more", "healthier", "cheaper", "spicy", "high-protein", "restaurant", "quicker", "cuisine"] as const;
export type Tweak = (typeof TWEAKS)[number];
export const TWEAK_LABEL: Record<Tweak, string> = {
  more: "3 more ideas",
  healthier: "Healthier",
  cheaper: "Cheaper",
  spicy: "Spicier",
  "high-protein": "More protein",
  restaurant: "Restaurant-style",
  quicker: "Quicker",
  cuisine: "Different cuisine",
};

/* ───────────── Request (from the browser – untrusted) ───────────── */

const text = (max: number) => z.string().trim().min(1).max(max);

export const pantryItemSchema = z.object({
  name: text(60),
  /** Free-text amount the user gave ("200 g", "2 pcs"), or null when unknown. */
  quantity: z.string().trim().max(30).nullable(),
});
export type PantryItem = z.infer<typeof pantryItemSchema>;

export const inspirationSchema = z.object({
  title: text(200),
  creator: text(100),
  platform: z.enum(["youtube", "tiktok", "instagram"]),
  url: z.string().url().max(300).startsWith("https://"),
});
export type Inspiration = z.infer<typeof inspirationSchema>;

export const generateContextSchema = z.object({
  ingredients: z.array(pantryItemSchema).min(1).max(40),
  /** Pantry basics the user explicitly said they have. Nothing else is assumed. */
  staples: z.array(text(40)).max(40),
  tags: z.array(z.enum(GEN_TAGS)).max(4),
  mode: z.enum(GEN_MODES),
  diets: z.array(z.enum(DIETARY_TAGS)).max(DIETARY_TAGS.length),
  /** Allergies and ingredients to avoid (names). */
  avoid: z.array(text(40)).max(40),
  servings: z.number().int().min(1).max(12),
  maxMinutes: z.number().int().positive().max(600).nullable(),
  inspiration: inspirationSchema.nullable(),
});
export type GenerateContext = z.infer<typeof generateContextSchema>;

export const ideaSchema = z.object({
  id: text(40),
  title: text(90),
  description: text(240),
  minutes: z.number().int().min(1).max(600),
  difficulty: z.enum(["easy", "medium", "hard"]),
  cuisine: z.string().trim().max(40),
  /** The user's own ingredients this idea uses. */
  uses: z.array(text(60)).max(40),
  /** Ingredients the user would need to buy. */
  missing: z.array(text(60)).max(20),
  /** Pantry basics used (only ones the user confirmed). */
  staples: z.array(text(40)).max(20),
  highlight: z.string().trim().max(160),
});
export type GeneratedIdea = z.infer<typeof ideaSchema>;

export const ideasRequestSchema = generateContextSchema.extend({
  kind: z.literal("ideas"),
  tweak: z.enum(TWEAKS).nullable(),
  /** Short conversational instruction ("no oven", "make it Korean"). */
  note: z.string().trim().max(200).optional(),
  /** Ideas already shown, so new ones differ. */
  previousTitles: z.array(text(90)).max(15),
  /** For tweaks: the idea being modified. */
  baseIdea: ideaSchema.nullable().optional(),
});

export const recipeRequestSchema = generateContextSchema.extend({
  kind: z.literal("recipe"),
  idea: ideaSchema,
});

export const generateRequestSchema = z.discriminatedUnion("kind", [ideasRequestSchema, recipeRequestSchema]);
export type IdeasRequest = z.infer<typeof ideasRequestSchema>;
export type RecipeRequest = z.infer<typeof recipeRequestSchema>;

/* ───────────── Model output (structured output – checked again afterwards) ───────────── */

export const aiIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      minutes: z.number(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      cuisine: z.string(),
      usesIngredients: z.array(z.string()),
      needsToBuy: z.array(z.string()),
      usesStaples: z.array(z.string()),
      highlight: z.string(),
    }),
  ),
});
export type AiIdeas = z.infer<typeof aiIdeasSchema>;

export const aiRecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number(),
  prepMinutes: z.number(),
  cookMinutes: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  cuisine: z.string(),
  equipment: z.array(z.string()),
  ingredients: z.array(
    z.object({
      name: z.string(),
      amount: z.number().nullable(),
      unit: z.string(),
      preparation: z.string(),
      source: z.enum(["have", "staple", "buy"]),
    }),
  ),
  steps: z.array(z.object({ text: z.string(), minutes: z.number().nullable(), uses: z.array(z.string()) })),
  substitutions: z.array(z.object({ ingredient: z.string(), swap: z.string(), note: z.string() })),
  safetyNotes: z.array(z.string()),
  tips: z.array(z.string()),
  videoSearch: z.string(),
});
export type AiRecipe = z.infer<typeof aiRecipeSchema>;

/* ───────────── Checked recipe (what the app shows, saves and syncs) ───────────── */

export const GEN_UNITS = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "pcs", "clove", "slice", "can", "pinch", "to taste"] as const;
export type GenUnit = (typeof GEN_UNITS)[number];

export const generatedRecipeSchema = z.object({
  id: text(40),
  kind: z.literal("ai"),
  createdAt: z.string().min(10).max(40),
  savedAt: z.string().min(10).max(40).optional(),
  title: text(90),
  description: z.string().max(400),
  servings: z.number().int().min(1).max(12),
  prepMinutes: z.number().int().min(0).max(600),
  cookMinutes: z.number().int().min(0).max(600),
  difficulty: z.enum(["easy", "medium", "hard"]),
  cuisine: z.string().max(40),
  mode: z.enum(GEN_MODES),
  equipment: z.array(z.string().max(60)).max(15),
  ingredients: z
    .array(
      z.object({
        name: text(80),
        amount: z.number().positive().max(10_000).nullable(),
        unit: z.enum(GEN_UNITS),
        preparation: z.string().max(120),
        source: z.enum(["have", "staple", "buy"]),
        /** What the user told us they have, e.g. "2 pcs" – or null when unknown. */
        youHave: z.string().max(30).nullable(),
      }),
    )
    .min(2)
    .max(30),
  steps: z.array(z.object({ text: z.string().min(3).max(600), minutes: z.number().int().min(1).max(600).nullable() })).min(2).max(20),
  substitutions: z.array(z.object({ ingredient: z.string().max(80), swap: z.string().max(120), note: z.string().max(200) })).max(10),
  /** App-written food safety guidance plus checked model notes. */
  safety: z.array(z.string().max(300)).max(10),
  tips: z.array(z.string().max(240)).max(6),
  /** Honest notes about amounts we don't know. */
  quantityNotes: z.array(z.string().max(200)).max(20),
  videoQuery: z.string().max(80),
  inspiration: inspirationSchema.nullable(),
  /** The user's ingredients the recipe was generated from. */
  basedOn: z.array(z.string().max(60)).max(40),
});
export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;

export const MAX_SAVED_AI_RECIPES = 100;
