import "server-only";

/**
 * Feature flags and limits for external services. Everything is OFF unless
 * explicitly configured – the app works fully without any of it.
 * Credentials are read only on the server and never sent to the browser.
 */
function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
const flag = (name: string) => process.env[name]?.trim().toLowerCase() === "true";

export function getServerConfig() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const youtubeKey = process.env.YOUTUBE_API_KEY?.trim();
  const serverless = Boolean(process.env.NETLIFY || process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const sharedStore = Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
  return {
    ai: {
      /**
       * Needs an API key and an explicit opt-in, so nothing is billed by accident.
       * On serverless hosts the spend limit is only reliable with a shared store,
       * so AI stays off there until Upstash is configured.
       */
      enabled: flag("AI_ENABLED") && Boolean(anthropicKey) && (!serverless || sharedStore),
      model: process.env.AI_MODEL?.trim() || "claude-opus-5-5",
      /** Hard daily ceiling across all users, in US dollars (estimated from token usage). */
      dailyBudgetUsd: num("AI_DAILY_BUDGET_USD", 1),
      /** Per visitor (IP-based) AI requests per day. */
      perUserDailyLimit: num("AI_PER_USER_DAILY_LIMIT", 20),
      timeoutMs: num("AI_TIMEOUT_MS", 30_000),
    },
    youtube: {
      enabled: flag("YOUTUBE_ENABLED") && Boolean(youtubeKey),
      apiKey: youtubeKey ?? "",
      /** Stay under Google's default 10,000 units/day. */
      dailyQuotaUnits: num("YOUTUBE_DAILY_QUOTA_UNITS", 8_000),
      regionCode: process.env.YOUTUBE_REGION_CODE?.trim() || "US",
    },
    cronSecret: process.env.CRON_SECRET?.trim() || "",
  };
}

export type ServerConfig = ReturnType<typeof getServerConfig>;
