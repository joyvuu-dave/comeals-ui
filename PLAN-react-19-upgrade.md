# Plan: Upgrade React 18 to React 19

**Date:** 2026-03-29 (updated 2026-03-30)
**Scope:** All 31 source files with React imports, package.json, vite.config.js
**Sequencing:** All prerequisite plans are now complete. This is the final plan.

---

## Current State

- `react`: ^18.3.1
- `react-dom`: ^18.3.1
- Entry point (`src/index.jsx`) already uses `createRoot` from `react-dom/client`
- JSX runtime: **classic** (`jsxRuntime: "classic"` in vite.config.js)
- 28 class components, 0 hooks, heavy use of HOCs (`inject`/`observer`, `withRouter`, `onClickOutside`)
- 3 new components added since original plan: `toast_container.jsx`, `confirm_modal.jsx`, `day_picker_input.jsx`
- No PropTypes, no string refs, no `findDOMNode`, no legacy context, no `UNSAFE_` lifecycle methods
- `day_picker_input.jsx` uses `React.createRef()` — relevant for Phase 3 (JSX runtime switch)

## React 19 Breaking Changes That Affect This Codebase

React 19 removes several deprecated APIs. The codebase itself does not use any of
them directly, but **five third-party dependencies do**:

| Removed API | Affected dependency | Impact | Status |
|---|---|---|---|
| `React.createFactory` | `react-big-calendar@1.17.1` | Runtime crash | **RESOLVED** — upgraded to 1.19.4 in moment→dayjs plan |
| `ReactDOM.findDOMNode` | `react-onclickoutside@6.13.2` | Runtime crash | Phase 1.1 |
| Peer dep `react: ^18` only | `mobx-react@7.6.0` | npm install failure | Phase 1.3 |
| Peer dep `react: ^18` only | `react-day-picker@7.4.8` | npm install failure | **RESOLVED** — upgraded to v9 in moment→dayjs plan |
| Peer dep `react: ^18` only | `react-debounce-input@3.3.0` | npm install warning | Phase 1.4 |
| Peer dep `react: ^18` only | `react-router-dom@5.2.0` | npm install warning + issues | Phase 2 |
| className bug in React 19 | `@fortawesome/react-fontawesome@0.2.6` | Runtime error | Phase 1.5 |

**Already resolved by prior plans:**
- `react-day-picker` v7→v9 (moment→dayjs plan)
- `react-big-calendar` 1.17.1→1.19.4 (moment→dayjs plan, also switched to dayjsLocalizer)

**Not a blocker (verified):**
- `react-modal@3.16.3` — peer deps already include React 19 (`react ^0.14-19`)

Other React 19 changes (removed `PropTypes` runtime, removed `defaultProps` on
function components, `ref` as regular prop) do not affect this codebase because
no source files use PropTypes or defaultProps. One new file
(`day_picker_input.jsx`) uses `React.createRef()`, which is NOT removed in
React 19.

---

## Prerequisites — ALL COMPLETE

All prerequisite plans have been implemented:

- **PLAN-version-banner.md** — Done. VersionBanner uses Vite manifest.
- **PLAN-eslint-config.md** — Done. ESLint 9 flat config, 0 warnings.
- **PLAN-form-loading-states.md** — Done. 7 forms have loading/loadingAction state.
- **PLAN-replace-window-alert.md** — Done. Toast system, ConfirmModal, handleAxiosError.
- **PLAN-moment-dayjs-daypicker.md** — Done. dayjs replaces moment, react-day-picker v9,
  DayPickerInputWrapper, react-big-calendar uses dayjsLocalizer.

The codebase is on stable React 18 with all refactoring complete. This plan
is now purely a dependency-upgrade exercise.

---

## Phase 1: Upgrade Dependency Blockers (on React 18)

All of these upgrades are done while still on React 18. Each should be verified
working before proceeding to the next. This de-risks the final React 19 bump by
isolating library migration issues from React version issues.

### 1.1 Replace react-onclickoutside with a ref-based approach

**Why:** The library uses `ReactDOM.findDOMNode`, which is removed in React 19.
The library is unmaintained (no fix planned). It is used in exactly one file.

**Current usage** (`src/components/meal/guest_dropdown.jsx`):
```js
import onClickOutside from "react-onclickoutside";

class GuestDropdown extends Component {
  handleClickOutside() {
    this.setState({ showDropdown: false });
  }
  // ...
}
export default onClickOutside(GuestDropdown);
```

**Replacement:** Add a `ref` to the dropdown's outer container and attach a
`mousedown` listener to `document` that checks whether the click target is
outside the ref. This is the standard pattern recommended by the React docs.

Since the codebase uses class components, the implementation uses `createRef`:

```js
class GuestDropdown extends Component {
  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClickOutside);
  }

  handleClickOutside(event) {
    if (this.wrapperRef.current && !this.wrapperRef.current.contains(event.target)) {
      this.setState({ showDropdown: false });
    }
  }

  render() {
    return <div ref={this.wrapperRef}>...</div>;
  }
}

export default GuestDropdown;  // no HOC wrapper
```

**Files changed:** 1 (`src/components/meal/guest_dropdown.jsx`)
**Package removed:** `react-onclickoutside`

### 1.2 ~~Upgrade react-big-calendar~~ — ALREADY DONE

Completed during the moment→dayjs migration. react-big-calendar is now at
1.19.4, using `dayjsLocalizer` instead of `momentLocalizer`. Calendar event
start/end strings are converted to native `Date` objects in `loadMonth`.
All 4 calendar e2e tests pass. **No action needed.**

### 1.3 Upgrade mobx-react from 7.6.0 to 9.2.x

**Why:** mobx-react 7.x has `peerDependencies: react ^16-18`. React 19 support
was added in 9.2.0 (peer dep: `react ^16-19`). This is a major version jump
(7 → 9) so it needs careful review.

**Key changes in mobx-react 8.x/9.x** (from changelogs):
- v8.0: Dropped support for React <16.8 (class components still supported)
- v9.0: Internal refactoring, no public API changes that affect this codebase
- The `observer`, `inject`, and `Provider` APIs that this codebase uses
  extensively are all still available and work the same way

**Steps:**
1. `npm install mobx-react@^9.2.0`
2. Run unit tests (`tests/unit/stores/`)
3. Run e2e tests
4. Verify that all `inject("store")` / `observer()` wrapped components render
   correctly

**Files changed:** 0 source files, 1 `package.json`

### 1.4 Replace react-debounce-input with inline implementation

**Why:** The library is abandoned (last published 4+ years ago) and its peer dep
does not include React 19. It is used in exactly one file. The functionality is
trivial to inline.

**Current usage** (`src/components/meal/menu_box.jsx`):
```jsx
import DebounceInput from "react-debounce-input";
// ...
<DebounceInput
  element="textarea"
  debounceTimeout={700}
  value={store.meal.description || ""}
  onChange={(e) => store.setDescription(e.target.value)}
  // ...
/>
```

**Replacement:** A class component with a `setTimeout`-based debounce in the
`onChange` handler. This keeps the pattern consistent with the rest of the
codebase (class components, no hooks).

```jsx
class DebouncedTextarea extends Component {
  constructor(props) {
    super(props);
    this.state = { value: props.value || "" };
    this.timeout = null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value && this.props.value !== this.state.value) {
      this.setState({ value: this.props.value || "" });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handleChange = (e) => {
    const val = e.target.value;
    this.setState({ value: val });
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.props.onChange(val);
    }, this.props.debounceTimeout || 700);
  };

  render() {
    return (
      <textarea
        value={this.state.value}
        onChange={this.handleChange}
        className={this.props.className}
        disabled={this.props.disabled}
      />
    );
  }
}
```

**IMPORTANT: onChange callback signature change.** The `DebounceInput` library
called `onChange` with a synthetic event object. The replacement calls
`this.props.onChange(val)` with a raw string. The usage in `menu_box.jsx` must
be updated simultaneously:

```jsx
// BEFORE (event-based)
onChange={e => store.setDescription(e.target.value)}

// AFTER (value-based)
onChange={val => store.setDescription(val)}
```

The `aria-label` prop also needs to be passed through to the `<textarea>`.

This can be defined directly in `menu_box.jsx` or in a small shared file.
Either way, the external dependency is removed.

**Files changed:** 1 (`src/components/meal/menu_box.jsx`)
**Package removed:** `react-debounce-input`

### 1.5 Upgrade @fortawesome/react-fontawesome from 0.2.6 to 3.x

**Why:** Version 0.2.6 has a known bug in React 19 where it throws when
`className` is not explicitly passed to `<FontAwesomeIcon>`. Version 3.0+
(a TypeScript rewrite) fixes this.

**Steps:**
1. `npm install @fortawesome/react-fontawesome@^3.0.0`
2. Review all `<FontAwesomeIcon>` usages to confirm the component API is
   unchanged (icon prop, className, onClick, etc.)
3. Run e2e tests to verify icons render correctly

**Files changed:** 0 source files (if API is unchanged), 1 `package.json`

---

## Phase 2: Upgrade react-router-dom from v5 to v6

This is the largest single piece of work in the upgrade. React Router v5 does
not officially support React 19. The migration from v5 to v6 involves
significant API changes.

### 2.1 Overview of v5 → v6 Changes

| v5 Pattern | v6 Replacement |
|---|---|
| `<Switch>` | `<Routes>` |
| `<Route component={X}>` | `<Route element={<X />}>` |
| `<Route render={() => ...}>` | `<Route element={...}>` |
| `<Redirect to="...">` | `<Navigate to="..." replace>` |
| `exact` prop on `<Route>` | Not needed (v6 matches exactly by default) |
| `withRouter(Component)` | Use `useNavigate`, `useParams`, `useLocation` hooks |
| `this.props.match.params` | `useParams()` hook |
| `this.props.history.push()` | `useNavigate()` hook |
| `this.props.location` | `useLocation()` hook |

### 2.2 Impact on Class Components

React Router v6 is hook-based. It does not ship `withRouter`. The codebase has
5 components wrapped in `withRouter`:

| File | Component | Uses from router |
|---|---|---|
| `src/components/app/scroll_to_top.jsx` | `ScrollToTop` | `location.pathname` |
| `src/components/calendar/show.jsx` | `MainCalendar` | `match.params`, `history.push` |
| `src/components/meals/edit.jsx` | `MealsEdit` | `match.params` |
| `src/components/residents/login.jsx` | `ResidentsLogin` | `location`, `history.push` |
| `src/components/meal/date_box.jsx` | `DateBox` | `history.push` |

Plus 10 more components that access `this.props.match.params` via route render
props (events/new, events/edit, guest_room_reservations/new, etc.).

**Strategy:** Create a thin `withRouter` shim that wraps v6 hooks and injects
them as props into class components. This is the recommended migration pattern
from the React Router docs for class-component-heavy codebases:

```jsx
import { useNavigate, useParams, useLocation } from "react-router-dom";

export function withRouter(Component) {
  function ComponentWithRouter(props) {
    const navigate = useNavigate();
    const params = useParams();
    const location = useLocation();
    return (
      <Component
        {...props}
        navigate={navigate}
        params={params}
        location={location}
        // Provide a history-like object for compat
        history={{ push: navigate, replace: (to) => navigate(to, { replace: true }) }}
        match={{ params }}
      />
    );
  }
  ComponentWithRouter.displayName = `withRouter(${Component.displayName || Component.name})`;
  return ComponentWithRouter;
}
```

This shim allows existing class components to keep using `this.props.match.params`
and `this.props.history.push()` without converting them to functional components.
The shim can be removed incrementally if/when components are converted to
functions with hooks later.

### 2.3 Route Definition Changes (src/index.jsx)

The route definitions in `src/index.jsx` need to be converted from v5 to v6
syntax. This is the main structural change.

**Current pattern (v5):**
```jsx
<Switch>
  <PrivateRoute exact path="/calendar/:type/:date" component={Calendar} />
  <PrivateRoute exact path="/meals/:id/edit" component={MealsEdit} />
  <Route exact path="/login" component={Login} />
  {/* etc. */}
</Switch>
```

**New pattern (v6):**
```jsx
<Routes>
  <Route path="/calendar/:type/:date" element={<PrivateRoute><Calendar /></PrivateRoute>} />
  <Route path="/meals/:id/edit" element={<PrivateRoute><MealsEdit /></PrivateRoute>} />
  <Route path="/login" element={<Login />} />
  {/* etc. */}
</Routes>
```

The `PrivateRoute` component (`src/components/app/private_route.jsx`) also needs
updating. In v5 it renders a `<Route>` or `<Redirect>`. In v6 it should render
children or `<Navigate>`.

### 2.4 File-by-File Changes

| File | Changes |
|---|---|
| `src/index.jsx` | `Switch` → `Routes`, `Route` props, `Redirect` → `Navigate`, update PrivateRoute usage |
| `src/components/app/private_route.jsx` | Rewrite to use `<Navigate>` instead of `<Redirect>`, render children instead of `component` prop |
| `src/components/app/scroll_to_top.jsx` | Add `withRouter` shim or convert to function with `useLocation` |
| `src/components/calendar/show.jsx` | Update `withRouter` import source |
| `src/components/meals/edit.jsx` | Update `withRouter` import source |
| `src/components/residents/login.jsx` | Update `withRouter` import source |
| `src/components/meal/date_box.jsx` | Update `withRouter` import source |
| `src/components/events/new.jsx` | Access params via shim or hook |
| `src/components/events/edit.jsx` | Access params via shim or hook |
| `src/components/guest_room_reservations/new.jsx` | Access params via shim or hook |
| `src/components/guest_room_reservations/edit.jsx` | Access params via shim or hook |
| `src/components/common_house_reservations/new.jsx` | Access params via shim or hook |
| `src/components/common_house_reservations/edit.jsx` | Access params via shim or hook |
| `src/components/residents/password_new.jsx` | Access params via shim or hook |

**New file:** `src/helpers/with_router.jsx` (the shim)

### 2.5 Optional Route Params (`:param?` syntax)

The current routes use v5 optional params:

```
/calendar/:type/:date/:modal?/:view?/:id?
/:modal?/:token?
```

React Router v6 re-added optional param support (`?` suffix) in **v6.21.0**.
Earlier v6 versions do NOT support it. The install must pin to v6.21+:

```
npm install react-router-dom@^6.21.0
```

With v6.21+, the optional param syntax works the same as v5:

```jsx
<Route path="/calendar/:type/:date/:modal?/:view?/:id?" element={...} />
<Route path="/:modal?/:token?" element={...} />
```

### 2.6 Trailing-Slash Redirect Route

The current v5 route:
```jsx
<Route exact strict path="/:url*"
  render={props => (<Redirect to={`${props.location.pathname}/`} />)} />
```

In v6, `exact` and `strict` don't exist. `<Redirect>` is replaced by
`<Navigate>`. The trailing-slash enforcement can be done with a layout route
or a simple component:

```jsx
function TrailingSlashRedirect() {
  const location = useLocation();
  if (!location.pathname.endsWith("/")) {
    return <Navigate to={location.pathname + "/"} replace />;
  }
  return null;
}

// In Routes:
<Routes>
  <Route path="*" element={<TrailingSlashRedirect />} />
  {/* ... other routes ... */}
</Routes>
```

Or, if v6's default behavior already handles trailing slashes correctly for
this app, this route may no longer be needed. Test by removing it and verifying
navigation still works.

### 2.7 Install

```
npm install react-router-dom@^6.21.0
```

Note: Pinned to v6.21+ (not just ^6) to ensure optional param support.
Going directly to v6 rather than v7. React Router v7 is a larger change
(introduces loader/action patterns from Remix) and is unnecessary for this
codebase. v6 is the minimal step needed for React 19 compatibility and has the
most established migration guides.

---

## Phase 3: Switch JSX Runtime to Automatic

**Why:** The codebase uses `jsxRuntime: "classic"` in vite.config.js, which means
every JSX file must `import React from "react"`. React 19 still supports the
classic runtime, so this is not strictly a blocker, but:
1. The automatic runtime is the standard since React 17 (2020)
2. It slightly reduces bundle size (no `React.createElement` calls in output)
3. It removes 28 unnecessary `import React from "react"` lines
4. The comment in vite.config.js says "React 16" which is inaccurate — the app
   is on React 18

**Steps:**

1. In `vite.config.js`, remove `jsxRuntime: "classic"` (or change to
   `jsxRuntime: "automatic"`, which is the default):
   ```js
   plugins: [
     react(),  // automatic runtime is the default
   ],
   ```

2. Remove the bare `import React from "react"` from files that do not reference
   `React` directly. Files that use `React.lazy`, `React.Fragment`, `Component`,
   etc. keep their imports but only import what they use:
   ```js
   // BEFORE
   import React, { Component } from "react";

   // AFTER (if Component is used but React namespace is not)
   import { Component } from "react";
   ```

3. Files that reference the `React` namespace directly keep the React import
   (or destructure the specific API they use):
   - `src/index.jsx` — uses `React.lazy()` → keep `import React from "react"`
   - `src/components/meal/date_box.jsx` — uses `React.lazy()` → keep import
   - `src/components/common/day_picker_input.jsx` — uses `React.createRef()` →
     either keep `import React` or change to
     `import { Component, createRef } from "react"` and use `createRef()`

4. Run `npm run build` and `npm test` to verify nothing breaks.

**Files changed:** `vite.config.js` + up to 28 source files (import cleanup)

This phase is safe to do on React 18 before the final version bump. The
automatic JSX runtime works on React 17+.

---

## Phase 4: Bump React to 19

With all blockers resolved, the actual version bump is straightforward:

```
npm install react@^19 react-dom@^19
```

**What changes in application code:** Nothing. All breaking-change work was done
in Phases 1-3.

**Verification:**
1. `npm run build` — must succeed with no errors
2. `npm test` — all unit tests pass
3. `npm run test:e2e` — all Playwright e2e tests pass
4. Manual smoke test of critical paths:
   - Login flow
   - Calendar month/week/day views, navigation, event rendering
   - Meal page: attendees, cooks, extras, close/open, menu editing
   - Create/edit/delete: events, guest room reservations, common house reservations
   - Password reset flow
   - Version banner (if PLAN-version-banner is completed)

---

## Phase 5: Post-Upgrade Cleanup

These are optional quality-of-life improvements that become possible after React
19 but are not required for the upgrade to work.

### 5.1 Remove the withRouter shim (optional, incremental)

If/when class components are converted to functional components, they can use
React Router hooks directly (`useNavigate`, `useParams`, `useLocation`) and the
`withRouter` shim can be removed one component at a time.

**Not recommended to do as part of this upgrade.** The shim works and avoids the
risk of rewriting 15 components simultaneously.

### 5.2 Consider ref-as-prop pattern (informational)

React 19 passes `ref` as a regular prop instead of requiring `forwardRef`. This
is a simplification but does not affect the current codebase since no components
use refs or `forwardRef`.

---

## Complete Dependency Change Summary

| Package | Current | Target | Change type | Status |
|---|---|---|---|---|
| `react` | ^18.3.1 | ^19.0.0 | Major upgrade | Phase 4 |
| `react-dom` | ^18.3.1 | ^19.0.0 | Major upgrade | Phase 4 |
| `mobx-react` | ^7.6.0 | ^9.2.0 | Major upgrade | Phase 1.3 |
| `react-router-dom` | 5.2.0 | ^6.21.0 | Major upgrade | Phase 2 |
| `@fortawesome/react-fontawesome` | ^0.2.6 | ^3.0.0 | Major upgrade | Phase 1.5 |
| `react-onclickoutside` | ^6.13.2 | (removed) | Replaced with inline code | Phase 1.1 |
| `react-debounce-input` | ^3.3.0 | (removed) | Replaced with inline code | Phase 1.4 |
| `react-big-calendar` | ^1.17.1 | 1.19.4 | Minor upgrade | **DONE** |
| `react-day-picker` | 7.4.8 | ^9.14.0 | Major upgrade | **DONE** |
| `moment` | 2.29.4 | (removed) | Replaced with dayjs | **DONE** |

---

## Ordering Relative to Other Plans

Plans 1-5 are **all complete**. This is the final plan:

1. ~~PLAN-version-banner.md~~ — Done
2. ~~PLAN-eslint-config.md~~ — Done
3. ~~PLAN-form-loading-states.md~~ — Done
4. ~~PLAN-replace-window-alert.md~~ — Done
5. ~~PLAN-moment-dayjs-daypicker.md~~ — Done (also resolved react-big-calendar
   and react-day-picker blockers)
6. **PLAN-react-19-upgrade.md** (this plan) — Ready to execute. Two dependency
   blockers already resolved by plan #5. Remaining work: 4 dependency upgrades/
   removals, react-router v5→v6 migration, JSX runtime switch, React 19 bump.

---

## Risks

### 1. react-big-calendar Minor Upgrade Regression

**Risk:** The project has prior history of react-big-calendar breaking on minor
bumps. The 1.17.1 → 1.19.x upgrade crosses two minor versions.

**Mitigation:** Do this upgrade in isolation (Phase 1.2) on React 18 so any
regressions are clearly attributable to the calendar library, not React. Run the
full e2e test suite (`tests/e2e/calendar.spec.js`) and do manual visual testing
of all calendar views. If issues are found, they can be addressed before
proceeding with the React 19 bump.

### 2. mobx-react Major Version Jump (7 → 9)

**Risk:** Skipping a major version. Internal behavior of `observer` or `inject`
may differ.

**Mitigation:** The public API (`observer`, `inject`, `Provider`) is unchanged
across 7→8→9. The changes are internal (better React 18 concurrent mode
support). Unit tests for the MobX stores (`tests/unit/stores/`) verify
store behavior. E2e tests verify rendered output.

### 3. react-router-dom v5 → v6 is a Large Migration

**Risk:** This is the highest-effort phase. Route definitions, private route
logic, and 15 components that access router props all need changes.

**Mitigation:** The `withRouter` shim strategy keeps the blast radius contained.
Components keep their existing prop-based API (`this.props.match.params`,
`this.props.history.push`). Only `src/index.jsx`, `private_route.jsx`, and the
shim itself need structural changes. The shim can be tested independently before
wiring it into all components.

### 4. react-onclickoutside Replacement May Miss Edge Cases

**Risk:** The document-level `mousedown` listener approach may behave slightly
differently than the library's internal implementation (which used `findDOMNode`
to locate the wrapped component's DOM node).

**Mitigation:** The replacement pattern is well-established and recommended by
React docs. The library is only used for one dropdown (`guest_dropdown.jsx`).
Manual testing: open the dropdown, click outside, verify it closes. Click inside,
verify it stays open. Test on touch devices if applicable.

### 5. @fortawesome/react-fontawesome v3 is a Full Rewrite

**Risk:** Version 3.x is a TypeScript rewrite. While the component API
(`<FontAwesomeIcon icon={...} />`) is intended to be compatible, there may be
subtle differences.

**Mitigation:** The codebase uses a straightforward subset of the API (icon prop,
className, onClick). Search all `<FontAwesomeIcon` usages, verify each prop is
still supported in v3. Run e2e visual tests to confirm icons render.

### 6. Class Components Are Not Deprecated in React 19

**Non-risk (clarification):** React 19 fully supports class components. There is
no need to convert the 25 class components to functions as part of this upgrade.
The class-to-function conversion is a separate, optional project that can be done
incrementally over time if desired.

---

## Testing Strategy

Each phase should be verified independently before proceeding to the next:

| Phase | Automated tests | Manual verification |
|---|---|---|
| 1.1 (onclickoutside) | E2e meal page tests | Open/close guest dropdown |
| 1.2 (big-calendar) | `calendar.spec.js` e2e | All calendar views, nav, events |
| 1.3 (mobx-react) | Unit tests + all e2e | Every page that uses store data |
| 1.4 (debounce-input) | E2e meal page tests | Type in menu description, verify debounce |
| 1.5 (fontawesome) | E2e visual tests | Icons visible on all pages |
| 2 (react-router) | All e2e tests | Every route, login redirect, deep linking |
| 3 (JSX runtime) | `npm run build` + all tests | Verify no missing React imports |
| 4 (React 19 bump) | Full test suite | Full manual smoke test |
