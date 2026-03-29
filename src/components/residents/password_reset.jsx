import React, { Component } from "react";
import axios from "axios";

class ResidentsPasswordReset extends Component {
  constructor(props) {
    super(props);

    this.state = {
      email: "",
      loading: false
    };
  }

  handleSubmit(e) {
    e.preventDefault();
    this.setState({ loading: true });

    var self = this;
    axios
      .post(`/api/v1/residents/password-reset`, {
        email: self.state.email
      })
      .then(function(response) {
        self.setState({ loading: false });
        if (response.status === 200) {
          if (response.data.message) {
            window.alert(response.data.message);
          }
          self.props.history.push("/");
        }
      })
      .catch(function(error) {
        self.setState({ loading: false });
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

  render() {
    return (
      <form onSubmit={e => this.handleSubmit(e)}>
        <fieldset>
          <legend>Password Reset</legend>
          <label className="w-100">
            <input
              type="text"
              placeholder="Email"
              autoCapitalize="none"
              disabled={this.state.loading}
              value={this.state.email}
              onChange={e => this.setState({ email: e.target.value })}
            />
          </label>
        </fieldset>

        <button
          className={this.state.loading ? "button-loader" : ""}
          type="submit"
          disabled={this.state.loading}
        >
          Reset
        </button>
      </form>
    );
  }
}

export default ResidentsPasswordReset;
