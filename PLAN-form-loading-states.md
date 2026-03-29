# Plan: Add Loading/Disabled State to Forms to Prevent Double Submission

## Problem

Six form components fire API calls on explicit form submit but have no loading
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

Match the existing pattern from `login.jsx` and `password_reset.jsx` exactly.

### 1. Add `loading: false` to initial state

In the constructor, add `loading: false` to `this.state`.

### 2. Set `loading: true` at the start of handleSubmit

Immediately after `e.preventDefault()`, add:
```js
this.setState({ loading: true });
```

### 3. Set `loading: false` in both `.then()` and `.catch()`

At the top of the `.then()` callback, add:
```js
self.setState({ loading: false });
```

At the top of the `.catch()` callback, add:
```js
self.setState({ loading: false });
```

This ensures the form unlocks regardless of success or failure.

### 4. Disable the submit button and add loader class

Change the submit button from:
```jsx
<button type="submit" className="button-dark">
  Create
</button>
```
to:
```jsx
<button
  type="submit"
  className={this.state.loading ? "button-dark button-loader" : "button-dark"}
  disabled={this.state.loading}
>
  Create
</button>
```

Note: The existing `button-dark` class must be preserved (unlike login.jsx which
has no base button class). The CSS in `shoelace.css` already defines a
`button-dark.button-loader` variant, so both classes can coexist.

### 5. Disable form inputs during submission

Add `disabled={this.state.loading}` to all `<input>`, `<select>`, and
`<textarea>` elements within the form. For `DayPickerInput`, wrap it in a
container with `pointerEvents: "none"` and `opacity: 0.5` when loading, since
`DayPickerInput` does not accept a `disabled` prop directly.

### 6. Protect handleDelete in edit forms

The three edit forms have a `handleDelete` method with a `window.confirm()`
guard followed by an axios DELETE call. These also need loading protection:

- Check `if (this.state.loading) return;` at the top of `handleDelete` (before
  the confirm dialog) to prevent triggering delete while a submit is in flight.
- Set `this.setState({ loading: true })` after the confirm dialog returns true,
  before the axios call.
- Set `self.setState({ loading: false })` in both `.then()` and `.catch()`.
- Add `disabled={this.state.loading}` to the Delete button.

The `loading` state is shared between submit and delete -- this is intentional.
A user should not be able to click Delete while a submit is in flight, or
vice versa.

## Specific changes per file

### `src/components/events/new.jsx`

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button** (line 164): Add `disabled={this.state.loading}`, change
  className to conditional `"button-dark button-loader"` / `"button-dark"`.
- **Form inputs**: Add `disabled={this.state.loading}` to the title `<input>`
  (line 93), description `<textarea>` (line 100), start_time `<select>`
  (line 129), end_time `<select>` (line 145), all_day `<input>` checkbox
  (line 158). Wrap `DayPickerInput` (line 109) in a disabled-style container
  when loading.

### `src/components/events/edit.jsx`

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **handleDelete**: Add early return if `this.state.loading`. Add
  `this.setState({ loading: true })` after confirm returns true. Add
  `self.setState({ loading: false })` at the top of `.then()` and `.catch()`.
- **Submit button** (line 260): Add `disabled={this.state.loading}`, change
  className to conditional.
- **Delete button** (line 167): Add `disabled={this.state.loading}`.
- **Form inputs**: Add `disabled={this.state.loading}` to the title `<input>`
  (line 184), description `<textarea>` (line 191), start_time `<select>`
  (line 219), end_time `<select>` (line 237), all_day `<input>` checkbox
  (line 253). Wrap `DayPickerInput` (line 201) in a disabled-style container
  when loading.

### `src/components/guest_room_reservations/new.jsx`

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button** (line 153): Add `disabled={this.state.loading}`, change
  className to conditional.
- **Form inputs**: Add `disabled={this.state.loading}` to the resident_id
  `<select>` (line 114). Wrap `DayPickerInput` (line 132) in a disabled-style
  container when loading.

### `src/components/guest_room_reservations/edit.jsx`

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **handleDelete**: Add early return if `this.state.loading`. Add
  `this.setState({ loading: true })` after confirm returns true. Add
  `self.setState({ loading: false })` at the top of `.then()` and `.catch()`.
- **Submit button** (line 193): Add `disabled={this.state.loading}`, change
  className to conditional.
- **Delete button** (line 141): Add `disabled={this.state.loading}`.
- **Form inputs**: Add `disabled={this.state.loading}` to the resident_id
  `<select>` (line 159). Wrap `DayPickerInput` (line 175) in a disabled-style
  container when loading.

### `src/components/common_house_reservations/new.jsx`

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **Submit button** (line 207): Add `disabled={this.state.loading}`, change
  className to conditional.
- **Form inputs**: Add `disabled={this.state.loading}` to the resident_id
  `<select>` (line 127), title `<input>` (line 143), start_time `<select>`
  (line 177), end_time `<select>` (line 197). Wrap `DayPickerInput` (line 154)
  in a disabled-style container when loading.

### `src/components/common_house_reservations/edit.jsx`

- **Constructor**: Add `loading: false` to `this.state`.
- **handleSubmit**: Add `this.setState({ loading: true })` after
  `e.preventDefault()`. Add `self.setState({ loading: false })` at the top of
  `.then()` and `.catch()`.
- **handleDelete**: Add early return if `this.state.loading`. Add
  `this.setState({ loading: true })` after confirm returns true. Add
  `self.setState({ loading: false })` at the top of `.then()` and `.catch()`.
- **Submit button** (line 265): Add `disabled={this.state.loading}`, change
  className to conditional.
- **Delete button** (line 169): Add `disabled={this.state.loading}`.
- **Form inputs**: Add `disabled={this.state.loading}` to the resident_id
  `<select>` (line 186), title `<input>` (line 203), start_time `<select>`
  (line 234), end_time `<select>` (line 252). Wrap `DayPickerInput` (line 215)
  in a disabled-style container when loading.

## Risks and considerations

1. **DayPickerInput lacks a `disabled` prop.** The `react-day-picker` v7
   `DayPickerInput` component does not natively support a `disabled` attribute.
   The workaround is to wrap it in a `<div>` with inline styles
   `{ pointerEvents: "none", opacity: 0.5 }` when `this.state.loading` is true.
   Alternatively, pass `inputProps={{ disabled: this.state.loading }}` to
   `DayPickerInput`, which forwards props to the underlying `<input>` element.
   The `inputProps` approach is cleaner and should be tried first.

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

For each of the six forms:
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
