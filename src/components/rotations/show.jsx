import { Component } from "react";
import axios from "axios";
import handleAxiosError from "../../helpers/handle_axios_error";
import Cookie from "js-cookie";

const styles = {
  main: {
    backgroundColor: "#ebebe4",
  },
};

class RotationsShow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      rotation: {
        id: null,
        description: "",
        residents: [],
      },
      ready: false,
    };
  }

  componentDidMount() {
    var self = this;
    axios
      .get(`/api/v1/rotations/${self.props.id}?token=${Cookie.get("token")}`)
      .then(function (response) {
        if (response.status === 200) {
          self.setState({
            rotation: response.data,
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
      <div style={styles.main}>
        {this.state.ready && (
          <div>
            <div className="flex center">
              <u className="cell">
                <h1>{`Rotation ${this.state.rotation.id}`}</h1>
              </u>
            </div>
            <br />
            <div className="flex center">
              <h2 className="cell nine text-success">
                {this.state.rotation.description}
              </h2>
            </div>
            <br />

            <ul>
              {[...this.state.rotation.residents]
                .sort((a, b) => {
                  if (a.display_name < b.display_name) return -1;
                  if (a.display_name > b.display_name) return 1;
                  return 0;
                })
                .map((resident) => {
                  return (
                    <div key={resident.id}>
                      {resident.signed_up && (
                        <s>
                          <li className="text-muted">
                            {resident.display_name}
                          </li>
                        </s>
                      )}
                      {!resident.signed_up && (
                        <li className="text-bold text-italic">
                          {resident.display_name}
                        </li>
                      )}
                    </div>
                  );
                })}
            </ul>
          </div>
        )}{" "}
        {!this.state.ready && <h3>Loading...</h3>}
      </div>
    );
  }
}

export default RotationsShow;
