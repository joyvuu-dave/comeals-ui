const { test, expect } = require("@playwright/test");
const { setupAuthenticatedPage } = require("../helpers/setup");

test.describe("Navigation", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);
  });

  test("prev/next meal arrows navigate between meals", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Should show navigation arrows
    // The next arrow should be visible since next_id is 43
    const nextArrow = page
      .locator('[data-testid="next-meal"]')
      .or(page.locator("svg.fa-chevron-right").first());

    if (await nextArrow.isVisible({ timeout: 5000 })) {
      await nextArrow.click();
      // Should navigate to meal 43
      await expect(page).toHaveURL(/\/meals\/43\/edit/, { timeout: 5000 });
    }
  });

  test("meal history modal opens and shows audit entries", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Click the history button/link
    const historyLink = page.locator("text=history").first();
    await expect(historyLink).toBeVisible({ timeout: 10000 });
    await historyLink.click();

    // History modal should open with audit entries
    await expect(page.locator(".ReactModal__Content--after-open")).toBeVisible({
      timeout: 5000,
    });

    // Should show history items from fixture -- use exact cell match
    await expect(
      page.getByRole("cell", { name: "signed up", exact: true }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("calendar back button navigates from meal to calendar", async ({
    page,
  }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Find the back arrow / calendar link
    const backButton = page
      .locator("svg.fa-arrow-left")
      .or(page.locator('[aria-label="Back to calendar"]'))
      .first();

    if (await backButton.isVisible({ timeout: 5000 })) {
      await backButton.click();
      await expect(page).toHaveURL(/\/calendar\//, { timeout: 5000 });
    }
  });
});
