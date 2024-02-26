import React from "react";
import { inject } from "mobx-react";
import Cookie from "js-cookie";
import axios from "axios";

const styles = {
  sideBar: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start"
  },
  button: {
    maxWidth: "95vw"
  }
};

const SideBar = inject("store")(
  class SideBar extends React.Component {
    getNavDate() {
      return this.props.location.pathname.split("/")[3];
    }

    openNewGuestRoomReservation() {
      this.props.history.push(
        `${this.props.location.pathname}guest-room-reservations/new`
      );
    }

    openNewCommonHouseReservation() {
      this.props.history.push(
        `${this.props.location.pathname}common-house-reservations/new`
      );
    }

    openNewEvent() {
      this.props.history.push(`${this.props.location.pathname}events/new`);
    }

    openNextMeal() {
      const myHistory = this.props.history;

      axios
        .get(`/api/v1/meals/next?token=${Cookie.get("token")}`)
        .then(function(response) {
          if (response.status === 200) {
            myHistory.push(`/meals/${response.data.meal_id}/edit`);
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
              window.bugsnagClient.notify(
                new Error("Bad response from server")
              );
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
    }

    render() {
      return (
        <div style={styles.sideBar}>
          <h3 className="mar-sm">Reserve</h3>
          <button
            onClick={this.openNewGuestRoomReservation.bind(this)}
            className="mar-sm"
            style={styles.button}
          >
            Guest Room
          </button>
          <button
            onClick={this.openNewCommonHouseReservation.bind(this)}
            className="mar-sm"
            style={styles.button}
          >
            Common House
          </button>
          <hr />
          <h3 className="mar-sm">Add</h3>
          <button
            onClick={this.openNewEvent.bind(this)}
            className="mar-sm button-secondary"
            style={styles.button}
          >
            Event
          </button>
          <hr />
          <h3 className="mar-sm">Goto</h3>
          <button
            onClick={this.openNextMeal.bind(this)}
            className="button-info mar-sm"
            style={styles.button}
          >
            Next Meal
          </button>
        </div>
      );
    }
  }
);

export default SideBar;
