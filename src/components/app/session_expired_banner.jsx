import { observer } from "mobx-react";

var styles = {
  banner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "0.75rem 1rem",
    backgroundColor: "#c0392b",
    color: "#fff",
    fontSize: "0.95rem",
  },
  button: {
    backgroundColor: "#fff",
    color: "#c0392b",
    border: "none",
    borderRadius: "4px",
    padding: "0.4rem 1rem",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.95rem",
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
  },
};

function SessionExpiredBanner({ store }) {
  if (!store.authExpired) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <span>Heads up — you've been signed out.</span>
      <button
        style={styles.button}
        onClick={function () {
          store.logout();
          window.location.href = "/";
        }}
      >
        Sign in
      </button>
    </div>
  );
}

export default observer(SessionExpiredBanner);
