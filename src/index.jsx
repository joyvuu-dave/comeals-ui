import "./styles.css";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "mobx-react";
import Cookie from "js-cookie";
import VersionBanner from "./components/app/version_banner";
import ToastContainer from "./components/app/toast_container";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import { DataStore } from "./stores/data_store";

import ResidentsLogin from "./components/residents/login";
import PrivateRoute from "./components/app/private_route";

import ScrollToTop from "./components/app/scroll_to_top";

function TrailingSlash() {
  var location = useLocation();
  if (!location.pathname.endsWith("/")) {
    return <Navigate to={location.pathname + "/" + location.search} replace />;
  }
  return null;
}

function isAuthenticated() {
  return (
    typeof Cookie.get("token") !== "undefined" &&
    Cookie.get("token") !== "undefined" &&
    Cookie.get("token") !== undefined
  );
}

function lazyRetry(importFn) {
  return function () {
    return importFn().catch(function (err) {
      if (!sessionStorage.getItem("chunk_retry")) {
        sessionStorage.setItem("chunk_retry", "1");
        window.location.reload();
        return new Promise(function () {});
      }
      sessionStorage.removeItem("chunk_retry");
      throw err;
    });
  };
}

const Calendar = React.lazy(
  lazyRetry(function () {
    return import("./components/calendar/show");
  })
);

const MealsEdit = React.lazy(
  lazyRetry(function () {
    return import("./components/meals/edit");
  })
);

document.addEventListener("DOMContentLoaded", () => {
  const store = DataStore.create();

  window.addEventListener("load", function() {
    function updateOnlineStatus() {
      if (navigator.onLine) {
        console.warn(`back online at ${new Date().toLocaleTimeString()}`);
        store.setIsOnline(true);
        if (store.meal && store.meal.id) {
          store.loadDataAsync();
        }
        if (typeof Cookie.get("community_id") !== "undefined") {
          store.loadMonthAsync();
        }
      } else {
        console.warn(`offline at ${new Date().toLocaleTimeString()}`);
        store.setIsOnline(false);
      }
    }

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  });

  createRoot(document.getElementById("root")).render(
      <Provider store={store}>
        <ToastContainer />
        <Router>
          <VersionBanner />
          <TrailingSlash />
          <ScrollToTop>
            <Suspense fallback={<h3>Loading...</h3>}>
            <Routes>
              <Route
                path="/calendar/:type/:date/:modal?/:view?/:id?"
                element={
                  <PrivateRoute auth={isAuthenticated()}>
                    <Calendar />
                  </PrivateRoute>
                }
              />
              <Route
                path="/meals/:id/edit/*"
                element={
                  <PrivateRoute auth={isAuthenticated()}>
                    <MealsEdit />
                  </PrivateRoute>
                }
              />
              <Route path="/:modal?/:token?" element={<ResidentsLogin />} />
            </Routes>
            </Suspense>
          </ScrollToTop>
        </Router>
      </Provider>
  );
  // Unregister any leftover service worker from previous deploys.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      registrations.forEach(function (registration) {
        registration.unregister();
      });
    });
  }
});
