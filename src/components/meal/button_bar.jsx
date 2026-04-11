import { Component } from "react";
import { inject, observer } from "mobx-react";

const styles = {
  main: {
    display: "flex",
    justifyContent: "space-between",
  },
};

const ButtonBar = inject("store")(
  observer(
    class ButtonBar extends Component {
      constructor(props) {
        super(props);
        this.toggleHistory = this.toggleHistory.bind(this);
      }

      toggleHistory() {
        if (this.props.location.pathname.includes("/history")) {
          this.props.history.push(
            this.props.location.pathname.split("/history")[0],
          );
        } else {
          this.props.history.push(`${this.props.location.pathname}history/`);
        }
      }

      render() {
        return (
          <div style={styles.main} className="button-border-radius">
            <button
              className="button-link text-secondary"
              onClick={this.toggleHistory}
            >
              history
            </button>
          </div>
        );
      }
    },
  ),
);

export default ButtonBar;
