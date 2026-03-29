import React, { Component } from "react";
import axios from "axios";

class ResidentsPasswordNew extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ready: false,
      name: "",
      password: ""
    };
  }

  componentDidMount() {
    var self = this;
    axios
      .get(`/api/v1/residents/name/${self.props.match.params.token}`)
      .then(function(response) {
        if (response.status === 200) {
          self.setState({
            name: response.data.name,
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
          self.props.history.push("/");
        } else if (error.request) {
          console.error("Error: no response received from server.");
        } else {
          console.error("Error: could not submit form.");
        }
      });
  }

  handleSubmit(e) {
    e.preventDefault();
    var self = this;

    axios
      .post(
        `/api/v1/residents/password-reset/${self.props.match.params.token}`,
        {
          password: self.state.password
        }
      )
      .then(function(response) {
        if (response.status === 200) {
          if (response.data.message) {
            window.alert(response.data.message);
          }
          self.props.history.push("/");
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
          self.props.history.push("/");
        } else {
          window.alert("Error: could not submit form.");
        }
      });
  }

  render() {
    return (
      <div>
        {this.state.ready && (
          <form onSubmit={e => this.handleSubmit(e)}>
            <fieldset className="w-100">
              <legend>Reset Password for {this.state.name}</legend>
              <label className="w-75">
                <input
                  type="password"
                  placeholder="New Password"
                  value={this.state.password}
                  onChange={e => this.setState({ password: e.target.value })}
                />
              </label>
            </fieldset>

            <button type="submit">Submit</button>
          </form>
        )}
        {!this.state.ready && <h3>Loading...</h3>}
      </div>
    );
  }
}

export default ResidentsPasswordNew;
