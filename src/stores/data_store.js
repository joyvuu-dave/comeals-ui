import { types } from "mobx-state-tree";
import { v4 } from "uuid";
import axios from "axios";
import Cookie from "js-cookie";

import Meal from "./meal";
import ResidentStore from "./resident_store";
import BillStore from "./bill_store";
import GuestStore from "./guest_store";
import EventSource from "./event_source";

import Pusher from "pusher-js";
import localforage from "localforage";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import handleAxiosError from "../helpers/handle_axios_error";
import { TIMEZONE, toPacificDayjs } from "../helpers/helpers";
import toastStore from "./toast_store";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DataStore = types
  .model("DataStore", {
    isLoading: true,
    editDescriptionMode: true,
    editBillsMode: true,
    meal: types.maybeNull(types.reference(Meal)),
    meals: types.optional(types.array(Meal), []),
    residentStore: types.optional(ResidentStore, {
      residents: {},
    }),
    billStore: types.optional(BillStore, {
      bills: {},
    }),
    guestStore: types.optional(GuestStore, {
      guests: {},
    }),
    calendarName: types.optional(types.string, ""),
    userName: types.optional(types.string, ""),
    eventSources: types.optional(types.array(EventSource), []),
    calendarEvents: types.optional(types.array(types.frozen()), []),
    currentDate: types.optional(types.string, function () {
      return dayjs().tz(TIMEZONE).format("YYYY-MM-DD");
    }),
    isOnline: false,
    authExpired: false,
  })
  .views((self) => ({
    get description() {
      if (!self.meal) return "";
      return self.meal.description;
    },
    get residents() {
      return self.residentStore.residents;
    },
    get bills() {
      return self.billStore.bills;
    },
    get guests() {
      return self.guestStore.guests;
    },
    get guestsCount() {
      return self.guestStore.guests.size;
    },
    get mealResidentsCount() {
      return Array.from(self.residents.values()).filter(
        (resident) => resident.attending,
      ).length;
    },
    get attendeesCount() {
      return self.guestsCount + self.mealResidentsCount;
    },
    get vegetarianCount() {
      const vegResidents = Array.from(self.residents.values()).filter(
        (resident) => resident.attending && resident.vegetarian,
      ).length;

      const vegGuests = Array.from(self.guests.values()).filter(
        (guest) => guest.vegetarian,
      ).length;

      return vegResidents + vegGuests;
    },
    get lateCount() {
      return Array.from(self.residents.values()).filter(
        (resident) => resident.attending && resident.late,
      ).length;
    },
    get extras() {
      if (!self.meal) return "n/a";
      // Extras only show when the meal is closed
      if (!self.meal.closed) {
        return "n/a";
      }

      if (self.meal.closed && typeof self.meal.max === "number") {
        return self.meal.max - self.attendeesCount;
      } else {
        return "";
      }
    },
    get canAdd() {
      if (!self.meal) return false;
      return (
        !self.meal.closed ||
        (self.meal.closed &&
          typeof self.extras === "number" &&
          self.extras >= 1)
      );
    },
  }))
  .actions((self) => ({
    afterCreate() {
      window.Comeals = {
        pusher: null,
        socketId: null,
        mealChannel: null,
        calendarChannel: null,
      };

      // Pusher public key + cluster from env vars (VITE_PUSHER_KEY, VITE_PUSHER_CLUSTER).
      // Local dev: .env file (committed defaults). Override via .env.local if needed.
      window.Comeals.pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
        cluster: import.meta.env.VITE_PUSHER_CLUSTER,
        encrypted: true,
      });

      window.Comeals.pusher.connection.bind("connected", function () {
        window.Comeals.socketId = window.Comeals.pusher.connection.socket_id;
      });

      window.Comeals.pusher.connection.bind("state_change", function (states) {
        // states = {previous: 'oldState', current: 'newState'}
        if (
          states.previous === "unavailable" &&
          states.current === "connected"
        ) {
          if (self.meal && self.meal.id) {
            self.loadDataAsync();
          }
          self.loadMonthAsync();
        }
      });

      self.setIsOnline(navigator.onLine);

      if (typeof window.__comealsInterceptor !== "undefined") {
        axios.interceptors.response.eject(window.__comealsInterceptor);
      }
      window.__comealsInterceptor = axios.interceptors.response.use(
        function (response) {
          return response;
        },
        function (error) {
          if (error.response && error.response.status === 401) {
            self.setAuthExpired(true);
          }
          return Promise.reject(error);
        },
      );
    },
    toggleEditDescriptionMode() {
      const isSaving = self.editDescriptionMode;
      self.editDescriptionMode = !self.editDescriptionMode;

      if (isSaving) {
        self.submitDescription();
      }
    },
    toggleEditBillsMode() {
      const isSaving = self.editBillsMode;
      self.editBillsMode = !self.editBillsMode;

      if (isSaving) {
        self.submitBills();
      }
    },
    saveDescription() {
      self.submitDescription();
    },
    saveBills() {
      self.submitBills();
    },
    setDescription(val) {
      self.meal.description = val;
      self.saveDescription();
      return self.meal.description;
    },
    toggleClosed() {
      if (!self.meal.closed) {
        // There is a cook who hasn't filled in their cost
        const cookNeedsToFillInCost = Array.from(self.bills.values()).some(
          (bill) =>
            bill.resident_id !== "" &&
            bill.amount === "" &&
            bill.no_cost === false,
        );

        if (cookNeedsToFillInCost) {
          toastStore.addToast(
            "All cook costs must be set before closing.",
            "warning",
          );
          return;
        }
      }

      const val = !self.meal.closed;
      self.meal.closed = val;

      axios({
        method: "patch",
        url: `/api/v1/meals/${self.meal.id}/closed?token=${Cookie.get(
          "token",
        )}`,
        withCredentials: true,
        data: {
          closed: val,
          socket_id: window.Comeals.socketId,
        },
      })
        .then(function (response) {
          if (response.status === 200) {
            // If meal has been opened, re-set extras value
            if (val === false) {
              self.meal.resetExtras();
              self.meal.resetClosedAt();
            } else {
              self.meal.setClosedAt();
            }
          }
        })
        .catch(function (error) {
          self.meal.toggleClosed();
          handleAxiosError(error);
        });
    },
    logout() {
      Cookie.remove("token", { path: "/" });
      Cookie.remove("community_id", { path: "/" });
      Cookie.remove("resident_id", { path: "/" });
      Cookie.remove("username", { path: "/" });
      Cookie.remove("timezone", { path: "/" });
    },
    submitDescription() {
      let obj = {
        id: self.meal.id,
        description: self.meal.description,
        socket_id: window.Comeals.socketId,
      };

      axios({
        method: "patch",
        url: `/api/v1/meals/${self.meal.id}/description?token=${Cookie.get(
          "token",
        )}`,
        data: obj,
        withCredentials: true,
      }).catch(function (error) {
        handleAxiosError(error);
      });
    },
    submitBills() {
      // Check for errors with bills
      if (
        Array.from(self.bills.values()).some(
          (bill) => bill.amountIsValid === false,
        )
      ) {
        self.editBillsMode = true;
        return;
      }

      // Format Bills
      let bills = Array.from(self.bills.values())
        .map((bill) => bill.toJSON())
        .map((bill) => {
          let obj = Object.assign({}, bill);

          // delete id
          delete obj["id"];

          // resident --> resident_id
          obj["resident_id"] = obj["resident"];
          delete obj["resident"];

          return obj;
        })
        .filter((bill) => bill.resident_id !== null);

      let obj = {
        id: self.meal.id,
        bills: bills,
        socket_id: window.Comeals.socketId,
      };

      axios({
        method: "patch",
        url: `/api/v1/meals/${self.meal.id}/bills?token=${Cookie.get("token")}`,
        data: obj,
        withCredentials: true,
      }).catch(function (error) {
        var isWarning =
          error.response &&
          error.response.data &&
          error.response.data.type === "warning";
        if (isWarning) {
          var msg = error.response.data.message || "";
          toastStore.replaceAll(
            "Cooks saved." + (msg ? " " + msg : ""),
            "info",
          );
        } else {
          handleAxiosError(error);
        }

        self.loadDataAsync();
      });
    },
    loadDataAsync() {
      axios
        .get(`/api/v1/meals/${self.meal.id}/cooks?token=${Cookie.get("token")}`)
        .then(function (response) {
          if (response.status === 200) {
            localforage
              .setItem(response.data.id.toString(), response.data)
              .then(function () {
                // Skip stale responses from a previous meal
                if (self.meal && self.meal.id === response.data.id) {
                  self.loadData(response.data);
                }
              });
          }
        })
        .catch(function (error) {
          handleAxiosError(error, { silent: true });
        });
    },
    loadMonthAsync() {
      axios
        .get(
          `/api/v1/communities/${Cookie.get("community_id")}/calendar/${
            self.currentDate
          }?token=${Cookie.get("token")}`,
        )
        .then(function (response) {
          if (response.status === 200) {
            localforage
              .setItem(
                `community-${response.data.id}-calendar-${response.data.year}-${response.data.month}`,
                response.data,
              )
              .then(function () {
                self.loadMonth(response.data);
              });
          }
        })
        .catch(function (error) {
          handleAxiosError(error, { silent: true });
        });
    },
    loadNext() {
      axios
        .get(
          `/api/v1/meals/${self.meal.nextId}/cooks?token=${Cookie.get("token")}`,
        )
        .then(function (response) {
          if (response.status === 200) {
            localforage.setItem(response.data.id.toString(), response.data);
          }
        })
        .catch(function (error) {
          handleAxiosError(error, { silent: true });
        });
    },
    loadPrev() {
      axios
        .get(
          `/api/v1/meals/${self.meal.prevId}/cooks?token=${Cookie.get("token")}`,
        )
        .then(function (response) {
          if (response.status === 200) {
            localforage.setItem(response.data.id.toString(), response.data);
          }
        })
        .catch(function (error) {
          handleAxiosError(error, { silent: true });
        });
    },
    preLoadData() {
      if (self.billStore && self.billStore.bills) {
        self.clearBills();
      }
      if (self.residentStore && self.residentStore.residents) {
        self.clearResidents();
      }
      if (self.guestStore && self.guestStore.guests) {
        self.clearGuests();
      }
    },
    loadData(data) {
      self.preLoadData();

      // Assign Meal Data — construct a "fake local" Date with Pacific
      // date components so that dayjs(meal.date) always reflects Pacific,
      // consistent with getPacificNow() in calendar/show.jsx.
      var d = toPacificDayjs(data.date);
      self.meal.date = new Date(d.year(), d.month(), d.date());
      self.meal.description = data.description;
      self.meal.closed = data.closed;
      self.meal.closed_at = data.closed_at ? new Date(data.closed_at) : null;
      self.meal.reconciled = data.reconciled;
      self.meal.nextId = data.next_id;
      self.meal.prevId = data.prev_id;

      if (data.max === null) {
        self.meal.extras = null;
      } else {
        const residentsCount = data.residents.filter(
          (resident) => resident.attending,
        ).length;

        const guestsCount = data.guests.length;
        self.meal.extras = data.max - (residentsCount + guestsCount);
      }

      let residents = data.residents.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });

      // Assign Residents
      residents.forEach((resident) => {
        if (resident.attending_at !== null) {
          resident.attending_at = new Date(resident.attending_at);
        }
        self.residentStore.residents.put(resident);
      });

      // Assign Guests
      data.guests.forEach((guest) => {
        guest.created_at = new Date(guest.created_at);
        self.guestStore.guests.put(guest);
      });

      // Assign Bills
      let bills = data.bills;

      // Rename resident_id --> resident (copy to avoid mutating cached data)
      bills = bills.map((bill) => {
        var obj = Object.assign({}, bill);
        obj["resident"] = obj["resident_id"];
        delete obj["resident_id"];
        return obj;
      });

      // Format amount for display
      bills = bills.map((bill) => {
        const amt = Number(bill["amount"]);
        return Object.assign({}, bill, {
          amount: amt === 0 ? "" : amt.toFixed(2),
        });
      });

      // Determine # of blank bills needed
      const extra = Math.max(3 - bills.length, 0);

      // Create array for iterating
      const array = Array(extra).fill();

      // Create blanks bills
      array.forEach(() => bills.push({}));

      // Assign ids to bills (types.identifier requires strings)
      bills = bills.map((obj) => {
        var bill = Object.assign({ id: v4() }, obj);
        bill.id = String(bill.id);
        return bill;
      });

      // Put bills into BillStore, skipping any with dangling resident references
      bills.forEach((bill) => {
        if (
          bill.resident != null &&
          !self.residentStore.residents.has(String(bill.resident))
        ) {
          console.warn(
            "Skipping bill with unknown resident reference:",
            bill.resident,
          );
          return;
        }
        self.billStore.bills.put(bill);
      });

      // Change loading state
      self.isLoading = false;

      // Unsubscribe from previous meal
      if (window.Comeals.mealChannel !== null) {
        window.Comeals.pusher.unsubscribe(window.Comeals.mealChannel.name);
      }

      // Subscribe to changes of this meal
      window.Comeals.mealChannel = window.Comeals.pusher.subscribe(
        `meal-${self.meal.id}`,
      );
      window.Comeals.mealChannel.bind("update", function () {
        self.loadDataAsync();
      });
    },
    loadMonth(data) {
      if (typeof data === "string") {
        self.isLoading = false;
        console.error("Error loading month data.", data);
        return true;
      }

      if (self.calendarEvents) {
        self.clearCalendarEvents();
      }

      // Convert event start/end strings to native Date objects.
      // react-big-calendar requires native Dates for its date arithmetic.
      // toPacificDayjs handles both offset and naive strings correctly.
      function pushEvents(events) {
        events.forEach(function (event) {
          var converted = Object.assign({}, event);
          if (converted.start) {
            var s = toPacificDayjs(converted.start);
            converted.start = new Date(
              s.year(),
              s.month(),
              s.date(),
              s.hour(),
              s.minute(),
            );
          }
          if (converted.end) {
            var e = toPacificDayjs(converted.end);
            converted.end = new Date(
              e.year(),
              e.month(),
              e.date(),
              e.hour(),
              e.minute(),
            );
          }
          self.calendarEvents.push(converted);
        });
      }

      var expectedKeys = [
        "meals",
        "bills",
        "rotations",
        "birthdays",
        "common_house_reservations",
        "guest_room_reservations",
        "events",
      ];
      var missing = expectedKeys.filter(function (k) {
        return !Array.isArray(data[k]);
      });
      if (missing.length > 0) {
        console.warn(
          "loadMonth: missing event arrays from API:",
          missing.join(", "),
        );
      }

      pushEvents(data.meals || []); // #1 Meals
      pushEvents(data.bills || []); // #2 Bills
      pushEvents(data.rotations || []); // #3 Rotations
      pushEvents(data.birthdays || []); // #4 Birthdays
      pushEvents(data.common_house_reservations || []); // #5 Common House Reservations
      pushEvents(data.guest_room_reservations || []); // #6 Guest Room Reservations
      pushEvents(data.events || []); // #7 Events

      // Change loading state
      self.isLoading = false;

      // Unsubscribe from previous month
      if (window.Comeals.calendarChannel !== null) {
        window.Comeals.pusher.unsubscribe(window.Comeals.calendarChannel.name);
      }

      // Subscribe to changes of this month
      var subscribeString = `community-${Cookie.get(
        "community_id",
      )}-calendar-${dayjs(self.currentDate).format("YYYY")}-${dayjs(
        self.currentDate,
      ).format("M")}`;
      window.Comeals.calendarChannel =
        window.Comeals.pusher.subscribe(subscribeString);

      window.Comeals.calendarChannel.bind("update", function () {
        self.loadMonthAsync();
      });
    },
    clearResidents() {
      self.residentStore.residents.clear();
    },
    clearBills() {
      self.billStore.bills.clear();
    },
    clearGuests() {
      self.guestStore.guests.clear();
    },
    clearCalendarEvents() {
      self.calendarEvents.clear();
    },
    appendGuest(obj) {
      self.guestStore.guests.put(obj);
    },
    addMeal(obj) {
      self.meals.push(obj);
    },
    switchMeals(id) {
      if (typeof self.meals.find((item) => item.id === id) === "undefined") {
        self.addMeal({ id: Number.parseInt(id, 10) });
      }

      self.meal = id;

      localforage
        .getItem(id.toString())
        .then(function (value) {
          // Skip if user already navigated to a different meal
          if (!self.meal || self.meal.id !== id) return;

          if (value === null) {
            self.loadDataAsync();
          } else {
            self.loadData(value);
            self.loadDataAsync();
          }
        })
        .catch(function (error) {
          console.error(
            "Failed to load cached meal data, fetching from server:",
            error,
          );
          localforage.removeItem(id.toString()).catch(function () {});
          self.loadDataAsync();
        });
    },
    switchMonths(date) {
      self.currentDate = date;

      var myDate = dayjs(date);
      const key = `community-${Cookie.get(
        "community_id",
      )}-calendar-${myDate.format("YYYY")}-${myDate.format("M")}`;

      localforage.getItem(key).then(function (value) {
        if (value === null || typeof value === "undefined") {
          self.loadMonthAsync();
        } else {
          self.loadMonth(value);
          self.loadMonthAsync();
        }
      });
    },
    goToMeal(mealId) {
      self.isLoading = true;
      self.switchMeals(Number.parseInt(mealId, 10));
    },
    goToMonth(date) {
      self.isLoading = true;
      self.switchMonths(date);
    },
    setIsOnline(val) {
      self.isOnline = !!val;
    },
    setAuthExpired(value) {
      self.authExpired = value;
    },
  }));
