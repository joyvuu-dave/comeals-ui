import { types, getParent } from "mobx-state-tree";
import axios from "axios";
import Cookie from "js-cookie";
import handleAxiosError from "../helpers/handle_axios_error";

const Meal = types
  .model("Meal", {
    id: types.identifierNumber,
    description: "",
    extras: types.maybeNull(types.number),
    closed: false,
    closed_at: types.maybeNull(types.Date),
    date: types.maybeNull(types.Date),
    reconciled: false,
    nextId: types.maybeNull(types.number),
    prevId: types.maybeNull(types.number),
  })
  .views((self) => ({
    get max() {
      if (self.extras === null) {
        return null;
      } else {
        return Number(self.extras) + self.form.attendeesCount;
      }
    },
    get form() {
      return getParent(self, 2);
    },
  }))
  .actions((self) => ({
    // This isn't the "real" toggleClosed. It's the backup
    // for un-doing the UI change if the API request fails
    toggleClosed() {
      self.closed = !self.closed;
      return self.closed;
    },
    resetExtras() {
      self.extras = null;
      return null;
    },
    resetClosedAt() {
      self.closed_at = null;
      return null;
    },
    setClosedAt() {
      const time = new Date();
      self.closed_at = time;
      return time;
    },
    setExtras(val) {
      const previousExtras = self.extras;

      // Scenario #1: explicit null (clear extras)
      // Note: empty string falls to Scenario #2 and resolves to 0
      if (val === null) {
        self.extras = null;

        axios({
          method: "patch",
          url: `/api/v1/meals/${self.id}/max?token=${Cookie.get("token")}`,
          data: {
            max: null,
            socket_id: window.Comeals.socketId,
          },
          withCredentials: true,
        }).catch(function (error) {
          self.extras = previousExtras;
          handleAxiosError(error);
          return previousExtras;
        });

        return;
      }

      // Scenario #2: non-negative integer
      const num = parseInt(Number(val), 10);
      if (Number.isInteger(num) && num >= 0) {
        self.extras = num;

        axios({
          method: "patch",
          url: `/api/v1/meals/${self.id}/max?token=${Cookie.get("token")}`,
          data: {
            max: self.max,
            socket_id: window.Comeals.socketId,
          },
          withCredentials: true,
        }).catch(function (error) {
          self.extras = previousExtras;
          handleAxiosError(error);
          return previousExtras;
        });
      }
    },
    incrementExtras() {
      if (self.extras === null) {
        return;
      }

      const num = parseInt(Number(self.extras), 10);
      if (Number.isInteger(num)) {
        const temp = num + 1;
        self.extras = temp;
      }
    },
    decrementExtras() {
      if (self.extras === null) {
        return;
      }

      const num = parseInt(Number(self.extras), 10);
      if (Number.isInteger(num)) {
        const temp = num - 1;
        self.extras = temp;
      }
    },
  }));

export default Meal;
