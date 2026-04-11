import { Component } from "react";
import { inject, observer } from "mobx-react";
import { Navigate, Link } from "react-router-dom";
import { withRouter } from "../../helpers/with_router";
import axios from "axios";
import Cookie from "js-cookie";
import dayjs from "dayjs";
import Modal from "react-modal";

import handleAxiosError from "../../helpers/handle_axios_error";
import { TIMEZONE } from "../../helpers/helpers";
import ResidentsPasswordReset from "./password_reset";
import ResidentsPasswordNew from "./password_new";

const styles = {
  box: {
    marginRight: "auto",
    marginLeft: "auto",
    paddingRight: "15px",
    paddingLeft: "15px",
    width: "100%",
  },
};

Modal.setAppElement("#root");
const ResidentsLogin = inject("store")(
  withRouter(
    observer(
      class ResidentsLogin extends Component {
        constructor(props) {
          super(props);

          this.state = {
            email: "",
            password: "",
            createCommunityVisible: false,
            redirectToReferrer: false,
            loading: false,
          };

          this.handleCloseModal = this.handleCloseModal.bind(this);
        }

        renderModal() {
          if (typeof this.props.match.params.modal === "undefined") {
            return null;
          }

          switch (this.props.match.params.modal) {
            case "reset-password":
              if (typeof this.props.match.params.token === "undefined") {
                return (
                  <ResidentsPasswordReset
                    handleCloseModal={this.handleCloseModal}
                    history={this.props.history}
                  />
                );
              } else {
                return (
                  <ResidentsPasswordNew
                    handleCloseModal={this.handleCloseModal}
                    history={this.props.history}
                    match={this.props.match}
                  />
                );
              }

            default:
              return null;
          }
        }

        handleCloseModal() {
          this.props.history.push("/");
        }

        handleSubmit(e) {
          e.preventDefault();
          this.setState({ loading: true });

          const self = this;
          axios
            .post(`/api/v1/residents/token`, {
              email: self.state.email,
              password: self.state.password,
            })
            .then(function (response) {
              self.setState({ loading: false });

              if (response.status === 200) {
                Cookie.set("token", response.data.token, {
                  expires: 7300,
                });
                Cookie.set("community_id", response.data.community_id, {
                  expires: 7300,
                });
                Cookie.set("resident_id", response.data.resident_id, {
                  expires: 7300,
                });
                Cookie.set("username", response.data.username, {
                  expires: 7300,
                });
                if (response.data.timezone) {
                  Cookie.set("timezone", response.data.timezone, {
                    expires: 7300,
                  });
                }

                var tz = response.data.timezone || "America/Los_Angeles";
                var { from } = self.props.location.state || {
                  from: {
                    pathname:
                      "/calendar/all/" + dayjs().tz(tz).format("YYYY-MM-DD"),
                  },
                };
                window.location.href = from.pathname || from;
              }
            })
            .catch(function (error) {
              self.setState({ loading: false });
              handleAxiosError(error);
            });
        }

        render() {
          const { from } = this.props.location.state || {
            from: {
              pathname: `/calendar/all/${dayjs().tz(TIMEZONE).format("YYYY-MM-DD")}`,
            },
          };
          const { redirectToReferrer } = this.state;

          if (
            redirectToReferrer ||
            (typeof Cookie.get("token") !== "undefined" &&
              Cookie.get("token") !== "undefined")
          ) {
            return <Navigate to={from} replace />;
          }

          return (
            <div>
              <header className="flex space-between header">
                <h2 className="pad-l-sm">Comeals</h2>
                {this.props.store.isOnline ? (
                  <span className="online">ONLINE</span>
                ) : (
                  <span className="offline">OFFLINE</span>
                )}
              </header>
              <div style={styles.box}>
                <br />
                <div>
                  <form onSubmit={(e) => this.handleSubmit(e)}>
                    <fieldset className="login-box">
                      <legend>Resident Login</legend>
                      <label className="w-80">
                        <input
                          type="text"
                          placeholder="Email"
                          autoCapitalize="none"
                          disabled={this.state.loading}
                          aria-label="email"
                          value={this.state.email}
                          onChange={(e) =>
                            this.setState({ email: e.target.value })
                          }
                        />
                      </label>
                      <br />
                      <label className="w-80">
                        <input
                          type="password"
                          placeholder="Password"
                          disabled={this.state.loading}
                          aria-label="password"
                          value={this.state.password}
                          onChange={(e) =>
                            this.setState({ password: e.target.value })
                          }
                        />
                      </label>
                    </fieldset>

                    <button
                      className={this.state.loading ? "button-loader" : ""}
                      type="submit"
                      disabled={this.state.loading}
                    >
                      Submit
                    </button>
                  </form>
                  <br />
                  <Link
                    to="/reset-password"
                    className="text-black"
                    disabled={this.state.loading}
                  >
                    Reset your password
                  </Link>
                </div>
              </div>
              <Modal
                isOpen={typeof this.props.match.params.modal !== "undefined"}
                contentLabel="Login Modal"
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
      },
    ),
  ),
);

export default ResidentsLogin;
