import React, { Component } from "react";
import { DayPicker } from "react-day-picker";
import dayjs from "dayjs";

class DayPickerInputWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    };
    this.wrapperRef = React.createRef();
    this.handleInputClick = this.handleInputClick.bind(this);
    this.handleDaySelect = this.handleDaySelect.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
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
      this.setState({ isOpen: false });
    }
  }

  handleInputClick() {
    if (this.props.inputDisabled) return;
    this.setState({ isOpen: true });
  }

  handleDaySelect(date) {
    if (!date) return;
    this.setState({ isOpen: false });
    if (this.props.onDayChange) {
      this.props.onDayChange(date);
    }
  }

  formatValue() {
    if (!this.props.value) return this.props.placeholder || "";
    return dayjs(this.props.value).format("MM/DD/YYYY");
  }

  render() {
    return (
      <div
        ref={this.wrapperRef}
        style={{ display: "inline-block", position: "relative" }}
      >
        <input
          type="text"
          readOnly
          disabled={this.props.inputDisabled}
          value={this.formatValue()}
          onClick={this.handleInputClick}
          placeholder={this.props.placeholder || ""}
        />
        {this.state.isOpen && (
          <div
            style={{
              position: "absolute",
              left: 0,
              zIndex: 1,
              background: "#fff",
              boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
            }}
          >
            <DayPicker
              mode="single"
              selected={
                this.props.value ? dayjs(this.props.value).toDate() : undefined
              }
              onSelect={this.handleDaySelect}
              defaultMonth={
                this.props.defaultMonth ||
                (this.props.value
                  ? dayjs(this.props.value).toDate()
                  : undefined)
              }
              disabled={this.props.disabledDays}
            />
          </div>
        )}
      </div>
    );
  }
}

export default DayPickerInputWrapper;
