import React, { Component } from "react";
import DayPickerInput from "react-day-picker/DayPickerInput";
import { formatDate, parseDate } from "react-day-picker/moment";
import axios from "axios";
import Cookie from "js-cookie";
import moment from "moment";
import { inject } from "mobx-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const GuestRoomReservationsEdit = inject("store")(
  class GuestRoomReservationsEdit extends Component {
    constructor(props) {
      super(props);
      this.handleDayChange = this.handleDayChange.bind(this);

      this.state = {
        ready: false,
        event: {},
        hosts: [],
        resident_id: "",
        day: "",
        loadingAction: null
      };
    }

    componentDidMount() {
      var self = this;
      axios
        .get(
          `/api/v1/guest-room-reservations/${
            self.props.eventId
          }?token=${Cookie.get("token")}`
        )
        .then(function(response) {
          if (response.status === 200) {
            self.setState({
              event: response.data.event,
              hosts: response.data.hosts,
              ready: true,
              resident_id: response.data.event.resident_id,
              day: response.data.event.date
            });
          }
        })
        .catch(function(error) {
          if (error.response) {
            const data = error.response.data;
            if (data.message) {
              window.alert(data.message);
            } else {
              console.error("Bad response from server", error);
            }
          } else if (error.request) {
            console.error("Error: No response from server.", error.request);
          } else {
            console.error(
              "Error: Could not retrieve common house reservation.",
              error.message
            );
          }
        });
    }

    handleSubmit(e) {
      e.preventDefault();
      this.setState({ loadingAction: "submit" });
      var self = this;
      axios
        .patch(
          `/api/v1/guest-room-reservations/${
            self.props.eventId
          }/update?token=${Cookie.get("token")}`,
          {
            resident_id: self.state.resident_id,
            date: self.state.day
          }
        )
        .then(function(response) {
          self.setState({ loadingAction: null });
          if (response.status === 200) {
            self.props.handleCloseModal();
          }
        })
        .catch(function(error) {
          self.setState({ loadingAction: null });
          if (error.response) {
            const data = error.response.data;
            if (data.message) {
              window.alert(data.message);
            } else {
              console.error("Bad response from server", error);
            }
          } else if (error.request) {
            window.alert("Error: no response received from server.");
          } else {
            window.alert("Error: could not submit form.");
          }
        });
    }

    handleDelete() {
      if (this.state.loadingAction) return;
      if (window.confirm("Do you really want to delete this reservation?")) {
        this.setState({ loadingAction: "delete" });
        var self = this;
        axios
          .delete(
            `/api/v1/guest-room-reservations/${
              self.props.eventId
            }/delete?token=${Cookie.get("token")}`
          )
          .then(function(response) {
            self.setState({ loadingAction: null });
            if (response.status === 200) {
              self.props.handleCloseModal();
            }
          })
          .catch(function(error) {
            self.setState({ loadingAction: null });
            if (error.response) {
              const data = error.response.data;
              if (data.message) {
                window.alert(data.message);
              } else {
                console.error("Bad response from server", error);
              }
            } else if (error.request) {
              window.alert("Error: no response received from server.");
            } else {
              window.alert("Error: could not submit form.");
            }
          });
      }
    }

    handleDayChange(val) {
      this.setState({ day: val });
    }

    render() {
      return (
        <div>
          {this.state.ready && (
            <div>
              <div className="flex">
                <h2>Guest Room Reservation</h2>
                <button
                  onClick={this.handleDelete.bind(this)}
                  type="button"
                  className={this.state.loadingAction === "delete" ? "mar-l-md button-warning button-loader" : "mar-l-md button-warning"}
                  disabled={this.state.loadingAction !== null}
                >
                  Delete
                </button>
                <FontAwesomeIcon
                  icon={faTimes}
                  size="2x"
                  className="close-button"
                  onClick={this.props.handleCloseModal}
                />
              </div>
              <fieldset>
                <legend>Edit</legend>
                <form onSubmit={e => this.handleSubmit(e)}>
                  <label>Host</label>
                  <select
                    id="local.resident_id"
                    value={this.state.resident_id}
                    onChange={e =>
                      this.setState({ resident_id: e.target.value })
                    }
                    disabled={this.state.loadingAction !== null}
                  >
                    {this.state.hosts.map(host => (
                      <option key={host[0]} value={host[0]}>
                        {host[2]} - {host[1]}
                      </option>
                    ))}
                  </select>
                  <br />

                  <label>Day</label>
                  <br />
                  <div style={this.state.loadingAction !== null ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
                    <DayPickerInput
                      formatDate={formatDate}
                      parseDate={parseDate}
                      onDayChange={this.handleDayChange}
                      value={formatDate(this.state.event.date)}
                      dayPickerProps={{
                        disabledDays: [
                          {
                            after: moment(this.state.event.date)
                              .add(6, "M")
                              .toDate()
                          }
                        ]
                      }}
                      inputProps={{ disabled: this.state.loadingAction !== null }}
                    />
                  </div>
                  <br />
                  <br />

                  <button
                    type="submit"
                    className={this.state.loadingAction === "submit" ? "button-dark button-loader" : "button-dark"}
                    disabled={this.state.loadingAction !== null}
                  >
                    Update
                  </button>
                </form>
              </fieldset>
            </div>
          )}
          {!this.state.ready && <h3>Loading...</h3>}
        </div>
      );
    }
  }
);

export default GuestRoomReservationsEdit;
