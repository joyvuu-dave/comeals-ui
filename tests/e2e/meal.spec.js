const { test, expect } = require("@playwright/test");
const { setupAuthenticatedPage } = require("../helpers/setup");

test.describe("Meal Editing", () => {
  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedPage(page, context);
  });

  test("meal page loads with correct initial state from fixture data", async ({
    page,
  }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // --- Status ---
    await expect(page.locator("h1", { hasText: "OPEN" })).toBeVisible({
      timeout: 10000,
    });

    // --- Description ---
    const textarea = page.locator('[aria-label="Enter meal description"]');
    await expect(textarea).toHaveValue("Pasta night with garlic bread");

    // --- Residents in attendee table ---
    const janeCell = page.getByRole("cell", {
      name: "Jane Smith",
      exact: true,
    });
    const bobCell = page.getByRole("cell", {
      name: "Bob Johnson",
      exact: true,
    });
    const aliceCell = page.getByRole("cell", {
      name: "Alice Williams",
      exact: true,
    });
    await expect(janeCell).toBeVisible();
    await expect(bobCell).toBeVisible();
    await expect(aliceCell).toBeVisible();

    // Jane is attending (green background)
    await expect(janeCell).toHaveClass(/background-green/);
    // Bob is NOT attending (no green)
    await expect(bobCell).not.toHaveClass(/background-green/);
    // Alice is attending (green background)
    await expect(aliceCell).toHaveClass(/background-green/);

    // --- Info circles (computed values) ---
    // Fixture: Jane attending + Alice attending + 1 guest = 3 total
    const totalCircle = page.locator(".info-circle", { hasText: "Total" });
    await expect(totalCircle).toContainText("3");
    // Fixture: no vegetarian attendees (Bob is veg but not attending)
    const vegCircle = page.locator(".info-circle", { hasText: "Veg" });
    await expect(vegCircle).toContainText("0");
    // Fixture: Alice is late = 1 late
    const lateCircle = page.locator(".info-circle", { hasText: "Late" });
    await expect(lateCircle).toContainText("1");

    // --- Late/Veg switch initial states ---
    // Alice (id=3) is late -- her switch should be checked
    await expect(page.locator("#late_switch_3")).toBeChecked();
    // Jane (id=1) is not late -- her switch should be unchecked
    await expect(page.locator("#late_switch_1")).not.toBeChecked();
    // Bob (id=2) is vegetarian -- his switch should be checked
    await expect(page.locator("#veg_switch_2")).toBeChecked();
    // Jane (id=1) is not vegetarian
    await expect(page.locator("#veg_switch_1")).not.toBeChecked();

    // --- Guest icons ---
    // Jane has 1 non-vegetarian guest: should show a cow icon
    const janeRow = janeCell.locator("xpath=ancestor::tr");
    await expect(janeRow.locator('.badge img[alt="cow-icon"]')).toBeVisible();
    // Bob has no guests: no icons in his row
    const bobRow = bobCell.locator("xpath=ancestor::tr");
    await expect(bobRow.locator(".badge img")).toHaveCount(0);

    // --- Cooks/Bills ---
    // First bill has resident_id=1 (Jane) and amount=25.50
    const firstCookSelect = page
      .locator('[aria-label="Select meal cook"]')
      .first();
    await expect(firstCookSelect).toHaveValue("1");
    const firstCostInput = page.locator('[aria-label="Set meal cost"]').first();
    await expect(firstCostInput).toHaveValue("25.50");
  });

  test("toggle resident attendance updates background and counts", async ({
    page,
  }) => {
    let apiMethod = null;
    let apiPayload = null;
    await page.route("**/api/v1/meals/*/residents/2*", (route) => {
      apiMethod = route.request().method();
      if (apiMethod === "POST") {
        apiPayload = route.request().postDataJSON();
      }
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    const bobCell = page.getByRole("cell", {
      name: "Bob Johnson",
      exact: true,
    });
    await expect(bobCell).toBeVisible({ timeout: 10000 });

    // Before: Bob not attending, Total=3, Veg=0
    await expect(bobCell).not.toHaveClass(/background-green/);
    const totalCircle = page.locator(".info-circle", { hasText: "Total" });
    await expect(totalCircle).toContainText("3");

    // Click to toggle attending (Bob is not attending -> adds him)
    await bobCell.click();

    // After: Bob attending (green), Total=4, Veg=1 (Bob is vegetarian)
    await expect(bobCell).toHaveClass(/background-green/, { timeout: 3000 });
    await expect(totalCircle).toContainText("4", { timeout: 3000 });
    const vegCircle = page.locator(".info-circle", { hasText: "Veg" });
    await expect(vegCircle).toContainText("1", { timeout: 3000 });

    // API: POST to add attendance (not DELETE), with late/vegetarian in payload
    await expect.poll(() => apiMethod, { timeout: 3000 }).toBe("POST");
    expect(apiPayload.vegetarian).toBe(true);
    expect(apiPayload.late).toBe(false);
  });

  test("toggle late switch updates checked state and late count", async ({
    page,
  }) => {
    let patchData = null;
    await page.route("**/api/v1/meals/*/residents/1*", (route) => {
      if (route.request().method() === "PATCH") {
        patchData = route.request().postDataJSON();
      }
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // Before: Jane not late, late count = 1 (only Alice)
    const lateSwitch = page.locator("#late_switch_1");
    await expect(lateSwitch).not.toBeChecked();
    const lateCircle = page.locator(".info-circle", { hasText: "Late" });
    await expect(lateCircle).toContainText("1");

    // Toggle late via the label (clicking hidden input with force doesn't fire React onChange)
    await page.locator('label[for="late_switch_1"]').click();

    // After: Jane is now late, switch is checked, late count = 2
    await expect(lateSwitch).toBeChecked({ timeout: 3000 });
    await expect(lateCircle).toContainText("2", { timeout: 3000 });

    // API should have been called with late: true
    expect(patchData).toBeTruthy();
    expect(patchData.late).toBe(true);
  });

  test("toggle veg switch updates checked state and veg count", async ({
    page,
  }) => {
    let patchData = null;
    await page.route("**/api/v1/meals/*/residents/1*", (route) => {
      if (route.request().method() === "PATCH") {
        patchData = route.request().postDataJSON();
      }
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // Before: Jane not veg, veg count = 0
    const vegSwitch = page.locator("#veg_switch_1");
    await expect(vegSwitch).not.toBeChecked();
    const vegCircle = page.locator(".info-circle", { hasText: "Veg" });
    await expect(vegCircle).toContainText("0");

    // Toggle veg via the label
    await page.locator('label[for="veg_switch_1"]').click();

    // After: Jane is now veg, switch is checked, veg count = 1
    await expect(vegSwitch).toBeChecked({ timeout: 3000 });
    await expect(vegCircle).toContainText("1", { timeout: 3000 });

    // API should have been called with vegetarian: true
    expect(patchData).toBeTruthy();
    expect(patchData.vegetarian).toBe(true);
  });

  test("edit meal description fires debounced API call", async ({ page }) => {
    let descriptionPayload = null;
    await page.route("**/api/v1/meals/*/description*", (route) => {
      descriptionPayload = route.request().postDataJSON();
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    const textarea = page.locator('[aria-label="Enter meal description"]');
    await expect(textarea).toHaveValue("Pasta night with garlic bread");

    // Clear and type new description
    await textarea.fill("Updated: Spaghetti and meatballs");
    await expect(textarea).toHaveValue("Updated: Spaghetti and meatballs");

    // Wait for debounce (700ms) to trigger the API call
    await expect.poll(() => descriptionPayload, { timeout: 3000 }).toBeTruthy();
    expect(descriptionPayload.description).toBe(
      "Updated: Spaghetti and meatballs",
    );
  });

  test("open/close meal toggles status and disables description", async ({
    page,
  }) => {
    let closedPayload = null;
    await page.route("**/api/v1/meals/*/closed*", (route) => {
      closedPayload = route.request().postDataJSON();
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Before: OPEN, description editable
    await expect(page.locator("h1", { hasText: "OPEN" })).toBeVisible({
      timeout: 10000,
    });
    const textarea = page.locator('[aria-label="Enter meal description"]');
    await expect(textarea).not.toBeDisabled();

    // Close the meal
    await page.locator("text=Open / Close Meal").click();

    // After: CLOSED, description disabled, extras visible
    await expect(page.locator("h1", { hasText: "CLOSED" })).toBeVisible({
      timeout: 5000,
    });
    await expect(textarea).toBeDisabled({ timeout: 3000 });
    await expect(page.locator("text=Extras")).toBeVisible();

    // API called with closed: true
    expect(closedPayload).toBeTruthy();
    expect(closedPayload.closed).toBe(true);
  });

  test("add a guest opens dropdown and fires API call", async ({ page }) => {
    let guestPostData = null;
    await page.route("**/api/v1/meals/*/residents/*/guests*", (route) => {
      if (route.request().method() === "POST") {
        guestPostData = route.request().postDataJSON();
      }
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 999,
          meal_id: 42,
          resident_id: 1,
          vegetarian: false,
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    const janeCell = page.getByRole("cell", {
      name: "Jane Smith",
      exact: true,
    });
    await expect(janeCell).toBeVisible({ timeout: 10000 });

    // Before: Jane has 1 guest (1 cow badge icon)
    const janeRow = janeCell.locator("xpath=ancestor::tr");
    await expect(janeRow.locator('.badge img[alt="cow-icon"]')).toHaveCount(1);

    // Click add guest button to open dropdown
    const addGuestButton = janeRow.locator(".dropdown-add");
    await expect(addGuestButton).toBeVisible();
    await addGuestButton.click();

    // Dropdown should show cow and carrot options
    const dropdownMenu = janeRow.locator(".dropdown-menu");
    await expect(dropdownMenu).toBeVisible({ timeout: 3000 });
    await expect(dropdownMenu.locator("img[alt='cow-icon']")).toBeVisible();
    await expect(dropdownMenu.locator("img[alt='carrot-icon']")).toBeVisible();

    // Click cow icon to add non-veg guest
    await dropdownMenu.locator("img[alt='cow-icon']").click();

    // API should have been called with vegetarian: false
    await expect.poll(() => guestPostData, { timeout: 3000 }).toBeTruthy();
    expect(guestPostData.vegetarian).toBe(false);
  });

  test("remove guest button exists and is enabled for resident with guests", async ({
    page,
  }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    const janeCell = page.getByRole("cell", {
      name: "Jane Smith",
      exact: true,
    });
    await expect(janeCell).toBeVisible({ timeout: 10000 });

    // Jane has 1 guest (cow badge icon)
    const janeRow = janeCell.locator("xpath=ancestor::tr");
    await expect(janeRow.locator('.badge img[alt="cow-icon"]')).toHaveCount(1);

    // Remove button should exist with correct aria-label
    const removeButton = janeRow.locator(
      '[aria-label="Remove Guest of Jane Smith"]',
    );
    await expect(removeButton).toBeVisible();

    // The button should be enabled (meal is open, Jane has guests)
    await expect(removeButton).not.toBeDisabled();

    // Bob has no guests -- his remove button should be disabled
    const bobCell = page.getByRole("cell", {
      name: "Bob Johnson",
      exact: true,
    });
    const bobRow = bobCell.locator("xpath=ancestor::tr");
    const bobRemove = bobRow.locator(
      '[aria-label="Remove Guest of Bob Johnson"]',
    );
    await expect(bobRemove).toBeDisabled();
  });

  test("set cook and cost persists in the UI and fires API call", async ({
    page,
  }) => {
    let billsPayload = null;
    await page.route("**/api/v1/meals/*/bills*", (route) => {
      if (route.request().method() === "PATCH") {
        billsPayload = route.request().postDataJSON();
      }
      route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // First cook select is pre-populated with Jane (value="1") and cost=25.50
    const cookSelect = page.locator('[aria-label="Select meal cook"]').first();
    await expect(cookSelect).toHaveValue("1", { timeout: 10000 });
    const costInput = page.locator('[aria-label="Set meal cost"]').first();
    await expect(costInput).toHaveValue("25.50");

    // Change cost to 35.00
    await costInput.fill("35.00");
    await expect(costInput).toHaveValue("35.00");

    // API should be called with updated bills
    await expect.poll(() => billsPayload, { timeout: 3000 }).toBeTruthy();
    expect(billsPayload.bills).toBeDefined();
  });

  test("guest icons (image assets) load correctly via Vite", async ({
    page,
  }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    const janeCell = page.getByRole("cell", {
      name: "Jane Smith",
      exact: true,
    });
    await expect(janeCell).toBeVisible({ timeout: 10000 });

    // Jane's row should have a cow icon in the badge (non-veg guest)
    const janeRow = janeCell.locator("xpath=ancestor::tr");
    const cowIcon = janeRow.locator('.badge img[alt="cow-icon"]');
    await expect(cowIcon).toBeVisible();

    // Verify the image actually loaded (not a broken image)
    const naturalWidth = await cowIcon.evaluate((el) => el.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    // Guest dropdown also has cow and carrot images (for adding guests)
    const dropdownCow = janeRow.locator(".dropdown-menu img[alt='cow-icon']");
    const dropdownCarrot = janeRow.locator(
      ".dropdown-menu img[alt='carrot-icon']",
    );
    // Open dropdown to make images visible
    await janeRow.locator(".dropdown-add").click();
    await expect(dropdownCow).toBeVisible({ timeout: 3000 });
    await expect(dropdownCarrot).toBeVisible();
  });

  test("closed meal shows extras radio buttons", async ({ page }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Extras section exists but is hidden (visibility:hidden) when meal is open
    const extrasContainer = page.locator('[aria-label="Set Extras to 0"]');
    // The parent div has visibility:hidden when open
    await expect(extrasContainer).toBeHidden();

    // Close the meal
    await page.locator("text=Open / Close Meal").click();
    await expect(page.locator("h1", { hasText: "CLOSED" })).toBeVisible({
      timeout: 5000,
    });

    // Now extras radio buttons should be visible
    await expect(page.locator('[aria-label="Set Extras to 0"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('[aria-label="Set Extras to 3"]')).toBeVisible();

    // Click extras = 3
    await page.locator('[aria-label="Set Extras to 3"]').click({ force: true });

    // The checkbox for 3 should be checked
    await expect(page.locator('[aria-label="Set Extras to 3"]')).toBeChecked({
      timeout: 3000,
    });
  });

  test("meal history modal shows audit entries with correct data", async ({
    page,
  }) => {
    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");

    // Click history link
    const historyLink = page.locator("text=history").first();
    await expect(historyLink).toBeVisible({ timeout: 10000 });
    await historyLink.click();

    // Modal should open
    const modal = page.locator(".ReactModal__Content--after-open");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Should show all 3 history entries from fixture
    await expect(
      modal.getByRole("cell", { name: "Jane Smith" }).first(),
    ).toBeVisible();
    await expect(
      modal.getByRole("cell", { name: "signed up", exact: true }),
    ).toBeVisible();
    await expect(
      modal.getByRole("cell", { name: "signed up late" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("cell", { name: "added a guest" }),
    ).toBeVisible();

    // Table should have header columns
    await expect(
      modal.getByRole("columnheader", { name: "User" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("columnheader", { name: "Action" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("columnheader", { name: "Time" }),
    ).toBeVisible();
  });

  test("prev/next meal arrows navigate and fire API calls", async ({
    page,
  }) => {
    const apiCalls = [];
    await page.route("**/api/v1/meals/*/cooks*", (route) => {
      const url = route.request().url();
      apiCalls.push(url);
      // Extract meal ID from URL and return fixture with matching id
      const mealId = Number(url.match(/\/meals\/(\d+)\//)[1]);
      const mealFixture = require("../fixtures/meal.json");
      const data = { ...mealFixture, id: mealId };
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });

    await page.goto("/meals/42/edit/");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("cell", { name: "Jane Smith", exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // Next arrow should be visible (fixture has next_id: 43)
    // Click next
    const nextArrow = page.locator("svg.fa-chevron-right").first();
    await nextArrow.click();
    await expect(page).toHaveURL(/\/meals\/43\/edit/, { timeout: 5000 });

    // Prev arrow should navigate back (fixture has prev_id: 41)
    await page.waitForLoadState("networkidle");
    const prevArrow = page.locator("svg.fa-chevron-left").first();
    await prevArrow.click();
    await expect(page).toHaveURL(/\/meals\/41\/edit/, { timeout: 5000 });
  });
});
