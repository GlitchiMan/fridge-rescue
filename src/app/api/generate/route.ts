import { NextResponse } from "next/server";
import { aiSpendToday, getAiProvider, recordAiSpend } from "@/lib/ai/provider";
import { generateRequestSchema, type GeneratedIdea, type GeneratedRecipe } from "@/lib/generate/schema";
import { generateIdeas, generateRecipe } from "@/lib/generate/service";
import { normalizeName } from "@/lib/generate/validate";
import { getServerConfig } from "@/lib/server/config";
import { burstLimit, clientKey, dailyCount } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Whether AI generation is switched on (no secrets exposed). */
export async function GET() {
  const { ai } = getServerConfig();
  return NextResponse.json({ aiEnabled: ai.enabled, perUserDailyLimit: ai.enabled ? ai.perUserDailyLimit : 0 }, { headers: { "Cache-Control": "no-store" } });
}

async function hash(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

const err = (status: number, code: string, error: string) => NextResponse.json({ code, error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const config = getServerConfig();
  const provider = getAiProvider();
  if (!provider) return err(503, "disabled", "AI recipe generation isn't switched on for this site yet.");

  const who = await clientKey(req.headers);
  if (!burstLimit(`gen:${who}`, 5, 60_000)) return err(429, "burst", "That's a lot of ideas at once. Try again in a minute.");

  let body;
  try {
    const raw = await req.text();
    if (raw.length > 30_000) return err(413, "too-large", "Request too large.");
    body = generateRequestSchema.parse(JSON.parse(raw));
  } catch {
    return err(400, "invalid-request", "Something in that request didn't look right.");
  }

  // Identical requests are served from the cache: no new spend, no limit used.
  const norm = (xs: string[]) => xs.map(normalizeName).sort();
  const keyParts = [
    provider.model,
    body.kind,
    body.ingredients.map((i) => `${normalizeName(i.name)}=${i.quantity ?? ""}`).sort(),
    norm(body.staples),
    [...body.tags].sort(),
    body.mode,
    [...body.diets].sort(),
    norm(body.avoid),
    body.servings,
    body.maxMinutes,
    body.inspiration?.url ?? "",
    body.kind === "ideas" ? [body.tweak, body.note?.toLowerCase() ?? "", norm(body.previousTitles), body.baseIdea?.title ?? ""] : [body.idea.title, body.idea.description],
  ];
  const cacheKey = `gen:${body.kind}:${await hash(JSON.stringify(keyParts))}`;
  const store = getStore();
  const cached = await store.get<{ ideas?: GeneratedIdea[]; recipe?: GeneratedRecipe }>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cached: true }, { headers: { "Cache-Control": "no-store" } });

  if ((await dailyCount(`gen-user:${who}`)) >= config.ai.perUserDailyLimit) {
    return err(429, "daily-limit", "You've used today's AI recipes. They reset tomorrow, and our tested recipes are always available.");
  }
  if ((await aiSpendToday()) >= config.ai.dailyBudgetUsd) {
    return err(429, "budget", "Fridge AI is resting for today. Our tested recipes are still here for you.");
  }

  try {
    await dailyCount(`gen-user:${who}`, 1);
    if (body.kind === "ideas") {
      const { ideas, issues, usage } = await generateIdeas(provider, body);
      await recordAiSpend(usage);
      if (issues.length) console.info("[generate] ideas adjusted:", issues.slice(0, 5).join(" | "));
      if (ideas.length === 0) return err(422, "no-ideas", "Fridge AI couldn't come up with ideas that pass our checks. Try adding an ingredient or changing a preference.");
      await store.set(cacheKey, { ideas }, 60 * 60 * 6);
      return NextResponse.json({ ideas }, { headers: { "Cache-Control": "no-store" } });
    }
    const { recipe, issues, usage } = await generateRecipe(provider, body);
    await recordAiSpend(usage);
    if (issues.length) console.info("[generate] recipe adjusted:", issues.slice(0, 5).join(" | "));
    if (!recipe) return err(422, "invalid-recipe", "That recipe didn't pass our safety and quality checks, so we didn't show it. Try another idea.");
    await store.set(cacheKey, { recipe }, 60 * 60 * 24 * 7);
    return NextResponse.json({ recipe }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[generate]", e instanceof Error ? e.message : e);
    return err(502, "unavailable", "Fridge AI is unavailable right now. Please try again in a moment.");
  }
}
