import { types, getParent } from "mobx-state-tree";
import axios from "axios";
import Cookie from "js-cookie";

const Meal = types
  .model("Meal", {
    id: types.identifier(types.number),
    description: "",
    extras: types.maybe(types.number),
    closed: false,
    closed_at: types.maybe(types.Date),
    date: types.maybe(types.Date),
    reconciled: false,
    nextId: types.maybe(types.number),
    prevId: types.maybe(types.number)
  })
  .views(self => ({
    get max() {
      if (self.extras === null) {
        return null;
      } else {
        return Number(self.extras) + self.form.attendeesCount;
      }
    },
    get form() {
      return getParent(self, 2);
    }
  }))
  .actions(self => ({
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

      // Scenario #1: empty string
      if (val === null) {
        self.extras = null;

        axios({
          method: "patch",
          url: `/api/v1/meals/${self.id}/max?token=${Cookie.get("token")}`,
          data: {
            max: null,
            socket_id: window.Comeals.socketId
          },
          withCredentials: true
        }).catch(function(error) {
          self.extras = previousExtras;

          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.bugsnagClient.notify(
                new Error("Bad response from server")
              );
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

          return previousExtras; // return old value of extras as feedback when running function from console
        });
      }

      // Scenario #2: positive integer
      const num = parseInt(Number(val), 10);
      if (Number.isInteger(num) && num >= 0) {
        self.extras = num;

        axios({
          method: "patch",
          url: `/api/v1/meals/${self.id}/max?token=${Cookie.get("token")}`,
          data: {
            max: self.max,
            socket_id: window.Comeals.socketId
          },
          withCredentials: true
        }).catch(function(error) {
          self.extras = previousExtras;

          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            const data = error.response.data;

            if (data.message) {
              window.alert(data.message);
            } else {
              window.bugsnagClient.notify(
                new Error("Bad response from server")
              );
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

          return previousExtras; // return old value of extras as feedback when running function from console
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
    }
  }));

export default Meal;
