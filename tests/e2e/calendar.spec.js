const { test, expect } = require("@playwright/test");
const { setupAuthenticatedPage } = require("../helpers/setup");

test.describe("Calendar", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);
  });

  test("calendar month view renders with events", async ({ page }) => {
    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");

    // Calendar should be visible
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // Should show January 2026
    await expect(page.locator("text=January 2026")).toBeVisible();

    // Should show meal events from fixtures
    await expect(page.locator("text=Meal: Jane Smith")).toBeVisible();
    await expect(page.locator("text=Meal: Bob Johnson")).toBeVisible();

    // Should show other event types
    await expect(page.locator("text=Community Meeting")).toBeVisible();
  });

  test("navigate to next/previous month updates URL and view", async ({
    page,
  }) => {
    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // Click next month
    await page.locator('[aria-label="Goto Next Month"]').click();

    // URL should update to February
    await expect(page).toHaveURL(/2026-02/);

    // Click previous month twice to go to December 2025
    await page.locator('[aria-label="Goto Last Month"]').click();
    await page.locator('[aria-label="Goto Last Month"]').click();

    // URL should update to December
    await expect(page).toHaveURL(/2025-12/);
  });

  test("Next Meal button navigates to meal edit page", async ({ page }) => {
    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // The "Next Meal" sidebar button navigates to the next upcoming meal
    await page.locator("text=Next Meal").click();

    // Should navigate to the meal edit page
    await expect(page).toHaveURL(/\/meals\/.*\/edit/, { timeout: 10000 });
  });

  test("clicking a non-meal event opens modal", async ({ page }) => {
    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // Click on a non-meal event (Community Meeting)
    await page.locator("text=Community Meeting").click();

    // Should open edit modal (URL changes to include event path)
    await expect(page).toHaveURL(/events\/edit\/70/);

    // Modal should be visible with event data
    await expect(page.locator(".ReactModal__Content--after-open")).toBeVisible({
      timeout: 10000,
    });
  });
});
