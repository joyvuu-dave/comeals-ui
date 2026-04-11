import { Component } from "react";
import { inject, observer } from "mobx-react";
import { toJS } from "mobx";
import { withRouter } from "../../helpers/with_router";
import { TIMEZONE } from "../../helpers/helpers";
import SideBar from "./side_bar";

import Cookie from "js-cookie";
import dayjs from "dayjs";

import Modal from "react-modal";
import GuestRoomReservationsNew from "../guest_room_reservations/new";
import CommonHouseReservationsNew from "../common_house_reservations/new";
import EventsNew from "../events/new";
import GuestRoomReservationsEdit from "../guest_room_reservations/edit";
import CommonHouseReservationsEdit from "../common_house_reservations/edit";
import EventsEdit from "../events/edit";
import RotationsShow from "../rotations/show";

import WebcalLinks from "./webcal_links";
import toastStore from "../../stores/toast_store";
import { Calendar, dayjsLocalizer } from "react-big-calendar";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const localizer = dayjsLocalizer(dayjs);

function getPacificNow() {
  var now = dayjs().tz(TIMEZONE);
  return new Date(
    now.year(),
    now.month(),
    now.date(),
    now.hour(),
    now.minute(),
  );
}

const styles = {
  main: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "nowrap",
  },
  chevron: {
    backgroundColor: "#444",
    border: "1px solid black",
    opacity: "0.75",
    width: "4rem",
    marginTop: "1rem",
  },
};

class MyToolbar extends Component {
  render() {
    return (
      <div style={styles.main}>
        <h2>{dayjs(this.props.date).format("MMMM YYYY")}</h2>
        <span style={styles.main}>
          <button
            className="mar-sm"
            onClick={this.navigate.bind(null, "TODAY")}
          >
            today
          </button>
          <button
            style={styles.chevron}
            onClick={this.navigate.bind(null, "PREV")}
            aria-label="Goto Last Month"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>{" "}
          <button
            style={styles.chevron}
            onClick={this.navigate.bind(null, "NEXT")}
            aria-label="Goto Next Month"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </span>
      </div>
    );
  }

  navigate = (action) => {
    this.props.onNavigate(action);
  };
}

let components = {
  toolbar: MyToolbar,
};

Modal.setAppElement("#root");
const MainCalendar = inject("store")(
  withRouter(
    observer(
      class MainCalendar extends Component {
        constructor(props) {
          super(props);

          this.handleCloseModal = this.handleCloseModal.bind(this);

          this.handleNavigate = this.handleNavigate.bind(this);
          this.handleSelectEvent = this.handleSelectEvent.bind(this);
          this.filterEvents = this.filterEvents.bind(this);
          this.formatEvent = this.formatEvent.bind(this);
          this.handleClickLogout = this.handleClickLogout.bind(this);
        }

        componentDidMount() {
          this.props.store.goToMonth(this.props.match.params.date);
        }

        componentDidUpdate(prevProps) {
          if (
            prevProps.match.params.type !== this.props.match.params.type ||
            prevProps.match.params.date !== this.props.match.params.date
          ) {
            this.props.store.goToMonth(this.props.match.params.date);
          }
        }

        renderModal() {
          if (typeof this.props.match.params.modal === "undefined") {
            return null;
          }

          // NEW RESOURCE
          if (this.props.match.params.view === "new") {
            switch (this.props.match.params.modal) {
              case "guest_room_reservations":
              case "guest-room-reservations":
                return (
                  <GuestRoomReservationsNew
                    handleCloseModal={this.handleCloseModal}
                    match={this.props.match}
                  />
                );

              case "common_house_reservations":
              case "common-house-reservations":
                return (
                  <CommonHouseReservationsNew
                    handleCloseModal={this.handleCloseModal}
                    match={this.props.match}
                  />
                );

              case "events":
                return (
                  <EventsNew
                    handleCloseModal={this.handleCloseModal}
                    match={this.props.match}
                  />
                );

              default:
                return null;
            }
          }

          // EDIT RESOURCE
          if (this.props.match.params.view === "edit") {
            switch (this.props.match.params.modal) {
              case "guest_room_reservations":
              case "guest-room-reservations":
                return (
                  <GuestRoomReservationsEdit
                    eventId={this.props.match.params.id}
                    handleCloseModal={this.handleCloseModal}
                  />
                );

              case "common_house_reservations":
              case "common-house-reservations":
                return (
                  <CommonHouseReservationsEdit
                    eventId={this.props.match.params.id}
                    handleCloseModal={this.handleCloseModal}
                  />
                );

              case "events":
                return (
                  <EventsEdit
                    eventId={this.props.match.params.id}
                    handleCloseModal={this.handleCloseModal}
                  />
                );

              default:
                return null;
            }
          }

          // SHOW RESOURCE
          if (this.props.match.params.view === "show") {
            switch (this.props.match.params.modal) {
              case "rotations":
                return (
                  <RotationsShow
                    id={this.props.match.params.id}
                    handleCloseModal={this.handleCloseModal}
                  />
                );

              default:
                return null;
            }
          }
        }

        handleCloseModal() {
          toastStore.clearAll();
          this.props.history.push(
            `/calendar/${this.props.match.params.type}/${
              this.props.match.params.date
            }`,
          );
        }

        handleClickLogout() {
          this.props.store.logout();
          this.props.history.push("/");
        }

        formatEvent(event) {
          var styles = { style: {} };

          const startString = dayjs(event.start).format();
          const todayString = dayjs(getPacificNow()).format("YYYY-MM-DD");

          if (
            dayjs(startString).isBefore(todayString, "day") &&
            typeof event.url !== "undefined"
          ) {
            styles.style["opacity"] = "0.6";
          }

          styles.style["backgroundColor"] = event.color;
          return styles;
        }

        render() {
          return (
            <div className="offwhite">
              <header className="header flex space-between">
                <h5 className="pad-xs">
                  {dayjs(getPacificNow()).format("ddd MMM Do")}
                </h5>
                {this.props.store.isOnline ? (
                  <span className="online">ONLINE</span>
                ) : (
                  <span className="offline">OFFLINE</span>
                )}
                <span>
                  <button
                    onClick={this.handleClickLogout}
                    className="button-link text-secondary"
                  >
                    {`logout ${Cookie.get("username")}`}
                  </button>
                </span>
              </header>
              <div style={styles.main} className="responsive-calendar">
                <SideBar
                  match={this.props.match}
                  history={this.props.history}
                  location={this.props.location}
                />
                <div style={{ height: 2000, marginRight: 15 }}>
                  <Calendar
                    localizer={localizer}
                    date={dayjs(this.props.match.params.date).toDate()}
                    defaultView="month"
                    eventPropGetter={this.formatEvent}
                    events={this.filterEvents()}
                    className="calendar"
                    onNavigate={this.handleNavigate}
                    onSelectEvent={this.handleSelectEvent}
                    views={["month"]}
                    getNow={getPacificNow}
                    components={components}
                  />
                  <WebcalLinks />
                </div>
              </div>
              <Modal
                isOpen={typeof this.props.match.params.modal !== "undefined"}
                contentLabel="Event Modal"
                onRequestClose={this.handleCloseModal}
                style={{
                  content: {
                    backgroundColor: "#CCDEEA",
                  },
                }}
              >
                {this.renderModal()}
              </Modal>
            </div>
          );
        }

        handleNavigate(event) {
          this.props.history.push(
            `/calendar/${this.props.match.params.type}/${dayjs(event).format(
              "YYYY-MM-DD",
            )}`,
          );
        }

        handleSelectEvent(event) {
          if (event.url) {
            this.props.history.push(event.url);
            return false;
          }
        }

        filterEvents() {
          var events = toJS(this.props.store.calendarEvents);

          switch (this.props.match.params.type) {
            case "all":
              return events;
            default:
              return [];
          }
        }
      },
    ),
  ),
);

export default MainCalendar;
