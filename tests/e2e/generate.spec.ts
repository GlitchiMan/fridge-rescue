import { expect, test, type Page } from "@playwright/test";

/**
 * The AI journey with the server's /api/generate answered by the test, so no
 * paid model is called. The real route's checks are covered by unit tests.
 */
const ideas = [
  { id: "idea-1", title: "Crispy garlic chicken rice bowls", description: "Golden chicken over fluffy rice.", minutes: 30, difficulty: "easy", cuisine: "Asian", uses: ["Chicken", "Rice"], missing: [], staples: [], highlight: "One pan, 30 minutes" },
  { id: "idea-2", title: "Creamy tomato chicken rice bake", description: "A cosy bake with melting cheese.", minutes: 45, difficulty: "easy", cuisine: "Italian", uses: ["Chicken", "Rice", "Tomatoes"], missing: ["Mozzarella"], staples: [], highlight: "" },
  { id: "idea-3", title: "Spicy cheesy chicken rice skillet", description: "Smoky, cheesy and quick.", minutes: 25, difficulty: "medium", cuisine: "Tex-Mex", uses: ["Chicken", "Rice"], missing: ["Jalapeño"], staples: [], highlight: "" },
];
const recipe = {
  id: "r-test-1",
  kind: "ai",
  createdAt: "2026-11-24T10:00:00.000Z",
  title: "Crispy garlic chicken rice bowls",
  description: "Golden chicken over fluffy rice.",
  servings: 2,
  prepMinutes: 10,
  cookMinutes: 20,
  difficulty: "easy",
  cuisine: "Asian",
  mode: "shop",
  equipment: ["Frying pan"],
  ingredients: [
    { name: "Chicken", amount: 400, unit: "g", preparation: "diced", source: "have", youHave: null },
    { name: "Rice", amount: 150, unit: "g", preparation: "", source: "have", youHave: null },
    { name: "Garlic", amount: 3, unit: "clove", preparation: "sliced", source: "buy", youHave: null },
  ],
  steps: [
    { text: "Cook the rice.", minutes: 15 },
    { text: "Fry the chicken until golden and cooked through.", minutes: 10 },
    { text: "Add the garlic and serve over rice.", minutes: 2 },
  ],
  substitutions: [],
  safety: ["Cook chicken and other poultry until the thickest part reaches 74 °C (165 °F) with no pink meat. A food thermometer is the reliable check."],
  tips: [],
  quantityNotes: ["You didn't say how much chicken you have. This recipe uses 400 g."],
  videoQuery: "garlic chicken rice bowl",
  inspiration: null,
  basedOn: ["Chicken", "Rice"],
};

async function mockAi(page: Page) {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/generate", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { aiEnabled: true, perUserDailyLimit: 20 } });
    const body = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(body);
    if (body.kind === "ideas") return route.fulfill({ json: { ideas } });
    return route.fulfill({ json: { recipe } });
  });
  return requests;
}

test("AI journey: ingredients → three ideas → full recipe → saved", async ({ page }) => {
  const requests = await mockAi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "What are we cooking?" })).toBeVisible();

  const input = page.getByRole("combobox", { name: "What's in your fridge?" });
  await input.fill("chicken, rice, gochujang");
  await input.press("Enter");
  await expect(page.getByRole("list", { name: "Other ingredients" }).getByText("gochujang")).toBeVisible();
  await page.getByRole("button", { name: "High protein" }).click();
  await page.getByRole("radio", { name: "Shopping is okay" }).click();
  await page.getByRole("button", { name: "Generate my recipes" }).click();

  await expect(page.getByRole("heading", { name: "Made for you" })).toBeVisible();
  await expect(page.getByText("AI-generated ideas, not kitchen-tested", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(3);
  const sent = requests[0]!;
  expect(sent.mode).toBe("shop");
  expect(sent.tags).toEqual(["high-protein"]);
  expect((sent.ingredients as { name: string }[]).map((i) => i.name)).toEqual(expect.arrayContaining(["Chicken breast", "Rice", "gochujang"]));
  // Only confirmed pantry basics are sent (water is on by default).
  expect(sent.staples).toEqual(["Water"]);

  await page.getByRole("button", { name: "Spicier" }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]!.tweak).toBe("spicy");
  expect(requests[1]!.previousTitles).toEqual(ideas.map((i) => i.title));

  await page.getByRole("button", { name: /Cook this/ }).first().click();
  await expect(page).toHaveURL(/\/ai-recipe\?idea=idea-1/);
  await expect(page.getByRole("heading", { level: 1, name: "Crispy garlic chicken rice bowls" })).toBeVisible();
  await expect(page.getByText("AI-generated recipe · not kitchen-tested")).toBeVisible();
  await expect(page.getByText("To buy")).toBeVisible();
  await expect(page.getByText("You didn't say how much chicken you have", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Food safety" })).toBeVisible();

  await page.getByRole("button", { name: "Add 1 to shopping list" }).click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.getByRole("button", { name: "Start cooking" }).click();
  await expect(page.getByRole("dialog")).toContainText("Cook the rice.");
  await page.keyboard.press("Escape");

  await page.goto("/saved");
  await expect(page.getByTestId("saved-ai-recipe").getByText("Crispy garlic chicken rice bowls")).toBeVisible();
  await page.getByTestId("saved-ai-recipe").getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: "Crispy garlic chicken rice bowls" })).toBeVisible();

  await page.goto("/shopping-list");
  await expect(page.getByText("Garlic", { exact: false }).first()).toBeVisible();
});

test("AI off: the site says so and shows tested recipes instead", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fridge AI isn't switched on yet", { exact: false })).toBeVisible();
  const input = page.getByRole("combobox", { name: "What's in your fridge?" });
  await input.fill("eggs, cheese");
  await input.press("Enter");
  await page.getByRole("button", { name: "Generate my recipes" }).click();
  await expect(page.getByText(/We found \d+ recipes? that use your ingredients/)).toBeVisible();
  await expect(page.getByText("From the Fridge Rescue collection of tested recipes.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Made for you" })).toHaveCount(0);
});

test("unsaved AI recipes from another tab are not shown or invented", async ({ page }) => {
  await page.goto("/ai-recipe?idea=nope");
  await expect(page.getByRole("heading", { level: 1, name: "This recipe isn't here anymore" })).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
});
