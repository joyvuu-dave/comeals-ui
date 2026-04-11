import { useNavigate, useParams, useLocation } from "react-router-dom";

export function withRouter(Component) {
  function ComponentWithRouter(props) {
    var navigate = useNavigate();
    var params = useParams();
    var location = useLocation();
    return (
      <Component
        {...props}
        navigate={navigate}
        params={params}
        location={location}
        history={{
          push: navigate,
          replace: function (to) {
            navigate(to, { replace: true });
          },
        }}
        match={{ params: params, url: location.pathname }}
      />
    );
  }
  ComponentWithRouter.displayName =
    "withRouter(" + (Component.displayName || Component.name) + ")";
  return ComponentWithRouter;
}
