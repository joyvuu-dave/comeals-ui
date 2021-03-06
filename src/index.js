import "./src/styles.css";
import React from "react";
import { render } from "react-dom";
import { Provider } from "mobx-react";
import Cookie from "js-cookie";
import registerServiceWorker from "./registerServiceWorker";
import Loadable from "react-loadable";

import {
  BrowserRouter as Router,
  Route,
  Switch,
  Redirect
} from "react-router-dom";

import { DataStore } from "./stores/data_store";

import ResidentsLogin from "./components/residents/login";
import PrivateRoute from "./components/app/private_route";

import ScrollToTop from "./components/app/scroll_to_top";

function isAuthenticated() {
  return (
    typeof Cookie.get("token") !== "undefined" &&
    Cookie.get("token") !== "undefined" &&
    Cookie.get("token") !== undefined
  );
}

function Loading({ error }) {
  if (error) {
    console.error(error);
    return "Error";
  } else {
    return <h3>Loading...</h3>;
  }
}

const Calendar = Loadable({
  loader: () => import("./components/calendar/show"),
  loading: Loading
});

const MealsEdit = Loadable({
  loader: () => import("./components/meals/edit"),
  loading: Loading
});

document.addEventListener("DOMContentLoaded", () => {
  const store = DataStore.create();

  window.addEventListener("load", function() {
    function updateOnlineStatus(event) {
      if (navigator.onLine) {
        console.log(`back online at ${new Date().toLocaleTimeString()}`);
        store.setIsOnline(true);
        if (store.meal && store.meal.id) {
          store.loadDataAsync();
        }
        if (typeof Cookie.get("community_id") !== "undefined") {
          store.loadMonthAsync();
        }
      } else {
        console.log(`offline at ${new Date().toLocaleTimeString()}`);
        store.setIsOnline(false);
      }
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  });

  render(
      <Provider store={store}>
        <Router>
          <ScrollToTop>
            <Switch>
              <Route
                exact
                strict
                path="/:url*"
                render={props => (
                  <Redirect to={`${props.location.pathname}/`} />
                )}
              />
              <PrivateRoute
                path="/calendar/:type/:date/:modal?/:view?/:id?"
                auth={isAuthenticated()}
                component={Calendar}
              />
              <PrivateRoute
                path="/meals/:id/edit"
                auth={isAuthenticated()}
                component={MealsEdit}
              />
              <Route path="/:modal?/:token?" component={ResidentsLogin} />
            </Switch>
          </ScrollToTop>
        </Router>
      </Provider>,
    document.getElementById("root")
  );
  registerServiceWorker();
});
