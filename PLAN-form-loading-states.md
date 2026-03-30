# Plan: Add Loading/Disabled State to Forms to Prevent Double Submission

## Problem

Seven form components fire API calls on explicit form submit but have no loading
state. A user can click the submit (or delete) button multiple times before the
request completes, causing duplicate records or conflicting server-side state.

## Scope

### Forms that NEED loading state added

All of these use `<form onSubmit>` with an explicit submit button and an axios
call that returns a promise. None of them currently track a `loading` flag.

| # | File | Submit method | Delete method |
|---|------|--------------|---------------|
| 1 | `src/components/events/new.jsx` | `handleSubmit` (POST) | n/a |
| 2 | `src/components/events/edit.jsx` | `handleSubmit` (PATCH) | `handleDelete` (DELETE) |
| 3 | `src/components/guest_room_reservations/new.jsx` | `handleSubmit` (POST) | n/a |
| 4 | `src/components/guest_room_reservations/edit.jsx` | `handleSubmit` (PATCH) | `handleDelete` (DELETE) |
| 5 | `src/components/common_house_reservations/new.jsx` | `handleSubmit` (POST) | n/a |
| 6 | `src/components/common_house_reservations/edit.jsx` | `handleSubmit` (PATCH) | `handleDelete` (DELETE) |
| 7 | `src/components/residents/password_new.jsx` | `handleSubmit` (POST) | n/a |

### Interactions that must NOT be changed (deliberate instant-action patterns)

These components fire API calls immediately on user interaction by design. They
do not use `<form onSubmit>` and have no submit button. They must be left alone.

| File | Interaction pattern | Why it is intentional |
|------|--------------------|-----------------------|
| `src/components/meal/attendees_box.jsx` | `onClick` on name cell calls `resident.toggleAttending()`. Checkbox `onChange` calls `resident.toggleLate()` and `resident.toggleVeg()`. | Single-click attend/toggle; instant feedback is the core UX. |
| `src/components/meal/extras.jsx` | Checkbox `onChange` calls `store.meal.setExtras(e.target.value)` | Radio-button-style selection, fires immediately on click. |
| `src/components/meal/menu_box.jsx` | `DebounceInput` textarea `onChange` calls `store.setDescription()` after 700ms debounce | Auto-save on typing; no submit button exists. |
| `src/components/meal/cooks_box.jsx` | Select `onChange` calls `bill.setResident()`, input `onChange` calls `bill.setAmount()`, checkbox `onChange` calls `bill.toggleNoCost()` | Inline editing; each field saves independently on change. |
| `src/components/meal/close_button.jsx` | Button `onClick` calls `store.toggleClosed` | Single toggle action; already uses `button-loader` class via `store.isLoading`. |
| `src/components/meal/guest_dropdown.jsx` | Dropdown click calls `resident.addGuest()` / button calls `resident.removeGuest()` | One-click add/remove guest from meal attendance list. |

### Already-protected forms (reference implementations)

| File | How it works |
|------|-------------|
| `src/components/residents/login.jsx` | `this.state.loading` flag; set true before axios POST, set false in `.then()` and `.catch()`; submit button gets `disabled={this.state.loading}` and `className={this.state.loading ? "button-loader" : ""}`; form inputs get `disabled={this.state.loading}`. |
| `src/components/residents/password_reset.jsx` | Same pattern as login.jsx. |

## Pattern to follow

Based on the existing pattern from `login.jsx` and `password_reset.jsx`, adapted
to support both submit and delete actions.

### New forms (1-3, 5, 7) — simple `loading` boolean

These forms only have a submit action (no delete), so a boolean is sufficient.

### Edit forms (2, 4, 6) — `loadingAction` string

These forms have both submit and delete. A simple `loading` boolean would show
the spinner on the Submit button even when the user clicked Delete — confusing
UX. Instead, use a `loadingAction` state: `null`, `"submit"`, or `"delete"`.
Each button shows the spinner only for its own action, while both check
`loadingAction !== null` for `disabled`.

### 1. Add loading state to initial state

In the constructor, add to `this.state`:

- **New forms / password_new**: `loading: false`
- **Edit forms**: `loadingAction: null`

### 2. Set loading at the start of handleSubmit

Immediately after `e.preventDefault()`, add:

- **New forms / password_new**: `this.setState({ loading: true });`
- **Edit forms**: `this.setState({ loadingAction: "submit" });`

### 3. Clear loading in both `.then()` and `.catch()`

At the top of each callback, add:

- **New forms / password_new**: `self.setState({ loading: false });`
- **Edit forms**: `self.setState({ loadingAction: null });`

This ensures the form unlocks regardless of success or failure.

### 4. Disable the submit button and add loader class

Change the submit button from:
```jsx
<button type="submit" className="button-dark">
  Create
</button>
```

**New forms:**
```jsx
<button
  type="submit"
  className={this.state.loading ? "button-dark button-loader" : "button-dark"}
  disabled={this.state.loading}
>
  Create
</button>
```

**Edit forms:**
```jsx
<button
  type="submit"
  className={this.state.loadingAction === "submit" ? "button-dark button-loader" : "button-dark"}
  disabled={this.state.loadingAction !== null}
>
  Update
</button>
```

Note: The existing `button-dark` class must be preserved (unlike login.jsx which
has no base button class). The CSS in `shoelace.css` already defines a
`button-dark.button-loader` variant (line 841), so both classes can coexist.

### 5. Disable form inputs during submission

For standard elements, add `disabled={this.state.loading}` (new forms) or
`disabled={this.state.loadingAction !== null}` (edit forms) to all `<input>`,
`<select>`, and `<textarea>` elements within the form.

For `DayPickerInput`, use both approaches together:
- `inputProps={{ disabled: ... }}` to disable the underlying text input
  (prevents opening the calendar overlay)
- Wrap in a container with `pointerEvents: "none"` and `opacity: 0.5` when
  loading — this provides visual disabled appearance (the input alone doesn't
  grey out the DayPickerInput container) and blocks interaction with the
  calendar overlay if it happens to be open

```jsx
<div style={this.state.loading ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInput
    ...
    inputProps={{ disabled: this.state.loading }}
  />
</div>
```

(Edit forms: substitute `this.state.loadingAction !== null` for
`this.state.loading` in the above.)

### 6. Protect handleDelete in edit forms

The three edit forms have a `handleDelete` method with a `window.confirm()`
guard followed by an axios DELETE call. These also need loading protection:

- Check `if (this.state.loadingAction) return;` at the top of `handleDelete`
  (before the confirm dialog) to prevent triggering delete while a submit is
  in flight.
- Set `this.setState({ loadingAction: "delete" })` after the confirm dialog
  returns true, before the axios call.
- Set `self.setState({ loadingAction: null })` in both `.then()` and `.catch()`.
- Disable and add spinner to the Delete button:

```jsx
<button
  className={this.state.loadingAction === "delete" ? "mar-l-md button-warning button-loader" : "mar-l-md button-warning"}
  disabled={this.state.loadingAction !== null}
  onClick={this.handleDelete.bind(this)}
>
  Delete
</button>
```

The CSS already defines `.button-warning.button-loader:after` (line 835 of
`shoelace.css`) with white spinner colors.

## Specific changes per file

### `src/components/events/new.jsx` (loading boolean)

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button**: Add `disabled={this.state.loading}`, change className to
  conditional `"button-dark button-loader"` / `"button-dark"`.
- **Form inputs**: Add `disabled={this.state.loading}` to the title `<input>`,
  description `<textarea>`, start_time `<select>`, end_time `<select>`,
  all_day `<input>` checkbox. Wrap `DayPickerInput` in disabled wrapper and
  add `inputProps={{ disabled: this.state.loading }}`.

### `src/components/events/edit.jsx` (loadingAction)

- **Constructor**: Add `loadingAction: null` to `this.state`.
- **handleSubmit**: Add `this.setState({ loadingAction: "submit" })` after
  `e.preventDefault()`. Add `self.setState({ loadingAction: null })` at the
  top of `.then()` and `.catch()`.
- **handleDelete**: Add early return if `this.state.loadingAction`. Add
  `this.setState({ loadingAction: "delete" })` after confirm returns true. Add
  `self.setState({ loadingAction: null })` at the top of `.then()` and
  `.catch()`.
- **Submit button**: Spinner on `loadingAction === "submit"`, disabled on
  `loadingAction !== null`.
- **Delete button**: Spinner on `loadingAction === "delete"`, disabled on
  `loadingAction !== null`.
- **Form inputs**: Add `disabled={this.state.loadingAction !== null}` to all
  inputs. Wrap `DayPickerInput` in disabled wrapper and add
  `inputProps={{ disabled: this.state.loadingAction !== null }}`.

### `src/components/guest_room_reservations/new.jsx` (loading boolean)

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button**: Add `disabled={this.state.loading}`, change className to
  conditional.
- **Form inputs**: Add `disabled={this.state.loading}` to the resident_id
  `<select>`. Wrap `DayPickerInput` in disabled wrapper and add
  `inputProps={{ disabled: this.state.loading }}`.

### `src/components/guest_room_reservations/edit.jsx` (loadingAction)

- **Constructor**: Add `loadingAction: null` to `this.state`.
- **handleSubmit**: Add `this.setState({ loadingAction: "submit" })` after
  `e.preventDefault()`. Add `self.setState({ loadingAction: null })` at the
  top of `.then()` and `.catch()`.
- **handleDelete**: Add early return if `this.state.loadingAction`. Add
  `this.setState({ loadingAction: "delete" })` after confirm returns true. Add
  `self.setState({ loadingAction: null })` at the top of `.then()` and
  `.catch()`.
- **Submit button**: Spinner on `loadingAction === "submit"`, disabled on
  `loadingAction !== null`.
- **Delete button**: Spinner on `loadingAction === "delete"`, disabled on
  `loadingAction !== null`.
- **Form inputs**: Add `disabled={this.state.loadingAction !== null}` to the
  resident_id `<select>`. Wrap `DayPickerInput` in disabled wrapper and add
  `inputProps={{ disabled: this.state.loadingAction !== null }}`.

### `src/components/common_house_reservations/new.jsx` (loading boolean)

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button**: Add `disabled={this.state.loading}`, change className to
  conditional.
- **Form inputs**: Add `disabled={this.state.loading}` to the resident_id
  `<select>`, title `<input>`, start_time `<select>`, end_time `<select>`.
  Wrap `DayPickerInput` in disabled wrapper and add
  `inputProps={{ disabled: this.state.loading }}`.

### `src/components/common_house_reservations/edit.jsx` (loadingAction)

- **Constructor**: Add `loadingAction: null` to `this.state`.
- **handleSubmit**: Add `this.setState({ loadingAction: "submit" })` after
  `e.preventDefault()`. Add `self.setState({ loadingAction: null })` at the
  top of `.then()` and `.catch()`.
- **handleDelete**: Add early return if `this.state.loadingAction`. Add
  `this.setState({ loadingAction: "delete" })` after confirm returns true. Add
  `self.setState({ loadingAction: null })` at the top of `.then()` and
  `.catch()`.
- **Submit button**: Spinner on `loadingAction === "submit"`, disabled on
  `loadingAction !== null`.
- **Delete button**: Spinner on `loadingAction === "delete"`, disabled on
  `loadingAction !== null`.
- **Form inputs**: Add `disabled={this.state.loadingAction !== null}` to the
  resident_id `<select>`, title `<input>`, start_time `<select>`, end_time
  `<select>`. Wrap `DayPickerInput` in disabled wrapper and add
  `inputProps={{ disabled: this.state.loadingAction !== null }}`.

### `src/components/residents/password_new.jsx` (loading boolean)

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button** (line 97): Add `disabled={this.state.loading}`, change
  className to conditional. Note: this button currently has no className --
  match login.jsx pattern (`className={this.state.loading ? "button-loader" : ""}`).
- **Form inputs**: Add `disabled={this.state.loading}` to the password
  `<input>` (line 88).

## Risks and considerations

1. **DayPickerInput disabled handling.** `DayPickerInput` does not accept a
   `disabled` prop directly. Use both: `inputProps={{ disabled: ... }}` to
   disable the underlying `<input>` (prevents opening the calendar), and a
   wrapper `<div>` with `{ pointerEvents: "none", opacity: 0.5 }` for visual
   consistency and to block interaction with the calendar overlay if it happens
   to already be open.

2. **Close-modal-on-success while loading is false.** In the `.then()` handler,
   `loading` is set to `false` before `self.props.handleCloseModal()` is called.
   This matches the existing login.jsx pattern and is correct -- the modal will
   close, unmounting the component, so the loading state is irrelevant after
   success. If `handleCloseModal` were ever changed to not unmount, the button
   would briefly flash back to enabled, but this is a non-issue today.

3. **No CSS changes needed.** The `button-loader` class and its
   `button-dark.button-loader` variant are already defined in `shoelace.css`
   (lines 809-857). No new styles are required.

4. **setState after unmount.** If the component unmounts (e.g., modal closed by
   the user pressing Escape) while an axios call is in flight, the `.then()` or
   `.catch()` callback will call `setState` on an unmounted component. React will
   log a warning but it is harmless. This is a pre-existing condition in
   login.jsx and password_reset.jsx. Fixing it is out of scope for this change
   but could be addressed later with an `_isMounted` flag or an AbortController.

5. **No changes to instant-action components.** The meal-related components
   (attendees_box, extras, menu_box, cooks_box, close_button, guest_dropdown)
   use immediate onChange/onClick actions by design. They must not be modified
   as part of this work.

## Testing

For each of the seven forms:
- Verify the submit button shows a spinner and becomes unclickable during
  submission.
- Verify form inputs are disabled during submission.
- Verify the form returns to an interactive state on API error (e.g., simulate
  a network failure or 422 response).
- For edit forms, verify the Delete button is disabled during a submit, and
  vice versa.
- Verify the Delete button shows loading state during deletion.
- Verify that rapid double-clicks on submit or delete do not produce duplicate
  API calls.
