/**
 * Shared test setup helpers for Comeals E2E tests.
 *
 * Handles: auth cookies, API mocking, Pusher stubbing, dialog handling,
 * localforage clearing, and clock freezing for visual determinism.
 */

const mealFixture = require("../fixtures/meal.json");
const calendarFixture = require("../fixtures/calendar.json");
const historyFixture = require("../fixtures/history.json");

const AUTH_COOKIES = [
  { name: "token", value: "test-token-abc123", domain: "localhost", path: "/" },
  {
    name: "community_id",
    value: "1",
    domain: "localhost",
    path: "/",
  },
  {
    name: "resident_id",
    value: "1",
    domain: "localhost",
    path: "/",
  },
  {
    name: "username",
    value: "Jane Smith",
    domain: "localhost",
    path: "/",
  },
];

/**
 * Set auth cookies so the app treats the user as logged in.
 */
async function authenticateContext(context) {
  await context.addCookies(AUTH_COOKIES);
}

/**
 * Stub Pusher globally so the app never makes real WebSocket connections.
 * Must be called before navigating to the app.
 */
async function stubPusher(page) {
  await page.addInitScript(() => {
    window.Pusher = function () {
      this.connection = {
        socket_id: "test-socket-id",
        bind: function () {},
      };
      this.subscribe = function () {
        return {
          bind: function () {},
          unbind_all: function () {},
        };
      };
      this.unsubscribe = function () {};
    };
  });
}

/**
 * Disable the idle timer that redirects after 5 minutes of inactivity.
 * Must be called before navigating to the app.
 */
async function disableIdleTimer(page) {
  await page.addInitScript(() => {
    window.idleTimer = function () {};
  });
}

/**
 * Clear localforage/IndexedDB to prevent stale cached data between tests.
 */
async function clearStorage(page) {
  await page.evaluate(async () => {
    if (window.localforage) {
      await window.localforage.clear();
    }
    // Also clear sessionStorage (chunk retry flag)
    sessionStorage.clear();
  });
}

/**
 * Mock all API routes with fixture data. Call after page is created but
 * before navigating to the app.
 *
 * Options:
 *   mealData    - override meal fixture
 *   calendarData - override calendar fixture
 *   historyData - override history fixture
 *   hosts       - hosts list for reservation forms
 */
async function mockApi(page, options = {}) {
  const meal = options.mealData || mealFixture;
  const calendar = options.calendarData || calendarFixture;
  const history = options.historyData || historyFixture;
  const hosts = options.hosts || [
    [1, "jane@example.com", "Jane Smith"],
    [2, "bob@example.com", "Bob Johnson"],
    [3, "alice@example.com", "Alice Williams"],
  ];

  // Meal data (GET /api/v1/meals/*/cooks*)
  await page.route("**/api/v1/meals/*/cooks*", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(meal),
      });
    } else {
      route.fulfill({ status: 200, body: "{}" });
    }
  });

  // Next meal (GET /api/v1/meals/next*)
  await page.route("**/api/v1/meals/next*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ meal_id: meal.id }),
    });
  });

  // Calendar data (GET /api/v1/communities/*/calendar/*)
  await page.route("**/api/v1/communities/*/calendar/*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(calendar),
    });
  });

  // Meal history (GET /api/v1/meals/*/history*)
  await page.route("**/api/v1/meals/*/history*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(history),
    });
  });

  // Resident attendance toggle (POST/DELETE /api/v1/meals/*/residents/*)
  await page.route("**/api/v1/meals/*/residents/*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Guest operations (POST/DELETE .../guests*)
  await page.route("**/api/v1/meals/*/residents/*/guests*", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 999,
          meal_id: meal.id,
          resident_id: 1,
          name: null,
          vegetarian: false,
          created_at: new Date().toISOString(),
        }),
      });
    } else {
      route.fulfill({ status: 200, body: "{}" });
    }
  });

  // Meal closed toggle (PATCH /api/v1/meals/*/closed*)
  await page.route("**/api/v1/meals/*/closed*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Meal description (PATCH /api/v1/meals/*/description*)
  await page.route("**/api/v1/meals/*/description*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Meal bills (PATCH /api/v1/meals/*/bills*)
  await page.route("**/api/v1/meals/*/bills*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Meal max/extras (PATCH /api/v1/meals/*/max*)
  await page.route("**/api/v1/meals/*/max*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Login (POST /api/v1/residents/token)
  await page.route("**/api/v1/residents/token", (route) => {
    if (route.request().method() === "POST") {
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
    } else {
      route.continue();
    }
  });

  // Password reset request (POST /api/v1/residents/password-reset)
  await page.route("**/api/v1/residents/password-reset", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Password reset email sent." }),
      });
    } else {
      route.continue();
    }
  });

  // Password reset with token (GET name, POST new password)
  await page.route("**/api/v1/residents/name/*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "Jane Smith" }),
    });
  });

  await page.route("**/api/v1/residents/password-reset/*", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Password updated successfully." }),
      });
    } else {
      route.continue();
    }
  });

  // Events CRUD -- individual event (must come before collection route)
  await page.route("**/api/v1/events/**", (route) => {
    const method = route.request().method();
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
      // PATCH (update) or DELETE
      route.fulfill({ status: 200, body: "{}" });
    }
  });

  // Events collection (POST to create)
  await page.route("**/api/v1/events?*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Common house reservations -- individual
  await page.route("**/api/v1/common-house-reservations/**", (route) => {
    const method = route.request().method();
    if (method === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          event: {
            id: 50,
            resident_id: 1,
            title: "Book Club",
            start_date: "2026-01-22T19:00:00",
            end_date: "2026-01-22T21:00:00",
          },
          residents: hosts,
        }),
      });
    } else {
      route.fulfill({ status: 200, body: "{}" });
    }
  });

  // Common house reservations -- collection (POST to create)
  await page.route("**/api/v1/common-house-reservations?*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Guest room reservations -- individual
  await page.route("**/api/v1/guest-room-reservations/**", (route) => {
    const method = route.request().method();
    if (method === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          event: {
            id: 60,
            resident_id: 1,
            date: "2026-01-25T00:00:00",
          },
          hosts: hosts,
        }),
      });
    } else {
      route.fulfill({ status: 200, body: "{}" });
    }
  });

  // Guest room reservations -- collection (POST to create)
  await page.route("**/api/v1/guest-room-reservations?*", (route) => {
    route.fulfill({ status: 200, body: "{}" });
  });

  // Community hosts
  await page.route("**/api/v1/communities/*/hosts*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(hosts),
    });
  });

  // Rotations
  await page.route("**/api/v1/rotations/*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 10,
        description: "Kitchen cleaning rotation",
        residents: [
          { id: 1, display_name: "Jane Smith", signed_up: true },
          { id: 2, display_name: "Bob Johnson", signed_up: false },
        ],
      }),
    });
  });

  // Resident ID lookup
  await page.route("**/api/v1/residents/id*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(1),
    });
  });

  // Version check (version.txt)
  await page.route("**/version.txt*", (route) => {
    route.fulfill({ status: 200, contentType: "text/plain", body: "1.9.0" });
  });
}

/**
 * Full page setup: auth + pusher stub + idle timer disable + API mocks.
 */
async function setupAuthenticatedPage(page, context, options = {}) {
  await authenticateContext(context);
  await stubPusher(page);
  await disableIdleTimer(page);
  await mockApi(page, options);
}

module.exports = {
  AUTH_COOKIES,
  authenticateContext,
  stubPusher,
  disableIdleTimer,
  clearStorage,
  mockApi,
  setupAuthenticatedPage,
};
