import React, { Component } from "react";
import { LocalForm, Control } from "react-redux-form";
import axios from "axios";

class CommunitiesNew extends Component {
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
      .post(`/api/v1/communities`, {
        name: values.name,
        email: values.email,
        password: values.password
      })
      .then(function(response) {
        self.setState({ loading: false });
        if (response.status === 200) {
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
    return (
      <div>
        <h2>Create a new Community</h2>
        <fieldset className="w-100">
          <legend>Community</legend>
          <LocalForm onSubmit={values => this.handleSubmit(values)}>
            <label>Community Name</label>
            <Control.text
              model=".name"
              className="w-75"
              disabled={this.state.loading}
            />
            <br />

            <label>Admin Email Address</label>
            <Control.text
              model=".email"
              className="w-75"
              disabled={this.state.loading}
            />
            <br />

            <label>Admin Password</label>
            <Control
              type="password"
              model=".password"
              className="w-75"
              disabled={this.state.loading}
            />
            <br />

            <button
              className={this.state.loading ? "button-loader" : ""}
              type="submit"
              disabled={this.state.loading}
            >
              Submit
            </button>
          </LocalForm>
        </fieldset>
      </div>
    );
  }
}

export default CommunitiesNew;
