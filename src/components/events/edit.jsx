import React, { Component } from "react";
import DayPickerInput from "react-day-picker/DayPickerInput";
import { formatDate, parseDate } from "react-day-picker/moment";
import axios from "axios";
import Cookie from "js-cookie";
import moment from "moment";
import { generateTimes } from "../../helpers/helpers";
import { inject } from "mobx-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const EventsEdit = inject("store")(
  class EventsEdit extends Component {
    constructor(props) {
      super(props);
      this.handleDayChange = this.handleDayChange.bind(this);

      this.state = {
        ready: false,
        event: {},
        title: "",
        description: "",
        day: "",
        start_time: "",
        end_time: "",
        all_day: false
      };
    }

    componentDidMount() {
      var self = this;
      axios
        .get(
          `/api/v1/events/${self.props.eventId}?token=${Cookie.get("token")}`
        )
        .then(function(response) {
          if (response.status === 200) {
            var evt = response.data;
            self.setState({
              event: evt,
              ready: true,
              title: evt.title,
              description: evt.description,
              day: evt.start_date,
              start_time: `${new Date(evt.start_date)
                .getHours()
                .toString()
                .padStart(2, "0")}:${new Date(evt.start_date)
                .getMinutes()
                .toString()
                .padStart(2, "0")}`,
              end_time: evt.end_date
                ? `${new Date(evt.end_date)
                    .getHours()
                    .toString()
                    .padStart(2, "0")}:${new Date(evt.end_date)
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`
                : "",
              all_day: evt.allday
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
            console.error("Error: Could not retrieve events.", error.message);
          }
        });
    }

    handleSubmit(e) {
      e.preventDefault();
      var self = this;
      var s = self.state;
      axios
        .patch(
          `/api/v1/events/${self.props.eventId}/update?token=${Cookie.get(
            "token"
          )}`,
          {
            title: s.title,
            description: s.description,
            start_year: s.day && new Date(s.day).getFullYear(),
            start_month: s.day && new Date(s.day).getMonth() + 1,
            start_day: s.day && new Date(s.day).getDate(),
            start_hours: s.start_time && s.start_time.split(":")[0],
            start_minutes: s.start_time && s.start_time.split(":")[1],
            end_hours: s.end_time && s.end_time.split(":")[0],
            end_minutes: s.end_time && s.end_time.split(":")[1],
            all_day: s.all_day
          }
        )
        .then(function(response) {
          if (response.status === 200) {
            self.props.handleCloseModal();
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
            window.alert("Error: no response received from server.");
          } else {
            window.alert("Error: could not submit form.");
          }
        });
    }

    handleDelete() {
      if (window.confirm("Do you really want to delete this event?")) {
        var self = this;
        axios
          .delete(
            `/api/v1/events/${self.state.event.id}/delete?token=${Cookie.get(
              "token"
            )}`
          )
          .then(function(response) {
            if (response.status === 200) {
              self.props.handleCloseModal();
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
                <h2>Event</h2>
                <button
                  onClick={this.handleDelete.bind(this)}
                  type="button"
                  className="mar-l-md button-warning"
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
                  <label>Title</label>
                  <input
                    type="text"
                    value={this.state.title}
                    onChange={e => this.setState({ title: e.target.value })}
                  />
                  <br />
                  <label>Description</label>
                  <textarea
                    placeholder="optional"
                    value={this.state.description}
                    onChange={e =>
                      this.setState({ description: e.target.value })
                    }
                  />
                  <br />
                  <label>Day</label>
                  <br />
                  <DayPickerInput
                    formatDate={formatDate}
                    parseDate={parseDate}
                    onDayChange={this.handleDayChange}
                    value={formatDate(this.state.event.start_date)}
                    dayPickerProps={{
                      disabledDays: [
                        {
                          after: moment(this.state.event.start_date)
                            .add(6, "M")
                            .toDate()
                        }
                      ]
                    }}
                  />
                  <br />
                  <br />
                  <label>Start Time</label>
                  <select
                    id="local.start_time"
                    value={this.state.start_time}
                    onChange={e =>
                      this.setState({ start_time: e.target.value })
                    }
                  >
                    <option />
                    {generateTimes().map(time => (
                      <option key={time.value} value={time.value}>
                        {time.display}
                      </option>
                    ))}
                  </select>
                  <br />
                  <label>End Time</label>
                  <select
                    id="local.end_time"
                    value={this.state.end_time}
                    onChange={e => this.setState({ end_time: e.target.value })}
                  >
                    <option />
                    {generateTimes().map(time => (
                      <option key={time.value} value={time.value}>
                        {time.display}
                      </option>
                    ))}
                  </select>
                  <br />
                  <label>All Day</label>
                  {"  "}
                  <input
                    type="checkbox"
                    id="local.all_day"
                    checked={this.state.all_day}
                    onChange={e =>
                      this.setState({ all_day: e.target.checked })
                    }
                  />
                  <br />
                  <br />
                  <button type="submit" className="button-dark">
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

export default EventsEdit;
