import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock external modules before importing stores
vi.mock("axios", () => {
  const mockAxios = vi.fn(() => Promise.resolve({ status: 200 }));
  mockAxios.get = vi.fn(() => Promise.resolve({ status: 200, data: {} }));
  return { default: mockAxios };
});

vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn(() => "test-token"),
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

function createDataStore(opts = {}) {
  const {
    mealProps = {},
    residents = [],
    guests = [],
    bills = [],
  } = opts;

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
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: false },
        ],
      });

      expect(store.attendeesCount).toBe(0);
    });

    it("counts only guests when no residents are attending", () => {
      const store = createDataStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: false },
        ],
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
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true },
        ],
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
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true },
        ],
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
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true },
        ],
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

    it("returns true when meal is closed and extras is empty string (no max set)", () => {
      const store = createDataStore({
        mealProps: { closed: true, extras: null },
      });

      // extras view returns "" when closed and max is null
      expect(store.extras).toBe("");
      expect(store.canAdd).toBe(true);
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
        residents: [
          { id: 10, meal_id: 1, name: "Alice" },
        ],
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
        (b) => b.amount === "" && b.resident === null
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
      store.meal = 2;
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
      store.meal = 3;
      store.loadData(makeMealData(3, { late: true }));

      // Now let localforage resolve (for the stale meal 2 request)
      await new Promise((r) => setTimeout(r, 0));

      // State should still show meal 3 data — the stale meal 2 callback was skipped
      expect(store.meal.id).toBe(3);
      expect(store.meal.description).toBe("Meal 3");
      expect(store.residents.get("10").late).toBe(true);
    });
  });
});
