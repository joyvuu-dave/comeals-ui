# Migration Plan: Replace moment.js with dayjs + Upgrade react-day-picker v7 to v9

**Date:** 2026-03-28 (updated 2026-03-30)
**Scope:** 12 source files, 1 CSS file, 2 config files, 2 e2e test files

**Note:** Since this plan was originally written, three other plans have been
implemented that modified the 6 form components:
1. **Form loading states** — added `loading`/`loadingAction` state, disabled
   inputs during submission, wrapped DayPickerInput in a loading div
2. **Toast notifications** — replaced `window.alert()` catch blocks with
   `handleAxiosError()`
3. **Confirmation modals** — replaced `window.confirm()` in edit forms with
   `ConfirmModal` component, split `handleDelete` into three methods

The "BEFORE" code snippets in this plan reflect the current state of the files
(after those changes). The DayPicker migration must preserve the loading wrapper
divs and `inputDisabled` behavior.

---

## Part 1: Replace moment.js with dayjs

### 1.1 Packages to Install

```
npm install dayjs
```

No other packages needed. dayjs ships with built-in plugins in `dayjs/plugin/*`.

`react-big-calendar@1.17.1` already lists `dayjs` as a dependency and ships a
`dayjsLocalizer` -- so dayjs will already be in node_modules after install. Adding
it to our own package.json makes the direct dependency explicit.

### 1.2 dayjs Plugins Required

The codebase uses the following moment APIs that require dayjs plugins:

| moment API used          | dayjs plugin needed       | Registration                                     |
|--------------------------|---------------------------|--------------------------------------------------|
| `.format("ddd, MMM Do")` (ordinal `Do`) | `advancedFormat`     | `dayjs.extend(advancedFormat)`                  |
| `.from(other)`           | `relativeTime`            | `dayjs.extend(relativeTime)`                     |
| `.diff(other, 'days')`   | (built-in -- no plugin)   | n/a                                              |
| `.add(6, 'M')`           | (built-in -- no plugin)   | n/a                                              |
| `.isBefore(other, 'day')` | `isSameOrBefore` is NOT needed; built-in `isBefore` supports unit granularity | n/a |
| `.toDate()`              | (built-in -- no plugin)   | n/a                                              |
| `.year()`, `.month()`, `.date()` | (built-in -- no plugin) | n/a                                           |

Create a single setup file, e.g. `src/dayjs-setup.js`:

```js
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

export default dayjs;
```

Every file that currently does `import moment from "moment"` should instead do:

```js
import dayjs from "../dayjs-setup";    // adjust relative path per file
```

Or, alternatively, register the plugins once in `src/index.jsx` before the app
renders and then each file can simply `import dayjs from "dayjs"` with the
plugins already active globally. The index.jsx approach is simpler and avoids
the custom import path. **Recommended: register plugins in index.jsx.**

### 1.3 Locale Setup

The codebase uses only the default English locale. No `dayjs/locale/*` import
is needed. If locale support becomes necessary later, add
`import 'dayjs/locale/en'` and `dayjs.locale('en')`.

### 1.4 File-by-File Moment-to-dayjs Migration

#### 1.4.1 `src/stores/data_store.js`

**Current moment usage (3 call sites):**

1. Default value for `currentDate`:
   ```js
   // BEFORE
   currentDate: types.optional(types.string, function() { return moment().format("YYYY-MM-DD"); }),
   // AFTER
   currentDate: types.optional(types.string, function() { return dayjs().format("YYYY-MM-DD"); }),
   ```

2. `loadMonth` action -- building Pusher subscribe string:
   ```js
   // BEFORE
   var subscribeString = `community-${Cookie.get("community_id")}-calendar-${moment(self.currentDate).format("YYYY")}-${moment(self.currentDate).format("M")}`;
   // AFTER
   var subscribeString = `community-${Cookie.get("community_id")}-calendar-${dayjs(self.currentDate).format("YYYY")}-${dayjs(self.currentDate).format("M")}`;
   ```

3. `switchMonths` action -- building localforage key:
   ```js
   // BEFORE
   var myDate = moment(date);
   const key = `community-${Cookie.get("community_id")}-calendar-${myDate.format("YYYY")}-${myDate.format("M")}`;
   // AFTER
   var myDate = dayjs(date);
   const key = `community-${Cookie.get("community_id")}-calendar-${myDate.format("YYYY")}-${myDate.format("M")}`;
   ```

**Note on `dayjs().format("M")`:** dayjs `M` gives month 1-12 (not zero-based), same as moment. This is safe.

#### 1.4.2 `src/components/calendar/show.jsx`

**Current moment usage (6 call sites + momentLocalizer):**

1. Calendar localizer (see Section 1.5 below for full detail):
   ```js
   // BEFORE
   import { Calendar, momentLocalizer } from "react-big-calendar";
   const localizer = momentLocalizer(moment);
   // AFTER
   import { Calendar, dayjsLocalizer } from "react-big-calendar";
   const localizer = dayjsLocalizer(dayjs);
   ```

2. Toolbar month/year display:
   ```js
   // BEFORE
   <h2>{moment(this.props.date).format("MMMM YYYY")}</h2>
   // AFTER
   <h2>{dayjs(this.props.date).format("MMMM YYYY")}</h2>
   ```

3. `formatEvent` -- formatting start date and comparing to today:
   ```js
   // BEFORE
   const startString = moment(event.start).format();
   const todayString = moment().format("YYYY-MM-DD");
   if (moment(startString).isBefore(todayString, "day") && typeof event.url !== "undefined") {
   // AFTER
   const startString = dayjs(event.start).format();
   const todayString = dayjs().format("YYYY-MM-DD");
   if (dayjs(startString).isBefore(todayString, "day") && typeof event.url !== "undefined") {
   ```
   **Note:** `dayjs().isBefore(other, unit)` works identically to moment -- the second argument for granularity is built-in, no plugin needed.

4. Header date display:
   ```js
   // BEFORE
   <h5 className="pad-xs">{moment().format("ddd MMM Do")}</h5>
   // AFTER
   <h5 className="pad-xs">{dayjs().format("ddd MMM Do")}</h5>
   ```
   **Note:** The `Do` ordinal token (1st, 2nd, 3rd...) requires the `advancedFormat` plugin.

5. `handleNavigate`:
   ```js
   // BEFORE
   `/calendar/${this.props.match.params.type}/${moment(event).format("YYYY-MM-DD")}`
   // AFTER
   `/calendar/${this.props.match.params.type}/${dayjs(event).format("YYYY-MM-DD")}`
   ```

6. `defaultDate` prop on Calendar:
   ```js
   // BEFORE
   defaultDate={moment(this.props.match.params.date).toDate()}
   // AFTER
   defaultDate={dayjs(this.props.match.params.date).toDate()}
   ```

#### 1.4.3 `src/components/meal/date_box.jsx`

**Current moment usage (5 call sites):**

1. `displayDate()` -- constructing "today" reference and computing relative days:
   ```js
   // BEFORE
   var today = moment([moment().year(), moment().month(), moment().date()]);
   var days = moment(this.props.store.meal.date).diff(today, "days");
   // ...
   return moment(this.props.store.meal.date).from(today);

   // AFTER
   var today = dayjs().startOf("day");
   var days = dayjs(this.props.store.meal.date).diff(today, "day");
   // ...
   return dayjs(this.props.store.meal.date).from(today);
   ```
   **Note on `moment([y, m, d])` pattern:** moment accepts an array to build a date
   at midnight. The dayjs equivalent is `dayjs().startOf("day")` which gives the
   same result (today at 00:00:00). The `.from()` method requires the `relativeTime`
   plugin.

   **Note on `.diff()` unit:** moment uses `"days"` (plural), dayjs uses `"day"`
   (singular). Both work in dayjs (it normalizes), but `"day"` is canonical.

2. `displayTopDate()`:
   ```js
   // BEFORE
   return moment(this.props.store.meal.date).format("ddd, MMM Do");
   // AFTER
   return dayjs(this.props.store.meal.date).format("ddd, MMM Do");
   ```
   **Note:** Requires `advancedFormat` plugin for `Do`.

#### 1.4.4 `src/components/meal/header.jsx`

**Current moment usage (1 call site):**

```js
// BEFORE
`/calendar/all/${moment(
  this.props.store.isLoading ? new Date() : this.props.store.meal.date
).format("YYYY-MM-DD")}`

// AFTER
`/calendar/all/${dayjs(
  this.props.store.isLoading ? new Date() : this.props.store.meal.date
).format("YYYY-MM-DD")}`
```

#### 1.4.5 `src/components/history/show.jsx`

**Current moment usage (2 call sites):**

1. Formatting the meal date header:
   ```js
   // BEFORE
   date: moment(response.data.date).format("ddd, MMM Do"),
   // AFTER
   date: dayjs(response.data.date).format("ddd, MMM Do"),
   ```
   Requires `advancedFormat` plugin for `Do`.

2. Formatting audit timestamps:
   ```js
   // BEFORE
   {moment(audit.display_time).format("ddd MMM D, h:mm a")}
   // AFTER
   {dayjs(audit.display_time).format("ddd MMM D, h:mm a")}
   ```
   **Note on `h:mm a`:** In moment, lowercase `a` gives "am"/"pm". In dayjs, lowercase
   `a` also gives "am"/"pm". This is compatible. No issue here.

#### 1.4.6 `src/components/residents/login.jsx`

**Current moment usage (1 call site):**

```js
// BEFORE
from: { pathname: `/calendar/all/${moment().format("YYYY-MM-DD")}` }
// AFTER
from: { pathname: `/calendar/all/${dayjs().format("YYYY-MM-DD")}` }
```

#### 1.4.7–1.4.12 Form components (events, guest_room_reservations, common_house_reservations)

**Note:** The moment-to-dayjs changes in these 6 form files happen simultaneously
with the react-day-picker v9 migration (Part 2). The final code uses
`DayPickerInputWrapper` with `disabledDays` and `defaultMonth` props — see
sections 2.4.1–2.4.6 for the complete replacement patterns including loading
state wrappers.

The moment usages below are all inside DayPickerInput props that get replaced
by the wrapper. They are listed here for reference only.

#### 1.4.7 `src/components/events/new.jsx`

**Current moment usage (2 call sites, both inside DayPickerInput props):**

```js
// BEFORE
initialMonth: moment(this.props.match.params.date).toDate(),
disabledDays: [{ after: moment(this.props.match.params.date).add(6, "M").toDate() }]

// AFTER
initialMonth: dayjs(this.props.match.params.date).toDate(),
disabledDays: [{ after: dayjs(this.props.match.params.date).add(6, "month").toDate() }]
```

**Note:** dayjs `.add()` unit: use `"month"` (dayjs also accepts `"M"` as a shorthand but
`"month"` is more readable and conventional).

These prop names will also change as part of the react-day-picker v9 migration
(Part 2). See Section 2.3.

#### 1.4.8 `src/components/events/edit.jsx`

**Current moment usage (1 call site, inside DayPickerInput props):**

```js
// BEFORE
disabledDays: [{ after: moment(this.state.event.start_date).add(6, "M").toDate() }]
// AFTER
disabledDays: [{ after: dayjs(this.state.event.start_date).add(6, "month").toDate() }]
```

Also changes as part of react-day-picker v9 migration.

#### 1.4.9 `src/components/guest_room_reservations/new.jsx`

**Current moment usage (2 call sites, inside DayPickerInput props):**

```js
// BEFORE
initialMonth: moment(this.props.match.params.date).toDate(),
disabledDays: [{ after: moment(this.props.match.params.date).add(6, "M").toDate() }]
// AFTER
defaultMonth: dayjs(this.props.match.params.date).toDate(),
disabledDays: [{ after: dayjs(this.props.match.params.date).add(6, "month").toDate() }]
```

#### 1.4.10 `src/components/guest_room_reservations/edit.jsx`

**Current moment usage (1 call site, inside DayPickerInput props):**

```js
// BEFORE
disabledDays: [{ after: moment(this.state.event.date).add(6, "M").toDate() }]
// AFTER
disabledDays: [{ after: dayjs(this.state.event.date).add(6, "month").toDate() }]
```

#### 1.4.11 `src/components/common_house_reservations/new.jsx`

**Current moment usage (2 call sites, inside DayPickerInput props):**

```js
// BEFORE
initialMonth: moment(this.props.match.params.date).toDate(),
disabledDays: [{ after: moment(this.props.match.params.date).add(6, "M").toDate() }]
// AFTER
defaultMonth: dayjs(this.props.match.params.date).toDate(),
disabledDays: [{ after: dayjs(this.props.match.params.date).add(6, "month").toDate() }]
```

#### 1.4.12 `src/components/common_house_reservations/edit.jsx`

**Current moment usage (1 call site, inside DayPickerInput props):**

```js
// BEFORE
disabledDays: [{ after: moment(this.state.event.start_date).add(6, "M").toDate() }]
// AFTER
disabledDays: [{ after: dayjs(this.state.event.start_date).add(6, "month").toDate() }]
```

### 1.5 react-big-calendar: momentLocalizer to dayjsLocalizer

`react-big-calendar@1.17.1` ships with a built-in `dayjsLocalizer`. The change
is in one file only: `src/components/calendar/show.jsx`.

```js
// BEFORE
import moment from "moment";
import { Calendar, momentLocalizer } from "react-big-calendar";
const localizer = momentLocalizer(moment);

// AFTER
import dayjs from "dayjs";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
const localizer = dayjsLocalizer(dayjs);
```

The `dayjsLocalizer` from react-big-calendar internally registers its own
plugins (`isBetween`, `isSameOrAfter`, `isSameOrBefore`, `localeData`,
`localizedFormat`, `minMax`, `utc`). These do NOT conflict with the
`advancedFormat` and `relativeTime` plugins registered in our setup -- dayjs
plugin registration is idempotent.

**Important:** Because `dayjsLocalizer` extends dayjs globally (via
`dayjs.extend()`), if we register our own plugins in `src/index.jsx` BEFORE the
Calendar component mounts, everything will work. The order does not actually
matter since plugins are additive, but for clarity, register our plugins first.

---

## Part 2: Upgrade react-day-picker from v7 to v9

### 2.1 What Changed Between v7 and v9

- **v7** shipped `DayPickerInput`, a combined input+calendar dropdown component.
  Import: `import DayPickerInput from "react-day-picker/DayPickerInput"`.
- **v8** (released 2022) **removed `DayPickerInput` entirely**. The library now
  exports only the `<DayPicker>` calendar component. Users must compose their
  own input+popover pattern.
- **v9** (released 2024) continues without `DayPickerInput`. The API is refined
  but the core approach is the same as v8.
- The `react-day-picker/moment` sub-module (which exported `formatDate` and
  `parseDate` helpers that used moment internally) **no longer exists** in v8/v9.
  v9 is date-library-agnostic.
- CSS class names changed completely. v7 used `.DayPicker-Day`, `.DayPickerInput`,
  `.DayPickerInput-Overlay`, etc. v9 uses `.rdp-day`, `.rdp-month`, etc.
- v9's only peer dependency is `react >= 16.8.0`. No date library dependency.

### 2.2 CSS Changes

In `src/styles.css`:
```css
/* BEFORE */
@import "react-day-picker/lib/style.css";

/* AFTER */
@import "react-day-picker/style.css";
```

The v9 CSS file path changes from `lib/style.css` to `style.css`. The class
names are entirely different (prefixed with `rdp-` instead of `DayPicker-`).

### 2.3 Replacement Pattern for DayPickerInput

Since v9 has no `DayPickerInput`, we need to build a reusable wrapper. Create a
shared component at `src/components/common/day_picker_input.jsx`:

```jsx
import React, { Component } from "react";
import { DayPicker } from "react-day-picker";
import dayjs from "dayjs";

class DayPickerInputWrapper extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    };
    this.wrapperRef = React.createRef();
    this.handleInputClick = this.handleInputClick.bind(this);
    this.handleDaySelect = this.handleDaySelect.bind(this);
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
      this.setState({ isOpen: false });
    }
  }

  handleInputClick() {
    if (this.props.inputDisabled) return;
    this.setState({ isOpen: true });
  }

  handleDaySelect(date) {
    this.setState({ isOpen: false });
    if (this.props.onDayChange) {
      this.props.onDayChange(date);
    }
  }

  formatValue() {
    if (!this.props.value) return this.props.placeholder || "";
    return dayjs(this.props.value).format("MM/DD/YYYY");
  }

  render() {
    return (
      <div ref={this.wrapperRef} style={{ display: "inline-block", position: "relative" }}>
        <input
          type="text"
          readOnly
          disabled={this.props.inputDisabled}
          value={this.formatValue()}
          onClick={this.handleInputClick}
          placeholder={this.props.placeholder || ""}
        />
        {this.state.isOpen && (
          <div style={{
            position: "absolute",
            left: 0,
            zIndex: 1,
            background: "#fff",
            boxShadow: "0 2px 5px rgba(0,0,0,0.15)"
          }}>
            <DayPicker
              mode="single"
              selected={this.props.value ? dayjs(this.props.value).toDate() : undefined}
              onSelect={this.handleDaySelect}
              defaultMonth={this.props.defaultMonth}
              disabled={this.props.disabledDays}
            />
          </div>
        )}
      </div>
    );
  }
}

export default DayPickerInputWrapper;
```

**Changes from the naive implementation:**

- **`selected` uses `dayjs().toDate()` instead of `new Date()`** — `new Date("2026-01-15")`
  parses date-only strings as UTC midnight, which displays as the wrong day in
  timezones behind UTC. `dayjs("2026-01-15").toDate()` parses as local time,
  matching the original moment behavior.
- **`disabledDays` prop (not `disabled`)** — avoids confusion with the HTML
  `disabled` attribute. The wrapper maps `this.props.disabledDays` to
  `<DayPicker disabled={...}>` internally.
- **`inputDisabled` prop** — adds `disabled` to the `<input>` element for form
  loading states. When `inputDisabled` is true, `handleInputClick` also returns
  early to prevent opening the calendar.

**Props summary:**

| Prop | Type | Purpose |
|------|------|---------|
| `value` | Date/string | Currently selected date |
| `placeholder` | string | Placeholder text when no date selected |
| `onDayChange` | function(Date) | Callback when a day is selected |
| `defaultMonth` | Date | Initial month shown in calendar |
| `disabledDays` | matcher[] | Days that cannot be selected (passed to DayPicker `disabled`) |
| `inputDisabled` | boolean | Disables the input element (for form loading states) |

This wrapper replicates the v7 DayPickerInput behavior:
- Shows a text input that displays the formatted date
- Opens a DayPicker calendar dropdown on click
- Closes on outside click
- Calls `onDayChange(date)` when a day is selected
- Supports disabling the input for form loading states

### 2.4 Form Component Migration (6 files)

All 6 form components follow an identical pattern. Here is what changes for each.

#### 2.4.1 `src/components/events/new.jsx`

**Note:** This file (and all 6 form files) was modified by the form loading
states plan and the toast notification plan. The current code has a loading
wrapper div around DayPickerInput with `inputProps={{ disabled }}` and
`pointerEvents`/`opacity` styling. These must be preserved in the migration.

**Current code (after loading states + toast changes):**
```jsx
import DayPickerInput from "react-day-picker/DayPickerInput";
import { formatDate, parseDate } from "react-day-picker/moment";
// ...
<div style={this.state.loading ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInput
    formatDate={formatDate}
    parseDate={parseDate}
    placeholder={""}
    onDayChange={this.handleDayChange}
    inputProps={{ disabled: this.state.loading }}
    dayPickerProps={{
      initialMonth: moment(this.props.match.params.date).toDate(),
      disabledDays: [{
        after: moment(this.props.match.params.date).add(6, "M").toDate()
      }]
    }}
  />
</div>
```

**v9 replacement:**
```jsx
import DayPickerInputWrapper from "../common/day_picker_input";
import dayjs from "dayjs";
// ...
<div style={this.state.loading ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInputWrapper
    placeholder=""
    onDayChange={this.handleDayChange}
    inputDisabled={this.state.loading}
    defaultMonth={dayjs(this.props.match.params.date).toDate()}
    disabledDays={[{
      after: dayjs(this.props.match.params.date).add(6, "month").toDate()
    }]}
  />
</div>
```

**Props that changed:**
- `formatDate` / `parseDate` -- removed (handled inside wrapper with dayjs)
- `inputProps={{ disabled }}` --> `inputDisabled` (wrapper prop)
- `dayPickerProps.initialMonth` --> `defaultMonth` (v9 DayPicker prop name)
- `dayPickerProps.disabledDays` --> `disabledDays` (wrapper maps to DayPicker `disabled`)
- `onDayChange` -- kept (wrapper passes through)
- Loading wrapper div -- kept as-is

#### 2.4.2 `src/components/events/edit.jsx`

**Note:** Edit forms use `loadingAction` (not `loading`). They also have
`handleDeleteClick`/`handleDeleteConfirm`/`handleDeleteCancel` methods and a
`<ConfirmModal>` — these are unrelated to the DayPicker migration but the
plan's code snippets should reflect the actual component structure.

**Current code (after loading states + toast + confirm modal changes):**
```jsx
<div style={this.state.loadingAction !== null ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInput
    formatDate={formatDate}
    parseDate={parseDate}
    onDayChange={this.handleDayChange}
    value={formatDate(this.state.event.start_date)}
    inputProps={{ disabled: this.state.loadingAction !== null }}
    dayPickerProps={{
      disabledDays: [{
        after: moment(this.state.event.start_date).add(6, "M").toDate()
      }]
    }}
  />
</div>
```

**v9 replacement:**
```jsx
<div style={this.state.loadingAction !== null ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInputWrapper
    value={this.state.event.start_date}
    onDayChange={this.handleDayChange}
    inputDisabled={this.state.loadingAction !== null}
    disabledDays={[{
      after: dayjs(this.state.event.start_date).add(6, "month").toDate()
    }]}
  />
</div>
```

**Props that changed:**
- `formatDate` / `parseDate` -- removed
- `value={formatDate(...)}` --> `value={this.state.event.start_date}` (wrapper formats internally)
- `inputProps={{ disabled }}` --> `inputDisabled`
- `dayPickerProps.disabledDays` --> `disabledDays`
- Loading wrapper div -- kept as-is

#### 2.4.3 `src/components/guest_room_reservations/new.jsx`

Same pattern as events/new.jsx — `loading` boolean, loading wrapper div
preserved, `inputDisabled={this.state.loading}`:

```jsx
<div style={this.state.loading ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInputWrapper
    placeholder=""
    onDayChange={this.handleDayChange}
    inputDisabled={this.state.loading}
    defaultMonth={dayjs(this.props.match.params.date).toDate()}
    disabledDays={[{
      after: dayjs(this.props.match.params.date).add(6, "month").toDate()
    }]}
  />
</div>
```

#### 2.4.4 `src/components/guest_room_reservations/edit.jsx`

Same pattern as events/edit.jsx — `loadingAction`, loading wrapper div
preserved, `inputDisabled={this.state.loadingAction !== null}`:

```jsx
<div style={this.state.loadingAction !== null ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInputWrapper
    value={this.state.event.date}
    onDayChange={this.handleDayChange}
    inputDisabled={this.state.loadingAction !== null}
    disabledDays={[{
      after: dayjs(this.state.event.date).add(6, "month").toDate()
    }]}
  />
</div>
```

#### 2.4.5 `src/components/common_house_reservations/new.jsx`

Same pattern as events/new.jsx — `loading` boolean:

```jsx
<div style={this.state.loading ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInputWrapper
    placeholder=""
    onDayChange={this.handleDayChange}
    inputDisabled={this.state.loading}
    defaultMonth={dayjs(this.props.match.params.date).toDate()}
    disabledDays={[{
      after: dayjs(this.props.match.params.date).add(6, "month").toDate()
    }]}
  />
</div>
```

#### 2.4.6 `src/components/common_house_reservations/edit.jsx`

Same pattern as events/edit.jsx — `loadingAction`:

```jsx
<div style={this.state.loadingAction !== null ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
  <DayPickerInputWrapper
    value={this.state.event.start_date}
    onDayChange={this.handleDayChange}
    inputDisabled={this.state.loadingAction !== null}
    disabledDays={[{
      after: dayjs(this.state.event.start_date).add(6, "month").toDate()
    }]}
  />
</div>
```

### 2.5 Import Changes Summary (All 6 Form Files)

Since Parts 1 and 2 happen simultaneously, all import changes are listed here:

```js
// DELETE these three lines from every form component:
import DayPickerInput from "react-day-picker/DayPickerInput";
import { formatDate, parseDate } from "react-day-picker/moment";
import moment from "moment";

// ADD these two lines:
import DayPickerInputWrapper from "../common/day_picker_input";
import dayjs from "dayjs";
```

Note: The `import moment from "moment"` line is also removed from the 6
non-form files (data_store, calendar/show, meal/date_box, meal/header,
history/show, residents/login) and replaced with `import dayjs from "dayjs"`
as part of the Part 1 migration.

### 2.6 v9 `disabled` Prop Format

In v7, `disabledDays` accepted `{ after: Date }` objects. In v9, the `disabled`
prop accepts the same matcher syntax: `{ after: Date }`, `{ before: Date }`,
date ranges, functions, etc. The object format is compatible -- only the prop
name changed from `disabledDays` to `disabled`.

Reference: https://daypicker.dev/docs/disabling-days

---

## Part 3: Cleanup

### 3.1 Remove moment from package.json

```bash
npm uninstall moment
```

This removes `moment` from `dependencies` in package.json. Note that
`react-big-calendar@1.17.1` lists `moment` in its own `dependencies` (not
peerDependencies), so moment will still exist inside
`node_modules/react-big-calendar/node_modules/moment/` -- but it will NOT be
bundled by Vite into our app because our code will no longer import it. The
react-big-calendar moment localizer code is tree-shaken away when we stop
importing `momentLocalizer`.

### 3.2 Remove `legacy-peer-deps=true` from `.npmrc`

The `.npmrc` file currently contains `legacy-peer-deps=true`. This was added
specifically because react-day-picker v7.4.8 has a peer dependency on
`react@^0.14 || ^15 || ^16 || ^17` which conflicts with our `react@^18.3.1`.

After upgrading to react-day-picker v9, the peer dependency becomes
`react >= 16.8.0`, which is satisfied by React 18. Therefore,
`legacy-peer-deps=true` can be removed.

**Before removing**, do a clean install without the flag to verify nothing breaks:

```bash
mv .npmrc .npmrc.bak
rm -rf node_modules package-lock.json
npm install
```

If `npm install` succeeds, the `.npmrc` is no longer needed — delete it and
commit the new `package-lock.json`. If it fails with peer dependency errors,
restore `.npmrc` and keep `legacy-peer-deps=true` until the conflicting
packages are updated. Several packages were added recently (eslint@9,
eslint-plugin-react, eslint-plugin-react-hooks, globals) — verify these don't
have unresolvable peer conflicts.

### 3.3 Update E2E Tests

Two e2e test files reference moment or DayPicker v7 CSS classes:

1. **`tests/e2e/exhaustive.spec.js`** -- Line 118: comment says "date box shows
   relative date from moment.js". Update the comment text only (the test itself
   just checks DOM content, not moment directly). Also, lines 254-266 reference
   v7 CSS classes:
   ```js
   // BEFORE
   const dayInput = modal.locator(".DayPickerInput input");
   const overlay = modal.locator(".DayPickerInput-Overlay");
   const day = overlay.locator('.DayPicker-Day[aria-disabled="false"]');

   // AFTER -- update selectors for the new wrapper + v9 classes
   const dayInput = modal.locator('input[readonly]');  // or add a data-testid
   const overlay = modal.locator('.rdp');
   const day = overlay.locator('.rdp-day:not([aria-disabled="true"])');
   ```

2. **`tests/e2e/visual.spec.js`** -- No moment references. However, visual
   baseline screenshots will need to be regenerated after the migration since
   the DayPicker calendar styling will change:
   ```bash
   npx playwright test --update-snapshots
   ```

### 3.4 Bundle Size Impact Estimate

| Package            | Minified Size | Gzipped    |
|--------------------|---------------|------------|
| moment (removed)   | ~290 KB       | ~72 KB     |
| dayjs (added)      | ~7 KB         | ~3 KB      |
| dayjs plugins (3)  | ~3 KB total   | ~1.5 KB    |
| react-day-picker v7 | ~34 KB       | ~9 KB      |
| react-day-picker v9 | ~40 KB       | ~11 KB     |
| **Net change**     | **~-274 KB**  | **~-66 KB**|

The dominant win is removing moment.js (~290 KB minified). dayjs is ~7 KB.
react-day-picker v9 is slightly larger than v7, but the net bundle reduction
is substantial.

Note: `react-big-calendar` bundles moment in its own dependencies, but since
we no longer import `momentLocalizer`, Vite's tree-shaking ensures the moment
localizer code (and its moment import) is not included in our bundle.

---

## Part 4: Ordering / Phasing

### Recommended: Do it all at once, in a single branch

**Rationale:**

1. The react-day-picker v7 `react-day-picker/moment` sub-module imports moment
   internally. You cannot remove moment without also upgrading react-day-picker.
   Conversely, upgrading react-day-picker to v9 eliminates the moment dependency
   from that package, making it natural to switch to dayjs at the same time.

2. The total scope is small: 12 source files + 1 CSS file + 1 new wrapper
   component + 2 e2e test files. None of the changes are architecturally novel
   -- they are straightforward find-and-replace with a known target API.

3. Doing it in two phases would leave the codebase in an intermediate state
   where some files use moment and some use dayjs, or where react-day-picker v9
   is installed but moment is still present -- confusing and error-prone.

### Execution Order Within the Single Branch

The app will NOT compile between steps 1 and 4 because upgrading
react-day-picker to v9 removes the `DayPickerInput` and
`react-day-picker/moment` imports that the 6 form files still reference.
This is expected for a single-branch migration -- the app compiles again
after step 4.

1. **Install dayjs + upgrade react-day-picker**:
   `npm install react-day-picker@^9.14.0 dayjs`. Register dayjs plugins
   (`advancedFormat`, `relativeTime`) in `src/index.jsx`.
2. **Update `src/styles.css`**: change the CSS import path from
   `react-day-picker/lib/style.css` to `react-day-picker/style.css`.
3. **Create `src/components/common/day_picker_input.jsx`** -- the DayPickerInput
   replacement wrapper (requires v9 to be installed for the `DayPicker` import).
4. **Migrate all 6 form components** (events, guest_room_reservations,
   common_house_reservations -- new + edit for each). Switch from DayPickerInput
   to DayPickerInputWrapper, replace moment with dayjs, remove v7 imports.
   App compiles again after this step.
5. **Migrate the 6 non-form files** (data_store, calendar/show, meal/date_box,
   meal/header, history/show, residents/login). Replace moment with dayjs.
   Switch `momentLocalizer` to `dayjsLocalizer` in calendar/show.
6. **Remove moment**: `npm uninstall moment`.
7. **Remove `.npmrc`** or remove the `legacy-peer-deps=true` line (after
   verifying clean install -- see Section 3.2).
8. **Update e2e tests**: fix CSS selectors and comments.
9. **Regenerate visual baselines**: `npx playwright test --update-snapshots`.
10. **Run full test suite**: `npm test && npx playwright test`.

---

## Part 5: Risks

### 5.1 What Could Break

1. **dayjs format token differences.** The `Do` ordinal token (e.g., "15th")
   requires the `advancedFormat` plugin. If the plugin is not registered before
   first use, `Do` will output literally "Do" instead of "15th". Mitigated by
   registering plugins early in `src/index.jsx`.

2. **dayjs `.from()` returning slightly different strings.** dayjs relativeTime
   uses the same thresholds as moment by default ("a few seconds ago", "2 months
   ago", etc.) but the exact wording may differ slightly in edge cases. The e2e
   test at `exhaustive.spec.js:139` checks for `Today|Yesterday|Tomorrow|ago|in \d`
   which should still pass, but verify.

3. **react-big-calendar `dayjsLocalizer` behavior.** The dayjsLocalizer has
   been stable since react-big-calendar 1.x. However, date boundary calculations
   (start/end of week, month navigation) could differ subtly if locale or
   timezone handling varies. Test calendar month navigation, event placement,
   and the "today" button.

4. **DayPickerInput replacement wrapper.** The custom wrapper is the highest-risk
   piece. Potential issues:
   - Keyboard accessibility (the v7 DayPickerInput handled arrow keys, escape,
     tab). The wrapper above uses a simple click-to-open/click-outside-to-close
     pattern. Consider whether keyboard support is needed.
   - The input is `readOnly`, meaning users cannot type a date. v7 allowed
     typed input with `parseDate`. If typed date entry is important, the wrapper
     needs an onChange handler that parses text input with dayjs.
   - Mobile: The overlay positioning may need adjustment.

5. **CSS class name changes.** Any custom CSS targeting `.DayPicker-*` classes
   will stop working. Check `src/styles.css` and `src/shoelace.css` for any
   overrides (currently the only DayPicker CSS is the library import itself,
   so this is low risk). The e2e tests that select by `.DayPickerInput` or
   `.DayPicker-Day` class names WILL break and must be updated.

6. **`react-day-picker` v9 disabled matcher format.** The `{ after: Date }`
   object format is supported in v9, so the existing disable logic should work.
   However, verify that `{ after: someDate }` disables days strictly after that
   date (not on or after).

### 5.2 How to Verify Nothing Regressed

1. **Manual smoke test checklist:**
   - [ ] Login page loads, redirects to `/calendar/all/YYYY-MM-DD`
   - [ ] Calendar month view renders with correct month/year header
   - [ ] Calendar "today" button navigates to current month
   - [ ] Calendar left/right arrows navigate months
   - [ ] Calendar events display with correct colors and opacity for past events
   - [ ] Clicking a meal event navigates to meal edit page
   - [ ] Meal page: date box shows formatted date (e.g., "Thu, Jan 15th")
   - [ ] Meal page: relative date shows (e.g., "2 months ago", "Today")
   - [ ] Meal page: prev/next arrows navigate between meals
   - [ ] Meal page: "Calendar" back button navigates to correct month
   - [ ] History modal: dates and timestamps format correctly
   - [ ] Event form: DayPicker opens, date can be selected, form submits
   - [ ] Event edit form: existing date pre-populated, can be changed
   - [ ] Guest room reservation form: DayPicker works, form submits
   - [ ] Guest room reservation edit: existing date shown, can be changed
   - [ ] Common house reservation form: DayPicker works, form submits
   - [ ] Common house reservation edit: existing date shown, can be changed
   - [ ] Days beyond 6 months from the calendar date are disabled in all pickers

2. **Automated tests:**
   ```bash
   npm test                    # unit/integration tests
   npx playwright test         # e2e tests (after updating selectors)
   ```

3. **Build verification:**
   ```bash
   npm run build
   ```
   Check that the build succeeds and the output bundle does not contain moment.
   You can verify with:
   ```bash
   grep -r "moment" build/assets/*.js | grep -v "moment-timezone" | head
   ```
   (Some react-big-calendar internal references to "moment" as a string may
   remain in comments, but the actual moment library code should be absent.)

4. **Bundle size check:**
   Compare `build/assets/*.js` file sizes before and after. Expect a significant
   reduction (see Section 3.4).
