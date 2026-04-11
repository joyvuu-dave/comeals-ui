import { makeAutoObservable } from "mobx";

class ToastStore {
  toasts = [];
  _nextId = 0;

  constructor() {
    makeAutoObservable(this);
  }

  addToast(message, type) {
    var isDuplicate = this.toasts.some(function (t) {
      return t.message === message && t.type === type;
    });
    if (isDuplicate) return;

    var id = ++this._nextId;
    this.toasts.push({
      id: id,
      message: message,
      type: type,
      timestamp: Date.now(),
    });
    return id;
  }

  removeToast(id) {
    this.toasts = this.toasts.filter(function (t) {
      return t.id !== id;
    });
  }

  clearAll() {
    this.toasts = [];
  }

  replaceAll(message, type) {
    var id = ++this._nextId;
    this.toasts = [
      { id: id, message: message, type: type, timestamp: Date.now() },
    ];
    return id;
  }
}

var toastStore = new ToastStore();
export default toastStore;
