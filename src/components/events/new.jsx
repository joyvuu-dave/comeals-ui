import { Component } from "react";
import DayPickerInputWrapper from "../common/day_picker_input";
import dayjs from "dayjs";
import axios from "axios";
import Cookie from "js-cookie";
import { inject } from "mobx-react";
import { generateTimes } from "../../helpers/helpers";
import handleAxiosError from "../../helpers/handle_axios_error";
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
        all_day: false,
        loading: false,
      };
    }

    handleSubmit(e) {
      e.preventDefault();
      this.setState({ loading: true });
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
            all_day: s.all_day,
          },
        )
        .then(function (response) {
          self.setState({ loading: false });
          if (response.status === 200) {
            self.props.handleCloseModal();
          }
        })
        .catch(function (error) {
          self.setState({ loading: false });
          handleAxiosError(error);
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
            <form onSubmit={(e) => this.handleSubmit(e)}>
              <label>Title</label>
              <input
                type="text"
                id="local.title"
                value={this.state.title}
                onChange={(e) => this.setState({ title: e.target.value })}
                disabled={this.state.loading}
              />
              <br />
              <label>Description</label>
              <textarea
                id="local.description"
                placeholder="optional"
                value={this.state.description}
                onChange={(e) => this.setState({ description: e.target.value })}
                disabled={this.state.loading}
              />
              <br />
              <label>Day</label>
              <br />
              <div
                style={
                  this.state.loading
                    ? { pointerEvents: "none", opacity: 0.5 }
                    : undefined
                }
              >
                <DayPickerInputWrapper
                  value={this.state.day}
                  placeholder=""
                  onDayChange={this.handleDayChange}
                  inputDisabled={this.state.loading}
                  defaultMonth={dayjs(this.props.match.params.date).toDate()}
                  disabledDays={[
                    {
                      after: dayjs(this.props.match.params.date)
                        .add(6, "month")
                        .toDate(),
                    },
                  ]}
                />
              </div>
              <br />
              <br />
              <label>Start Time</label>
              <select
                id="local.start_time"
                value={this.state.start_time}
                onChange={(e) => this.setState({ start_time: e.target.value })}
                disabled={this.state.loading}
              >
                <option />
                {generateTimes().map((time) => (
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
                onChange={(e) => this.setState({ end_time: e.target.value })}
                disabled={this.state.loading}
              >
                <option />
                {generateTimes().map((time) => (
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
                onChange={(e) => this.setState({ all_day: e.target.checked })}
                disabled={this.state.loading}
              />
              <br />
              <br />
              <button
                type="submit"
                className={
                  this.state.loading
                    ? "button-dark button-loader"
                    : "button-dark"
                }
                disabled={this.state.loading}
              >
                Create
              </button>
            </form>
          </fieldset>
        </div>
      );
    }
  },
);

export default EventsNew;
