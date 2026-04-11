import { Component } from "react";
import { observer } from "mobx-react";
import toastStore from "../../stores/toast_store";
import "../../toast.css";

var AUTO_DISMISS_MS = {
  success: 5000,
  info: 5000,
  warning: 8000,
  error: 15000,
};

var ToastContainer = observer(
  class ToastContainer extends Component {
    constructor(props) {
      super(props);
      this._timers = {};
    }

    componentDidMount() {
      this._setupTimers();
    }

    componentDidUpdate() {
      this._setupTimers();
    }

    _setupTimers() {
      var self = this;
      toastStore.toasts.forEach(function (toast) {
        if (!self._timers[toast.id]) {
          var delay = AUTO_DISMISS_MS[toast.type] || 5000;
          self._timers[toast.id] = setTimeout(function () {
            toastStore.removeToast(toast.id);
            delete self._timers[toast.id];
          }, delay);
        }
      });
    }

    componentWillUnmount() {
      var self = this;
      Object.keys(self._timers).forEach(function (id) {
        clearTimeout(self._timers[id]);
      });
    }

    handleDismiss(id) {
      if (this._timers[id]) {
        clearTimeout(this._timers[id]);
        delete this._timers[id];
      }
      toastStore.removeToast(id);
    }

    render() {
      if (toastStore.toasts.length === 0) {
        return null;
      }

      var self = this;
      return (
        <div className="toast-container" aria-relevant="additions">
          {toastStore.toasts.map(function (toast) {
            return (
              <div
                key={toast.id}
                className={"toast toast--" + toast.type}
                role="alert"
                aria-live="assertive"
              >
                <span className="toast__message">{toast.message}</span>
                <button
                  className="toast__dismiss"
                  onClick={function () {
                    self.handleDismiss(toast.id);
                  }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      );
    }
  },
);

export default ToastContainer;
