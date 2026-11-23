import { expect, test } from "@playwright/test";

// Runs against a build with no Supabase keys: accounts must say so and guests must be unaffected.
test.skip(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), "Only for builds without Supabase");

for (const [path, heading] of [
  ["/signup", "Make your kitchen yours."],
  ["/login", "Welcome back."],
  ["/forgot-password", "Reset your password."],
  ["/reset-password", "Choose a new password."],
] as const) {
  test(`${path} is honest when accounts aren't connected`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText("accounts aren't connected yet")).toBeVisible();
    await expect(page.locator("form button[type=submit]")).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
}

test("account page doesn't pretend anyone is signed in", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts aren't connected yet" })).toBeVisible();
});

test("guests keep working with no auth traffic", async ({ page }) => {
  const authCalls: string[] = [];
  page.on("request", (r) => {
    if (/supabase/i.test(r.url())) authCalls.push(r.url());
  });
  await page.goto("/my-fridge");
  await page.getByRole("button", { name: "+ Eggs" }).click();
  await page.reload();
  await expect(page.getByTestId("inventory-item").filter({ hasText: "Egg" })).toHaveCount(1);
  expect(authCalls).toEqual([]);
});

test("auth callback rejects a bad link safely", async ({ page }) => {
  await page.goto("/auth/callback?code=bad&next=https://evil.example");
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(page.getByText("That link is invalid or has expired")).toBeVisible();
});
