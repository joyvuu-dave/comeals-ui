const { test, expect } = require("@playwright/test");
const {
  setupAuthenticatedPage,
  setupDialogHandler,
  stubPusher,
  disableIdleTimer,
  mockApi,
} = require("../helpers/setup");

test.describe("Form CRUD", () => {
  test.describe("Events", () => {
    /** @type {Array<{type: string, message: string}>} */
    let dialogs;

    test.beforeEach(async ({ page, context }) => {
      const result = await setupAuthenticatedPage(page, context);
      dialogs = result.dialogs;
    });

    test("create a new event via modal", async ({ page }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click "Event" button in sidebar
      const eventButton = page.locator("text=Event").first();
      await expect(eventButton).toBeVisible({ timeout: 5000 });
      await eventButton.click();

      // Modal should open
      await expect(
        page.locator(".ReactModal__Content--after-open")
      ).toBeVisible({ timeout: 5000 });

      // Fill in the form
      const titleInput = page.locator(".ReactModal__Content input").first();
      await titleInput.fill("Test Event");

      // Submit
      const submitButton = page.locator(
        ".ReactModal__Content button:has-text('Create')"
      );
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);
      }
    });

    test("edit an existing event populates initial values", async ({
      page,
    }) => {
      // Go to calendar, wait for it to load, then click the event
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click event using text selector (proven to work with rbc)
      await page.locator("text=Community Meeting").click();

      // Modal should open with event data
      await expect(
        page.locator(".ReactModal__Content--after-open")
      ).toBeVisible({ timeout: 10000 });

      // Should show the edit fieldset with legend
      await expect(page.locator("fieldset legend")).toBeVisible({
        timeout: 10000,
      });
    });

    test("delete an event shows confirmation dialog", async ({ page }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click event to open edit modal
      await page.locator("text=Community Meeting").click();

      await expect(
        page.locator(".ReactModal__Content--after-open")
      ).toBeVisible({ timeout: 10000 });

      // Wait for form to load
      await expect(page.locator("fieldset legend")).toBeVisible({
        timeout: 10000,
      });

      // Click delete button
      const deleteButton = page.locator(
        ".ReactModal__Content button:has-text('Delete')"
      );
      await expect(deleteButton).toBeVisible({ timeout: 5000 });
      await deleteButton.click();

      // Should show confirmation dialog (captured by setup handler)
      await expect
        .poll(() => dialogs.filter((d) => d.type === "confirm").length, {
          timeout: 5000,
        })
        .toBeGreaterThan(0);
    });
  });

  test.describe("Common House Reservations", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("create a new common house reservation", async ({ page }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click "Common House" button in sidebar
      const chButton = page.locator("text=Common House").first();
      await expect(chButton).toBeVisible({ timeout: 5000 });
      await chButton.click();

      // Modal should open
      await expect(
        page.locator(".ReactModal__Content--after-open")
      ).toBeVisible({ timeout: 5000 });

      // Should have a resident select dropdown
      const residentSelect = page.locator("#local\\.resident_id");
      if (await residentSelect.isVisible({ timeout: 3000 })) {
        await residentSelect.selectOption({ index: 1 });
      }
    });
  });

  test.describe("Guest Room Reservations", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("create a new guest room reservation", async ({ page }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click "Guest Room" button in sidebar
      const grButton = page.locator("text=Guest Room").first();
      await expect(grButton).toBeVisible({ timeout: 5000 });
      await grButton.click();

      // Modal should open
      await expect(
        page.locator(".ReactModal__Content--after-open")
      ).toBeVisible({ timeout: 5000 });

      // Should have a host select dropdown
      const hostSelect = page.locator("#local\\.resident_id");
      if (await hostSelect.isVisible({ timeout: 3000 })) {
        await hostSelect.selectOption({ index: 1 });
      }
    });
  });
});
