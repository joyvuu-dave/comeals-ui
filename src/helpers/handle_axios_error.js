import toastStore from "../stores/toast_store";

export default function handleAxiosError(error, options) {
  var silent = options && options.silent;
  if (error.response) {
    var data = error.response.data;
    if (data.message) {
      var toastType = data.type === "warning" ? "warning" : "error";
      if (silent) {
        console.error(data.message);
      } else {
        toastStore.replaceAll(data.message, toastType);
      }
      return toastType;
    } else {
      console.error("Bad response from server", error);
      return "error";
    }
  } else if (error.request) {
    if (silent) {
      console.error("Error: no response received from server.");
    } else {
      toastStore.replaceAll(
        "Error: no response received from server.",
        "error",
      );
    }
    return "error";
  } else {
    if (silent) {
      console.error("Error: could not submit form.");
    } else {
      toastStore.replaceAll("Error: could not submit form.", "error");
    }
    return "error";
  }
}
