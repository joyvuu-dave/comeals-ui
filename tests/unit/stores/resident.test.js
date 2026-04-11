import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock external modules before importing stores
vi.mock("axios", () => ({
  default: vi.fn(() => Promise.resolve({ status: 200 })),
}));

vi.mock("js-cookie", () => ({
  default: {
    get: vi.fn(() => "test-token"),
    remove: vi.fn(),
  },
}));

vi.mock("pusher-js", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      connection: {
        bind: vi.fn(),
        socket_id: "test-socket",
      },
      subscribe: vi.fn(() => ({ bind: vi.fn(), name: "test-channel" })),
      unsubscribe: vi.fn(),
    })),
  };
});

vi.mock("localforage", () => ({
  default: {
    getItem: vi.fn(() => Promise.resolve(null)),
    setItem: vi.fn(() => Promise.resolve()),
  },
}));

import { types } from "mobx-state-tree";
import axios from "axios";
import Meal from "../../../src/stores/meal.js";
import ResidentStore from "../../../src/stores/resident_store.js";
import BillStore from "../../../src/stores/bill_store.js";
import GuestStore from "../../../src/stores/guest_store.js";

// Build a minimal DataStore-like parent that satisfies all getParent chains.
const TestDataStore = types
  .model("TestDataStore", {
    meals: types.optional(types.array(Meal), []),
    meal: types.maybeNull(types.reference(Meal)),
    residentStore: types.optional(ResidentStore, { residents: {} }),
    billStore: types.optional(BillStore, { bills: {} }),
    guestStore: types.optional(GuestStore, { guests: {} }),
  })
  .views((self) => ({
    get attendeesCount() {
      const residentsAttending = Array.from(
        self.residentStore.residents.values(),
      ).filter((r) => r.attending).length;
      return self.guestStore.guests.size + residentsAttending;
    },
  }))
  .actions((self) => ({
    addResident(r) {
      self.residentStore.residents.put(r);
    },
    addGuest(g) {
      self.guestStore.guests.put(g);
    },
    appendGuest(obj) {
      self.guestStore.guests.put(obj);
    },
  }));

function createStore(opts = {}) {
  const { mealProps = {}, residents = [], guests = [] } = opts;

  const mealDefaults = { id: 1, ...mealProps };
  const store = TestDataStore.create({
    meals: [mealDefaults],
    meal: mealDefaults.id,
    residentStore: { residents: {} },
    guestStore: { guests: {} },
  });

  residents.forEach((r) => store.addResident(r));
  guests.forEach((g) => store.addGuest(g));

  return store;
}

describe("Resident model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Comeals = {
      socketId: "test",
      pusher: null,
      mealChannel: null,
      calendarChannel: null,
    };
  });

  // ── guests view ──

  describe("guests", () => {
    it("returns guests belonging to this resident", () => {
      const store = createStore({
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true },
          { id: 11, meal_id: 1, name: "Bob", attending: true },
        ],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
          { id: 101, meal_id: 1, resident_id: 10, created_at: Date.now() },
          { id: 102, meal_id: 1, resident_id: 11, created_at: Date.now() },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.guests).toHaveLength(2);
      expect(alice.guests.map((g) => g.id)).toEqual(
        expect.arrayContaining([100, 101]),
      );
    });

    it("returns empty array when resident has no guests", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.guests).toHaveLength(0);
    });
  });

  // ── guestsCount view ──

  describe("guestsCount", () => {
    it("returns the number of guests for this resident", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
          { id: 101, meal_id: 1, resident_id: 10, created_at: Date.now() },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.guestsCount).toBe(2);
    });

    it("returns 0 when resident has no guests", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.guestsCount).toBe(0);
    });
  });

  // ── canRemove view ──

  describe("canRemove", () => {
    it("Scenario 1: returns false when not attending", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemove).toBe(false);
    });

    it("Scenario 2: returns true when attending and meal is open", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemove).toBe(true);
    });

    it("Scenario 3: returns true when attending, meal closed, added after closed_at", () => {
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);
      const attendedTime = new Date(2023, 0, 1, 13, 0, 0); // after closed

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: attendedTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemove).toBe(true);
    });

    it("Scenario 4: returns false when has guests, meal closed, added before closed_at", () => {
      const attendedTime = new Date(2023, 0, 1, 11, 0, 0);
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: attendedTime.getTime(),
          },
        ],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: attendedTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemove).toBe(false);
    });

    it("explicit fallthrough: returns false when attending, meal closed, added before closed_at, no guests", () => {
      const attendedTime = new Date(2023, 0, 1, 11, 0, 0);
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: attendedTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      // No guests so scenario 4 does not match, falls through to return false
      expect(alice.canRemove).toBe(false);
    });
  });

  // ── canRemoveGuest view ──

  describe("canRemoveGuest", () => {
    it("Scenario 1: returns false when no guests", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemoveGuest).toBe(false);
    });

    it("Scenario 2: returns true when has guests and meal is open", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemoveGuest).toBe(true);
    });

    it("Scenario 3: returns true when has guests, meal closed, guest added after closed_at", () => {
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);
      const guestTime = new Date(2023, 0, 1, 13, 0, 0);

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: guestTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemoveGuest).toBe(true);
    });

    it("Scenario 4: returns false when has guests, meal closed, guest added before closed_at", () => {
      const guestTime = new Date(2023, 0, 1, 11, 0, 0);
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: guestTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemoveGuest).toBe(false);
    });

    it("explicit fallthrough: returns false when guest created_at equals closed_at", () => {
      const guestTime = new Date(2023, 0, 1, 12, 0, 0);
      const closedTime = new Date(2023, 0, 1, 12, 0, 0); // exactly equal

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: guestTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      // guest.created_at <= closed_at so scenario 4 matches -> false
      expect(alice.canRemoveGuest).toBe(false);
    });
  });

  // ── toggleAttending ──

  describe("toggleAttending", () => {
    it("adds resident when not attending and meal is open", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(true);
    });

    it("removes resident when attending and meal is open", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(false);
    });

    it("blocks adding when meal is closed and extras < 1 (null extras)", () => {
      const store = createStore({
        mealProps: { closed: true, extras: null },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      // null < 1 is true, so should block
      expect(alice.attending).toBe(false);
    });

    it("blocks adding when meal is closed and extras is 0", () => {
      const store = createStore({
        mealProps: { closed: true, extras: 0 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(false);
    });

    it("allows adding when meal is closed and extras >= 1", () => {
      const store = createStore({
        mealProps: { closed: true, extras: 5 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(true);
    });

    it("blocks removing when meal is closed and canRemove is false", () => {
      const attendedTime = new Date(2023, 0, 1, 11, 0, 0);
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);

      const store = createStore({
        mealProps: {
          closed: true,
          closed_at: closedTime.getTime(),
          extras: 5,
        },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: attendedTime.getTime(),
          },
        ],
        // Need guests so scenario 4 of canRemove matches
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: attendedTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      // canRemove is false (scenario 4: has guests, closed, attended before closed)
      expect(alice.canRemove).toBe(false);
      alice.toggleAttending();
      expect(alice.attending).toBe(true); // unchanged
    });

    it("decrements extras when adding a resident", () => {
      const store = createStore({
        mealProps: { closed: true, extras: 5 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(store.meal.extras).toBe(4);
    });

    it("increments extras when removing a resident", () => {
      const store = createStore({
        mealProps: { closed: false, extras: 5 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(store.meal.extras).toBe(6);
    });

    it("sets late flag when options.late is true", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: false, late: false },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending({ late: true });
      expect(alice.attending).toBe(true);
      expect(alice.late).toBe(true);
    });

    it("sets vegetarian flag when options.toggleVeg is true", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            vegetarian: false,
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending({ toggleVeg: true });
      expect(alice.attending).toBe(true);
      expect(alice.vegetarian).toBe(true);
    });

    it("makes correct API call when adding", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          url: expect.stringContaining("/api/v1/meals/1/residents/10"),
        }),
      );
    });

    it("makes correct API call when removing", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "delete",
          url: expect.stringContaining("/api/v1/meals/1/residents/10"),
        }),
      );
    });
  });

  // ── toggleAttending edge cases ──

  describe("toggleAttending edge cases", () => {
    it("clears late flag when removing attendance", () => {
      // When a resident removes themselves, late should reset to false
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true, late: true },
        ],
      });
      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(false);
      expect(alice.late).toBe(false);
    });

    it("boundary: adding at extras=1 decrements to 0", () => {
      // Boundary: after this add, no more people can join
      const store = createStore({
        mealProps: { closed: true, extras: 1 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: false }],
      });
      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(true);
      expect(store.meal.extras).toBe(0);
    });

    it("removing from open meal increments extras even when extras is null", () => {
      // incrementExtras is a no-op when extras is null
      const store = createStore({
        mealProps: { closed: false, extras: null },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });
      const alice = store.residentStore.residents.get("10");
      alice.toggleAttending();
      expect(alice.attending).toBe(false);
      expect(store.meal.extras).toBeNull(); // increment was a no-op
    });
  });

  // ── addGuest boundary ──

  describe("addGuest boundary", () => {
    it("decrements extras when adding a guest to a closed meal", () => {
      // Guest additions also consume an extras slot
      const store = createStore({
        mealProps: { closed: true, extras: 1 },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
      });
      const alice = store.residentStore.residents.get("10");
      alice.addGuest({ vegetarian: false });
      expect(store.meal.extras).toBe(0);
    });
  });

  // ── toggleLate ──

  describe("toggleLate", () => {
    it("adds via toggleAttending with late when not attending", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: false, late: false },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleLate();
      expect(alice.attending).toBe(true);
      expect(alice.late).toBe(true);
    });

    it("toggles late when already attending", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true, late: false },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleLate();
      expect(alice.late).toBe(true);
      expect(alice.attending).toBe(true); // stays attending
    });

    it("toggles late off when already late", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true, late: true },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleLate();
      expect(alice.late).toBe(false);
    });

    it("makes patch API call when toggling late on an attending resident", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          { id: 10, meal_id: 1, name: "Alice", attending: true, late: false },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleLate();

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "patch",
          data: expect.objectContaining({ late: true }),
        }),
      );
    });
  });

  // ── toggleVeg ──

  describe("toggleVeg", () => {
    it("adds via toggleAttending with veg when not attending", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: false,
            vegetarian: false,
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleVeg();
      expect(alice.attending).toBe(true);
      expect(alice.vegetarian).toBe(true);
    });

    it("toggles vegetarian when already attending", () => {
      const store = createStore({
        mealProps: { closed: false },
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

      const alice = store.residentStore.residents.get("10");
      alice.toggleVeg();
      expect(alice.vegetarian).toBe(true);
      expect(alice.attending).toBe(true); // stays attending
    });

    it("toggles vegetarian off when already vegetarian", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            vegetarian: true,
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      alice.toggleVeg();
      expect(alice.vegetarian).toBe(false);
    });

    it("makes patch API call when toggling veg on an attending resident", () => {
      const store = createStore({
        mealProps: { closed: false },
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

      const alice = store.residentStore.residents.get("10");
      alice.toggleVeg();

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "patch",
          data: expect.objectContaining({ vegetarian: true }),
        }),
      );
    });
  });

  // ── Hardening: canRemove / canRemoveGuest boundary conditions ──

  describe("canRemove boundary: attending_at exactly equals closed_at", () => {
    it("returns false (not strictly after close)", () => {
      const sameTime = new Date(2023, 0, 1, 12, 0, 0);
      const store = createStore({
        mealProps: { closed: true, closed_at: sameTime.getTime() },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: sameTime.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      // attending_at === closed_at, not >, so scenario 3 doesn't match
      expect(alice.canRemove).toBe(false);
    });
  });

  describe("canRemoveGuest boundary: mixed pre- and post-close guests", () => {
    it("returns true when at least one guest was added after close", () => {
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);
      const beforeClose = new Date(2023, 0, 1, 11, 0, 0);
      const afterClose = new Date(2023, 0, 1, 13, 0, 0);

      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime() },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: beforeClose.getTime(),
          },
          {
            id: 101,
            meal_id: 1,
            resident_id: 10,
            created_at: afterClose.getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      // Scenario 3: at least one guest after close
      expect(alice.canRemoveGuest).toBe(true);
    });
  });

  describe("canRemove with null timestamps", () => {
    it("returns false when attending_at is null and meal is closed", () => {
      const closedTime = new Date(2023, 0, 1, 12, 0, 0);
      const store = createStore({
        mealProps: { closed: true, closed_at: closedTime.getTime(), extras: 5 },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: null,
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemove).toBe(false);
    });

    it("returns false when closed_at is null and meal is closed (BUG-1 regression guard)", () => {
      const store = createStore({
        mealProps: { closed: true, closed_at: null, extras: 5 },
        residents: [
          {
            id: 10,
            meal_id: 1,
            name: "Alice",
            attending: true,
            attending_at: Date.now(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemove).toBe(false);
    });
  });

  describe("canRemoveGuest with null closed_at", () => {
    it("returns false when closed_at is null and meal is closed", () => {
      const store = createStore({
        mealProps: { closed: true, closed_at: null },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          { id: 100, meal_id: 1, resident_id: 10, created_at: Date.now() },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.canRemoveGuest).toBe(false);
    });
  });

  describe("removeGuest removes newest guest first", () => {
    it("removes the most recently created guest", () => {
      const store = createStore({
        mealProps: { closed: false },
        residents: [{ id: 10, meal_id: 1, name: "Alice", attending: true }],
        guests: [
          {
            id: 100,
            meal_id: 1,
            resident_id: 10,
            created_at: new Date(2023, 0, 1).getTime(),
          },
          {
            id: 101,
            meal_id: 1,
            resident_id: 10,
            created_at: new Date(2023, 0, 2).getTime(),
          },
        ],
      });

      const alice = store.residentStore.residents.get("10");
      expect(alice.guestsCount).toBe(2);

      // removeGuest sends DELETE for the newest guest (id 101)
      alice.removeGuest();
      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "delete",
          url: expect.stringContaining("/guests/101"),
        }),
      );
    });
  });
});
