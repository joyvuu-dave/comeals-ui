import React, { Component } from "react";
import { LocalForm, Control } from "react-redux-form";
import axios from "axios";

class ResidentsPasswordReset extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false
    };
  }

  handleSubmit(values) {
    this.setState({ loading: true });

    var self = this;
    axios
      .post(`/api/v1/residents/password-reset`, {
        email: values.email
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
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const data = error.response.data;

          if (data.message) {
            window.alert(data.message);
          } else {
            window.bugsnagClient.notify(new Error("Bad response from server"));
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
    return (
      <LocalForm onSubmit={values => this.handleSubmit(values)}>
        <fieldset>
          <legend>Password Reset</legend>
          <label className="w-100">
            <Control.text
              model=".email"
              placeholder="Email"
              autoCapitalize="none"
              disabled={this.state.loading}
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
      </LocalForm>
    );
  }
}

export default ResidentsPasswordReset;
