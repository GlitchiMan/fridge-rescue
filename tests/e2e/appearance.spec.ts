import { expect, test } from "@playwright/test";

test("chosen palette and dark mode persist across pages and reloads", async ({ page }) => {
  await page.goto("/preferences");
  await page.getByRole("button", { name: "Champagne" }).click();
  await page.getByRole("button", { name: "Dark" }).click();
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-palette", "champagne");
  await expect(root).toHaveAttribute("data-mode", "dark");

  await page.goto("/recipes");
  await expect(root).toHaveAttribute("data-palette", "champagne");
  await expect(root).toHaveAttribute("data-mode", "dark");
  await page.reload();
  await expect(root).toHaveAttribute("data-mode", "dark");
});

test("system mode follows the device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});

test("corrupted appearance data falls back safely", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fridge-rescue:appearance", "{not json"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-palette", "forest");
  expect(errors).toEqual([]);
});
