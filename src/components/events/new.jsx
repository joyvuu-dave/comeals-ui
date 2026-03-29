import React, { Component } from "react";
import DayPickerInput from "react-day-picker/DayPickerInput";
import { formatDate, parseDate } from "react-day-picker/moment";
import moment from "moment";
import axios from "axios";
import Cookie from "js-cookie";
import { inject } from "mobx-react";
import { generateTimes } from "../../helpers/helpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const EventsNew = inject("store")(
  class EventsNew extends Component {
    constructor(props) {
      super(props);
      this.handleDayChange = this.handleDayChange.bind(this);

      this.state = {
        communityId: Cookie.get("community_id"),
        title: "",
        description: "",
        day: null,
        start_time: "",
        end_time: "",
        all_day: false
      };
    }

    handleSubmit(e) {
      e.preventDefault();
      var self = this;
      var s = self.state;
      axios
        .post(
          `/api/v1/events?community_id=${
            s.communityId
          }&token=${Cookie.get("token")}`,
          {
            title: s.title,
            description: s.description,
            start_year: s.day && s.day.getFullYear(),
            start_month: s.day && s.day.getMonth() + 1,
            start_day: s.day && s.day.getDate(),
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

    handleDayChange(val) {
      this.setState({ day: val });
    }

    render() {
      return (
        <div>
          <div className="flex">
            <h2>Event</h2>
            <FontAwesomeIcon
              icon={faTimes}
              size="2x"
              className="close-button"
              onClick={this.props.handleCloseModal}
            />
          </div>
          <fieldset>
            <legend>New</legend>
            <form onSubmit={e => this.handleSubmit(e)}>
              <label>Title</label>
              <input
                type="text"
                id="local.title"
                value={this.state.title}
                onChange={e => this.setState({ title: e.target.value })}
              />
              <br />
              <label>Description</label>
              <textarea
                id="local.description"
                placeholder="optional"
                value={this.state.description}
                onChange={e => this.setState({ description: e.target.value })}
              />
              <br />
              <label>Day</label>
              <br />
              <DayPickerInput
                formatDate={formatDate}
                parseDate={parseDate}
                placeholder={""}
                onDayChange={this.handleDayChange}
                dayPickerProps={{
                  initialMonth: moment(this.props.match.params.date).toDate(),
                  disabledDays: [
                    {
                      after: moment(this.props.match.params.date)
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
                onChange={e => this.setState({ start_time: e.target.value })}
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
                checked={this.state.all_day}
                onChange={e => this.setState({ all_day: e.target.checked })}
              />
              <br />
              <br />
              <button type="submit" className="button-dark">
                Create
              </button>
            </form>
          </fieldset>
        </div>
      );
    }
  }
);

export default EventsNew;
