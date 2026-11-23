import { NextResponse } from "next/server";
import { z } from "zod";
import { getIngredient } from "@/data/ingredients";
import { getRecipeSummaries } from "@/data/recipes";
import { aiSpendToday, getAiProvider, recordAiSpend } from "@/lib/ai/provider";
import { enhanceWithAi } from "@/lib/assistant/ai";
import { parseQuestion } from "@/lib/assistant/intent";
import { answerLocally, type AssistantContext } from "@/lib/assistant/local";
import { todayIso } from "@/lib/matching/freshness";
import { getServerConfig } from "@/lib/server/config";
import { burstLimit, clientKey, dailyCount } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";
import { DIETARY_TAGS, EQUIPMENT, UNITS, type InventoryItem } from "@/types";

export const dynamic = "force-dynamic";

/** Whether the AI layer is available (no secrets exposed). */
export async function GET() {
  const { ai } = getServerConfig();
  return NextResponse.json({ aiEnabled: ai.enabled, perUserDailyLimit: ai.enabled ? ai.perUserDailyLimit : 0 });
}

const id = z.string().min(1).max(60).regex(/^[a-z0-9-]+$/);
const bodySchema = z.object({
  message: z.string().trim().min(2).max(500),
  /** Only sent when the user allowed the assistant to read their kitchen. */
  inventory: z
    .array(
      z.object({
        ingredientId: id,
        quantity: z.number().finite().nonnegative().max(1_000_000).nullable(),
        unit: z.enum(UNITS),
        useBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        bestBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        isLeftover: z.boolean().optional(),
      }),
    )
    .max(300)
    .nullable(),
  preferences: z.object({
    diets: z.array(z.enum(DIETARY_TAGS)).max(4),
    excludedIngredients: z.array(id).max(100),
    equipment: z.array(z.enum(EQUIPMENT)).max(10),
    maxMinutes: z.number().int().positive().max(600).nullable(),
    pantryStaples: z.array(id).max(100),
  }),
  favorites: z.array(id).max(200),
  videoTitle: z.string().max(200).optional(),
});

async function hash(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  const config = getServerConfig();
  const provider = getAiProvider();
  if (!provider) return NextResponse.json({ error: "AI is not enabled on this site." }, { status: 503 });

  const who = await clientKey(req.headers);
  if (!burstLimit(`ai:${who}`, 6, 60_000)) return NextResponse.json({ error: "Too many questions at once – try again in a minute." }, { status: 429 });

  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await req.text();
    if (raw.length > 60_000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = bodySchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const recipes = getRecipeSummaries();
  const inventory: InventoryItem[] | null = body.inventory
    ? body.inventory
        .filter((i) => getIngredient(i.ingredientId))
        .map((i, n) => ({ ...i, id: `k${n}`, displayName: getIngredient(i.ingredientId)!.name, location: getIngredient(i.ingredientId)!.defaultLocation, addedAt: "" }))
    : null;
  const ctx: AssistantContext = {
    recipes,
    inventory,
    preferences: {
      ...body.preferences,
      excludedIngredients: body.preferences.excludedIngredients.filter((x) => getIngredient(x)),
      pantryStaples: body.preferences.pantryStaples.filter((x) => getIngredient(x)),
    },
    favorites: body.favorites.filter((f) => recipes.some((r) => r.id === f)),
    today: todayIso(),
  };

  const wide = answerLocally(body.message, ctx, 8);
  const local = { ...wide, picks: wide.picks.slice(0, 4) };

  // Limits: per-visitor daily requests and a global daily spend ceiling.
  if ((await dailyCount(`ai-user:${who}`)) >= config.ai.perUserDailyLimit) {
    return NextResponse.json({ answer: local, fallback: "You've reached today's limit for AI answers – showing smart matches instead." });
  }
  if ((await aiSpendToday()) >= config.ai.dailyBudgetUsd) {
    return NextResponse.json({ answer: local, fallback: "AI answers are paused for today – showing smart matches instead." });
  }

  const q = parseQuestion(body.message);
  const filters = [
    q.maxMinutes ? `max ${q.maxMinutes} min` : "",
    [...q.diets, ...ctx.preferences.diets].join(", "),
    q.noOven ? "no oven" : "",
    q.avoid.length ? `avoid ${q.avoid.join(", ")}` : "",
    ctx.preferences.equipment.length ? `has ${ctx.preferences.equipment.join(", ")}` : "",
  ].filter(Boolean);
  const kitchen = inventory
    ? inventory.map((i) => `${i.displayName}${i.quantity !== null ? ` (${i.quantity} ${i.unit})` : ""}${i.useBy ? ` use by ${i.useBy}` : ""}`)
    : null;

  // Identical question + context within an hour → cached answer, no new spend.
  const cacheKey = `ai-answer:${await hash(JSON.stringify([provider.model, body.message.toLowerCase(), wide.picks.map((p) => p.recipeId), kitchen, filters, body.videoTitle ?? ""]))}`;
  const store = getStore();
  const cached = await store.get<typeof local>(cacheKey);
  if (cached) return NextResponse.json({ answer: cached });

  try {
    await dailyCount(`ai-user:${who}`, 1);
    const { answer, usage } = await enhanceWithAi(provider, { message: body.message, candidates: wide.picks, kitchen, filters, videoTitle: body.videoTitle }, local);
    await recordAiSpend(usage);
    if (!answer) return NextResponse.json({ answer: local, fallback: "The AI couldn't answer that one – here are smart matches instead." });
    await store.set(cacheKey, answer, 60 * 60);
    return NextResponse.json({ answer });
  } catch (e) {
    console.error("[assistant]", e instanceof Error ? e.message : e);
    return NextResponse.json({ answer: local, fallback: "AI is unavailable right now – here are smart matches instead." });
  }
}
