import { Component } from "react";
import DayPickerInputWrapper from "../common/day_picker_input";
import dayjs from "dayjs";
import axios from "axios";
import Cookie from "js-cookie";
import { inject } from "mobx-react";
import handleAxiosError from "../../helpers/handle_axios_error";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

const GuestRoomReservationsNew = inject("store")(
  class GuestRoomReservationsNew extends Component {
    constructor(props) {
      super(props);
      this.handleDayChange = this.handleDayChange.bind(this);

      this.state = {
        communityId: Cookie.get("community_id"),
        hosts: [],
        ready: false,
        resident_id: "",
        day: null,
        loading: false,
      };
    }

    componentDidMount() {
      var self = this;
      axios
        .get(
          `/api/v1/communities/${
            self.state.communityId
          }/hosts?token=${Cookie.get("token")}`,
        )
        .then(function (response) {
          if (response.status === 200) {
            self.setState({
              hosts: response.data,
              ready: true,
            });
          }
        })
        .catch(function (error) {
          handleAxiosError(error, { silent: true });
        });
    }

    handleSubmit(e) {
      e.preventDefault();
      this.setState({ loading: true });
      var self = this;
      axios
        .post(
          `/api/v1/guest-room-reservations?community_id=${
            self.state.communityId
          }&token=${Cookie.get("token")}`,
          {
            resident_id: self.state.resident_id,
            date: self.state.day
              ? dayjs(self.state.day).format("YYYY-MM-DD")
              : null,
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
          {this.state.ready && (
            <div>
              <div className="flex">
                <h2>Guest Room Reservation</h2>
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
                  <label>Host</label>
                  <select
                    id="local.resident_id"
                    value={this.state.resident_id}
                    onChange={(e) =>
                      this.setState({ resident_id: e.target.value })
                    }
                    disabled={this.state.loading}
                  >
                    <option />
                    {this.state.hosts.map((host) => (
                      <option key={host[0]} value={host[0]}>
                        {host[2]} - {host[1]}
                      </option>
                    ))}
                  </select>
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
                      defaultMonth={dayjs(
                        this.props.match.params.date,
                      ).toDate()}
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
          )}
          {!this.state.ready && <h3>Loading...</h3>}
        </div>
      );
    }
  },
);

export default GuestRoomReservationsNew;
