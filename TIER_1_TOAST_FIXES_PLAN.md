# Plan: Tier 1 Toast Notification Fixes (4.1, 4.2, 4.3)

## Context

Toast notifications for form errors have two UX problems:
1. They persist after the calendar modal is closed, leaving orphaned error messages on screen
2. Server-side warnings (third-cook scenarios) return HTTP 400, causing the frontend to show them as red error toasts — even though the action succeeded. Users think their cook assignment failed when it actually went through.

Additionally, the backend's Scenario #2 warning ("switching cooks") fires too broadly — it triggers any time bills are submitted with 3+ cooks and the count hasn't changed, even if the user is just updating a cost amount without changing who the cook is.

This plan addresses items 4.1, 4.2, and 4.3 from `FORM_ERRORS_AND_WARNINGS_PLAN.md`.

## Changes

### Step 1: Add `clearAll()` to toast store (4.1)

**File:** `comeals-ui/src/stores/toast_store.js`

Add a `clearAll()` method that empties the toasts array. MobX will react and the toast container will re-render with nothing. Existing auto-dismiss timers in toast_container will fire harmlessly on removed IDs (the `removeToast` filter is a no-op for missing IDs).

### Step 2: Clear toasts on calendar modal close (4.1)

**File:** `comeals-ui/src/components/calendar/show.jsx`

- Import `toastStore` from `../../stores/toast_store`
- In `handleCloseModal()` (line 199), call `toastStore.clearAll()` before navigating away

### Step 3: Fix Scenario #2 to only warn when cooks actually change (backend bug fix)

**File:** `comeals-backend/app/controllers/api/v1/meals_controller.rb`

Current Scenario #2 logic (line 168):
```ruby
if (cook_ids.length == @meal.bills.count) && @meal.another_meal_in_this_rotation_has_less_than_two_cooks?
```

This fires whenever the count is the same — even if the user is just updating a cost amount. The fix: compare the actual set of cook IDs, not just the count.

```ruby
existing_cook_ids = @meal.bills.pluck(:resident_id).map(&:to_s).sort
new_cook_ids = cook_ids.map(&:to_s).sort
cooks_changed = new_cook_ids != existing_cook_ids

if (cook_ids.length == @meal.bills.count) && cooks_changed && @meal.another_meal_in_this_rotation_has_less_than_two_cooks?
```

**Important:** We must keep `cook_ids.length == @meal.bills.count` in the condition. Scenarios #1 and #2 are separate `if` blocks (not `if/elsif`), so both can execute. Without the count check, an "add 3rd cook" action would trigger both Scenario #1 and Scenario #2 (since `cooks_changed` is also true when adding). Scenario #2 would overwrite Scenario #1's message with the wrong warning text.

The `.map(&:to_s)` normalizes types since params come in as strings but DB IDs are integers.

### Step 4: Add `type` field to backend warning responses (4.2)

**File:** `comeals-backend/app/controllers/api/v1/meals_controller.rb`

In `update_bills`, both warning branches (Scenario #1 and #2) currently set `message` and `request_symbol` but no type indicator.

Change: Initialize a `message_type` variable to `nil` alongside `message` and `request_symbol` (line 151-152). Set it to `'warning'` in both warning branches. At the render line (196), include the type in the JSON response:

```ruby
response = { message: message }
response[:type] = message_type if message_type
render json: response, status: request_symbol
```

This is backward-compatible — success responses and hard errors don't include `type`, so no existing behavior changes.

### Step 5: Frontend respects `type` field from server (4.2)

**File:** `comeals-ui/src/helpers/handle_axios_error.js`

In the `error.response` branch where `data.message` exists (line 8), check for `data.type`:
- If `data.type === "warning"`, use `toastStore.addToast(data.message, "warning")` (yellow toast)
- Otherwise, use `"error"` (red toast, current behavior)

Also: return the resolved toast type from the function so callers can act on it. Currently returns nothing. Return values for all paths:
- `error.response` with `data.message`: return `"warning"` or `"error"` (based on `data.type`)
- `error.response` without `data.message`: return `"error"` (logged to console, no toast)
- `error.request` (no response): return `"error"`
- Catch-all: return `"error"`

This ensures callers always get a string back and can reliably check `=== "warning"`.

### Step 6: Show success toast alongside cook warnings (4.3)

**File:** `comeals-ui/src/stores/data_store.js`

In `submitBills()` (line 273 `.catch` handler), after calling `handleAxiosError(error)`:
- Check the return value — if it's `"warning"`, also call `toastStore.addToast("Cooks updated.", "success")`
- This makes it unambiguous that the action succeeded despite the warning

### Step 7: Add backend tests for third-cook warning scenarios

**File:** `comeals-backend/spec/requests/api/v1/update_bills_spec.rb`

Add a new `describe 'third-cook warnings'` block. Test setup needs:
- A rotation with two meals in it (same `rotation_id`)
- The second meal has < 2 cooks (to trigger `another_meal_in_this_rotation_has_less_than_two_cooks?`)
- The primary meal is in the future (`date: 1.week.from_now`)
- Three cooks (residents) available

Tests to add:

1. **Adding a 3rd cook warns** — Submit 3 cooks when meal currently has 2. Expect: HTTP 400, message includes "Warning", response includes `type: "warning"`, bills are still saved.

2. **Switching a 3rd cook warns** — Meal has 3 cooks, submit with one cook swapped for a different person. Expect: HTTP 400, message includes "Warning", `type: "warning"`, bills are still saved with the new cook.

3. **Updating cost for existing 3rd cook does NOT warn** — Meal has 3 cooks, submit same 3 cook IDs but with a different amount. Expect: HTTP 200, message is "Form submitted.", no `type` field, bill amount is updated.

4. **No warning when all rotation meals have 2+ cooks** — Same 3-cook setup but the other meal in the rotation also has 2 cooks. Expect: HTTP 200, no warning.

5. **No warning for past meals** — Same setup but meal date is in the past. Expect: HTTP 200, no warning.

## Files Modified

| File | Repo | Change |
|------|------|--------|
| `src/stores/toast_store.js` | comeals-ui | Add `clearAll()` method |
| `src/components/calendar/show.jsx` | comeals-ui | Import toastStore, call clearAll in handleCloseModal |
| `src/helpers/handle_axios_error.js` | comeals-ui | Check `data.type`, return toast type |
| `src/stores/data_store.js` | comeals-ui | Show success toast when warning detected in submitBills |
| `app/controllers/api/v1/meals_controller.rb` | comeals-backend | Fix Scenario #2 logic, add `type: "warning"` to responses |
| `spec/requests/api/v1/update_bills_spec.rb` | comeals-backend | Add 5 tests for third-cook warning scenarios |

## Verification

1. **Backend tests:** Run `bundle exec rspec spec/requests/api/v1/update_bills_spec.rb` — all existing tests pass, 5 new tests pass.

2. **4.1 — Toast clears on modal close:**
   - Open calendar, click to create an Event, submit empty form, see error toast appear
   - Close the modal (X button or click overlay)
   - Verify toast disappears immediately

3. **4.2 — Warning shows as yellow, not red:**
   - On the meal edit page, assign a 3rd cook to a future meal where another meal in the rotation has < 2 cooks
   - Verify toast is yellow (warning) not red (error)
   - Verify hard errors (reconciled meal, invalid amount) still show as red

4. **4.3 — Success toast alongside warning:**
   - Same scenario as 4.2
   - Verify both a green "Cooks updated." toast AND a yellow warning toast appear

5. **Cost-only update — no warning:**
   - On a meal that already has 3 cooks (with the rotation condition), update only the dollar amount for the 3rd cook
   - Verify NO warning toast appears

6. **Existing e2e tests** (`tests/e2e/error-handling.spec.js`):
   - The "event create API error shows alert" test (line 88) mocks a 422 with no `type` field — should still show `.toast--error`. No change needed.
   - Run full frontend e2e suite to confirm nothing breaks.

## Known Trade-offs

1. **Toast ordering (Step 6):** When both success and warning toasts appear, the warning renders on top (added first) and the success toast below. Ideally the success toast would be on top since it answers the user's primary question ("did my action work?"). Reversing the order would require duplicating the `data.type` check before calling `handleAxiosError`, which isn't worth the complexity. Both toasts are visible simultaneously — acceptable.

2. **`clearAll` scope (Step 2):** `clearAll()` removes ALL toasts, not just ones triggered by the form. If a background request (e.g., version banner poll) happens to fire an error toast at the exact moment the user closes the modal, it would be swallowed. This is extremely unlikely and the alternative (tracking toast provenance) adds significant complexity for negligible benefit.
