import toastStore from "../stores/toast_store";

export default function handleAxiosError(error, options) {
  var silent = options && options.silent;
  if (error.response) {
    var data = error.response.data;
    if (data.message) {
      toastStore.addToast(data.message, "error");
    } else {
      console.error("Bad response from server", error);
    }
  } else if (error.request) {
    if (silent) {
      console.error("Error: no response received from server.");
    } else {
      toastStore.addToast("Error: no response received from server.", "error");
    }
  } else {
    if (silent) {
      console.error("Error: could not submit form.");
    } else {
      toastStore.addToast("Error: could not submit form.", "error");
    }
  }
}
