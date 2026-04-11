import { Component } from "react";
import { inject, observer } from "mobx-react";
import dayjs from "dayjs";
import ButtonBar from "./button_bar";
import Cookie from "js-cookie";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    height: "2.25rem",
  },
};

const Header = inject("store")(
  observer(
    class Header extends Component {
      render() {
        return (
          <header style={styles.header} className="header background-yellow">
            <button
              onClick={() =>
                this.props.history.push(
                  `/calendar/all/${dayjs(
                    this.props.store.isLoading
                      ? new Date()
                      : this.props.store.meal.date,
                  ).format("YYYY-MM-DD")}`,
                )
              }
              className="text-black button-link"
            >
              <h5>
                <FontAwesomeIcon icon={faArrowLeft} /> <strong>Calendar</strong>
              </h5>
            </button>
            {this.props.store.isOnline ? (
              <span className="online">ONLINE</span>
            ) : (
              <span className="offline">OFFLINE</span>
            )}
            <div className="flex">
              <ButtonBar
                history={this.props.history}
                location={this.props.location}
                match={this.props.match}
              />
              <button
                className="button button-link text-secondary"
                onClick={() => {
                  this.props.store.logout();
                  this.props.history.push("/");
                }}
              >
                logout {Cookie.get("username")}
              </button>
            </div>
          </header>
        );
      }
    },
  ),
);

export default Header;
