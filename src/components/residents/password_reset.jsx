import React, { Component } from "react";
import { LocalForm, Control } from "react-redux-form";
import axios from "axios";

class ResidentsPasswordReset extends Component {
  handleSubmit(values) {
    var self = this;

    axios
      .post(`/api/v1/residents/password-reset`, {
        email: values.email
      })
      .then(function(response) {
        if (response.status === 200) {
          window.alert(response.data.message);
          self.props.history.push("/");
        }
      })
      .catch(function(error) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          const data = error.response.data;

          window.alert(data.message);
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
            />
          </label>
        </fieldset>

        <button type="submit">Reset</button>
      </LocalForm>
    );
  }
}

export default ResidentsPasswordReset;
