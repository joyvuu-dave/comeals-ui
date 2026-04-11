const { test, expect } = require("@playwright/test");
const { stubPusher, disableIdleTimer, mockApi } = require("../helpers/setup");

test.describe("Password Reset", () => {
  test.beforeEach(async ({ page }) => {
    await stubPusher(page);
    await disableIdleTimer(page);
    await mockApi(page);
  });

  test("request password reset sends POST with email", async ({ page }) => {
    let resetPayload = null;
    let resetMethod = null;
    await page.route("**/api/v1/residents/password-reset", (route) => {
      resetMethod = route.request().method();
      if (resetMethod === "POST") {
        resetPayload = route.request().postDataJSON();
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Password reset email sent." }),
      });
    });

    await page.goto("/reset-password/");
    await page.waitForLoadState("networkidle");

    // Should show the password reset form in a modal
    const modal = page.locator(".ReactModal__Content--after-open");
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator("text=Password Reset")).toBeVisible();

    // Fill in email
    const emailInput = modal.locator('input[placeholder="Email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill("jane@example.com");

    // Submit via the Reset button
    await modal.getByRole("button", { name: "Reset" }).click();

    // API: POST with email
    await expect.poll(() => resetPayload, { timeout: 5000 }).toBeTruthy();
    expect(resetMethod).toBe("POST");
    expect(resetPayload.email).toBe("jane@example.com");

    // Success toast
    const toast = page.locator(".toast--success");
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast.locator(".toast__message")).toContainText(
      "Password reset email sent",
    );
  });

  test("set new password sends POST with password", async ({ page }) => {
    let passwordPayload = null;
    let passwordMethod = null;
    let passwordUrl = null;
    await page.route("**/api/v1/residents/password-reset/*", (route) => {
      passwordMethod = route.request().method();
      passwordUrl = route.request().url();
      if (passwordMethod === "POST") {
        passwordPayload = route.request().postDataJSON();
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Password updated successfully." }),
      });
    });

    await page.goto("/reset-password/test-reset-token/");
    await page.waitForLoadState("networkidle");

    // The modal should open with the password form
    const modal = page.locator(".ReactModal__Content--after-open");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Fill in new password
    const passwordInput = modal.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await passwordInput.fill("newpassword123");

    // Submit
    await modal.getByRole("button", { name: "Submit" }).click();

    // API: POST to /residents/password-reset/{token} with password
    await expect.poll(() => passwordPayload, { timeout: 5000 }).toBeTruthy();
    expect(passwordMethod).toBe("POST");
    expect(passwordPayload.password).toBe("newpassword123");
    expect(passwordUrl).toContain("test-reset-token");

    // Success toast
    const toast = page.locator(".toast--success");
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast.locator(".toast__message")).toContainText(
      "Password updated",
    );
  });
});
