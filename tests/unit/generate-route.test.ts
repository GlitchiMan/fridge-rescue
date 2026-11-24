import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.VERCEL = "1"; // in-memory store for tests
const state = vi.hoisted(() => ({ calls: 0, off: false, spend: 0 }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({
  getAiProvider: () =>
    state.off
      ? null
      : {
          id: "fake",
          model: "fake-model",
          generate: async () => {
            state.calls++;
            return {
              data: { ideas: [{ title: "Crispy garlic chicken rice bowls", description: "Golden chicken over rice.", minutes: 30, difficulty: "easy", cuisine: "Asian", usesIngredients: ["Chicken", "Rice"], needsToBuy: [], usesStaples: [], highlight: "" }] },
              usage: { inputTokens: 100, outputTokens: 50, costUsd: 0.001 },
            };
          },
        },
  aiSpendToday: async () => state.spend,
  recordAiSpend: async () => undefined,
}));

const { GET, POST } = await import("@/app/api/generate/route");

let ip = 0;
const body = (patch: object = {}) => ({
  kind: "ideas",
  ingredients: [{ name: "Chicken", quantity: null }, { name: "Rice", quantity: null }],
  staples: [],
  tags: [],
  mode: "have",
  diets: [],
  avoid: [],
  servings: 2,
  maxMinutes: null,
  inspiration: null,
  tweak: null,
  previousTitles: [],
  ...patch,
});
const post = (b: unknown) => POST(new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify(b), headers: { "x-forwarded-for": `10.0.0.${++ip}` } }));

describe("POST /api/generate", () => {
  beforeEach(() => {
    state.off = false;
    state.spend = 0;
  });

  it("says when AI is off instead of pretending", async () => {
    state.off = true;
    const res = await post(body());
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("disabled");
  });

  it("reports status without secrets", async () => {
    const json = await (await GET()).json();
    expect(Object.keys(json).sort()).toEqual(["aiEnabled", "perUserDailyLimit"]);
  });

  it("rejects malformed requests", async () => {
    expect((await post({ kind: "ideas", ingredients: [] })).status).toBe(400);
  });

  it("serves identical requests from the cache without a new model call", async () => {
    const first = await post(body());
    expect(first.status).toBe(200);
    expect((await first.json()).ideas[0].title).toBe("Crispy garlic chicken rice bowls");
    const before = state.calls;
    const second = await (await post(body())).json();
    expect(second.cached).toBe(true);
    expect(state.calls).toBe(before);
  });

  it("stops at the daily spending cap", async () => {
    state.spend = 999;
    const res = await post(body({ servings: 5 }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("budget");
  });

  it("limits bursts from one visitor", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await POST(new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify(body({ servings: 3, previousTitles: [`t${i}`] })), headers: { "x-forwarded-for": "10.9.9.9" } }));
      codes.push(res.status);
    }
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
  });
});
