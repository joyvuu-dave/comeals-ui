const { test, expect } = require("@playwright/test");
const { setupAuthenticatedPage } = require("../helpers/setup");

test.describe("Form CRUD", () => {
  test.describe("Events", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("create a new event sends POST with form data", async ({ page }) => {
      let eventPayload = null;
      let eventMethod = null;
      await page.route("**/api/v1/events?*", (route) => {
        eventMethod = route.request().method();
        if (eventMethod === "POST") {
          eventPayload = route.request().postDataJSON();
        }
        route.fulfill({ status: 200, body: "{}" });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click "Event" button in sidebar to open create modal
      await page.locator("text=Event").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Fill in the title
      const titleInput = modal.locator('input[type="text"]').first();
      await titleInput.fill("Test Event");

      // Submit
      const submitButton = modal.locator("button:has-text('Create')");
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // API: POST with title in the payload
      await expect.poll(() => eventPayload, { timeout: 5000 }).toBeTruthy();
      expect(eventMethod).toBe("POST");
      expect(eventPayload.title).toBe("Test Event");
    });

    test("edit an existing event loads data via GET", async ({ page }) => {
      let eventGetUrl = null;
      await page.route("**/api/v1/events/**", (route) => {
        if (route.request().method() === "GET") {
          eventGetUrl = route.request().url();
        }
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 70,
            title: "Community Meeting",
            description: "Monthly community meeting",
            start_date: "2026-01-28T19:00:00",
            end_date: "2026-01-28T21:00:00",
            allday: false,
          }),
        });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click event to open edit modal
      await page.locator("text=Community Meeting").click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 10000 });

      // Should show the edit fieldset
      await expect(modal.locator("fieldset legend")).toBeVisible({
        timeout: 10000,
      });

      // API: GET to fetch event data (URL contains event ID 70)
      expect(eventGetUrl).toBeTruthy();
      expect(eventGetUrl).toContain("/events/70");
    });

    test("delete an event sends DELETE after confirmation", async ({
      page,
    }) => {
      let deleteUrl = null;
      let deleteMethod = null;
      await page.route("**/api/v1/events/**", (route) => {
        const method = route.request().method();
        if (method === "DELETE") {
          deleteMethod = method;
          deleteUrl = route.request().url();
        }
        if (method === "GET") {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: 70,
              title: "Community Meeting",
              description: "Monthly community meeting",
              start_date: "2026-01-28T19:00:00",
              end_date: "2026-01-28T21:00:00",
              allday: false,
            }),
          });
        } else {
          route.fulfill({ status: 200, body: "{}" });
        }
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Open event edit modal
      await page.locator("text=Community Meeting").click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 10000 });
      await expect(modal.locator("fieldset legend")).toBeVisible({
        timeout: 10000,
      });

      // Click delete
      await modal.locator("button:has-text('Delete')").click();

      // Confirmation modal should appear
      const confirmOverlay = page.locator(".ReactModal__Overlay").last();
      await expect(
        confirmOverlay.locator("text=Do you really want to delete this event?"),
      ).toBeVisible({ timeout: 5000 });
      // Click Delete in the confirmation modal
      await confirmOverlay
        .locator('.button-warning:has-text("Delete")')
        .click();

      // API: DELETE to /events/70/delete
      await expect.poll(() => deleteMethod, { timeout: 5000 }).toBe("DELETE");
      expect(deleteUrl).toContain("/events/70");
    });
  });

  test.describe("Common House Reservations", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("create a new common house reservation sends POST", async ({
      page,
    }) => {
      let postPayload = null;
      let postMethod = null;
      await page.route("**/api/v1/common-house-reservations?*", (route) => {
        postMethod = route.request().method();
        if (postMethod === "POST") {
          postPayload = route.request().postDataJSON();
        }
        route.fulfill({ status: 200, body: "{}" });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click "Common House" button in sidebar
      await page.locator("text=Common House").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Select a resident from dropdown
      const residentSelect = modal.locator("#local\\.resident_id");
      await expect(residentSelect).toBeVisible({ timeout: 3000 });
      await residentSelect.selectOption({ index: 1 });

      // Submit
      const submitButton = modal.locator("button:has-text('Create')");
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // API: POST with resident_id
      await expect.poll(() => postPayload, { timeout: 5000 }).toBeTruthy();
      expect(postMethod).toBe("POST");
      expect(postPayload.resident_id).toBeDefined();
    });
  });

  test.describe("Guest Room Reservations", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("create a new guest room reservation sends POST", async ({ page }) => {
      let postPayload = null;
      let postMethod = null;
      await page.route("**/api/v1/guest-room-reservations?*", (route) => {
        postMethod = route.request().method();
        if (postMethod === "POST") {
          postPayload = route.request().postDataJSON();
        }
        route.fulfill({ status: 200, body: "{}" });
      });

      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Click "Guest Room" button in sidebar
      await page.locator("text=Guest Room").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Select a host from dropdown
      const hostSelect = modal.locator("#local\\.resident_id");
      await expect(hostSelect).toBeVisible({ timeout: 3000 });
      await hostSelect.selectOption({ index: 1 });

      // Submit
      const submitButton = modal.locator("button:has-text('Create')");
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // API: POST with resident_id
      await expect.poll(() => postPayload, { timeout: 5000 }).toBeTruthy();
      expect(postMethod).toBe("POST");
      expect(postPayload.resident_id).toBeDefined();
    });
  });
});
