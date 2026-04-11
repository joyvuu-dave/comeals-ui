import { Component } from "react";
import axios from "axios";
import handleAxiosError from "../../helpers/handle_axios_error";
import Cookie from "js-cookie";
import dayjs from "dayjs";

class MealHistoryShow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      date: "loading...",
      items: [],
      ready: false,
    };
  }

  componentDidMount() {
    var self = this;
    axios
      .get(
        `/api/v1/meals/${self.props.id}/history?token=${Cookie.get("token")}`,
      )
      .then(function (response) {
        if (response.status === 200) {
          self.setState({
            items: response.data.items,
            date: dayjs(response.data.date).format("ddd, MMM Do"),
            ready: true,
          });
        }
      })
      .catch(function (error) {
        handleAxiosError(error, { silent: true });
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
                {this.state.items.map((audit) => {
                  return (
                    <tr key={audit.id}>
                      <td>{audit.id}</td>
                      <td>{audit.user_name}</td>
                      <td>{audit.description}</td>
                      <td>
                        {dayjs(audit.display_time).format("ddd MMM D, h:mm a")}
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
