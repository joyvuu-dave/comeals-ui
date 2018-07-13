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
import moment from "moment";

export const DataStore = types
  .model("DataStore", {
    isLoading: true,
    editDescriptionMode: true,
    editBillsMode: true,
    meal: types.maybe(types.reference(Meal)),
    meals: types.optional(types.array(Meal), []),
    residentStore: types.optional(ResidentStore, {
      residents: {}
    }),
    billStore: types.optional(BillStore, {
      bills: {}
    }),
    guestStore: types.optional(GuestStore, {
      guests: {}
    }),
    calendarName: types.optional(types.string, ""),
    userName: types.optional(types.string, ""),
    eventSources: types.optional(types.array(EventSource), []),
    modalActive: false,
    modalName: types.maybe(types.string),
    modalId: types.maybe(types.number),
    modalIsChanging: false,
    modalChangedData: false,
    showHistory: false,
    calendarEvents: types.optional(types.array(types.frozen), []),
    currentDate: types.optional(types.string, moment().format("YYYY-MM-DD")),
    isOnline: false
  })
  .views(self => ({
    get description() {
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
        resident => resident.attending
      ).length;
    },
    get attendeesCount() {
      return self.guestsCount + self.mealResidentsCount;
    },
    get vegetarianCount() {
      const vegResidents = Array.from(self.residents.values()).filter(
        resident => resident.attending && resident.vegetarian
      ).length;

      const vegGuests = Array.from(self.guests.values()).filter(
        guest => guest.vegetarian
      ).length;

      return vegResidents + vegGuests;
    },
    get lateCount() {
      return Array.from(self.residents.values()).filter(
        resident => resident.late
      ).length;
    },
    get extras() {
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
      return (
        !self.meal.closed ||
        (self.meal.closed && self.extas === "") ||
        (self.meal.closed &&
          typeof self.extras === "number" &&
          self.extras >= 1)
      );
    }
  }))
  .actions(self => ({
    afterCreate() {
      window.Comeals = {
        pusher: null,
        socketId: null,
        channel: null
      };

      window.Comeals.pusher = new Pusher("8affd7213bb4643ca7f1", {
        cluster: "us2",
        encrypted: true
      });

      window.Comeals.pusher.connection.bind("connected", function() {
        window.Comeals.socketId = window.Comeals.pusher.connection.socket_id;
      });

      window.Comeals.pusher.connection.bind("state_change", function(states) {
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

      self.setIsOnline();
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
    setDescription(val) {
      self.meal.description = val;
      self.toggleEditDescriptionMode();
      self.toggleEditDescriptionMode();
      return self.meal.description;
    },
    toggleClosed() {
      const val = !self.meal.closed;
      self.meal.closed = val;

      axios({
        method: "patch",
        url: `/api/v1/meals/${self.meal.id}/closed?token=${Cookie.get(
          "token"
        )}`,
        withCredentials: true,
        data: {
          closed: val,
          socket_id: window.Comeals.socketId
        }
      })
        .then(function(response) {
          if (response.status === 200) {
            console.log(response.data);

            // If meal has been opened, re-set extras value
            if (val === false) {
              self.meal.resetExtras();
              self.meal.resetClosedAt();
            } else {
              self.meal.setClosedAt();
            }
          }
        })
        .catch(function(error) {
          self.meal.toggleClosed();
          console.log("Meal closed patch - Fail!");

          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            window.alert("Error: no response received from server.");
          } else {
            // Something happened in setting up the request that triggered an Error
            window.alert("Error: could not submit form.");
          }
        });
    },
    logout() {
      Cookie.remove("token", { path: "/" });
      Cookie.remove("community_id", { path: "/" });
      Cookie.remove("resident_id", { path: "/" });
      Cookie.remove("username", { path: "/" });
    },
    toggleHistory() {
      self.showHistory = !self.showHistory;
    },
    submitDescription() {
      let obj = {
        id: self.meal.id,
        description: self.meal.description,
        socket_id: window.Comeals.socketId
      };

      console.log(obj);

      axios({
        method: "patch",
        url: `/api/v1/meals/${self.meal.id}/description?token=${Cookie.get(
          "token"
        )}`,
        data: obj,
        withCredentials: true
      })
        .then(function(response) {
          if (response.status === 200) {
            console.log(response.data);
          }
        })
        .catch(function(error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            window.alert("Error: no response received from server.");
          } else {
            // Something happened in setting up the request that triggered an Error
            window.alert("Error: could not submit form.");
          }
        });
    },
    submitBills() {
      // Check for errors with bills
      if (
        Array.from(self.bills.values()).some(
          bill => bill.amountIsValid === false
        )
      ) {
        self.editBillsMode = true;
        return;
      }

      // Format Bills
      let bills = Array.from(self.bills.values())
        .map(bill => bill.toJSON())
        .map(bill => {
          let obj = Object.assign({}, bill);

          // delete id
          delete obj["id"];

          // resident --> resident_id
          obj["resident_id"] = obj["resident"];
          delete obj["resident"];

          // amount --> amount_cents
          obj["amount_cents"] = parseInt(Number(obj["amount"]) * 100, 10);
          delete obj["amount"];

          return obj;
        })
        .filter(bill => bill.resident_id !== null);

      let obj = {
        id: self.meal.id,
        bills: bills,
        socket_id: window.Comeals.socketId
      };

      console.log(obj);

      axios({
        method: "patch",
        url: `/api/v1/meals/${self.meal.id}/bills?token=${Cookie.get("token")}`,
        data: obj,
        withCredentials: true
      })
        .then(function(response) {
          if (response.status === 200) {
            console.log(response.data);
          }
        })
        .catch(function(error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            window.alert("Error: no response received from server.");
          } else {
            // Something happened in setting up the request that triggered an Error
            window.alert("Error: could not submit form.");
          }

          self.loadDataAsync();
        });
    },
    loadDataAsync() {
      axios
        .get(`/api/v1/meals/${self.meal.id}/cooks?token=${Cookie.get("token")}`)
        .then(function(response) {
          if (response.status === 200) {
            localforage
              .setItem(response.data.id.toString(), response.data)
              .then(function() {
                self.loadData(response.data);
              });
          }
        })
        .catch(function(error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.error("Error: no response received from server.");
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error: could not get meal.");
          }
        });
    },
    loadMonthAsync() {
      console.log("loadMonthAsync...");

      axios
        .get(
          `/api/v1/communities/${Cookie.get("community_id")}/calendar/${
            self.currentDate
          }?token=${Cookie.get("token")}`
        )
        .then(function(response) {
          if (response.status === 200) {
            localforage
              .setItem(
                `community-${response.data.id}-calendar-${response.data.year}-${
                  response.data.month
                }`,
                response.data
              )
              .then(function() {
                self.loadMonth(response.data);
              });
          }
        })
        .catch(function(error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.error("Error: No response from the server");
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error: Could not get calendar data.");
          }
        });
    },
    loadNext() {
      axios
        .get(
          `/api/v1/meals/${self.meal.nextId}/cooks?token=${Cookie.get("token")}`
        )
        .then(function(response) {
          if (response.status === 200) {
            localforage.setItem(response.data.id.toString(), response.data);
          }
        })
        .catch(function(error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            console.error("Error: No response from the server.");
          } else {
            // Something happened in setting up the request that triggered an Error
            const message = error.message;
            console.error("Error: Could not get next meal.", message);
          }
        });
    },
    loadPrev() {
      axios
        .get(
          `/api/v1/meals/${self.meal.prevId}/cooks?token=${Cookie.get("token")}`
        )
        .then(function(response) {
          if (response.status === 200) {
            localforage.setItem(response.data.id.toString(), response.data);
          }
        })
        .catch(function(error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.alert("Error: bad response from server.");
            }
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            const request = error.request;
            console.error("Error: No response from server", request);
          } else {
            // Something happened in setting up the request that triggered an Error
            const message = error.message;
            console.error("Error: Could not retrieve cooks.", message);
          }
        });
    },
    loadData(data) {
      if (self.billStore && self.billStore.bills) {
        self.clearBills();
      }
      if (self.residentStore && self.residentStore.residents) {
        self.clearResidents();
      }
      if (self.guestStore && self.guestStore.guests) {
        self.clearGuests();
      }

      // Assign Meal Data
      const dateArray = data.date.split("-");
      const date = new Date(
        dateArray[0],
        Number(dateArray[1] - 1),
        Number(dateArray[2])
      );

      self.meal.date = date;
      self.meal.description = data.description;
      self.meal.closed = data.closed;
      self.meal.closed_at = new Date(data.closed_at);
      self.meal.reconciled = data.reconciled;
      self.meal.nextId = data.next_id;
      self.meal.prevId = data.prev_id;

      if (data.max === null) {
        self.meal.extras = null;
      } else {
        const residentsCount = data.residents.filter(
          resident => resident.attending
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
      residents.forEach(resident => {
        if (resident.attending_at !== null)
          resident.attending_at = new Date(resident.attending_at);
        self.residentStore.residents.put(resident);
      });

      // Assign Guests
      data.guests.forEach(guest => {
        guest.created_at = new Date(guest.created_at);
        self.guestStore.guests.put(guest);
      });

      // Assign Bills
      let bills = data.bills;

      // Rename resident_id --> resident
      bills = bills.map(bill => {
        bill["resident"] = bill["resident_id"];
        delete bill["resident_id"];
        return bill;
      });

      // Convert amount_cents --> amount
      bills = bills.map(bill => {
        bill["amount"] =
          bill["amount_cents"] === 0
            ? ""
            : (bill["amount_cents"] / 100).toFixed(2);
        delete bill["amount_cents"];
        return bill;
      });

      // Determine # of blank bills needed
      const extra = Math.max(3 - bills.length, 0);

      // Create array for iterating
      const array = Array(extra).fill();

      // Create blanks bills
      array.forEach(() => bills.push([]));

      // Assign ids to bills
      bills = bills.map(obj => Object.assign({ id: v4() }, obj));

      // Put bills into BillStore
      bills.forEach(bill => {
        self.billStore.bills.put(bill);
      });

      // Change loading state
      self.isLoading = false;

      // Unsubscribe from previous meal
      if (window.Comeals.channel !== null) {
        window.Comeals.pusher.unsubscribe(window.Comeals.channel.name);
      }

      // Subscribe to changes of this meal
      window.Comeals.channel = window.Comeals.pusher.subscribe(
        `meal-${self.meal.id}`
      );
      window.Comeals.channel.bind("update", function(data) {
        console.log(data.message);
        self.loadDataAsync();
      });
    },
    loadMonth(data) {
      console.log("loadMonth...");
      console.log("data", data);

      if (typeof data === "string") {
        self.isLoading = false;
        window.alert("Error loading data.");
        return true;
      }

      if (self.calendarEvents) {
        self.clearCalendarEvents();
      }

      // #1 Meals
      data.meals.forEach(event => {
        self.calendarEvents.push(event);
      });

      // #2 Bills
      data.bills.forEach(event => {
        self.calendarEvents.push(event);
      });

      // #3 Rotations
      data.rotations.forEach(event => {
        self.calendarEvents.push(event);
      });

      // #4 Birthdays
      data.birthdays.forEach(event => {
        self.calendarEvents.push(event);
      });

      // #5 Common House Reservations
      data.common_house_reservations.forEach(event => {
        self.calendarEvents.push(event);
      });

      // #6 Guest Room Reservations
      data.guest_room_reservations.forEach(event => {
        self.calendarEvents.push(event);
      });

      // #7 Events
      data.events.forEach(event => {
        self.calendarEvents.push(event);
      });

      // Change loading state
      self.isLoading = false;

      // Unsubscribe from previous month
      if (window.Comeals.channel !== null) {
        window.Comeals.pusher.unsubscribe(window.Comeals.channel.name);
      }

      // Subscribe to changes of this month
      var subscribeString = `community-${Cookie.get(
        "community_id"
      )}-calendar-${moment(self.currentDate).format("YYYY")}-${moment(
        self.currentDate
      ).format("M")}`;
      console.log("subscribeString", subscribeString);
      window.Comeals.channel = window.Comeals.pusher.subscribe(subscribeString);

      window.Comeals.channel.bind("update", function(data) {
        console.log(data.message);
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
      if (
        typeof self.meals.find((item, index, array) => item.id === id) ===
        "undefined"
      ) {
        self.addMeal({ id: Number.parseInt(id, 10) });
      }

      self.meal = id;

      localforage.getItem(id.toString()).then(function(value) {
        if (value === null) {
          self.loadDataAsync();
        } else {
          self.loadData(value);
          self.loadDataAsync();
        }
      });
    },
    switchMonths(date) {
      console.log("currentDate switched from:", self.currentDate);
      self.currentDate = date;
      console.log("to", self.currentDate);

      var myDate = moment(date);
      const key = `community-${Cookie.get(
        "community_id"
      )}-calendar-${myDate.format("YYYY")}-${myDate.format("M")}`;
      console.log("key: ", key);

      localforage.getItem(key).then(function(value) {
        if (value === null || typeof value === "undefined") {
          console.log("no key!");
          self.loadMonthAsync();
        } else {
          console.log("yes key!");
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
      console.log(date);
      self.isLoading = true;
      self.switchMonths(date);
    },
    setCalendarInfo(name, array) {
      self.modalIsChanging = false;
      self.calendarName = name;
      self.eventSources.clear();
      self.eventSources = array;
    },
    openModal(name, id) {
      self.modalIsChanging = true;
      self.modalName = name;
      self.modalId = id;
      self.modalActive = true;
    },
    setIsOnline(val) {
      self.isOnline = navigator.onLine;
    }
  }));
