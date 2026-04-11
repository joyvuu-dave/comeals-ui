const { test, expect } = require("@playwright/test");
const {
  setupAuthenticatedPage,
  stubPusher,
  disableIdleTimer,
  mockApi,
} = require("../helpers/setup");

/**
 * Visual regression tests.
 *
 * These capture screenshots and compare against golden reference images.
 * On first run, golden images are created in tests/e2e/visual.spec.js-snapshots/.
 * On subsequent runs, new screenshots are diffed against the golden.
 *
 * After a dependency upgrade, if a visual test fails:
 *   - If the change is EXPECTED (library updated its styling): update the golden
 *     with `npx playwright test --update-snapshots`
 *   - If the change is UNEXPECTED: you caught a regression!
 *
 * Time is frozen to 2026-01-15 12:00 for deterministic screenshots.
 */
test.describe("Visual Baselines", () => {
  test("login page", async ({ page }) => {
    await stubPusher(page);
    await disableIdleTimer(page);
    await mockApi(page);

    // Freeze time for determinism
    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00"));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for the login form to render
    await expect(page.locator('input[aria-label="email"]')).toBeVisible({
      timeout: 10000,
    });

    await expect(page).toHaveScreenshot("login-page.png", {
      fullPage: true,
    });
  });

  test("calendar month view", async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);

    // Freeze time for determinism
    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00"));

    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // Wait a moment for all events to render
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("calendar-month.png", {
      fullPage: true,
    });
  });

  test("meal edit page", async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);

    // Freeze time for determinism
    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00"));

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Wait for residents to render in attendee table
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("meal-edit.png", {
      fullPage: true,
    });
  });

  test("event creation form", async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);

    // Freeze time for determinism
    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00"));

    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // Open event creation modal
    const eventButton = page.locator("text=Event").first();
    await expect(eventButton).toBeVisible({ timeout: 5000 });
    await eventButton.click();

    await expect(page.locator(".ReactModal__Content--after-open")).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("event-form.png", {
      fullPage: true,
    });
  });
});
