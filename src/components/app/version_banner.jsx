import React, { Component } from "react";

var POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

var styles = {
  banner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "0.75rem 1rem",
    backgroundColor: "#444",
    color: "#fff",
    fontSize: "0.95rem"
  },
  button: {
    backgroundColor: "#CCDEEA",
    color: "#444",
    border: "none",
    borderRadius: "4px",
    padding: "0.4rem 1rem",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.95rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center"
  }
};

class VersionBanner extends Component {
  constructor(props) {
    super(props);
    this.state = { updateAvailable: false };
    this._currentMainJs = null;
    this._intervalId = null;
  }

  componentDidMount() {
    // Derive the running app's main.js filename from the DOM rather than
    // a network fetch. This avoids a race condition: if a deploy finishes
    // between when the browser loaded index.html and when this component
    // mounts, a network-fetched baseline would reflect the new build while
    // the running code is old — the banner would never fire.
    var scripts = document.querySelectorAll('script[src*="/static/js/main."]');
    if (scripts.length > 0) {
      this._currentMainJs = scripts[0].getAttribute("src").replace(/^\//, "");
    }

    var self = this;
    this._intervalId = setInterval(function () {
      self.checkForUpdate();
    }, POLL_INTERVAL);
  }

  componentWillUnmount() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
    }
  }

  checkForUpdate() {
    if (!this._currentMainJs) {
      return;
    }

    var self = this;
    fetch("/asset-manifest.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch manifest");
        }
        return response.json();
      })
      .then(function (manifest) {
        if (manifest["main.js"] && manifest["main.js"] !== self._currentMainJs) {
          self.setState({ updateAvailable: true });
          clearInterval(self._intervalId);
        }
      })
      .catch(function () {
        // Silently ignore fetch failures (user might be briefly offline)
      });
  }

  render() {
    if (!this.state.updateAvailable) {
      return null;
    }

    return (
      <div style={styles.banner}>
        <span>A new version is available.</span>
        <button
          style={styles.button}
          onClick={function () {
            window.location.reload();
          }}
        >
          Refresh
        </button>
      </div>
    );
  }
}

export default VersionBanner;
