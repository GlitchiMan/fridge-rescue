// Calls the model and checks the result. Provider is injected, so tests use a fake.
import type { AiProvider, AiUsage } from "@/lib/ai/provider";
import { buildIdeasPrompt, buildRecipePrompt, IDEAS_SYSTEM, RECIPE_SYSTEM } from "./prompt";
import { aiIdeasSchema, aiRecipeSchema, type GeneratedIdea, type GeneratedRecipe, type IdeasRequest, type RecipeRequest } from "./schema";
import { validateIdeas, validateRecipe } from "./validate";

const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export async function generateIdeas(provider: AiProvider, req: IdeasRequest): Promise<{ ideas: GeneratedIdea[]; issues: string[]; usage: AiUsage }> {
  const { data, usage } = await provider.generate({ system: IDEAS_SYSTEM, user: buildIdeasPrompt(req), schema: aiIdeasSchema, maxTokens: 6000, effort: "low", timeoutMs: 45_000 });
  if (!data) return { ideas: [], issues: ["no usable answer from the model"], usage };
  return { ...validateIdeas(data, req, newId), usage };
}

export async function generateRecipe(provider: AiProvider, req: RecipeRequest): Promise<{ recipe: GeneratedRecipe | null; issues: string[]; usage: AiUsage }> {
  const { data, usage } = await provider.generate({ system: RECIPE_SYSTEM, user: buildRecipePrompt(req), schema: aiRecipeSchema, maxTokens: 10000, effort: "low", timeoutMs: 60_000 });
  if (!data) return { recipe: null, issues: ["no usable answer from the model"], usage };
  return { ...validateRecipe(data, req, { id: newId(), now: new Date().toISOString() }), usage };
}
