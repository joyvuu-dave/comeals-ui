const { test, expect } = require("@playwright/test");
const { setupAuthenticatedPage } = require("../helpers/setup");

test.describe("Exhaustive Coverage", () => {
  test.describe("Calendar Page", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("webcal subscription links render with correct hrefs", async ({
      page,
    }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // "Subscribe to All Meals" link (always visible)
      const allMealsLink = page.locator("a", {
        hasText: "Subscribe to All Meals",
      });
      await expect(allMealsLink).toBeVisible();
      const allHref = await allMealsLink.getAttribute("href");
      expect(allHref).toContain("webcal://");
      expect(allHref).toContain("/communities/1/ical.ics");

      // "Subscribe to My Meals" link (visible after resident_id loaded)
      const myMealsLink = page.locator("a", {
        hasText: "Subscribe to My Meals",
      });
      await expect(myMealsLink).toBeVisible({ timeout: 5000 });
      const myHref = await myMealsLink.getAttribute("href");
      expect(myHref).toContain("webcal://");
      expect(myHref).toContain("/residents/1/ical.ics");
    });

    test("today button navigates calendar to current date", async ({
      page,
    }) => {
      // Start on a date far from today
      await page.goto("/calendar/all/2025-06-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Verify we're on June 2025
      await expect(page).toHaveURL(/2025-06/);

      // Click "today" button
      const todayButton = page.locator("button", { hasText: "today" });
      await expect(todayButton).toBeVisible();
      await todayButton.click();

      // URL should change away from 2025-06 to today's date
      await expect(page).not.toHaveURL(/2025-06/, { timeout: 5000 });
    });
  });

  test.describe("Meal Page", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("close button CSS class changes from green to red", async ({
      page,
    }) => {
      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      const closeButton = page.locator("text=Open / Close Meal");
      await expect(closeButton).toBeVisible({ timeout: 10000 });

      // Open meal: button should have success (green) class
      await expect(closeButton).toHaveClass(/button-success/);

      // Close the meal
      await closeButton.click();
      await expect(page.locator("h1", { hasText: "CLOSED" })).toBeVisible({
        timeout: 5000,
      });

      // Closed meal: button should have danger (red) class
      await expect(closeButton).toHaveClass(/button-danger/, { timeout: 3000 });
    });

    test("cook select dropdown shows only can_cook residents", async ({
      page,
    }) => {
      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      const cookSelect = page
        .locator('[aria-label="Select meal cook"]')
        .first();
      await expect(cookSelect).toBeVisible({ timeout: 10000 });

      // Fixture: Jane (can_cook: true), Bob (can_cook: true), Alice (can_cook: false)
      // Cook select should show Jane and Bob but NOT Alice
      const options = cookSelect.locator("option");
      const texts = await options.allTextContents();

      expect(texts).toContain("Jane Smith");
      expect(texts).toContain("Bob Johnson");
      expect(texts).not.toContain("Alice Williams");

      // Should also have the placeholder option
      expect(texts.some((t) => t.includes("¯\\_(ツ)_/¯"))).toBe(true);
    });

    test("date box shows relative date from dayjs", async ({ page }) => {
      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      // Fixture meal date is 2026-01-15. The test runs on a different date,
      // so it should show a relative string like "2 months ago" or similar.
      // We just verify SOMETHING renders in the date area (not empty).
      const dateBox = page.locator("h2").first();
      await expect(dateBox).toBeVisible({ timeout: 10000 });

      // The display shows "ddd, MMM Do" format (e.g., "Thu, Jan 15th")
      const dateText = await dateBox.textContent();
      expect(dateText).toMatch(/Jan/);
      expect(dateText).toMatch(/15/);

      // The relative date should also appear (e.g., "2 months ago")
      // It's rendered below the date in the date box component
      const dateContainer = page.locator('[style*="grid-area: a1"]');
      const containerText = await dateContainer.textContent();
      // Should contain either "Today", "Yesterday", "Tomorrow", or "ago"/"in"
      expect(
        containerText.match(/Today|Yesterday|Tomorrow|ago|in \d/),
      ).toBeTruthy();
    });

    test("bill amount validation shows red border on invalid input", async ({
      page,
    }) => {
      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      const costInput = page.locator('[aria-label="Set meal cost"]').first();
      await expect(costInput).toBeVisible({ timeout: 10000 });

      // Valid amount: no input-invalid class
      await expect(costInput).not.toHaveClass(/input-invalid/);

      // Enter invalid amount (negative)
      await costInput.fill("-5");

      // Should show input-invalid class (red border)
      await expect(costInput).toHaveClass(/input-invalid/, { timeout: 3000 });

      // Fix it with a valid amount
      await costInput.fill("10.00");
      await expect(costInput).not.toHaveClass(/input-invalid/, {
        timeout: 3000,
      });
    });

    test("guest dropdown closes when clicking outside", async ({ page }) => {
      await page.goto("/meals/42/edit/");
      await page.waitForLoadState("networkidle");

      const janeCell = page.getByRole("cell", {
        name: "Jane Smith",
        exact: true,
      });
      await expect(janeCell).toBeVisible({ timeout: 10000 });
      const janeRow = janeCell.locator("xpath=ancestor::tr");

      // Open the dropdown
      const addButton = janeRow.locator(".dropdown-add");
      await addButton.click();

      // Dropdown should be open (active class)
      const dropdown = janeRow.locator(".dropdown");
      await expect(dropdown).toHaveClass(/active/, { timeout: 3000 });

      // Click somewhere else on the page (the date box area)
      await page.locator("h2").first().click();

      // Dropdown should close (no active class)
      await expect(dropdown).not.toHaveClass(/active/, { timeout: 3000 });
    });
  });

  test.describe("Form Details", () => {
    test.beforeEach(async ({ page, context }) => {
      await setupAuthenticatedPage(page, context);
    });

    test("event form time selects have correct options from generateTimes()", async ({
      page,
    }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Open event creation modal
      await page.locator("text=Event").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Find the start time select
      const timeSelects = modal.locator("select");
      const firstSelect = timeSelects.first();
      await expect(firstSelect).toBeVisible();

      // Get all option texts (first may be empty default)
      const options = firstSelect.locator("option");
      const allValues = await options.allTextContents();
      const values = allValues.filter((v) => v.trim() !== "");

      // Should start at 8:00 AM
      expect(values[0]).toBe("8:00 AM");

      // Should include noon
      expect(values).toContain("12:00 PM");

      // Should end around 10:00 PM
      expect(values[values.length - 1]).toBe("10:00 PM");

      // Should have 15-minute increments
      expect(values).toContain("8:15 AM");
      expect(values).toContain("8:30 AM");
      expect(values).toContain("8:45 AM");
    });

    test("DayPickerInput renders and accepts date selection", async ({
      page,
    }) => {
      await page.goto("/calendar/all/2026-01-15/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".rbc-calendar")).toBeVisible({
        timeout: 10000,
      });

      // Open event creation modal
      await page.locator("text=Event").first().click();
      const modal = page.locator(".ReactModal__Content--after-open");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Find the DayPickerInput wrapper (renders a readonly input)
      const dayInput = modal.locator("input[readonly]");
      await expect(dayInput).toBeVisible({ timeout: 3000 });

      // Click to open the calendar overlay
      await dayInput.click();

      // The DayPicker overlay should appear (v9 uses .rdp-root class)
      const overlay = modal.locator(".rdp-root");
      await expect(overlay).toBeVisible({ timeout: 3000 });

      // Click a day in the picker (find a clickable day button)
      const day = overlay.locator(".rdp-day_button").first();
      if (await day.isVisible({ timeout: 2000 })) {
        await day.click();

        // The input should now have a date value
        const inputValue = await dayInput.inputValue();
        expect(inputValue.length).toBeGreaterThan(0);
      }
    });
  });
});
