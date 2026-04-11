import { Navigate, useLocation } from "react-router-dom";
import Cookie from "js-cookie";

export default function PrivateRoute({ children }) {
  var location = useLocation();

  var token = Cookie.get("token");
  var isAuthenticated = typeof token !== "undefined" && token !== "undefined";

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
