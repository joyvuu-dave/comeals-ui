import { Component } from "react";
import { inject, observer } from "mobx-react";

const styles = {
  main: {
    gridArea: "a3",
    display: "grid",
    gridTemplateRows: "1fr 4fr",
    border: "1px solid",
  },
  text: {
    height: "100%",
    resize: "none",
    opacity: "1",
    visibility: "visible",
    fontSize: "1.25rem",
    whiteSpace: "pre-wrap",
  },
};

class DebouncedTextarea extends Component {
  constructor(props) {
    super(props);
    this.state = { value: props.value || "" };
    this.timeout = null;
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.value !== this.props.value &&
      this.props.value !== this.state.value
    ) {
      this.setState({ value: this.props.value || "" });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleChange = (e) => {
    var val = e.target.value;
    this.setState({ value: val });
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.props.onChange(val);
    }, this.props.debounceTimeout || 700);
  };

  render() {
    return (
      <textarea
        value={this.state.value}
        onChange={this.handleChange}
        className={this.props.className}
        style={this.props.style}
        disabled={this.props.disabled}
        aria-label={this.props["aria-label"]}
      />
    );
  }
}

const MenuBox = inject("store")(
  observer(({ store }) => (
    <div style={styles.main} className="button-border-radius">
      <div className="flex space-between title">
        <h2 className="w-15">Menu</h2>
      </div>
      <div>
        <DebouncedTextarea
          debounceTimeout={700}
          className={store.editDescriptionMode ? "" : "offwhite"}
          style={styles.text}
          value={store.meal && store.meal.description}
          onChange={(val) => store.setDescription(val)}
          disabled={
            !store.editDescriptionMode || (store.meal && store.meal.closed)
          }
          aria-label="Enter meal description"
        />
      </div>
    </div>
  )),
);

export default MenuBox;
