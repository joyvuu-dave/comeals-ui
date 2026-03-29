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
import Meal from "../../../src/stores/meal.js";
import ResidentStore from "../../../src/stores/resident_store.js";
import BillStore from "../../../src/stores/bill_store.js";
import GuestStore from "../../../src/stores/guest_store.js";

// Build a minimal DataStore-like parent to satisfy the getParent chains.
// Bill.form -> getParent(self, 2) = BillStore
// Bill.form.form -> DataStore
// Bill actions call self.form.form.toggleEditBillsMode()
const TestDataStore = types
  .model("TestDataStore", {
    meals: types.optional(types.array(Meal), []),
    meal: types.maybeNull(types.reference(Meal)),
    residentStore: types.optional(ResidentStore, { residents: {} }),
    billStore: types.optional(BillStore, { bills: {} }),
    guestStore: types.optional(GuestStore, { guests: {} }),
    editBillsMode: true,
  })
  .views((self) => ({
    get attendeesCount() {
      const residentsAttending = Array.from(
        self.residentStore.residents.values()
      ).filter((r) => r.attending).length;
      return self.guestStore.guests.size + residentsAttending;
    },
  }))
  .actions((self) => ({
    toggleEditBillsMode() {
      self.editBillsMode = !self.editBillsMode;
    },
    addResident(r) {
      self.residentStore.residents.put(r);
    },
    addBill(b) {
      self.billStore.bills.put(b);
    },
  }));

function createStore(opts = {}) {
  const {
    mealProps = {},
    residents = [],
    bills = [],
  } = opts;

  const mealDefaults = { id: 1, ...mealProps };
  const store = TestDataStore.create({
    meals: [mealDefaults],
    meal: mealDefaults.id,
    residentStore: { residents: {} },
    billStore: { bills: {} },
    guestStore: { guests: {} },
  });

  residents.forEach((r) => store.addResident(r));
  bills.forEach((b) => store.addBill(b));

  return store;
}

describe("Bill model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.Comeals = { socketId: "test", pusher: null, channel: null };
  });

  // ── resident_id computed view ──

  describe("resident_id", () => {
    it("returns the resident id when a resident is assigned", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
        bills: [{ id: "bill-1", resident: 10, amount: "25.00" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.resident_id).toBe(10);
    });

    it("returns empty string when resident is null", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "25.00" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.resident_id).toBe("");
    });
  });

  // ── amountIsValid view ──

  describe("amountIsValid", () => {
    it("returns true for a valid positive number string", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "25.50" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.amountIsValid).toBe(true);
    });

    it("returns true for empty string (Number('') === 0)", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.amountIsValid).toBe(true);
    });

    it("returns true for zero", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "0" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.amountIsValid).toBe(true);
    });

    it("returns false for negative number", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "-5" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.amountIsValid).toBe(false);
    });

    it("returns false for NaN string", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "abc" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.amountIsValid).toBe(false);
    });

    it("returns true for a decimal number", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "12.99" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(bill.amountIsValid).toBe(true);
    });
  });

  // ── setResident action ──

  describe("setResident", () => {
    it("sets resident reference by id", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
        bills: [{ id: "bill-1" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      bill.setResident(10);
      expect(bill.resident_id).toBe(10);
      expect(bill.resident.name).toBe("Alice");
    });

    it("clears resident when passed empty string", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
        bills: [{ id: "bill-1", resident: 10 }],
      });

      const bill = store.billStore.bills.get("bill-1");
      const result = bill.setResident("");
      expect(result).toBeNull();
      expect(bill.resident).toBeNull();
      expect(bill.resident_id).toBe("");
    });

    it("returns null when clearing, returns resident ref when setting", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
        bills: [{ id: "bill-1" }],
      });

      const bill = store.billStore.bills.get("bill-1");

      const setResult = bill.setResident(10);
      expect(setResult).toBeTruthy();
      expect(setResult.id).toBe(10);

      const clearResult = bill.setResident("");
      expect(clearResult).toBeNull();
    });

    it("triggers toggleEditBillsMode twice (save cycle)", () => {
      const store = createStore({
        residents: [{ id: 10, meal_id: 1, name: "Alice" }],
        bills: [{ id: "bill-1" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      // editBillsMode starts as true
      expect(store.editBillsMode).toBe(true);

      bill.setResident(10);
      // After two toggles, it should be back to true
      expect(store.editBillsMode).toBe(true);
    });
  });

  // ── setAmount action ──

  describe("setAmount", () => {
    it("sets amount to a string value", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      const result = bill.setAmount("42.50");
      expect(result).toBe("42.50");
      expect(bill.amount).toBe("42.50");
    });

    it("sets amount to empty string", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "25.00" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      bill.setAmount("");
      expect(bill.amount).toBe("");
    });

    it("triggers toggleEditBillsMode twice", () => {
      const store = createStore({
        bills: [{ id: "bill-1", amount: "" }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(store.editBillsMode).toBe(true);
      bill.setAmount("10.00");
      expect(store.editBillsMode).toBe(true);
    });
  });

  // ── toggleNoCost action ──

  describe("toggleNoCost", () => {
    it("toggles no_cost from false to true", () => {
      const store = createStore({
        bills: [{ id: "bill-1", no_cost: false }],
      });

      const bill = store.billStore.bills.get("bill-1");
      const result = bill.toggleNoCost();
      expect(result).toBe(true);
      expect(bill.no_cost).toBe(true);
    });

    it("toggles no_cost from true to false", () => {
      const store = createStore({
        bills: [{ id: "bill-1", no_cost: true }],
      });

      const bill = store.billStore.bills.get("bill-1");
      const result = bill.toggleNoCost();
      expect(result).toBe(false);
      expect(bill.no_cost).toBe(false);
    });

    it("triggers toggleEditBillsMode twice", () => {
      const store = createStore({
        bills: [{ id: "bill-1", no_cost: false }],
      });

      const bill = store.billStore.bills.get("bill-1");
      expect(store.editBillsMode).toBe(true);
      bill.toggleNoCost();
      expect(store.editBillsMode).toBe(true);
    });
  });
});
