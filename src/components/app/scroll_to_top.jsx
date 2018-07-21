import { Component } from "react";
import { withRouter } from "react-router-dom";

class ScrollToTop extends Component {
  componentDidUpdate(prevProps) {
    // Always scroll up when changing
    // between calendar and meal pages
    var pages = [];
    const currentPage = this.props.location.pathname.split("/");
    const prevPage = prevProps.location.pathname.split("/");

    pages.push(currentPage[1]);
    pages.push(prevPage[1]);

    if (pages.indexOf("calendar") !== -1 && pages.indexOf("meal") !== -1) {
      console.log("changing between calendar and meal");
      window.scrollTo(0, 0);
      return;
    }

    // DESKTOP
    if (window.innerWidth >= 825) {
      // don't scroll up when
      // switching months
      if (
        currentPage[1] === "calendar" &&
        prevPage[1] === "calendar" &&
        currentPage[2] === prevPage[2]
      ) {
        console.log("desktop: changing between calendar months");
        return;
      } else {
        console.log("desktop: not changing between calendar months");
        window.scrollTo(0, 0);
        return;
      }
    }

    // MOBILE
    if (window.innerWidth < 825) {
      console.log("mobile");
      return;
    }
  }

  render() {
    return this.props.children;
  }
}

export default withRouter(ScrollToTop);
