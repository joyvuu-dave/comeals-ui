# Plan: Replace window.alert() and window.confirm() with In-App Notifications

## Catalog of All Usages

**Note:** Line numbers below are approximate. Several files have been modified
since this catalog was compiled (loading state changes). During implementation,
search for `window.alert(` and `window.confirm(` in each file rather than
relying on line numbers.

### window.alert() calls (86 total)

| # | File | Line | Trigger | Message | Type |
|---|------|------|---------|---------|------|
| 1 | `src/stores/data_store.js` | 169 | Validation: closing meal when a cook has no cost set | `"All cook costs must be set before closing."` | Validation |
| 2 | `src/stores/data_store.js` | 207 | API error: PATCH toggle closed | `data.message` (server) | API error |
| 3 | `src/stores/data_store.js` | 215 | No response: PATCH toggle closed | `"Error: no response received from server."` | API error |
| 4 | `src/stores/data_store.js` | 218 | Request setup error: PATCH toggle closed | `"Error: could not submit form."` | API error |
| 5 | `src/stores/data_store.js` | 252 | API error: PATCH submit description | `data.message` (server) | API error |
| 6 | `src/stores/data_store.js` | 260 | No response: PATCH submit description | `"Error: no response received from server."` | API error |
| 7 | `src/stores/data_store.js` | 263 | Request setup error: PATCH submit description | `"Error: could not submit form."` | API error |
| 8 | `src/stores/data_store.js` | 313 | API error: PATCH submit bills | `data.message` (server) | API error |
| 9 | `src/stores/data_store.js` | 321 | No response: PATCH submit bills | `"Error: no response received from server."` | API error |
| 10 | `src/stores/data_store.js` | 324 | Request setup error: PATCH submit bills | `"Error: could not submit form."` | API error |
| 11 | `src/stores/data_store.js` | 349 | API error: GET loadDataAsync (meal cooks) | `data.message` (server) | API error |
| 12 | `src/stores/data_store.js` | 390 | API error: GET loadMonthAsync (calendar) | `data.message` (server) | API error |
| 13 | `src/stores/data_store.js` | 422 | API error: GET loadNext (next meal) | `data.message` (server) | API error |
| 14 | `src/stores/data_store.js` | 455 | API error: GET loadPrev (prev meal) | `data.message` (server) | API error |
| 15 | `src/stores/resident.js` | 187 | API error: POST toggleAttending (add) | `data.message` (server) | API error |
| 16 | `src/stores/resident.js` | 195 | No response: POST toggleAttending (add) | `"Error: no response received from server."` | API error |
| 17 | `src/stores/resident.js` | 198 | Request setup error: POST toggleAttending (add) | `"Error: could not submit form."` | API error |
| 18 | `src/stores/resident.js` | 231 | API error: DELETE toggleAttending (remove) | `data.message` (server) | API error |
| 19 | `src/stores/resident.js` | 239 | No response: DELETE toggleAttending (remove) | `"Error: no response received from server."` | API error |
| 20 | `src/stores/resident.js` | 242 | Request setup error: DELETE toggleAttending (remove) | `"Error: could not submit form."` | API error |
| 21 | `src/stores/resident.js` | 276 | API error: PATCH toggleLate | `data.message` (server) | API error |
| 22 | `src/stores/resident.js` | 284 | No response: PATCH toggleLate | `"Error: no response received from server."` | API error |
| 23 | `src/stores/resident.js` | 287 | Request setup error: PATCH toggleLate | `"Error: could not submit form."` | API error |
| 24 | `src/stores/resident.js` | 320 | API error: PATCH toggleVeg | `data.message` (server) | API error |
| 25 | `src/stores/resident.js` | 328 | No response: PATCH toggleVeg | `"Error: no response received from server."` | API error |
| 26 | `src/stores/resident.js` | 331 | Request setup error: PATCH toggleVeg | `"Error: could not submit form."` | API error |
| 27 | `src/stores/resident.js` | 368 | API error: POST addGuest | `data.message` (server) | API error |
| 28 | `src/stores/resident.js` | 376 | No response: POST addGuest | `"Error: no response received from server."` | API error |
| 29 | `src/stores/resident.js` | 379 | Request setup error: POST addGuest | `"Error: could not submit form."` | API error |
| 30 | `src/stores/resident.js` | 424 | API error: DELETE removeGuest | `data.message` (server) | API error |
| 31 | `src/stores/resident.js` | 432 | No response: DELETE removeGuest | `"Error: no response received from server."` | API error |
| 32 | `src/stores/resident.js` | 435 | Request setup error: DELETE removeGuest | `"Error: could not submit form."` | API error |
| 33 | `src/stores/meal.js` | 73 | API error: PATCH setExtras (null) | `data.message` (server) | API error |
| 34 | `src/stores/meal.js` | 81 | No response: PATCH setExtras (null) | `"Error: no response received from server."` | API error |
| 35 | `src/stores/meal.js` | 84 | Request setup error: PATCH setExtras (null) | `"Error: could not submit form."` | API error |
| 36 | `src/stores/meal.js` | 115 | API error: PATCH setExtras (number) | `data.message` (server) | API error |
| 37 | `src/stores/meal.js` | 123 | No response: PATCH setExtras (number) | `"Error: no response received from server."` | API error |
| 38 | `src/stores/meal.js` | 126 | Request setup error: PATCH setExtras (number) | `"Error: could not submit form."` | API error |
| 39 | `src/components/residents/login.jsx` | 110 | API error: POST login | `data.message` (server) | API error |
| 40 | `src/components/residents/login.jsx` | 115 | No response: POST login | `"Error: no response received from server."` | API error |
| 41 | `src/components/residents/login.jsx` | 117 | Request setup error: POST login | `"Error: could not submit form."` | API error |
| 42 | `src/components/residents/password_reset.jsx` | 27 | Success: POST password reset request | `response.data.message` (server) | Success |
| 43 | `src/components/residents/password_reset.jsx` | 37 | API error: POST password reset request | `data.message` (server) | API error |
| 44 | `src/components/residents/password_reset.jsx` | 42 | No response: POST password reset request | `"Error: no response received from server."` | API error |
| 45 | `src/components/residents/password_reset.jsx` | 44 | Request setup error: POST password reset request | `"Error: could not submit form."` | API error |
| 46 | `src/components/residents/password_new.jsx` | 31 | API error: GET name by reset token (componentDidMount) | `data.message` (server) | API error |
| 47 | `src/components/residents/password_new.jsx` | 58 | Success: POST set new password | `response.data.message` (server) | Success |
| 48 | `src/components/residents/password_new.jsx` | 67 | API error: POST set new password | `data.message` (server) | API error |
| 49 | `src/components/residents/password_new.jsx` | 72 | No response: POST set new password | `"Error: no response received from server."` | API error |
| 50 | `src/components/residents/password_new.jsx` | 75 | Request setup error: POST set new password | `"Error: could not submit form."` | API error |
| 51 | `src/components/calendar/side_bar.jsx` | 56 | API error: GET next meal | `data.message` (server) | API error |
| 52 | `src/components/calendar/webcal_links.jsx` | 39 | API error: GET resident id | `data.message` (server) | API error |
| 53 | `src/components/rotations/show.jsx` | 44 | API error: GET rotation | `data.message` (server) | API error |
| 54 | `src/components/history/show.jsx` | 39 | API error: GET meal history | `data.message` (server) | API error |
| 55 | `src/components/guest_room_reservations/new.jsx` | 46 | API error: GET hosts (componentDidMount) | `data.message` (server) | API error |
| 56 | `src/components/guest_room_reservations/new.jsx` | 80 | API error: POST create reservation | `data.message` (server) | API error |
| 57 | `src/components/guest_room_reservations/new.jsx` | 85 | No response: POST create reservation | `"Error: no response received from server."` | API error |
| 58 | `src/components/guest_room_reservations/new.jsx` | 87 | Request setup error: POST create reservation | `"Error: could not submit form."` | API error |
| 59 | `src/components/guest_room_reservations/edit.jsx` | 49 | API error: GET reservation (componentDidMount) | `data.message` (server) | API error |
| 60 | `src/components/guest_room_reservations/edit.jsx` | 86 | API error: PATCH update reservation | `data.message` (server) | API error |
| 61 | `src/components/guest_room_reservations/edit.jsx` | 91 | No response: PATCH update reservation | `"Error: no response received from server."` | API error |
| 62 | `src/components/guest_room_reservations/edit.jsx` | 93 | Request setup error: PATCH update reservation | `"Error: could not submit form."` | API error |
| 63 | `src/components/guest_room_reservations/edit.jsx` | 116 | API error: DELETE reservation | `data.message` (server) | API error |
| 64 | `src/components/guest_room_reservations/edit.jsx` | 121 | No response: DELETE reservation | `"Error: no response received from server."` | API error |
| 65 | `src/components/guest_room_reservations/edit.jsx` | 123 | Request setup error: DELETE reservation | `"Error: could not submit form."` | API error |
| 66 | `src/components/common_house_reservations/new.jsx` | 50 | API error: GET hosts (componentDidMount) | `data.message` (server) | API error |
| 67 | `src/components/common_house_reservations/new.jsx` | 92 | API error: POST create reservation | `data.message` (server) | API error |
| 68 | `src/components/common_house_reservations/new.jsx` | 97 | No response: POST create reservation | `"Error: no response received from server."` | API error |
| 69 | `src/components/common_house_reservations/new.jsx` | 99 | Request setup error: POST create reservation | `"Error: could not submit form."` | API error |
| 70 | `src/components/common_house_reservations/edit.jsx` | 69 | API error: GET reservation (componentDidMount) | `data.message` (server) | API error |
| 71 | `src/components/common_house_reservations/edit.jsx` | 114 | API error: PATCH update reservation | `data.message` (server) | API error |
| 72 | `src/components/common_house_reservations/edit.jsx` | 119 | No response: PATCH update reservation | `"Error: no response received from server."` | API error |
| 73 | `src/components/common_house_reservations/edit.jsx` | 121 | Request setup error: PATCH update reservation | `"Error: could not submit form."` | API error |
| 74 | `src/components/common_house_reservations/edit.jsx` | 144 | API error: DELETE reservation | `data.message` (server) | API error |
| 75 | `src/components/common_house_reservations/edit.jsx` | 149 | No response: DELETE reservation | `"Error: no response received from server."` | API error |
| 76 | `src/components/common_house_reservations/edit.jsx` | 151 | Request setup error: DELETE reservation | `"Error: could not submit form."` | API error |
| 77 | `src/components/events/new.jsx` | 60 | API error: POST create event | `data.message` (server) | API error |
| 78 | `src/components/events/new.jsx` | 65 | No response: POST create event | `"Error: no response received from server."` | API error |
| 79 | `src/components/events/new.jsx` | 67 | Request setup error: POST create event | `"Error: could not submit form."` | API error |
| 80 | `src/components/events/edit.jsx` | 69 | API error: GET event (componentDidMount) | `data.message` (server) | API error |
| 81 | `src/components/events/edit.jsx` | 112 | API error: PATCH update event | `data.message` (server) | API error |
| 82 | `src/components/events/edit.jsx` | 117 | No response: PATCH update event | `"Error: no response received from server."` | API error |
| 83 | `src/components/events/edit.jsx` | 119 | Request setup error: PATCH update event | `"Error: could not submit form."` | API error |
| 84 | `src/components/events/edit.jsx` | 142 | API error: DELETE event | `data.message` (server) | API error |
| 85 | `src/components/events/edit.jsx` | 147 | No response: DELETE event | `"Error: no response received from server."` | API error |
| 86 | `src/components/events/edit.jsx` | 149 | Request setup error: DELETE event | `"Error: could not submit form."` | API error |

### window.confirm() calls (3 total)

| # | File | Line | Trigger | Message |
|---|------|------|---------|---------|
| 1 | `src/components/events/edit.jsx` | 125 | Delete button click | `"Do you really want to delete this event?"` |
| 2 | `src/components/guest_room_reservations/edit.jsx` | 99 | Delete button click | `"Do you really want to delete this reservation?"` |
| 3 | `src/components/common_house_reservations/edit.jsx` | 127 | Delete button click | `"Do you really want to delete this reservation?"` |


## Categories of Usage

### Category 1: API Error Messages (83 occurrences)

By far the largest category. Every axios call in the codebase follows the same three-branch error handler pattern:

```js
.catch(function(error) {
  if (error.response) {
    const data = error.response.data;
    if (data.message) {
      window.alert(data.message);        // Branch A: server returned an error message
    } else {
      console.error("Bad response from server", error);
    }
  } else if (error.request) {
    window.alert("Error: no response received from server.");  // Branch B: no response
  } else {
    window.alert("Error: could not submit form.");             // Branch C: request setup failed
  }
});
```

This exact pattern (or a slight variation where branches B and C use `console.error` instead of `window.alert`) is copy-pasted across every file. The files where branches B and C use `console.error` instead of `window.alert` are:
- `src/stores/data_store.js` (loadDataAsync, loadMonthAsync, loadNext, loadPrev)
- `src/components/calendar/side_bar.jsx` (openNextMeal)
- `src/components/calendar/webcal_links.jsx` (componentDidMount)
- `src/components/rotations/show.jsx` (componentDidMount)
- `src/components/history/show.jsx` (componentDidMount)
- `src/components/guest_room_reservations/new.jsx` (componentDidMount)
- `src/components/common_house_reservations/new.jsx` (componentDidMount)
- `src/components/events/edit.jsx` (componentDidMount)
- `src/components/guest_room_reservations/edit.jsx` (componentDidMount)
- `src/components/common_house_reservations/edit.jsx` (componentDidMount)

In all of these, branch A still uses `window.alert(data.message)`.

Some catch blocks also contain **rollback logic** before the error handling (e.g., reverting optimistic updates in `resident.js` and `meal.js`). The error display logic is independent of the rollback logic and can be extracted separately.

### Category 2: Validation Messages (1 occurrence)

| File | Line | Message |
|------|------|---------|
| `src/stores/data_store.js` | 169 | `"All cook costs must be set before closing."` |

This is a client-side validation check in `toggleClosed()`. It fires before any API call is made. It prevents the meal from being closed when a cook has not entered their cost.

### Category 3: Success Messages (2 occurrences)

| File | Line | Context | Message |
|------|------|---------|---------|
| `src/components/residents/password_reset.jsx` | 27 | Password reset email sent successfully | `response.data.message` (from server, e.g., "Check your email") |
| `src/components/residents/password_new.jsx` | 58 | New password saved successfully | `response.data.message` (from server, e.g., "Password updated") |

Both occur inside `.then()` handlers for successful responses. After showing the alert, both redirect to `/` via `self.props.history.push("/")`.

### Category 4: Delete Confirmations (3 occurrences)

| File | Line | Message |
|------|------|---------|
| `src/components/events/edit.jsx` | 125 | `"Do you really want to delete this event?"` |
| `src/components/guest_room_reservations/edit.jsx` | 99 | `"Do you really want to delete this reservation?"` |
| `src/components/common_house_reservations/edit.jsx` | 127 | `"Do you really want to delete this reservation?"` |

All three follow the same structure: `if (window.confirm("...")) { axios.delete(...) }`. The delete only proceeds if the user clicks OK.


## Replacement Approach

### For Alerts/Errors/Success (Categories 1-3): Toast Component

**Recommendation: Option A -- Build a simple toast component from scratch.**

Reasoning:
- The project uses its own CSS based on Shoelace 2.0 and avoids heavy dependencies. The user profile notes a preference for stability over modern patterns.
- `react-hot-toast` (41 kB) and `react-toastify` (59 kB) both add dependency weight and bring their own styling systems that would need to be overridden to match the existing look.
- The requirements are simple: show a colored bar with a message, auto-dismiss or persist, stack multiple toasts. This is roughly 80-120 lines of component code and 40-50 lines of CSS.
- No additional npm dependencies to maintain or worry about breaking on React upgrades.

#### Toast Component Design

**State management:** Create a lightweight standalone store (not part of the MobX-State-Tree DataStore) so that toasts can be triggered from anywhere -- including MobX store actions, React components, and a shared axios error handler. The simplest approach is a plain MobX observable:

```
src/stores/toast_store.js
```

- `toasts`: observable array of `{ id, message, type, timestamp }`
- `addToast(message, type)`: push a new toast, return its id
- `removeToast(id)`: remove by id
- `type` is one of: `"error"`, `"success"`, `"warning"`, `"info"`

The project uses MobX 6.13.7, which requires `makeAutoObservable(this)` in the
constructor. Example skeleton:

```js
import { makeAutoObservable } from "mobx";

class ToastStore {
  toasts = [];
  _nextId = 0;

  constructor() {
    makeAutoObservable(this);
  }

  addToast(message, type) {
    var id = ++this._nextId;
    this.toasts.push({ id, message, type, timestamp: Date.now() });
    return id;
  }

  removeToast(id) {
    this.toasts = this.toasts.filter(function(t) { return t.id !== id; });
  }
}

var toastStore = new ToastStore();
export default toastStore;
```

The store is a singleton exported as a module-level instance. It does not live inside DataStore because:
1. Toast state is UI-only (not app data).
2. The axios error handler utility needs to call `addToast()` without having a reference to the DataStore.
3. It keeps the DataStore from growing even larger.

**React component:**

```
src/components/app/toast_container.jsx
```

- Observes the toast store via `mobx-react` observer.
- Renders a fixed-position container in the top-right corner.
- Each toast is a div with role="alert" and aria-live="assertive".
- Error toasts: red background, persist until dismissed (show an X button), or auto-dismiss after 15 seconds.
- Success toasts: green background, auto-dismiss after 5 seconds.
- Warning/info toasts: yellow/blue background, auto-dismiss after 5 seconds.
- Toasts stack vertically (newest on top).
- Each toast has a dismiss button (X icon or text).

**CSS:**

```
src/toast.css (imported by toast_container.jsx)
```

- `.toast-container`: `position: fixed; top: 1rem; right: 1rem; z-index: 10001;` (above the modal overlay at 10000, above sticky headers at 9999).
- `.toast`: base styles with padding, border-radius, margin-bottom, box-shadow, transition for slide-in.
- `.toast--error`: `background-color: #c0392b; color: #fff;`
- `.toast--success`: `background-color: #2ecc40; color: #fff;` (reuses `--color-green` from existing CSS vars).
- `.toast--warning`: `background-color: #e9c46a; color: #333;` (reuses `--hasana-yellow`).
- `.toast--info`: `background-color: #3498db; color: #fff;`

**Mounting point:** Add `<ToastContainer />` once in `src/index.jsx`, inside the `<Provider>` but outside the `<Router>`, so it renders on every page including the login page.

#### Auto-dismiss Timing

| Type | Auto-dismiss | Rationale |
|------|-------------|-----------|
| Success | 5 seconds | User just needs brief confirmation |
| Info | 5 seconds | Informational, not critical |
| Warning | 8 seconds | Slightly more important |
| Error | 15 seconds (with manual dismiss button always visible) | User needs time to read; clicking dismiss always available |

### For Confirmations (Category 4): Confirmation Modal

**Recommendation: Reuse the existing `react-modal` setup.**

The project already depends on `react-modal` (used in `login.jsx` for password reset modals). The calendar modals also use `ReactModal__Overlay--after-open` with `z-index: 10000`. A confirmation modal can share the same dependency.

#### Confirmation Modal Design

```
src/components/app/confirm_modal.jsx
```

- A generic confirmation modal component.
- Props: `isOpen`, `message`, `onConfirm`, `onCancel`.
- Renders a `react-modal` with the confirmation message, a "Cancel" button, and a "Delete" (or "Confirm") button styled with `button-warning`.
- Uses the same `react-modal` styling/z-index conventions already in the project.

**Usage pattern in delete handlers:**

The three edit forms already use a `loadingAction` state (added in the form
loading states plan). The confirmation modal must integrate with it.

Currently (after loading state changes):
```js
handleDelete() {
  if (this.state.loadingAction) return;
  if (window.confirm("Do you really want to delete this event?")) {
    this.setState({ loadingAction: "delete" });
    var self = this;
    axios.delete(...)
      .then(function(response) {
        self.setState({ loadingAction: null });
        // ...
      })
      .catch(function(error) {
        self.setState({ loadingAction: null });
        // ...
      });
  }
}
```

After:
```js
// Component state: add confirmDeleteOpen: false

handleDeleteClick() {
  if (this.state.loadingAction) return;
  this.setState({ confirmDeleteOpen: true });
}

handleDeleteConfirm() {
  this.setState({ confirmDeleteOpen: false, loadingAction: "delete" });
  var self = this;
  axios.delete(...)
    .then(function(response) {
      self.setState({ loadingAction: null });
      // ... (existing success logic)
    })
    .catch(function(error) {
      self.setState({ loadingAction: null });
      handleAxiosError(error);
    });
}

handleDeleteCancel() {
  this.setState({ confirmDeleteOpen: false });
}

// In render:
<ConfirmModal
  isOpen={this.state.confirmDeleteOpen}
  message="Do you really want to delete this event?"
  onConfirm={this.handleDeleteConfirm}
  onCancel={this.handleDeleteCancel}
/>
```

The `loadingAction` guard moves to `handleDeleteClick` (don't open the modal if
a submit/delete is already in flight). Setting `loadingAction: "delete"` moves
to `handleDeleteConfirm` (set it when the user actually confirms, not when the
modal opens). The `.then()` and `.catch()` clearing of `loadingAction` is
preserved exactly as implemented.

This avoids promise-based patterns and stays consistent with the class
component / callback style used throughout the codebase. Each of the three edit
components gets a `confirmDeleteOpen` state field plus two extra handler
methods.


## Implementation with the Shared Axios Error Handler

This plan directly addresses the `todo.md` item: "Extract shared axios error handler; replace window.alert() with toast/notification UI". The two tasks are done together because the shared error handler's job is to call the toast system.

### Shared Error Handler Utility

```
src/helpers/handle_axios_error.js
```

```js
import toastStore from "../stores/toast_store";

export default function handleAxiosError(error, options) {
  var silent = options && options.silent;
  if (error.response) {
    const data = error.response.data;
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
```

The `silent` option controls branches B and C only (no response / request setup
error). Branch A (server returned an error message) always shows a toast because
the server explicitly sent a message for the user. The `silent` option preserves
the existing behavior of files that intentionally use `console.error` for
branches B and C.

**Important:** The goal is to replicate existing behavior exactly. If a call site
currently uses `console.error`, it must stay as `console.error`. If it currently
uses `window.alert`, it becomes a toast. No errors should be newly surfaced.

### Which files use `silent: true`

These files currently use `console.error` (not `window.alert`) for branches B
and C. They must call `handleAxiosError(error, { silent: true })`:

- `src/stores/data_store.js` — `loadDataAsync`, `loadMonthAsync`, `loadNext`,
  `loadPrev` (GET requests for loading data)
- `src/components/calendar/side_bar.jsx` — `openNextMeal` (GET)
- `src/components/calendar/webcal_links.jsx` — `componentDidMount` (GET)
- `src/components/rotations/show.jsx` — `componentDidMount` (GET)
- `src/components/history/show.jsx` — `componentDidMount` (GET)
- `src/components/guest_room_reservations/new.jsx` — `componentDidMount` (GET)
- `src/components/guest_room_reservations/edit.jsx` — `componentDidMount` (GET)
- `src/components/common_house_reservations/new.jsx` — `componentDidMount` (GET)
- `src/components/common_house_reservations/edit.jsx` — `componentDidMount` (GET)
- `src/components/events/edit.jsx` — `componentDidMount` (GET)
- `src/components/residents/password_new.jsx` — `componentDidMount` (GET)

All other call sites use `handleAxiosError(error)` (no options) to show toasts
for all three branches, matching the current `window.alert` behavior.

**Special case — `password_new.jsx` componentDidMount:** This catch block has
custom redirect logic (`self.props.history.push("/")`) inside the
`if (error.response)` branch that runs after the alert. This redirect must be
preserved as additional logic after the handler call:

```js
.catch(function(error) {
  handleAxiosError(error, { silent: true });
  if (error.response) {
    self.props.history.push("/");
  }
});
```

### How Catch Blocks Change

**Before (form submit pattern — all three branches alert):**
```js
.catch(function(error) {
  if (!isAlive(self)) return;
  self.setLate(!val);                       // <-- rollback logic (stays)

  if (error.response) {
    const data = error.response.data;
    if (data.message) {
      window.alert(data.message);
    } else {
      console.error("Bad response from server", error);
    }
  } else if (error.request) {
    window.alert("Error: no response received from server.");
  } else {
    window.alert("Error: could not submit form.");
  }
});
```

**After:**
```js
.catch(function(error) {
  if (!isAlive(self)) return;
  self.setLate(!val);                       // <-- rollback logic (stays)
  handleAxiosError(error);                  // <-- one line replaces 12
});
```

**Before (data loading pattern — branches B/C use console.error):**
```js
.catch(function(error) {
  if (error.response) {
    const data = error.response.data;
    if (data.message) {
      window.alert(data.message);
    } else {
      console.error("Bad response from server", error);
    }
  } else if (error.request) {
    console.error("Error: No response from server.", error.request);
  } else {
    console.error("Error: Could not retrieve data.", error.message);
  }
});
```

**After:**
```js
.catch(function(error) {
  handleAxiosError(error, { silent: true });
});
```

The rollback logic (reverting optimistic updates, re-incrementing extras, etc.)
stays in each individual catch block. Only the error display logic is extracted.

### Axios Interceptor: Not Recommended

An axios response interceptor (`axios.interceptors.response.use`) would be simpler but is wrong here because:
1. Many catch blocks need custom rollback logic *before* the error display. An interceptor would fire before the catch block has a chance to roll back.
2. Some catch blocks intentionally use `console.error` instead of `window.alert` for branches B and C (e.g., `loadDataAsync`, `loadMonthAsync`). A blanket interceptor would change that behavior.
3. The explicit `handleAxiosError(error)` call in each catch block makes the intent clear and is easy to audit.


## Phasing

### Phase 1: Build the Toast System (foundation)

1. Create `src/stores/toast_store.js` -- MobX observable singleton.
2. Create `src/components/app/toast_container.jsx` -- React observer component.
3. Create `src/toast.css` -- toast styles.
4. Mount `<ToastContainer />` in `src/index.jsx`.
5. Manual smoke test: import `toastStore` in browser console or a temp button, verify toasts appear, auto-dismiss, and stack correctly.

**No existing behavior changes yet.** The old `window.alert()` calls still work. This phase is additive only.

### Phase 2: Build the Confirmation Modal

1. Create `src/components/app/confirm_modal.jsx`.
2. Manual test: render it from one of the edit components to verify it opens and closes.

**No existing behavior changes yet.**

### Phase 3: Extract the Shared Axios Error Handler

1. Create `src/helpers/handle_axios_error.js` that calls `toastStore.addToast()`.
2. Write a unit test for `handleAxiosError` confirming it adds toasts for each of the three error branches.

**No existing behavior changes yet.**

### Phase 4: Replace window.alert() Calls

Work file-by-file. For each file:
1. Import `handleAxiosError` (or `toastStore` directly for non-error cases).
2. Replace the 10-12 line error handler block with `handleAxiosError(error)`.
3. For success messages (password_reset.jsx line 27, password_new.jsx line 58): replace `window.alert(response.data.message)` with `toastStore.addToast(response.data.message, "success")`.
4. For the validation message (data_store.js line 169): replace `window.alert("All cook costs must be set before closing.")` with `toastStore.addToast("All cook costs must be set before closing.", "warning")`.
5. Verify no remaining `window.alert(` calls in `src/`.

Recommended order within this phase (stores first, then components, smallest
files first). Files marked with **(silent)** have `componentDidMount` or data
loading catch blocks that must use `handleAxiosError(error, { silent: true })`
to preserve existing `console.error` behavior for branches B and C:

1. `src/stores/meal.js` (6 alert calls, 2 catch blocks)
2. `src/stores/resident.js` (18 alert calls, 6 catch blocks)
3. `src/stores/data_store.js` (14 alert calls, 1 validation + 7 catch blocks) **(silent for loadDataAsync, loadMonthAsync, loadNext, loadPrev)**
4. `src/components/calendar/webcal_links.jsx` (1 alert call) **(silent)**
5. `src/components/calendar/side_bar.jsx` (1 alert call) **(silent)**
6. `src/components/rotations/show.jsx` (1 alert call) **(silent)**
7. `src/components/history/show.jsx` (1 alert call) **(silent)**
8. `src/components/residents/login.jsx` (3 alert calls)
9. `src/components/residents/password_reset.jsx` (4 alert calls, 1 is success)
10. `src/components/residents/password_new.jsx` (5 alert calls, 1 is success) **(silent for componentDidMount; componentDidMount also has redirect logic — see note below)**
11. `src/components/events/new.jsx` (3 alert calls)
12. `src/components/events/edit.jsx` (7 alert calls) **(silent for componentDidMount)**
13. `src/components/guest_room_reservations/new.jsx` (4 alert calls) **(silent for componentDidMount)**
14. `src/components/guest_room_reservations/edit.jsx` (7 alert calls) **(silent for componentDidMount)**
15. `src/components/common_house_reservations/new.jsx` (4 alert calls) **(silent for componentDidMount)**
16. `src/components/common_house_reservations/edit.jsx` (8 alert calls) **(silent for componentDidMount)**

### Phase 5: Replace window.confirm() Calls

For each of the three edit components:
1. Import `ConfirmModal`.
2. Add `confirmDeleteOpen: false` to component state (alongside existing
   `loadingAction: null`).
3. Split `handleDelete` into `handleDeleteClick`, `handleDeleteConfirm`,
   `handleDeleteCancel`. **Preserve the `loadingAction` guard and state
   transitions** — see the pattern in the "Confirmation Modal Design" section
   above. The `loadingAction: "delete"` set, `.then()` clear, and `.catch()`
   clear must all be kept.
4. Replace the error handling in the delete `.catch()` with
   `handleAxiosError(error)` (if not already done in Phase 4).
5. Add `<ConfirmModal>` to the render method.
6. Update the Delete button's `onClick` to call `handleDeleteClick`.

Files:
1. `src/components/events/edit.jsx`
2. `src/components/guest_room_reservations/edit.jsx`
3. `src/components/common_house_reservations/edit.jsx`


## Files to Change

### New Files (4)

| File | Purpose |
|------|---------|
| `src/stores/toast_store.js` | MobX observable toast state singleton |
| `src/components/app/toast_container.jsx` | Toast rendering component |
| `src/toast.css` | Toast styles |
| `src/components/app/confirm_modal.jsx` | Reusable confirmation modal |

### New Files (1, utility)

| File | Purpose |
|------|---------|
| `src/helpers/handle_axios_error.js` | Shared axios error handler |

### Modified Files (17)

| File | Changes |
|------|---------|
| `src/index.jsx` | Import and mount `<ToastContainer />` |
| `src/stores/data_store.js` | Import `handleAxiosError` and `toastStore`; replace 7 error handler blocks + 1 validation alert |
| `src/stores/resident.js` | Import `handleAxiosError`; replace 6 error handler blocks |
| `src/stores/meal.js` | Import `handleAxiosError`; replace 2 error handler blocks |
| `src/components/residents/login.jsx` | Import `handleAxiosError`; replace 1 error handler block |
| `src/components/residents/password_reset.jsx` | Import `handleAxiosError` and `toastStore`; replace 1 error handler block + 1 success alert |
| `src/components/residents/password_new.jsx` | Import `handleAxiosError` and `toastStore`; replace 2 error handler blocks + 1 success alert |
| `src/components/calendar/side_bar.jsx` | Import `handleAxiosError`; replace 1 error handler block |
| `src/components/calendar/webcal_links.jsx` | Import `handleAxiosError`; replace 1 error handler block |
| `src/components/rotations/show.jsx` | Import `handleAxiosError`; replace 1 error handler block |
| `src/components/history/show.jsx` | Import `handleAxiosError`; replace 1 error handler block |
| `src/components/events/new.jsx` | Import `handleAxiosError`; replace 1 error handler block |
| `src/components/events/edit.jsx` | Import `handleAxiosError` and `ConfirmModal`; replace 3 error handler blocks + convert confirm to modal |
| `src/components/guest_room_reservations/new.jsx` | Import `handleAxiosError`; replace 2 error handler blocks |
| `src/components/guest_room_reservations/edit.jsx` | Import `handleAxiosError` and `ConfirmModal`; replace 3 error handler blocks + convert confirm to modal |
| `src/components/common_house_reservations/new.jsx` | Import `handleAxiosError`; replace 2 error handler blocks |
| `src/components/common_house_reservations/edit.jsx` | Import `handleAxiosError` and `ConfirmModal`; replace 3 error handler blocks + convert confirm to modal |


## Risks

### Timing: Toasts That Auto-Dismiss Might Hide Important Errors

**Risk:** An error toast dismisses before the user reads it, especially on a slow connection where errors fire rapidly.

**Mitigation:** Error toasts have a 15-second timeout (compared to 5 seconds for success). They also have a visible dismiss button, making it clear they are interactive. If needed, the timeout can be increased or error toasts can be made fully persistent (no auto-dismiss) in a follow-up.

### Accessibility: Toasts Need ARIA Live Regions

**Risk:** Screen readers may not announce dynamically-added toasts.

**Mitigation:** Each toast element will use `role="alert"` and `aria-live="assertive"`. The toast container will use `aria-relevant="additions"`. The confirmation modal inherits accessibility from `react-modal`, which already handles focus trapping and aria attributes.

### Z-Index Stacking

**Risk:** The existing codebase uses specific z-index values:
- `.sticky-header`: `z-index: 9999`
- `.ReactModal__Overlay--after-open`: `z-index: 10000`
- Toast container needs to appear above both.

**Mitigation:** Toast container uses `z-index: 10001`. This means toasts will appear above open modals, which is the correct behavior (e.g., if a delete API call fails while a modal is open, the error toast should be visible on top of the modal).

### Confirmation Modal Nesting

**Risk:** The three edit components that need confirmation modals are themselves rendered inside a `react-modal` (the calendar's event detail modal). This means the confirmation modal is a modal-inside-a-modal.

**Mitigation:** `react-modal` supports stacking out of the box. The confirmation modal will use its own `ReactModal` instance. Because the outer modal has `z-index: 10000` and the confirmation can use the same or a slightly higher value through react-modal's default stacking, this should work without additional z-index manipulation.

### MobX Store Actions Calling Toast Store

**Risk:** MobX-State-Tree actions in `data_store.js`, `resident.js`, and `meal.js` would be calling a plain MobX observable (`toast_store.js`) from inside MST actions. This is valid but worth noting: the toast store intentionally lives outside the MST tree.

**Mitigation:** This is a deliberate design choice. The `handleAxiosError` utility function (called from within `.catch()` callbacks, which are already outside the MST action context) will interact with the toast store. Since `.catch()` callbacks in the existing code already call `window.alert()` (a side effect outside MST), replacing that with `toastStore.addToast()` is the same pattern.

### Password Reset Flow: Alert-Then-Navigate

**Risk:** In `password_reset.jsx` (line 27) and `password_new.jsx` (line 58), the current code shows `window.alert()` (which blocks) and then immediately calls `self.props.history.push("/")`. With a non-blocking toast, the user will be navigated to `/` instantly and the toast will need to persist across the route change.

**Mitigation:** Because the toast container is mounted at the root level (in `index.jsx`, outside the router), toasts survive route transitions. The user will see the success toast appear as they are redirected to the login page. This is actually a better UX than the current blocking alert.

### No Breaking Changes During Phasing

**Risk:** Partially completed work could leave some errors shown as alerts and some as toasts, creating an inconsistent experience.

**Mitigation:** Phases 1-3 are purely additive (no existing behavior changes). Phase 4 can be done in a single commit per file, or as one large commit. The key point is that each file is fully converted (no file has a mix of alert and toast calls after conversion).
