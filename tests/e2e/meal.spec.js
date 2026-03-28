const { test, expect } = require("@playwright/test");
const { setupAuthenticatedPage } = require("../helpers/setup");

test.describe("Meal Editing", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);
  });

  test("meal page loads and displays resident list", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Should show the meal date header
    await expect(page.locator("h2").first()).toBeVisible({ timeout: 10000 });

    // Should show OPEN status (meal is not closed) -- use exact role match
    await expect(
      page.locator("h1", { hasText: "OPEN" })
    ).toBeVisible();

    // Should show residents in the attendee table
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Bob Johnson", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Alice Williams", exact: true })
    ).toBeVisible();
  });

  test("toggle resident attendance changes background", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Bob Johnson is not attending (attending: false) -- find in attendee table
    const bobCell = page.getByRole("cell", {
      name: "Bob Johnson",
      exact: true,
    });
    await expect(bobCell).toBeVisible({ timeout: 10000 });

    // Bob's cell should NOT have background-green class (not attending)
    await expect(bobCell).not.toHaveClass(/background-green/);

    // Click Bob's name to toggle attending
    await bobCell.click();

    // After optimistic update, Bob's cell should get background-green
    await expect(bobCell).toHaveClass(/background-green/, { timeout: 3000 });
  });

  test("toggle late and vegetarian switches", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Wait for the attendee table to render
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true })
    ).toBeVisible({ timeout: 10000 });

    // Jane Smith (id=1) is attending, not late, not vegetarian
    // The late/veg switches use pretty-checkbox: the <input> is hidden behind
    // the styled <td> overlay. Use force:true to click through.
    const lateSwitch = page.locator("#late_switch_1");
    await expect(lateSwitch).toBeVisible({ timeout: 3000 });
    await lateSwitch.click({ force: true });
    await page.waitForTimeout(300);

    const vegSwitch = page.locator("#veg_switch_1");
    await expect(vegSwitch).toBeVisible({ timeout: 3000 });
    await vegSwitch.click({ force: true });
    await page.waitForTimeout(300);
  });

  test("edit meal description with debounced textarea", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Menu")).toBeVisible({ timeout: 10000 });

    // Find the description textarea
    const textarea = page.locator('[aria-label="Enter meal description"]');
    if (await textarea.isVisible()) {
      await textarea.fill("Updated: Spaghetti and meatballs");
      // Wait for debounce to trigger the API call
      await page.waitForTimeout(1500);
    }
  });

  test("open/close meal button works", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Find the Open/Close button
    const closeButton = page.locator("text=Open / Close Meal");
    await expect(closeButton).toBeVisible({ timeout: 10000 });

    // Click to close the meal
    await closeButton.click();
    await page.waitForTimeout(500);

    // The meal status should change (store updates optimistically)
    // CLOSED text should appear
    await expect(page.locator("text=CLOSED")).toBeVisible({ timeout: 5000 });
  });

  test("add a guest via dropdown", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Wait for attendee table
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true })
    ).toBeVisible({ timeout: 10000 });

    // Find the guest add button (dropdown-add class)
    const addGuestButton = page.locator(".dropdown-add").first();
    await expect(addGuestButton).toBeVisible({ timeout: 3000 });
    await addGuestButton.click();
    await page.waitForTimeout(500);
  });

  test("set cook and cost in bills section", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Cooks")).toBeVisible({ timeout: 10000 });

    // The cook select dropdown
    const cookSelect = page.locator('[aria-label="Select meal cook"]').first();
    if (await cookSelect.isVisible()) {
      await cookSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }

    // The cost input
    const costInput = page.locator('[aria-label="Set meal cost"]').first();
    if (await costInput.isVisible()) {
      await costInput.fill("35.00");
      await page.waitForTimeout(300);
    }
  });
});
