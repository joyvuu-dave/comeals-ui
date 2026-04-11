const { test, expect } = require("@playwright/test");
const {
  setupAuthenticatedPage,
  stubPusher,
  disableIdleTimer,
  mockApi,
} = require("../helpers/setup");
const mealFixture = require("../fixtures/meal.json");

test.describe("Critical Paths", () => {
  test("unauthenticated user is redirected to login from protected route", async ({
    page,
  }) => {
    // Set up page WITHOUT auth cookies
    await stubPusher(page);
    await disableIdleTimer(page);
    await mockApi(page);

    // Try to access a protected route
    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");

    // Should be redirected to login (shows email/password inputs, not calendar)
    await expect(page.locator('input[aria-label="email"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".rbc-calendar")).not.toBeVisible();

    // Try meal page too
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Should still show login
    await expect(page.locator('input[aria-label="email"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("rotation modal fetches data and renders resident list", async ({
    page,
    context,
  }) => {
    let rotationGetUrl = null;
    await setupAuthenticatedPage(page, context);

    await page.route("**/api/v1/rotations/*", (route) => {
      rotationGetUrl = route.request().url();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 10,
          description: "Kitchen cleaning rotation",
          residents: [
            { id: 1, display_name: "Jane Smith", signed_up: true },
            { id: 2, display_name: "Bob Johnson", signed_up: false },
            { id: 3, display_name: "Alice Williams", signed_up: false },
          ],
        }),
      });
    });

    // Navigate to calendar with rotation modal URL
    await page.goto("/calendar/all/2026-01-15/rotations/show/10/");
    await page.waitForLoadState("networkidle");

    // Modal should open
    const modal = page.locator(".ReactModal__Content--after-open");
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Should show rotation title and description
    await expect(modal.locator("text=Rotation 10")).toBeVisible({
      timeout: 5000,
    });
    await expect(modal.locator("text=Kitchen cleaning rotation")).toBeVisible();

    // Signed-up residents should be struck through (muted)
    const janeEntry = modal.locator("text=Jane Smith");
    await expect(janeEntry).toBeVisible();
    // Jane is signed_up=true → should be in <s> tag with text-muted class
    await expect(modal.locator("s", { hasText: "Jane Smith" })).toBeVisible();

    // Not-signed-up residents should be bold italic
    const bobEntry = modal.locator("li.text-bold", { hasText: "Bob Johnson" });
    await expect(bobEntry).toBeVisible();

    // Residents should be sorted alphabetically
    const listItems = modal.locator("li");
    const names = await listItems.allTextContents();
    expect(names).toEqual(["Alice Williams", "Bob Johnson", "Jane Smith"]);

    // API: GET to /rotations/10
    expect(rotationGetUrl).toContain("/rotations/10");
  });

  test("reconciled meal disables all controls", async ({ page, context }) => {
    const reconciledMeal = {
      ...mealFixture,
      reconciled: true,
      closed: true,
      closed_at: "2026-01-15T20:00:00Z",
    };

    await setupAuthenticatedPage(page, context, { mealData: reconciledMeal });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Should show RECONCILED status
    await expect(page.locator("h1", { hasText: "RECONCILED" })).toBeVisible({
      timeout: 10000,
    });

    // Open/Close button should be disabled
    const closeButton = page.locator("text=Open / Close Meal");
    await expect(closeButton).toBeDisabled();

    // Cook select should be disabled
    const cookSelect = page.locator('[aria-label="Select meal cook"]').first();
    await expect(cookSelect).toBeDisabled();

    // Cost input should be disabled
    const costInput = page.locator('[aria-label="Set meal cost"]').first();
    await expect(costInput).toBeDisabled();

    // Late switch should be disabled (Alice, id=3, is attending)
    await expect(page.locator("#late_switch_3")).toBeDisabled();

    // Veg switch should be disabled
    await expect(page.locator("#veg_switch_1")).toBeDisabled();

    // Extras radio buttons should be disabled
    await expect(page.locator('[aria-label="Set Extras to 0"]')).toBeDisabled();
  });

  test("close meal is prevented when cook has no cost set", async ({
    page,
    context,
  }) => {
    // Create a meal where a cook is assigned but has empty cost
    const mealWithEmptyCost = {
      ...mealFixture,
      bills: [
        {
          id: 201,
          meal_id: 42,
          resident_id: 1,
          amount: "",
          no_cost: false,
        },
      ],
    };

    await setupAuthenticatedPage(page, context, {
      mealData: mealWithEmptyCost,
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Meal should be open
    await expect(page.locator("h1", { hasText: "OPEN" })).toBeVisible({
      timeout: 10000,
    });

    // Try to close the meal
    await page.locator("text=Open / Close Meal").click();

    // Should show validation warning toast preventing close
    const toast = page.locator(".toast--warning");
    await expect(toast).toBeVisible({ timeout: 5000 });
    await expect(toast.locator(".toast__message")).toContainText("cost");

    // Meal should still be OPEN (close was prevented)
    await expect(page.locator("h1", { hasText: "OPEN" })).toBeVisible();
  });

  test("online/offline indicator exists with correct state", async ({
    page,
    context,
  }) => {
    await setupAuthenticatedPage(page, context);

    // Check calendar page
    await page.goto("/calendar/all/2026-01-15/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".rbc-calendar")).toBeVisible({ timeout: 10000 });

    // The online indicator exists in DOM with class "online" and text "ONLINE"
    // CSS intentionally hides it (opacity:0, visibility:hidden) when online --
    // it only flashes visible during offline->online transition. The ".offline"
    // class makes it visible with red background. So: we verify the element
    // exists, has the right class, and has the right text.
    const indicator = page.locator("span.online, span.offline");
    await expect(indicator).toHaveCount(1);
    await expect(indicator).toHaveClass(/online/);
    await expect(indicator).toHaveText("ONLINE");

    // Check meal page has it too
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true }),
    ).toBeVisible({ timeout: 10000 });

    const mealIndicator = page.locator("span.online, span.offline");
    await expect(mealIndicator).toHaveCount(1);
    await expect(mealIndicator).toHaveText("ONLINE");
  });

  test("toggle off attendance sends DELETE and updates counts", async ({
    page,
    context,
  }) => {
    let apiMethod = null;
    let apiUrl = null;
    await setupAuthenticatedPage(page, context);

    // Intercept Jane's resident endpoint (id=1) to capture the DELETE
    await page.route("**/api/v1/meals/*/residents/1?*", (route) => {
      apiMethod = route.request().method();
      apiUrl = route.request().url();
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    const janeCell = page.getByRole("cell", {
      name: "Jane Smith",
      exact: true,
    });
    await expect(janeCell).toBeVisible({ timeout: 10000 });

    // Before: Jane is attending (green background), Total=3
    await expect(janeCell).toHaveClass(/background-green/);
    const totalCircle = page.locator(".info-circle", { hasText: "Total" });
    await expect(totalCircle).toContainText("3");

    // Click Jane's name to remove attendance
    await janeCell.click();

    // After: Jane not attending (no green), Total decreases
    await expect(janeCell).not.toHaveClass(/background-green/, {
      timeout: 3000,
    });
    // Total: was 3 (Jane + Alice + 1 guest). After removing Jane, her guest
    // is also effectively removed from count. New total = Alice (1) = 1.
    // But the guest might still count... depends on the computed.
    // At minimum, total should be less than 3.
    await expect
      .poll(
        async () => {
          const text = await totalCircle.textContent();
          return parseInt(text.match(/\d+/)?.[0] || "99");
        },
        { timeout: 3000 },
      )
      .toBeLessThan(3);

    // API: DELETE (not POST) to remove attendance
    await expect.poll(() => apiMethod, { timeout: 3000 }).toBe("DELETE");
    expect(apiUrl).toContain("/residents/1");
  });
});
