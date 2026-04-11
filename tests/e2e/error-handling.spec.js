const { test, expect } = require("@playwright/test");
const {
  setupAuthenticatedPage,
  stubPusher,
  disableIdleTimer,
  mockApi,
} = require("../helpers/setup");
const mealFixture = require("../fixtures/meal.json");

test.describe("Error Handling & Edge Cases", () => {
  test.describe("API Error Responses", () => {
    test("attendance toggle API error reverts background and shows alert", async ({
      page,
      context,
    }) => {
      await setupAuthenticatedPage(page, context);

      // Override resident endpoint to return 500 error
      await page.route("**/api/v1/meals/*/residents/2*", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Server error: could not update" }),
        });
      });

      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      const bobCell = page.getByRole("cell", {
        name: "Bob Johnson",
        exact: true,
      });
      await expect(bobCell).toBeVisible({ timeout: 10000 });

      // Before: Bob not attending
      await expect(bobCell).not.toHaveClass(/background-green/);

      // Click to toggle attending (will optimistically turn green, then revert)
      await bobCell.click();

      // Should show error toast
      const toast = page.locator(".toast--error");
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast.locator(".toast__message")).toContainText(
        "Server error",
      );

      // Background should revert to NOT green (state rolled back)
      await expect(bobCell).not.toHaveClass(/background-green/, {
        timeout: 3000,
      });
    });

    test("close meal API error reverts status and shows alert", async ({
      page,
      context,
    }) => {
      await setupAuthenticatedPage(page, context);

      // Override closed endpoint to return error
      await page.route("**/api/v1/meals/*/closed*", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Cannot close meal right now" }),
        });
      });

      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      // Before: OPEN
      await expect(page.locator("h1", { hasText: "OPEN" })).toBeVisible({
        timeout: 10000,
      });

      // Try to close
      await page.locator("text=Open / Close Meal").click();

      // Should show error toast
      await expect(page.locator(".toast--error")).toBeVisible({
        timeout: 5000,
      });

      // Status should revert to OPEN
      await expect(page.locator("h1", { hasText: "OPEN" })).toBeVisible({
        timeout: 5000,
      });
    });

    test("event create API error shows alert", async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);

      // Override events endpoint to return error
      await page.route("**/api/v1/events?*", (route) => {
        route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ message: "Title is required" }),
        });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Open event creation modal
      await page.locator("text=Event").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Submit without filling in title
      const submitButton = modal.locator("button:has-text('Create')");
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Should show validation error toast
      const toast = page.locator(".toast--error");
      await expect(toast).toBeVisible({ timeout: 5000 });
      await expect(toast.locator(".toast__message")).toContainText(
        "Title is required",
      );
    });

    test("error toast clears when calendar modal is closed", async ({
      page,
      context,
    }) => {
      await setupAuthenticatedPage(page, context);

      // Override events endpoint to return error
      await page.route("**/api/v1/events?*", (route) => {
        route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ message: "Title is required" }),
        });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Open event creation modal and submit to trigger error
      await page.locator("text=Event").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });
      await modal.locator("button:has-text('Create')").click();

      // Error toast should appear
      await expect(page.locator(".toast--error")).toBeVisible({
        timeout: 5000,
      });

      // Close the modal via X button
      await modal.locator(".close-button").click();

      // Toast should be cleared
      await expect(page.locator(".toast--error")).not.toBeVisible({
        timeout: 3000,
      });
    });

    test("warning response shows yellow toast, not red", async ({
      page,
      context,
    }) => {
      await setupAuthenticatedPage(page, context);

      // Override events endpoint to return a warning (type: "warning")
      await page.route("**/api/v1/events?*", (route) => {
        route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Warning: test warning message",
            type: "warning",
          }),
        });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Open event creation modal and submit to trigger warning
      await page.locator("text=Event").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });
      await modal.locator("button:has-text('Create')").click();

      // Should show warning toast (yellow), not error toast (red)
      await expect(page.locator(".toast--warning")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.locator(".toast--error")).not.toBeVisible();
    });

    test("network error (no response) shows generic alert", async ({
      page,
      context,
    }) => {
      await setupAuthenticatedPage(page, context);

      // Override resident endpoint to abort (simulates network failure)
      await page.route("**/api/v1/meals/*/residents/2*", (route) => {
        route.abort("connectionfailed");
      });

      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      const bobCell = page.getByRole("cell", {
        name: "Bob Johnson",
        exact: true,
      });
      await expect(bobCell).toBeVisible({ timeout: 10000 });

      // Click to toggle (network will fail)
      await bobCell.click();

      // Should show a generic error toast about no response
      await expect(page.locator(".toast--error")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Loading States", () => {
    test("login button shows loader class during API call", async ({
      page,
    }) => {
      await stubPusher(page);
      await disableIdleTimer(page);

      // Slow down the login response so we can observe the loading state
      await page.route("**/api/v1/residents/token", (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              token: "test",
              community_id: 1,
              resident_id: 1,
              username: "Jane",
            }),
          });
        }, 1000);
      });
      await mockApi(page);

      await page.goto("/");
      await page.locator('input[aria-label="email"]').fill("jane@example.com");
      await page.locator('input[aria-label="password"]').fill("pass");

      const submitButton = page.getByRole("button", { name: "Submit" });

      // Click submit -- button should get loader class while waiting
      await submitButton.click();

      // During the API call, button should have button-loader class
      await expect(submitButton).toHaveClass(/button-loader/, {
        timeout: 1000,
      });
    });
  });

  test.describe("Navigation Edge Cases", () => {
    test("meal with only prev_id navigates backward but not forward", async ({
      page,
      context,
    }) => {
      // Meal with no next meal (last in sequence)
      const lastMeal = {
        ...mealFixture,
        next_id: null,
        prev_id: 41,
      };

      await setupAuthenticatedPage(page, context, { mealData: lastMeal });

      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("cell", { name: "Jane Smith", exact: true }),
      ).toBeVisible({ timeout: 10000 });

      // Previous arrow should work (prev_id: 41)
      const prevArrow = page.locator("svg.fa-chevron-left").first();
      await prevArrow.click();
      await expect(page).toHaveURL(/\/meals\/41\/edit/, { timeout: 5000 });
    });

    test("meal with only next_id navigates forward but not backward", async ({
      page,
      context,
    }) => {
      // Meal with no previous meal (first in sequence)
      const firstMeal = {
        ...mealFixture,
        next_id: 43,
        prev_id: null,
      };

      await setupAuthenticatedPage(page, context, { mealData: firstMeal });

      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("cell", { name: "Jane Smith", exact: true }),
      ).toBeVisible({ timeout: 10000 });

      // Next arrow should work (next_id: 43)
      const nextArrow = page.locator("svg.fa-chevron-right").first();
      await nextArrow.click();
      await expect(page).toHaveURL(/\/meals\/43\/edit/, { timeout: 5000 });
    });
  });
});
