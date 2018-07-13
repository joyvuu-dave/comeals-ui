import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { Redirect, Link, withRouter } from "react-router-dom";
import { LocalForm, Control } from "react-redux-form";
import axios from "axios";
import Cookie from "js-cookie";
import moment from "moment";
import Modal from "react-modal";

import ResidentsPasswordReset from "./password_reset";
import CommunitiesNew from "../../components/communities/new";
import ResidentsPasswordNew from "./password_new";

Modal.setAppElement("#root");
const ResidentsLogin = inject("store")(
  withRouter(
    observer(
      class ResidentsLogin extends Component {
        constructor(props) {
          super(props);

          this.state = {
            createCommunityVisible: false,
            redirectToReferrer: false,
            loading: false
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

            case "create-community":
              return (
                <CommunitiesNew
                  handleCloseModal={this.handleCloseModal}
                  history={this.props.history}
                />
              );

            default:
              return null;
          }
        }

        handleCloseModal() {
          this.props.history.push("/");
        }

        handleSubmit(values) {
          this.setState({ loading: true });

          const self = this;
          axios
            .post(`/api/v1/residents/token`, {
              email: values.email,
              password: values.password
            })
            .then(function(response) {
              self.setState({ loading: false });

              if (response.status === 200) {
                console.log("data", response.data);
                // set token cookie
                Cookie.set("token", response.data.token, {
                  expires: 7300
                });
                // set community_id cookie
                Cookie.set("community_id", response.data.community_id, {
                  expires: 7300
                });

                // set community_id cookie
                Cookie.set("resident_id", response.data.resident_id, {
                  expires: 7300
                });

                // set username cookie
                Cookie.set("username", response.data.username, {
                  expires: 7300
                });

                self.props.history.push(
                  `/calendar/all/${moment().format("YYYY-MM-DD")}`
                );
              }
            })
            .catch(function(error) {
              self.setState({ loading: false });

              if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const data = error.response.data;

                if (data.message) {
                  window.alert(data.message);
                } else {
                  window.alert("Error: bad response from server.");
                }
              } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                window.alert("Error: no response received from server.");
              } else {
                // Something happened in setting up the request that triggered an Error
                window.alert("Error: could not submit form.");
              }
            });
        }

        render() {
          const { from } = this.props.location.state || {
            from: { pathname: `/calendar/all/${moment().format("YYYY-MM-DD")}` }
          };
          const { redirectToReferrer } = this.state;

          if (
            redirectToReferrer ||
            (typeof Cookie.get("token") !== "undefined" &&
              Cookie.get("token") !== "undefined" &&
              Cookie.get("token") !== undefined)
          ) {
            return <Redirect to={from} />;
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
                <a
                  href={`${this.state.host}admin.comeals${this.state.topLevel}`}
                  className="pad-r-sm text-secondary"
                >
                  admin
                </a>
              </header>
              <div className="box">
                <br />
                <div>
                  <LocalForm onSubmit={values => this.handleSubmit(values)}>
                    <fieldset className="login-box">
                      <legend>Resident Login</legend>
                      <label className="w-80">
                        <Control.text
                          model=".email"
                          placeholder="Email"
                          autoCapitalize="none"
                          disabled={this.state.loading}
                        />
                      </label>
                      <br />
                      <label className="w-80">
                        <Control.password
                          type="password"
                          model=".password"
                          placeholder="Password"
                          disabled={this.state.loading}
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
                  </LocalForm>
                  <br />
                  <Link
                    to="/reset-password"
                    className="text-black"
                    disabled={this.state.loading}
                  >
                    Reset your password
                  </Link>
                </div>
                <div>
                  <br />
                  <br />
                  <br />
                  <br />
                  <div className="w-50">
                    <h3 className="text-black">Add your Community</h3>
                    <p className="text-black">
                      Start managing your common meals today!
                    </p>
                    <Link
                      className="button"
                      to="/create-community"
                      disabled={this.state.loading}
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              </div>
              <Modal
                isOpen={typeof this.props.match.params.modal !== "undefined"}
                contentLabel="Login Modal"
                onRequestClose={this.handleCloseModal}
                style={{
                  content: {
                    backgroundColor: "#6699cc"
                  }
                }}
              >
                {this.renderModal()}
              </Modal>
            </div>
          );
        }
      }
    )
  )
);

export default ResidentsLogin;
