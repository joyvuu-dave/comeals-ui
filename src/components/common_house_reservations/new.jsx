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

const CommonHouseReservationsNew = inject("store")(
  class CommonHouseReservationsNew extends Component {
    constructor(props) {
      super(props);
      this.handleDayChange = this.handleDayChange.bind(this);

      this.state = {
        communityId: Cookie.get("community_id"),
        residents: [],
        ready: false,
        resident_id: "",
        title: "",
        day: null,
        start_time: "",
        end_time: ""
      };
    }

    componentDidMount() {
      var self = this;
      axios
        .get(
          `/api/v1/communities/${
            self.state.communityId
          }/hosts?token=${Cookie.get("token")}`
        )
        .then(function(response) {
          if (response.status === 200) {
            self.setState({
              residents: response.data,
              ready: true
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
            console.error("Error: No response from server", error.request);
          } else {
            console.error("Error: Could not retrieve hosts.", error.message);
          }
        });
    }

    handleSubmit(e) {
      e.preventDefault();
      var self = this;
      var s = self.state;
      axios
        .post(
          `/api/v1/common-house-reservations?community_id=${
            s.communityId
          }&token=${Cookie.get("token")}`,
          {
            resident_id: s.resident_id,
            start_year: s.day && s.day.getFullYear(),
            start_month: s.day && s.day.getMonth() + 1,
            start_day: s.day && s.day.getDate(),
            start_hours: s.start_time && s.start_time.split(":")[0],
            start_minutes: s.start_time && s.start_time.split(":")[1],
            end_hours: s.end_time && s.end_time.split(":")[0],
            end_minutes: s.end_time && s.end_time.split(":")[1],
            title: s.title
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
          {this.state.ready && (
            <div>
              <div className="flex">
                <h2>Common House</h2>
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
                  <label>Resident</label>
                  <select
                    id="local.resident_id"
                    value={this.state.resident_id}
                    onChange={e =>
                      this.setState({ resident_id: e.target.value })
                    }
                  >
                    <option />
                    {this.state.residents.map(resident => (
                      <option key={resident[0]} value={resident[0]}>
                        {resident[2]} - {resident[1]}
                      </option>
                    ))}
                  </select>
                  <br />
                  <label>Title</label>
                  <br />
                  <input
                    type="text"
                    id="local.title"
                    placeholder="optional"
                    value={this.state.title}
                    onChange={e => this.setState({ title: e.target.value })}
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
                      initialMonth: moment(
                        this.props.match.params.date
                      ).toDate(),
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

                  <button type="submit" className="button-dark">
                    Create
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

export default CommonHouseReservationsNew;
