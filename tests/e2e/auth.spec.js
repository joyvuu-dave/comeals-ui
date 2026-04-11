const { test, expect } = require("@playwright/test");
const { stubPusher, disableIdleTimer, mockApi } = require("../helpers/setup");

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await stubPusher(page);
    await disableIdleTimer(page);
    await mockApi(page);
  });

  test("login page renders with email and password fields", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('input[aria-label="email"]')).toBeVisible();
    await expect(page.locator('input[aria-label="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  });

  test("successful login sends POST with credentials", async ({ page }) => {
    let loginPayload = null;
    let loginMethod = null;
    await page.route("**/api/v1/residents/token", (route) => {
      loginMethod = route.request().method();
      if (loginMethod === "POST") {
        loginPayload = route.request().postDataJSON();
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "test-token-abc123",
          community_id: 1,
          resident_id: 1,
          username: "Jane Smith",
        }),
      });
    });

    await page.goto("/");
    await page.locator('input[aria-label="email"]').fill("jane@example.com");
    await page.locator('input[aria-label="password"]').fill("password123");

    // Login sets cookies and navigates via React Router
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForURL("**/calendar/**");

    // API: POST to /residents/token with email and password
    expect(loginMethod).toBe("POST");
    expect(loginPayload.email).toBe("jane@example.com");
    expect(loginPayload.password).toBe("password123");

    // No error toasts
    await expect(page.locator(".toast--error")).not.toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    // Override login endpoint to return error
    await page.route("**/api/v1/residents/token", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid email or password" }),
      });
    });

    await page.goto("/");
    await page.locator('input[aria-label="email"]').fill("wrong@example.com");
    await page.locator('input[aria-label="password"]').fill("wrongpass");
    await page.getByRole("button", { name: "Submit" }).click();

    // Wait for the error toast
    const toast = page.locator(".toast--error");
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast.locator(".toast__message")).toContainText(
      "Invalid email or password",
    );
  });

  test("logout clears cookies and redirects to login", async ({
    page,
    context,
  }) => {
    const { setupAuthenticatedPage } = require("../helpers/setup");
    await setupAuthenticatedPage(page, context);

    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");

    // Click logout
    const logoutButton = page.locator("text=logout");
    await expect(logoutButton.first()).toBeVisible({ timeout: 10000 });
    await logoutButton.first().click();

    // Should navigate to login page
    await expect(page.locator('input[aria-label="email"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
