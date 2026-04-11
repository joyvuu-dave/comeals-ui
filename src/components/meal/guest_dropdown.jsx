import React, { Component } from "react";
import Cow from "../../images/cow.png";
import Carrot from "../../images/carrot.png";

const styles = {
  topButton: {
    marginBottom: "1px",
  },
};

class GuestDropdown extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.wrapperRef = React.createRef();

    this.state = {
      open: false,
    };
  }

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClickOutside);
  }

  handleClickOutside(event) {
    if (
      this.wrapperRef.current &&
      !this.wrapperRef.current.contains(event.target)
    ) {
      this.setState({ open: false });
    }
  }

  handleClick() {
    this.setState((prevState) => {
      return { open: !prevState.open };
    });
  }

  render() {
    return (
      <div
        ref={this.wrapperRef}
        className={
          this.state.open
            ? "dropdown dropdown-left active"
            : "dropdown dropdown-left"
        }
        onClick={this.handleClick}
      >
        <button
          key={`dropdown_${this.props.resident.id}`}
          className="mar-r-sm"
          style={styles.topButton}
          disabled={this.props.reconciled || !this.props.canAdd}
        >
          <div
            className="dropdown-add"
            aria-label={`Add Guest of ${this.props.resident.name}`}
          />
        </button>
        <div className="dropdown-menu">
          <a
            onClick={() => this.props.resident.addGuest({ vegetarian: false })}
          >
            <img src={Cow} className="pointer" alt="cow-icon" />
          </a>
          <a onClick={() => this.props.resident.addGuest({ vegetarian: true })}>
            <img src={Carrot} className="pointer" alt="carrot-icon" />
          </a>
        </div>
      </div>
    );
  }
}

export default GuestDropdown;
