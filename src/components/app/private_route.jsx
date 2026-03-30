import { Navigate, useLocation } from "react-router-dom";

export default function PrivateRoute({ auth, children }) {
  var location = useLocation();

  if (!auth) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
