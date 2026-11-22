import { expect, test, type Page } from "@playwright/test";

async function addHeroIngredient(page: Page, text: string) {
  const input = page.getByRole("combobox", { name: "What's in your fridge?" });
  await input.fill(text);
  await input.press("Enter");
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/sw\.js|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

test("Journey A: first-time visitor finds, opens and saves a recipe", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What's in your");

  await addHeroIngredient(page, "eggs");
  await addHeroIngredient(page, "cheese");
  await addHeroIngredient(page, "potatoes");
  const chips = page.getByRole("list", { name: "Selected ingredients" });
  await expect(chips.getByText("Eggs")).toBeVisible();
  await expect(chips.getByText("Potatoes")).toBeVisible();

  await page.getByRole("button", { name: "Find recipes" }).click();
  await expect(page.getByText(/We found \d+ recipes? that use your ingredients/)).toBeVisible();
  const omelette = page.getByRole("link", { name: "Classic Cheese Omelette" }).first();
  await expect(omelette).toBeVisible();
  // Butter isn't assumed: the omelette is "one ingredient away" until the user confirms staples.
  await expect(page.getByText("You're only one ingredient away!").first()).toBeVisible();
  await page.getByText("Got pantry basics like oil, salt or butter?").click();
  await page.getByRole("button", { name: "Butter", exact: true }).click();
  await page.getByRole("button", { name: "Update results" }).click();
  await expect(page.getByRole("heading", { name: "You can make this now" })).toBeVisible();
  // Typed ingredients have unknown quantities → honest label, never "Ready to cook"
  await expect(page.getByText("Ingredients match — check quantities").first()).toBeVisible();

  await omelette.click();
  await expect(page.getByRole("heading", { level: 1, name: "Classic Cheese Omelette" })).toBeVisible();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.goto("/saved");
  await expect(page.getByTestId("saved-recipe").getByText("Classic Cheese Omelette")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("saved-recipe").getByText("Classic Cheese Omelette")).toBeVisible();
  expect(errors).toEqual([]);
});

test("synonyms and keyboard selection work in the ingredient combobox", async ({ page }) => {
  await page.goto("/");
  const input = page.getByRole("combobox", { name: "What's in your fridge?" });
  await input.fill("capsicum");
  await expect(page.getByRole("option", { name: /Bell peppers/ })).toBeVisible();
  await input.press("ArrowDown");
  await input.press("ArrowUp");
  await input.press("Enter");
  await expect(page.getByRole("list", { name: "Selected ingredients" }).getByText("Bell peppers")).toBeVisible();
  await input.fill("garbanzo beans, scallion");
  await input.press("Enter");
  const chips = page.getByRole("list", { name: "Selected ingredients" });
  await expect(chips.getByText("Chickpeas (canned)")).toBeVisible();
  await expect(chips.getByText("Spring onions")).toBeVisible();
});

test("Journey B: add, edit and persist a fridge item with a date", async ({ page }) => {
  await page.goto("/my-fridge");
  await expect(page.getByText("Your fridge is looking a little empty.")).toBeVisible();
  const input = page.getByRole("combobox", { name: "Add an ingredient" });
  await input.fill("spinach");
  await page.getByRole("option", { name: /Spinach/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Amount/).fill("200");
  await dialog.getByLabel("Unit").selectOption("g");
  const tomorrow = new Date(Date.now() + 86_400_000);
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  await dialog.getByLabel("Use-by date").fill(iso);
  await dialog.getByRole("button", { name: "Add to my kitchen" }).click();

  const row = page.getByTestId("inventory-item").filter({ hasText: "Spinach" });
  await expect(row.getByTestId("inventory-qty")).toHaveText("200 g");
  await expect(row.getByText("Use by tomorrow")).toBeVisible();
  // Use-soon panel highlights it
  await expect(page.getByRole("heading", { name: "Use soon" })).toBeVisible();

  await row.getByRole("button", { name: "Edit Spinach" }).click();
  await page.getByRole("dialog").getByLabel(/Amount/).fill("150");
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect(row.getByTestId("inventory-qty")).toHaveText("150 g");

  await page.reload();
  await expect(page.getByTestId("inventory-item").filter({ hasText: "Spinach" }).getByTestId("inventory-qty")).toHaveText("150 g");

  // Remove with undo
  await page.getByRole("button", { name: "Remove Spinach" }).click();
  await expect(page.getByTestId("inventory-item")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("inventory-item")).toHaveCount(1);
});

test("adding a duplicate ingredient offers to combine quantities", async ({ page }) => {
  await page.goto("/my-fridge");
  const input = page.getByRole("combobox", { name: "Add an ingredient" });
  for (const amount of ["300", "200"]) {
    await input.fill("rice");
    await page.getByRole("option", { name: /Rice \(uncooked\)/ }).click();
    await page.getByRole("dialog").getByLabel(/Amount/).fill(amount);
    await page.getByRole("dialog").getByRole("button", { name: /Add to my kitchen|Combine amounts/ }).click();
  }
  await expect(page.getByTestId("inventory-item")).toHaveCount(1);
  await expect(page.getByTestId("inventory-qty")).toHaveText("500 g");
});

test("Journey D: missing ingredients go to the shopping list and can be ticked off", async ({ page }) => {
  await page.goto("/my-fridge");
  for (const name of ["Eggs", "Potatoes"]) {
    await page.getByRole("button", { name: `+ ${name}` }).click();
  }
  await page.goto("/recipes/potato-and-egg-skillet");
  await expect(page.getByText(/You have 2 of 4 ingredients/)).toBeVisible();
  await page.getByRole("button", { name: /Add 2 missing to shopping list/ }).click();
  await expect(page.getByText("Added 2 items to your shopping list")).toBeVisible();
  // Adding again must not double count
  await page.getByRole("button", { name: /Add 2 missing to shopping list/ }).click();

  await page.goto("/shopping-list");
  const items = page.getByTestId("shopping-item");
  await expect(items).toHaveCount(2);
  await expect(page.getByText("1 onion")).toBeVisible();
  await expect(page.getByText("1 tbsp cooking oil")).toBeVisible();
  await page.getByText("1 onion").click();
  await expect(page.getByText("1 to buy · 1 in basket")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 to buy · 1 in basket")).toBeVisible();
});

test("serving adjustment scales ingredient quantities", async ({ page }) => {
  await page.goto("/recipes/potato-and-egg-skillet");
  const panel = page.locator("section", { has: page.getByRole("heading", { name: "Ingredients" }) });
  await expect(panel.getByText("400 g")).toBeVisible();
  await page.getByRole("button", { name: "More servings" }).click();
  await page.getByRole("button", { name: "More servings" }).click();
  await expect(panel.getByText("4 servings")).toBeVisible();
  await expect(panel.getByText("800 g")).toBeVisible();
  await expect(panel.getByText("4 eggs")).toBeVisible();
});

test("Journey E: plan meals and keep them after reload", async ({ page }) => {
  await page.goto("/meal-planner");
  await page.getByRole("button", { name: "Add dinner on Monday" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Quick Chickpea Curry/ }).click();
  await page.getByRole("button", { name: "Add dinner on Tuesday" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Simple Tomato Pasta/ }).click();
  await expect(page.getByTestId("plan-entry")).toHaveCount(2);
  await page.getByRole("button", { name: "Add missing to list" }).click();
  await page.reload();
  await expect(page.getByTestId("plan-entry")).toHaveCount(2);
  await page.goto("/shopping-list");
  // 2 servings of a 3-serving curry = 1⅓ cans → rounded up to something you can buy.
  await expect(page.getByText("2 cans chickpeas", { exact: true })).toBeVisible();
  await expect(page.getByText("2 cans canned tomatoes", { exact: true })).toBeVisible();
});

test("mark as cooked deducts inventory only after confirmation", async ({ page }) => {
  await page.goto("/my-fridge");
  const input = page.getByRole("combobox", { name: "Add an ingredient" });
  await input.fill("eggs");
  await page.getByRole("option", { name: /^Eggs/ }).click();
  await page.getByRole("dialog").getByLabel(/Amount/).fill("6");
  await page.getByRole("dialog").getByRole("button", { name: "Add to my kitchen" }).click();

  await page.goto("/recipes/classic-cheese-omelette");
  await page.getByRole("button", { name: "Mark as cooked" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Eggs: 6 eggs → 3 eggs/)).toBeVisible();
  await dialog.getByRole("button", { name: "Mark cooked & update fridge" }).click();
  await page.goto("/my-fridge");
  await expect(page.getByTestId("inventory-qty")).toHaveText("3 eggs");
  await expect(page.getByRole("heading", { name: "Cook it again" })).toBeVisible();
});

test("recipe filters and public SEO essentials", async ({ page, request }) => {
  await page.goto("/recipes?time=15");
  await expect(page.getByText(/\d+ recipes?/).first()).toBeVisible();
  const cards = page.locator("article h3 a");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain("/recipes/classic-cheese-omelette");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /my-fridge");

  const html = await (await request.get("/recipes/red-lentil-curry")).text();
  expect(html).toContain('"@type":"Recipe"');
  expect(html).not.toContain("aggregateRating");
  expect(html).toContain('<link rel="canonical"');
});

test("main pages render without errors or horizontal overflow", async ({ page }) => {
  const errors = trackErrors(page);
  for (const path of ["/", "/recipes", "/recipes/tomato-soup", "/my-fridge", "/meal-planner", "/shopping-list", "/saved", "/preferences", "/ideas", "/ideas/budget-student-dinners", "/how-it-works", "/about", "/contact", "/privacy", "/terms", "/cookie-settings"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
  const res = await page.goto("/this-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("This page has gone missing")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cooking mode steps through instructions", async ({ page }) => {
  await page.goto("/recipes/garlic-butter-pasta");
  await page.getByRole("button", { name: "Start cooking" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Step 1", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByText("Step 2", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Previous" }).click();
  await expect(dialog.getByText("Step 1", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
