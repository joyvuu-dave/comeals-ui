import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock external modules before importing stores
vi.mock("axios", () => {
  const mockAxios = vi.fn(() => Promise.resolve({ status: 200 }));
  mockAxios.get = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
  mockAxios.interceptors = {
    response: { use: vi.fn(), eject: vi.fn() },
    request: { use: vi.fn() },
  };
  return { default: mockAxios };
});

vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn((name) => {
      const cookies = {
        token: "test-token",
        community_id: "test-community-id",
      };
      return cookies[name];
    }),
    remove: vi.fn(),
  },
}));

vi.mock("pusher-js", () => {
  class MockPusher {
    constructor() {
      this.connection = {
        bind: vi.fn(),
        socket_id: "test-socket",
      };
      this.subscribe = vi.fn(() => ({ bind: vi.fn(), name: "test-channel" }));
      this.unsubscribe = vi.fn();
    }
  }
  return { default: MockPusher };
});

vi.mock("localforage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("uuid", () => {
  let counter = 0;
  return {
    v4: vi.fn(() => "test-uuid-" + ++counter),
  };
});

import { unprotect, isAlive } from "mobx-state-tree";
import { runInAction } from "mobx";
import { DataStore } from "../../../src/stores/data_store.js";
import localforage from "localforage";
import axios from "axios";
import toastStore from "../../../src/stores/toast_store.js";

function createDataStore(opts = {}) {
  const { mealProps = {}, residents = [], guests = [], bills = [] } = opts;

  const mealDefaults = { id: 1, ...mealProps };

  // DataStore.afterCreate sets up Pusher. We need navigator.onLine available.
  const store = DataStore.create({
    meals: [mealDefaults],
    meal: mealDefaults.id,
    residentStore: { residents: {} },
    billStore: { bills: {} },
    guestStore: { guests: {} },
  });

  // Temporarily unprotect the tree so we can populate sub-stores for testing
  unprotect(store);
  runInAction(() => {
    residents.forEach((r) => store.residentStore.residents.put(r));
    guests.forEach((g) => store.guestStore.guests.put(g));
    bills.forEach((b) => store.billStore.bills.put(b));
  });

  return store;
}

describe("DataStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up window/navigator stubs for afterCreate
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
    window.alert = vi.fn();
  });

  // ── attendeesCount ──

  describe("attendeesCount", () => {
    it("counts attending residents plus guests", () => {
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true },
          { id: 11, meal_id: 1, name: "Bob", attending: true },
          { id: 12, meal_id: 1, name: "Charlie", attending: false },
        ],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
          { id: 101, meal_id: 1, resident_id: 11, created_at: Date.now() },
        ],
      });

      // 2 attending residents + 2 guests = 4
      expect(store.attendeesCount).toBe(4);
    });

    it("returns 0 when no one is attending and no guests", () => {
      const store = createDataStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      expect(store.attendeesCount).toBe(0);
    });

    it("counts only guests when no residents are attending", () => {
      const store = createDataStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
        ],
      });

      expect(store.attendeesCount).toBe(1);
    });

    it("counts only attending residents when no guests", () => {
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true },
          { id: 11, meal_id: 1, name: "Bob", attending: true },
        ],
      });

      expect(store.attendeesCount).toBe(2);
    });
  });

  // ── vegetarianCount ──

  describe("vegetarianCount", () => {
    it("counts vegetarian attending residents plus vegetarian guests", () => {
      const store = createDataStore({
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            vegetarian: true,
          },
          {
            id: 11,
            meal_id: 1,
            name: "Bob",
            attending: true,
            vegetarian: false,
          },
          {
            id: 12,
            meal_id: 1,
            name: "Charlie",
            attending: false,
            vegetarian: true,
          },
        ],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: Date.now(),
            vegetarian: true,
          },
          {
            id: 101,
            meal_id: 1,
            resident_id: 11,
            created_at: Date.now(),
            vegetarian: false,
          },
        ],
      });

      // Alice is veg + attending, Charlie is veg but NOT attending, guest 100 is veg
      expect(store.vegetarianCount).toBe(2);
    });

    it("returns 0 when no vegetarians", () => {
      const store = createDataStore({
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            vegetarian: false,
          },
        ],
      });

      expect(store.vegetarianCount).toBe(0);
    });

    it("does not count non-attending vegetarian residents", () => {
      const store = createDataStore({
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            vegetarian: true,
          },
        ],
      });

      expect(store.vegetarianCount).toBe(0);
    });
  });

  // ── lateCount ──

  describe("lateCount", () => {
    it("counts residents who are late", () => {
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true, late: true },
          { id: 11, meal_id: 1, name: "Bob", attending: true, late: false },
          {
            id: 12,
            meal_id: 1,
            name: "Charlie",
            attending: true,
            late: true,
          },
        ],
      });

      expect(store.lateCount).toBe(2);
    });

    it("returns 0 when no one is late", () => {
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true, late: false },
        ],
      });

      expect(store.lateCount).toBe(0);
    });

    it("returns 0 when no residents", () => {
      const store = createDataStore();
      expect(store.lateCount).toBe(0);
    });

    it("excludes non-attending residents with late:true", () => {
      // lateCount filters by attending && late, matching the vegetarianCount pattern
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: false, late: true },
          { id: 11, meal_id: 1, name: "Bob", attending: true, late: true },
        ],
      });
      expect(store.lateCount).toBe(1);
    });

    it("matches vegetarianCount pattern for non-attending residents", () => {
      // Both views filter by attending before checking their respective flag
      const store = createDataStore({
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            late: true,
            vegetarian: true,
          },
        ],
      });
      expect(store.vegetarianCount).toBe(0);
      expect(store.lateCount).toBe(0);
    });
  });

  // ── extras ──

  describe("extras", () => {
    it("returns 'n/a' when meal is open", () => {
      const store = createDataStore({
        mealProps: { closed: false, extras: 5 },
      });

      expect(store.extras).toBe("n/a");
    });

    it("returns numeric difference when meal is closed and max is a number", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: 5 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      // max = extras + attendeesCount = 5 + 1 = 6
      // extras view = max - attendeesCount = 6 - 1 = 5
      expect(store.extras).toBe(5);
    });

    it("returns empty string when meal is closed and max is null", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: null },
      });

      expect(store.extras).toBe("");
    });

    it("returns 0 when closed and all spots taken", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: 0 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
        ],
      });

      // max = 0 + 2 = 2, extras = 2 - 2 = 0
      expect(store.extras).toBe(0);
    });

    it("returns negative when over capacity", () => {
      // This can happen if extras was set before people were added
      const store = createDataStore({
        mealProps: { closed: true, extras: -1 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      // max = -1 + 1 = 0, extras = 0 - 1 = -1
      expect(store.extras).toBe(-1);
    });
  });

  // ── canAdd ──

  describe("canAdd", () => {
    it("returns true when meal is open", () => {
      const store = createDataStore({
        mealProps: { closed: false },
      });

      expect(store.canAdd).toBe(true);
    });

    it("returns false when meal is closed and no max set", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: null },
      });

      // extras view returns "" when closed and max is null
      expect(store.extras).toBe("");
      expect(store.canAdd).toBe(false);
    });

    it("returns true when meal is closed and extras >= 1", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: 3 },
      });

      expect(store.canAdd).toBe(true);
    });

    it("returns false when meal is closed and extras is 0", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: 0 },
      });

      // max = 0 + 0 = 0, extras view = 0 - 0 = 0
      // canAdd: closed=true, extras === 0 (number, not ""), extras < 1
      expect(store.canAdd).toBe(false);
    });

    it("returns false when meal is closed and extras is negative", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: -1 },
      });

      expect(store.canAdd).toBe(false);
    });
  });

  // ── loadData transformation ──

  describe("loadData", () => {
    it("formats bill amounts correctly (0 becomes empty string, others get 2 decimals)", () => {
      const store = createDataStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
      });

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "Pasta night",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: 2,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [
          { id: "b1", resident_id: 10, amount: "25.5", no_cost: false },
          { id: "b2", resident_id: null, amount: "0", no_cost: false },
        ],
      };

      store.loadData(data);

      const bills = Array.from(store.bills.values());
      // Should have at least 3 bills (2 from data + 1 blank to reach min of 3)
      expect(bills.length).toBeGreaterThanOrEqual(3);

      // Find the bill with amount 25.50
      const billWithAmount = bills.find((b) => b.amount === "25.50");
      expect(billWithAmount).toBeTruthy();

      // Bill with amount 0 should have empty string
      const billWithZero = bills.find(
        (b) => b.amount === "" && b.resident === null,
      );
      expect(billWithZero).toBeTruthy();
    });

    it("sorts residents alphabetically by name", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 12,
            meal_id: 1,
            name: "Charlie",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 11,
            meal_id: 1,
            name: "Bob",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [],
      };

      store.loadData(data);

      // Residents should be sorted: Alice, Bob, Charlie
      const names = Array.from(store.residents.values()).map((r) => r.name);
      expect(names).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("creates blank bills to reach minimum of 3", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [{ id: "b1", resident_id: null, amount: "10", no_cost: false }],
      };

      store.loadData(data);

      // 1 bill from data + 2 blanks = 3
      expect(store.bills.size).toBe(3);
    });

    it("does not create blank bills when 3 or more exist", () => {
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice" },
          { id: 11, meal_id: 1, name: "Bob" },
          { id: 12, meal_id: 1, name: "Charlie" },
        ],
      });

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 11,
            meal_id: 1,
            name: "Bob",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 12,
            meal_id: 1,
            name: "Charlie",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [
          { id: "b1", resident_id: 10, amount: "10", no_cost: false },
          { id: "b2", resident_id: 11, amount: "20", no_cost: false },
          { id: "b3", resident_id: 12, amount: "30", no_cost: false },
          { id: "b4", resident_id: null, amount: "5", no_cost: false },
        ],
      };

      store.loadData(data);

      // 4 bills, no blanks needed
      expect(store.bills.size).toBe(4);
    });

    it("sets meal properties from data", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "Taco Tuesday",
        closed: true,
        closed_at: "2023-06-15T18:00:00Z",
        reconciled: true,
        max: null,
        next_id: 2,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [],
      };

      store.loadData(data);

      expect(store.meal.description).toBe("Taco Tuesday");
      expect(store.meal.closed).toBe(true);
      expect(store.meal.reconciled).toBe(true);
      expect(store.meal.nextId).toBe(2);
      expect(store.meal.prevId).toBeNull();
    });

    it("sets extras based on max minus attendees when max is provided", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: true,
        closed_at: "2023-06-15T18:00:00Z",
        reconciled: false,
        max: 10,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 11,
            meal_id: 1,
            name: "Bob",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 12,
            meal_id: 1,
            name: "Charlie",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: "2023-06-15T17:00:00Z",
            vegetarian: false,
          },
        ],
        bills: [],
      };

      store.loadData(data);

      // max=10, attending=2, guests=1 => extras = 10 - 3 = 7
      expect(store.meal.extras).toBe(7);
    });

    it("sets extras to null when max is null", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [],
      };

      store.loadData(data);

      expect(store.meal.extras).toBeNull();
    });

    it("sets isLoading to false after loading", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [],
      };

      store.loadData(data);
      expect(store.isLoading).toBe(false);
    });

    it("renames resident_id to resident in bill data", () => {
      const store = createDataStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
      });

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [{ id: "b1", resident_id: 10, amount: "15", no_cost: false }],
      };

      store.loadData(data);

      const bills = Array.from(store.bills.values());
      const aliceBill = bills.find((b) => b.resident !== null);
      expect(aliceBill).toBeTruthy();
      expect(aliceBill.resident.id).toBe(10);
    });

    it("loads guest data", () => {
      const store = createDataStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
      });

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [
          {
            id: 200,
            meal_id: 1,
            resident_id: 10,
            created_at: "2023-06-15T17:00:00Z",
            vegetarian: true,
            name: null,
          },
        ],
        bills: [],
      };

      store.loadData(data);

      expect(store.guests.size).toBe(1);
      const guest = store.guests.get("200");
      expect(guest.vegetarian).toBe(true);
      expect(guest.resident_id).toBe(10);
    });
  });

  // ── Dead tree / navigation race conditions ──

  describe("navigation race conditions", () => {
    function makeMealData(id, residentOverrides = {}) {
      return {
        id,
        date: "2023-06-15",
        description: `Meal ${id}`,
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: id + 1,
        prev_id: id - 1,
        residents: [
          {
            id: 10,
            meal_id: id,
            name: "Alice",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
            ...residentOverrides,
          },
        ],
        guests: [],
        bills: [],
      };
    }

    it("loadData kills old resident nodes and creates live replacements", () => {
      const store = createDataStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      // Capture a reference to the old resident node
      const oldResident = store.residents.get("10");
      expect(isAlive(oldResident)).toBe(true);

      // Load new data (simulates navigating to a different meal)
      store.loadData(makeMealData(1, { attending: false }));

      // Old reference is dead
      expect(isAlive(oldResident)).toBe(false);

      // New resident is alive with updated data
      const newResident = store.residents.get("10");
      expect(isAlive(newResident)).toBe(true);
      expect(newResident.attending).toBe(false);
    });

    it("successive loadData calls replace nodes each time", () => {
      const store = createDataStore();

      store.loadData(makeMealData(1, { attending: true }));
      const ref1 = store.residents.get("10");
      expect(isAlive(ref1)).toBe(true);

      store.loadData(makeMealData(1, { attending: false }));
      expect(isAlive(ref1)).toBe(false);

      const ref2 = store.residents.get("10");
      expect(isAlive(ref2)).toBe(true);
      expect(ref2.attending).toBe(false);

      store.loadData(makeMealData(1, { late: true }));
      expect(isAlive(ref2)).toBe(false);

      const ref3 = store.residents.get("10");
      expect(isAlive(ref3)).toBe(true);
      expect(ref3.late).toBe(true);
    });

    it("loadDataAsync skips stale responses from a previous meal", async () => {
      const store = createDataStore({
        mealProps: { id: 1 },
      });

      // Set up a second meal so we can switch to it
      unprotect(store);
      runInAction(() => {
        store.meals.push({ id: 2 });
      });

      // Load initial data for meal 1
      store.loadData(makeMealData(1, { attending: true }));
      expect(store.residents.get("10").attending).toBe(true);

      // Simulate: loadDataAsync fires a request for meal 1
      // but user navigates to meal 2 before response arrives
      const meal1Response = {
        status: 200,
        data: makeMealData(1, { attending: false, late: true }),
      };
      axios.get.mockResolvedValueOnce(meal1Response);
      localforage.setItem.mockResolvedValueOnce();

      // Switch to meal 2 and load its data
      runInAction(() => {
        store.meal = 2;
      });
      store.loadData(makeMealData(2, { attending: false }));
      expect(store.meal.id).toBe(2);
      expect(store.meal.description).toBe("Meal 2");

      // Now trigger loadDataAsync (which will get the stale meal 1 response)
      store.loadDataAsync();

      // Wait for the axios + localforage promise chain to resolve
      await vi.waitFor(() => {
        expect(localforage.setItem).toHaveBeenCalled();
      });

      // Flush microtasks
      await new Promise((r) => setTimeout(r, 0));

      // State should still show meal 2 data — the stale meal 1 response was skipped
      expect(store.meal.id).toBe(2);
      expect(store.meal.description).toBe("Meal 2");
    });

    it("loadMonth does not clobber meal Pusher subscription", async () => {
      const store = createDataStore({ mealProps: { id: 1 } });

      // Override subscribe to return identifiable channel objects
      window.Comeals.pusher.subscribe = vi.fn((name) => ({
        bind: vi.fn(),
        name: name,
      }));
      window.Comeals.pusher.unsubscribe = vi.fn();

      const mealData = {
        id: 1,
        date: "2023-06-15",
        description: "Meal",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [],
      };
      store.loadData(mealData);
      expect(window.Comeals.mealChannel.name).toBe("meal-1");

      const calendarData = {
        id: 1,
        year: 2023,
        month: 6,
        meals: [],
        bills: [],
        rotations: [],
        birthdays: [],
        common_house_reservations: [],
        guest_room_reservations: [],
        events: [],
      };
      store.loadMonth(calendarData);

      // After loading calendar data, meal subscription must still be intact
      expect(window.Comeals.mealChannel.name).toBe("meal-1");
      expect(window.Comeals.calendarChannel.name).toMatch(/^community-/);
    });

    it("switchMeals skips localforage callback if user already navigated away", async () => {
      const store = createDataStore({
        mealProps: { id: 1 },
      });

      // Add meals 2 and 3 to the array
      unprotect(store);
      runInAction(() => {
        store.meals.push({ id: 2 });
        store.meals.push({ id: 3 });
      });

      // Load initial data for meal 1
      store.loadData(makeMealData(1));

      // Set up localforage to return cached data for meal 2
      const meal2Data = makeMealData(2, { attending: true });
      localforage.getItem.mockResolvedValueOnce(meal2Data);

      // switchMeals to meal 2 starts the async localforage lookup
      store.switchMeals(2);

      // Before localforage resolves, user navigates to meal 3
      runInAction(() => {
        store.meal = 3;
      });
      store.loadData(makeMealData(3, { late: true }));

      // Now let localforage resolve (for the stale meal 2 request)
      await new Promise((r) => setTimeout(r, 0));

      // State should still show meal 3 data — the stale meal 2 callback was skipped
      expect(store.meal.id).toBe(3);
      expect(store.meal.description).toBe("Meal 3");
      expect(store.residents.get("10").late).toBe(true);
    });
  });

  // ── extras view return types ──

  describe("extras view type consistency", () => {
    it("returns string 'n/a' when meal is open", () => {
      const store = createDataStore({
        mealProps: { closed: false, extras: 5 },
      });
      expect(store.extras).toBe("n/a");
      expect(typeof store.extras).toBe("string");
    });

    it("returns a number when meal is closed with max set", () => {
      const store = createDataStore({ mealProps: { closed: true, extras: 3 } });
      expect(typeof store.extras).toBe("number");
    });

    it("returns empty string when meal is closed with null max", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: null },
      });
      expect(store.extras).toBe("");
      expect(typeof store.extras).toBe("string");
    });
  });

  // ── canAdd boundary conditions ──

  describe("canAdd boundary conditions", () => {
    it("returns true when closed and extras is exactly 1 (boundary)", () => {
      // Boundary: extras=1 is the minimum value that allows adding
      const store = createDataStore({ mealProps: { closed: true, extras: 1 } });
      expect(store.canAdd).toBe(true);
    });

    it("returns false when closed and extras is exactly 0 (boundary)", () => {
      const store = createDataStore({ mealProps: { closed: true, extras: 0 } });
      expect(store.canAdd).toBe(false);
    });

    it("handles the transition from extras=1 to 0 after adding a resident", () => {
      // After someone joins, extras decrements — canAdd should flip from true to false
      const store = createDataStore({
        mealProps: { closed: true, extras: 1 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });
      expect(store.canAdd).toBe(true);

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(store.meal.extras).toBe(0);
      expect(store.canAdd).toBe(false);
    });
  });

  // ── BUG-1: closed_at null handling ──

  describe("closed_at null handling", () => {
    it("preserves null closed_at instead of creating epoch Date (Regression test for BUG-1)", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: true,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [],
      };

      store.loadData(data);
      expect(store.meal.closed_at).toBeNull();
    });

    it("preserves a valid closed_at Date", () => {
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: true,
        closed_at: "2023-06-15T18:00:00Z",
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [],
      };

      store.loadData(data);
      expect(store.meal.closed_at).toBeInstanceOf(Date);
      expect(store.meal.closed_at.getTime()).toBe(
        new Date("2023-06-15T18:00:00Z").getTime(),
      );
    });
  });

  // ── BUG-2: setIsOnline parameter handling ──

  describe("setIsOnline", () => {
    it("uses provided value instead of navigator.onLine (Regression test for BUG-2)", () => {
      // navigator.onLine is true from beforeEach
      const store = createDataStore();
      expect(store.isOnline).toBe(true);

      store.setIsOnline(false);
      expect(store.isOnline).toBe(false);

      store.setIsOnline(true);
      expect(store.isOnline).toBe(true);
    });
  });

  // ── BUG-3: submitBills toast behavior on warning ──

  describe("submitBills warning toast", () => {
    it("shows single info toast instead of warning+success (Regression test for BUG-3)", async () => {
      const store = createDataStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", can_cook: true }],
        bills: [{ id: "bill-1", resident: 10, amount: "25.00" }],
      });

      toastStore.clearAll();

      // Mock axios to reject with a warning response
      axios.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: "Warning: third cooks should not be added.",
            type: "warning",
          },
        },
      });

      // Mock the loadDataAsync axios.get call with valid meal data
      axios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          id: 1,
          date: "2023-06-15",
          description: "",
          closed: false,
          closed_at: null,
          reconciled: false,
          max: null,
          next_id: null,
          prev_id: null,
          residents: [
            {
              id: 10,
              meal_id: 1,
              name: "Alice",
              attending: false,
              attending_at: null,
              late: false,
              vegetarian: false,
              can_cook: true,
              active: true,
            },
          ],
          guests: [],
          bills: [
            { id: "bill-1", resident_id: 10, amount: "25.00", no_cost: false },
          ],
        },
      });

      store.submitBills();

      // Wait for the catch handler to fire and verify final toast state
      await vi.waitFor(() => {
        expect(toastStore.toasts).toHaveLength(1);
        expect(toastStore.toasts[0].type).toBe("info");
        expect(toastStore.toasts[0].message).toContain("Cooks saved.");
      });
    });
  });

  // ── BUG-4: loadMonth with missing event arrays ──

  describe("loadMonth missing arrays", () => {
    it("handles missing event arrays without crashing (Regression test for BUG-4)", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const store = createDataStore();

      const data = {
        id: 1,
        year: 2023,
        month: 6,
        meals: [
          {
            title: "Test",
            start: "2023-06-15T18:00:00",
            end: "2023-06-15T19:00:00",
          },
        ],
        // All other arrays omitted
      };

      expect(() => store.loadMonth(data)).not.toThrow();
      expect(store.calendarEvents.length).toBe(1);
      expect(store.isLoading).toBe(false);
      spy.mockRestore();
    });

    it("handles all arrays missing", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const store = createDataStore();

      const data = { id: 1, year: 2023, month: 6 };

      expect(() => store.loadMonth(data)).not.toThrow();
      expect(store.calendarEvents.length).toBe(0);
      spy.mockRestore();
    });
  });

  // ── BUG-6: dangling bill reference ──

  describe("loadData bill reference integrity", () => {
    it("does not crash when bill references non-existent resident (Regression test for BUG-6)", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const store = createDataStore();

      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [
          { id: "b1", resident_id: 10, amount: "15", no_cost: false },
          { id: "b2", resident_id: 999, amount: "20", no_cost: false },
        ],
      };

      // loadData should not throw
      expect(() => store.loadData(data)).not.toThrow();

      // Valid bill with resident 10 should be loadable and accessible
      const bills = Array.from(store.bills.values());
      const validBill = bills.find(
        (b) => b.resident !== null && b.resident.id === 10,
      );
      expect(validBill).toBeTruthy();
      expect(validBill.amount).toBe("15.00");
      spy.mockRestore();
    });
  });

  // ── Hardening: critical path edge cases ──

  describe("loadData edge cases", () => {
    it("handles completely empty data (no residents, guests, or bills)", () => {
      const store = createDataStore();
      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [],
        guests: [],
        bills: [],
      };

      store.loadData(data);
      expect(store.residents.size).toBe(0);
      expect(store.guests.size).toBe(0);
      expect(store.bills.size).toBe(3); // 3 blank bills created
      expect(store.attendeesCount).toBe(0);
      expect(store.meal.extras).toBeNull();
    });

    it("handles max=0 (capacity set to exactly the current attendees)", () => {
      const store = createDataStore();
      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: true,
        closed_at: "2023-06-15T18:00:00Z",
        reconciled: false,
        max: 2,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
          {
            id: 11,
            meal_id: 1,
            name: "Bob",
            attending: true,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [],
      };

      store.loadData(data);
      expect(store.meal.extras).toBe(0); // max=2, attendees=2
      expect(store.canAdd).toBe(false);
    });

    it("handles bill with amount zero correctly (displays as empty string)", () => {
      const store = createDataStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
      });
      const data = {
        id: 1,
        date: "2023-06-15",
        description: "",
        closed: false,
        closed_at: null,
        reconciled: false,
        max: null,
        next_id: null,
        prev_id: null,
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            attending_at: null,
            late: false,
            vegetarian: false,
            can_cook: true,
            active: true,
          },
        ],
        guests: [],
        bills: [{ id: "b1", resident_id: 10, amount: "0", no_cost: false }],
      };

      store.loadData(data);
      const bill = Array.from(store.bills.values()).find(
        (b) => b.resident !== null,
      );
      expect(bill.amount).toBe("");
    });
  });

  describe("toggleClosed validation", () => {
    it("blocks closing when a cook has no cost and no no_cost flag", () => {
      const store = createDataStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", can_cook: true }],
        bills: [{ id: "bill-1", resident: 10, amount: "", no_cost: false }],
      });

      toastStore.clearAll();
      store.toggleClosed();

      // Meal should stay open
      expect(store.meal.closed).toBe(false);
      expect(toastStore.toasts.length).toBe(1);
      expect(toastStore.toasts[0].type).toBe("warning");
    });

    it("allows closing when cook has no_cost flag set", () => {
      const store = createDataStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", can_cook: true }],
        bills: [{ id: "bill-1", resident: 10, amount: "", no_cost: true }],
      });

      toastStore.clearAll();
      store.toggleClosed();

      // Meal should close (optimistic update)
      expect(store.meal.closed).toBe(true);
    });

    it("allows closing when cook has amount filled in", () => {
      const store = createDataStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", can_cook: true }],
        bills: [
          { id: "bill-1", resident: 10, amount: "25.00", no_cost: false },
        ],
      });

      toastStore.clearAll();
      store.toggleClosed();

      expect(store.meal.closed).toBe(true);
    });

    it("allows closing when no cooks are assigned (blank bills)", () => {
      const store = createDataStore({
        mealProps: { closed: false },
        bills: [{ id: "bill-1", amount: "", no_cost: false }],
      });

      toastStore.clearAll();
      store.toggleClosed();

      expect(store.meal.closed).toBe(true);
    });
  });

  describe("loadMonth edge cases", () => {
    it("handles empty arrays (valid but no events)", () => {
      const store = createDataStore();
      const data = {
        id: 1,
        year: 2023,
        month: 6,
        meals: [],
        bills: [],
        rotations: [],
        birthdays: [],
        common_house_reservations: [],
        guest_room_reservations: [],
        events: [],
      };

      store.loadMonth(data);
      expect(store.calendarEvents.length).toBe(0);
      expect(store.isLoading).toBe(false);
    });

    it("rejects string data (error response from API)", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const store = createDataStore();
      var result = store.loadMonth("error: unauthorized");
      expect(result).toBe(true);
      expect(store.isLoading).toBe(false);
      spy.mockRestore();
    });

    it("converts event dates to fake-local Dates in Pacific timezone", () => {
      const store = createDataStore();
      const data = {
        id: 1,
        year: 2023,
        month: 6,
        meals: [
          {
            title: "Dinner",
            start: "2023-06-15T18:30:00",
            end: "2023-06-15T19:30:00",
          },
        ],
        bills: [],
        rotations: [],
        birthdays: [],
        common_house_reservations: [],
        guest_room_reservations: [],
        events: [],
      };

      store.loadMonth(data);
      var event = store.calendarEvents[0];
      expect(event.start).toBeInstanceOf(Date);
      expect(event.end).toBeInstanceOf(Date);
      expect(event.title).toBe("Dinner");
    });

    it("converts offset date strings to correct Pacific dates", () => {
      const store = createDataStore();
      // 4 PM Pacific (-07:00) to 6 PM Pacific (-07:00) on June 15
      const data = {
        id: 1,
        year: 2023,
        month: 6,
        meals: [],
        bills: [],
        rotations: [],
        birthdays: [],
        common_house_reservations: [
          {
            title: "Reservation",
            start: "2023-06-15T16:00:00.000-07:00",
            end: "2023-06-15T18:00:00.000-07:00",
          },
        ],
        guest_room_reservations: [],
        events: [],
      };

      store.loadMonth(data);
      var event = store.calendarEvents[0];
      expect(event.start.getDate()).toBe(15);
      expect(event.start.getHours()).toBe(16);
      expect(event.end.getDate()).toBe(15);
      expect(event.end.getHours()).toBe(18);
    });

    it("converts UTC (Z) date strings to correct Pacific dates", () => {
      const store = createDataStore();
      // 2023-06-16T01:00:00Z = June 15 6 PM Pacific (PDT)
      // 2023-06-16T03:00:00Z = June 15 8 PM Pacific (PDT)
      const data = {
        id: 1,
        year: 2023,
        month: 6,
        meals: [
          {
            title: "Late Dinner",
            start: "2023-06-16T01:00:00Z",
            end: "2023-06-16T03:00:00Z",
          },
        ],
        bills: [],
        rotations: [],
        birthdays: [],
        common_house_reservations: [],
        guest_room_reservations: [],
        events: [],
      };

      store.loadMonth(data);
      var event = store.calendarEvents[0];
      expect(event.start.getDate()).toBe(15);
      expect(event.start.getHours()).toBe(18);
      expect(event.end.getDate()).toBe(15);
      expect(event.end.getHours()).toBe(20);
    });
  });
});
