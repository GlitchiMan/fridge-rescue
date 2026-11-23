import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { getServerConfig } from "@/lib/server/config";
import { dayKey, getStore } from "@/lib/server/store";

/**
 * Provider-neutral interface so another model provider can be added later
 * without touching the assistant. Server-only: keys never reach the browser.
 */
export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface AiProvider {
  readonly id: string;
  readonly model: string;
  generate<T>(req: { system: string; user: string; schema: z.ZodType<T>; maxTokens: number }): Promise<{ data: T | null; usage: AiUsage }>;
}

/** US$ per 1M tokens (input, output). Used only for spend estimates/limits. */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const [inP, outP] = PRICES[model] ?? [5, 25]; // unknown model → assume a pricier tier
  return (inputTokens * inP + outputTokens * outP) / 1_000_000;
}

class AnthropicProvider implements AiProvider {
  readonly id = "anthropic";
  private client: Anthropic;
  constructor(readonly model: string, timeoutMs: number) {
    // Reads ANTHROPIC_API_KEY from the server environment.
    this.client = new Anthropic({ timeout: timeoutMs, maxRetries: 1 });
  }

  async generate<T>({ system, user, schema, maxTokens }: { system: string; user: string; schema: z.ZodType<T>; maxTokens: number }) {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: maxTokens,
      // Short, conversational answers: low effort keeps latency and cost down.
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      // Stable system prompt first so it can be served from the prompt cache.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    const usage: AiUsage = {
      inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
      outputTokens: response.usage.output_tokens,
      costUsd: estimateCost(this.model, response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0) * 1.25 + (response.usage.cache_read_input_tokens ?? 0) * 0.1, response.usage.output_tokens),
    };
    // A refusal or truncated answer → no data; the caller falls back to the local answer.
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return { data: null, usage };
    return { data: (response.parsed_output as T | null) ?? null, usage };
  }
}

export function getAiProvider(): AiProvider | null {
  const { ai } = getServerConfig();
  if (!ai.enabled) return null;
  return new AnthropicProvider(ai.model, ai.timeoutMs);
}

/* ── Spend accounting ── */

export async function aiSpendToday(): Promise<number> {
  return (await getStore().get<number>(`ai-spend:${dayKey()}`)) ?? 0;
}

export async function recordAiSpend(usage: AiUsage): Promise<void> {
  const store = getStore();
  const day = dayKey();
  const spend = await aiSpendToday();
  await store.set(`ai-spend:${day}`, spend + usage.costUsd, 60 * 60 * 26);
  const tokens = (await store.get<{ input: number; output: number; requests: number }>(`ai-tokens:${day}`)) ?? { input: 0, output: 0, requests: 0 };
  await store.set(`ai-tokens:${day}`, { input: tokens.input + usage.inputTokens, output: tokens.output + usage.outputTokens, requests: tokens.requests + 1 }, 60 * 60 * 24 * 31);
}
