import React, { Component } from "react";
import axios from "axios";
import Cookie from "js-cookie";
import moment from "moment";

class MealHistoryShow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      date: "loading...",
      items: [],
      ready: false
    };
  }

  componentDidMount() {
    var self = this;
    axios
      .get(
        `/api/v1/meals/${self.props.id}/history?token=${Cookie.get("token")}`
      )
      .then(function(response) {
        if (response.status === 200) {
          self.setState({
            items: response.data.items,
            date: moment(response.data.date).format("ddd, MMM Do"),
            ready: true
          });
        }
      })
      .catch(function(error) {
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
          console.error("Error: No response from server");
        } else {
          // Something happened in setting up the request that triggered an Error
          const message = error.message;
          console.error("Error: Could not retrieve meal history.", message);
        }
      });
  }

  render() {
    return (
      <div>
        {this.state.ready && (
          <div>
            <div className="flex center">
              <h1 className="cell">{this.state.date}</h1>
            </div>
            <table className="table-striped background-white">
              <thead>
                <tr>
                  <th className="background-white sticky-header">ID</th>
                  <th className="background-white sticky-header">User</th>
                  <th className="background-white sticky-header">Action</th>
                  <th className="background-white sticky-header">Time</th>
                </tr>
              </thead>
              <tbody>
                {this.state.items.map(audit => {
                  return (
                    <tr key={audit.id}>
                      <td>{audit.id}</td>
                      <td>{audit.user_name}</td>
                      <td>{audit.description}</td>
                      <td>
                        {moment(audit.display_time).format("ddd MMM D, h:mm a")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!this.state.ready && <h3>Loading...</h3>}
      </div>
    );
  }
}

export default MealHistoryShow;
