const { test, expect } = require("@playwright/test");
const {
  setupAuthenticatedPage,
  authenticateContext,
  stubPusher,
  disableIdleTimer,
} = require("../helpers/setup");

test.describe("Session Expiry", () => {
  test("shows session-expired banner when API returns 401", async ({
    page,
    context,
  }) => {
    await authenticateContext(context);
    await stubPusher(page);
    await disableIdleTimer(page);

    // Mock calendar endpoint to return 401 (expired token)
    await page.route("**/api/v1/communities/*/calendar/*", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          message:
            "You are not authenticated. Please try signing in and then try again.",
        }),
      });
    });

    // Mock other endpoints normally so the page renders
    await page.route("**/api/v1/residents/id*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(1),
      });
    });

    await page.goto("/calendar/all/2026-01-15/");

    // Session-expired banner should appear
    const banner = page.locator("text=Heads up — you've been signed out");
    await expect(banner).toBeVisible({ timeout: 10000 });

    // "Log in" button should be present
    const loginButton = page.locator("button", { hasText: "Sign in" });
    await expect(loginButton).toBeVisible();
  });

  test("does NOT show session-expired banner on successful auth", async ({
    page,
    context,
  }) => {
    await setupAuthenticatedPage(page, context);

    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");

    // Calendar should render normally
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // No session-expired banner
    await expect(
      page.locator("text=Heads up — you've been signed out"),
    ).not.toBeVisible();
  });

  test("does NOT show session-expired banner when offline", async ({
    page,
    context,
  }) => {
    await authenticateContext(context);
    await stubPusher(page);
    await disableIdleTimer(page);

    // Mock calendar to abort (simulates network failure, not 401)
    await page.route("**/api/v1/communities/*/calendar/*", (route) => {
      route.abort("connectionfailed");
    });

    await page.route("**/api/v1/residents/id*", (route) => {
      route.abort("connectionfailed");
    });

    await page.goto("/calendar/all/2026-01-15/");

    // Wait a moment for any async error handling
    await page.waitForTimeout(2000);

    // No session-expired banner (this is a network error, not auth)
    await expect(
      page.locator("text=Heads up — you've been signed out"),
    ).not.toBeVisible();
  });

  test("clicking 'Log in' clears session and redirects to login page", async ({
    page,
    context,
  }) => {
    await authenticateContext(context);
    await stubPusher(page);
    await disableIdleTimer(page);

    // Mock calendar endpoint to return 401
    await page.route("**/api/v1/communities/*/calendar/*", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          message: "You are not authenticated.",
        }),
      });
    });

    await page.route("**/api/v1/residents/id*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(1),
      });
    });

    await page.goto("/calendar/all/2026-01-15/");

    // Wait for banner
    const loginButton = page.locator("button", { hasText: "Sign in" });
    await expect(loginButton).toBeVisible({ timeout: 10000 });

    // Click "Log in" — should navigate to login page
    await Promise.all([page.waitForEvent("load"), loginButton.click()]);

    // Should be on the login page with email/password fields
    await expect(page.locator('input[aria-label="email"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test("401 on meal data fetch also triggers banner", async ({
    page,
    context,
  }) => {
    await authenticateContext(context);
    await stubPusher(page);
    await disableIdleTimer(page);

    // Mock meal endpoint to return 401
    await page.route("**/api/v1/meals/*/cooks*", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          message: "You are not authenticated.",
        }),
      });
    });

    // Mock next-meal endpoint to return a meal id so the app tries to load it
    await page.route("**/api/v1/meals/next*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ meal_id: 42 }),
      });
    });

    await page.goto("/meals/42/edit/");

    // Session-expired banner should appear
    await expect(
      page.locator("text=Heads up — you've been signed out"),
    ).toBeVisible({ timeout: 10000 });
  });
});
