# Form Errors & Warnings: Evaluation and Plan

## Table of Contents

1. [Current State: How Errors and Warnings Work Today](#1-current-state)
2. [Issues Found](#2-issues-found)
3. [Best Practices Analysis](#3-best-practices-analysis)
4. [Recommendations](#4-recommendations)
5. [Other Observations](#5-other-observations)

---

## 1. Current State

### 1.1 Toast Notification System

The app uses a custom-built toast system (no external library).

**Key files:**

- `src/stores/toast_store.js` — MobX store, holds toast array
- `src/components/app/toast_container.jsx` — renders toasts, manages auto-dismiss timers
- `src/toast.css` — styling
- `src/helpers/handle_axios_error.js` — central error handler that creates toasts

**Toast types and auto-dismiss timers:**
| Type | Color | Auto-dismiss | Use case |
|------|-------|-------------|----------|
| error | Red (#c0392b) | 15 seconds | API errors, validation failures |
| warning | Yellow (#e9c46a) | 8 seconds | Advisory messages (e.g., cook costs not set) |
| success | Green (#2ecc40) | 5 seconds | Password reset confirmation |
| info | Blue (#3498db) | 5 seconds | (unused currently) |

**Positioning:** Fixed top-right corner, z-index 10002 (above modal overlay at 10000).

**Dismissal:** Auto-dismiss on timer, or manual click of X button. No other dismissal triggers.

**Duplicate prevention:** Won't add a toast with same message+type as an existing one.

### 1.2 Calendar Page — Creating Resources

Three resource types can be created from the calendar sidebar, each opening a `react-modal`:

#### Guest Room Reservation (`src/components/guest_room_reservations/new.jsx`)

- Fields: Host (dropdown), Day (date picker)
- No client-side validation
- On submit, POST to API; on error, red toast via `handleAxiosError`
- On success, modal closes

#### Common House Reservation (`src/components/common_house_reservations/new.jsx`)

- Fields: Resident (dropdown), Title (text, optional), Day (date picker), Start Time (dropdown), End Time (dropdown)
- No client-side validation
- Same error pattern: red toast on API error

#### Event (`src/components/events/new.jsx`)

- Fields: Title (text), Description (textarea, optional), Day (date picker), Start Time (dropdown), End Time (dropdown), All Day (checkbox)
- No client-side validation
- Same error pattern: red toast on API error

**All three forms share identical error handling:** submit to API, catch error, call `handleAxiosError(error)` which shows a red toast with the server's error message (e.g., "Title is required").

**Modal setup** (in `src/components/calendar/show.jsx`, lines 270-281):

- `react-modal` with `onRequestClose` bound to `handleCloseModal`
- `handleCloseModal` navigates away via `history.push`, which unmounts the form component
- Modal overlay has z-index 10000; toast container has z-index 10002

### 1.3 Meal Edit Page — Cook Warnings

**Client-side warning** (`src/stores/data_store.js`, lines 164-174):

- When closing a meal, if any assigned cook has no cost set and no `no_cost` flag, shows:
  - `"All cook costs must be set before closing."` — yellow warning toast
  - **Blocks the action** (returns early, meal stays open)

**Server-side warnings** (`comeals-backend/app/controllers/api/v1/meals_controller.rb`):
These come from the PATCH `/api/v1/meals/:meal_id/bills` endpoint:

| Scenario                                                  | Message                                                                                                             | HTTP Status | Blocks action?                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------ |
| Adding 3rd cook when rotation has meals with < 2 cooks    | "Warning: third cooks should not be added until all meals in the rotation have at least two cooks."                 | 400         | **NO** — cooks are assigned despite the response |
| Switching 3rd cook when rotation has meals with < 2 cooks | "Warning: third cook should not be switched when there are other meals in the rotation without at least two cooks." | 400         | **NO** — switch goes through                     |
| Changing cost on reconciled meal                          | "Cost change not permitted. Meal has already been reconciled."                                                      | 400         | **YES**                                          |
| Invalid bill amount                                       | "Invalid amount: {value}"                                                                                           | 400         | **YES**                                          |

---

## 2. Issues Found

### Issue 2.1: Server warnings display as errors (CRITICAL UX problem)

The backend's third-cook warnings return HTTP 400. The frontend's `handleAxiosError` treats ALL non-200 responses the same: it shows a red error toast. So the user sees:

> [RED] "Warning: third cooks should not be added until all meals in the rotation have at least two cooks."

This is deeply confusing because:

- **The action succeeded** — the cook was assigned
- **It looks like it failed** — red = error = something went wrong
- **The message says "Warning"** but the visual treatment says "Error"
- The user has no way to know the action actually went through without refreshing or checking

This is exactly the issue described: "it sort of looks like the user is being told that they can't do something, when we do actually allow them to do the thing."

**Root cause:** The backend uses HTTP 400 for both hard errors and soft warnings. The frontend has no way to distinguish them.

### Issue 2.2: Toast notifications persist after modal closes

When a user submits a form in the calendar modal and gets an error:

1. Red toast appears in top-right corner
2. User closes the modal (X button, ESC, or overlay click)
3. Toast remains visible for up to 15 seconds
4. Toast has no contextual connection to the form that triggered it

The user is now looking at the calendar with a floating red error about a form they already dismissed.

### Issue 2.3: No client-side validation anywhere

All three calendar forms submit directly to the server with no validation. For example:

- Guest room reservation: can submit with no host selected and no date
- Common house reservation: can submit with no resident, no date, no times
- Event: can submit with no title and no date

This means a round-trip to the server just to learn that "Title is required." On slow connections (or when the server is down), this is a poor experience.

### Issue 2.4: No required field indicators

None of the forms mark which fields are required. Users must guess, submit, and wait for the server error.

### Issue 2.5: Error toast positioning on mobile

The toast container uses `position: fixed; top: 1rem; right: 1rem;` with `max-width: min(24rem, calc(100vw - 2rem))`. On an iPhone in the installed PWA mode:

- The modal is full-screen (no browser chrome since `manifest.json` uses `"display": "fullscreen"`)
- The toast appears over the top-right of the modal content
- On smaller screens, the toast can cover form fields or the close button

### Issue 2.6: No toast slide-out animation

Toasts slide in with a `translateX(100%)` to `translateX(0)` animation, but disappear instantly when dismissed or auto-expired. This can be jarring.

---

## 3. Best Practices Analysis

### 3.1 Error display location: Toast vs. Inline

**Best practice for form validation errors:** Inline, adjacent to the relevant field or at the top of the form. This is well-established guidance from:

- Nielsen Norman Group: errors should appear next to the field, be visible without scrolling
- WCAG 2.1 (3.3.1 Error Identification): errors must identify the field in error
- Material Design, Apple HIG, and most design systems

**Best practice for system-level errors** (network failures, server errors): Toast or banner is appropriate. These are not tied to a specific field.

**When toasts are appropriate for forms:**

- Success confirmation after form submission ("Event created")
- Transient status updates ("Saving...")
- Errors that occur outside the form's context (network failure)

**When toasts are NOT ideal for forms:**

- Field validation ("Title is required") — should be inline
- Constraint violations ("End time must be after start time") — should be near the fields

### 3.2 Warning vs. Error distinction

When an action succeeds but with a caveat (like the third-cook scenario), best practice is:

- Use a distinct visual treatment: yellow/amber, not red
- Use language like "Note:" or "Warning:" — not the same pattern as errors
- Consider whether the warning should be shown _before_ the action (as a confirmation dialog) or _after_ (as a notice)
- If shown after, make it clear the action succeeded

### 3.3 Dismissing errors with context

**Best practice:** When a form/modal is dismissed, any validation errors tied to that form should also be dismissed. The user has chosen to abandon the form — persisting its errors is noise.

System-level errors (like "no response from server") can reasonably persist since they're not form-specific.

### 3.4 Mobile considerations

- Toast positioning should account for safe areas (notch, home indicator)
- On small screens, centered/bottom toasts often work better than top-right (less likely to obscure content)
- Touch targets for dismiss buttons should be at least 44x44px (Apple HIG)

---

## 4. Recommendations

### Tier 1: Quick wins (minimal code changes, high impact)

#### 4.1 Clear toasts when calendar modal closes

**Change:** When `handleCloseModal` is called in `show.jsx`, also call `toastStore.clearAll()` (new method).

**Scope:** Add a `clearAll()` method to `toast_store.js`, call it from `handleCloseModal`.

**Impact:** Eliminates the lingering-toast-after-modal-close problem. Simple, low risk.

#### 4.2 Distinguish warnings from errors in the backend response

**Option A (backend change):** Have the third-cook endpoints return a different HTTP status or include a `type: "warning"` field in the response JSON alongside the message. For example:

```json
{ "message": "Third cooks should not be added until...", "type": "warning" }
```

**Option B (frontend change):** In `handleAxiosError`, check if `data.message` starts with "Warning:" and use `toastStore.addToast(message, "warning")` instead of `"error"`.

Option A is cleaner. Option B is quicker.

**Impact:** Users will see a yellow warning instead of a red error. Immediately reduces confusion about whether the action succeeded.

#### 4.3 Show a success toast alongside warnings

When the third-cook warning fires, the action actually succeeded. Consider showing both:

- A green success toast: "Cooks updated"
- A yellow warning toast: "Note: some meals in this rotation still have fewer than two cooks."

This makes it unambiguous that the action went through.

### Tier 2: Moderate effort, solid improvement

#### 4.4 Add basic client-side validation to calendar forms

Before submitting to the server, check required fields and show inline errors. For each form:

**Guest Room Reservation:**

- Host must be selected
- Day must be chosen

**Common House Reservation:**

- Resident must be selected
- Day must be chosen
- Start time must be selected
- End time must be selected
- End time must be after start time

**Event:**

- Title must not be empty
- Day must be chosen

**Implementation approach:** Add a `validate()` method to each form component. On submit, run validation first. If invalid, set error state (`this.setState({ errors: { title: "Title is required" } })`) and render error messages below the relevant fields. Do NOT submit to the server.

Keep server-side validation as the backstop — the client-side validation is for user experience, not security.

#### 4.5 Add required field indicators

Mark required fields with a visual indicator (e.g., asterisk or "(required)" label). This is a small CSS/markup change per form.

#### 4.6 Center toast positioning on mobile

For screens under ~600px wide, consider centering toasts horizontally rather than pinning to top-right. This avoids overlap with the modal close button and feels more natural on mobile.

Alternatively, position toasts at the bottom of the viewport on mobile, which is where iOS users are accustomed to seeing transient messages (similar to iOS system toasts).

### Tier 3: Larger effort, "textbook" UX

#### 4.7 Inline form errors for all validation

Replace toast-based form validation entirely with inline errors. When a server returns a field-specific error:

- Show the error text below the field in red
- Scroll to the first error if it's off-screen
- Clear the error when the user modifies the field

This requires the backend to return structured errors (field -> message mapping) rather than a single string. Currently the backend returns `{ "message": "Title is required" }` — no field association.

**Backend change needed:** Return errors like:

```json
{ "errors": { "title": ["can't be blank"], "date": ["is required"] } }
```

This is a significant backend change and would need to be coordinated.

#### 4.8 Pre-action confirmation for warnings

For the third-cook scenario, instead of allowing the action and then showing a warning after:

1. When the user selects a 3rd cook and there are under-staffed meals in the rotation, show a confirmation dialog _before_ saving
2. "This rotation has meals with fewer than 2 cooks. Add a 3rd cook anyway?"
3. User confirms or cancels

This is the cleanest UX for "allowed but not recommended" actions. However, it requires moving the rotation-awareness check to the frontend (or adding a pre-validation API endpoint).

---

## 5. Other Observations

These are things I noticed during the review that are outside the immediate scope but worth documenting for later.

### 5.1 manifest.json display and orientation settings

`manifest.json` has `"display": "fullscreen"` and `"orientation": "landscape"`. For an app that is "heavily used as an installed iPhone app":

- `"fullscreen"` hides the status bar (time, battery, signal) — `"standalone"` is almost certainly more appropriate and is what most web apps use
- `"orientation": "landscape"` is unusual for a calendar/form-based app primarily used on phones — most users hold phones in portrait. This setting can cause the app to force landscape on some devices/browsers

These seem likely to be leftover defaults from Create React App and probably worth revisiting.

### 5.2 Bill amount validation: client vs. server mismatch

In `cooks_box.jsx`, the bill amount input has `type="number" min="0" max="999" step="0.01"`. There is also a `bill.amountIsValid` check that applies an `input-invalid` CSS class. However, when `amountIsValid` is false during `submitBills()`, the only feedback is that `editBillsMode` stays `true` — no error message is shown. The user sees the field highlighted red but may not understand why.

### 5.3 The "close meal" validation is the only client-side validation in the entire app

The check in `data_store.js:toggleClosed()` for cook costs being set is the **only** place the frontend validates before hitting the server. Everything else — calendar forms, bills, attendance — relies entirely on server responses.

### 5.4 No loading indicator for initial data fetches in calendar forms

Guest Room and Common House forms show "Loading..." while fetching the host/resident list, but if that fetch fails silently (`{ silent: true }`), the form just never appears. The user sees "Loading..." forever with no error.

### 5.5 Edit forms also have no client-side validation

The edit forms for guest rooms, common house, and events have the same pattern as the new forms: submit to server, catch error, show toast. Same issues apply.

### 5.6 Delete confirmation uses a separate modal component

`src/components/app/confirm_modal.jsx` handles delete confirmations. This is a good pattern (confirmation before destructive action). However, it's a nested modal (modal inside modal), which can cause z-index and focus-trap issues on some screen readers.

### 5.7 Toast container accessibility

The toast container uses `aria-relevant="additions"` and individual toasts use `role="alert" aria-live="assertive"`. This is mostly correct, but `assertive` will interrupt screen readers immediately — for non-critical warnings, `aria-live="polite"` would be more appropriate. Consider using `assertive` only for errors and `polite` for warnings/info/success.

### 5.8 Idle timer interaction with toasts

There's an idle timer that reloads the page after inactivity. If a toast is displayed and the user walks away, the page may reload while the toast is still showing. This isn't a bug per se, but if we move to inline form errors, we should be aware that the idle timer could clear form state.

---

## Decision Log

_Track decisions made as we work through this plan._

| Date | Decision | Rationale |
| ---- | -------- | --------- |
|      |          |           |

---

## Implementation Tracker

| Item                                 | Status      | Notes                                        |
| ------------------------------------ | ----------- | -------------------------------------------- |
| 4.1 Clear toasts on modal close      | Not started |                                              |
| 4.2 Distinguish warnings from errors | Not started | Need to decide Option A vs B                 |
| 4.3 Success toast alongside warnings | Not started |                                              |
| 4.4 Client-side validation           | Not started |                                              |
| 4.5 Required field indicators        | Not started |                                              |
| 4.6 Mobile toast positioning         | Not started |                                              |
| 4.7 Inline form errors               | Not started | Needs backend changes                        |
| 4.8 Pre-action confirmation          | Not started | Needs backend or frontend rotation awareness |
