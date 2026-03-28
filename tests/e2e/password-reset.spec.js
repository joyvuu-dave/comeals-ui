const { test, expect } = require("@playwright/test");
const {
  stubPusher,
  disableIdleTimer,
  mockApi,
  setupDialogHandler,
} = require("../helpers/setup");

test.describe("Password Reset", () => {
  test.beforeEach(async ({ page }) => {
    await stubPusher(page);
    await disableIdleTimer(page);
    await mockApi(page);
  });

  test("request password reset shows confirmation", async ({ page }) => {
    const dialogs = setupDialogHandler(page);

    await page.goto("/reset-password/");
    await page.waitForLoadState("networkidle");

    // Should show the password reset form in a modal
    await expect(page.locator("text=Password Reset")).toBeVisible({
      timeout: 10000,
    });

    // Target the modal's email input (not the login form's)
    const modal = page.locator(".ReactModal__Content--after-open");
    await expect(modal).toBeVisible();
    const emailInput = modal.locator('input[placeholder="Email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill("jane@example.com");

    // Submit via the Reset button in the modal
    await modal.getByRole("button", { name: "Reset" }).click();

    // Should show confirmation dialog
    await expect
      .poll(() => dialogs.length, { timeout: 5000 })
      .toBeGreaterThan(0);
    expect(dialogs[0].message).toContain("Password reset email sent");
  });

  test("set new password with token shows form and submits", async ({
    page,
  }) => {
    const dialogs = setupDialogHandler(page);

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

    // Should show confirmation
    await expect
      .poll(() => dialogs.length, { timeout: 5000 })
      .toBeGreaterThan(0);
    expect(dialogs[0].message).toContain("Password updated");
  });
});
