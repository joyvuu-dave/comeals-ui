- seperate apps

  - app #1: admin, api
  - app #2: client

- pwa
  - workbox v3
  - webmanifest
- styling
  - subscribe links
- subscribe links
  - ability to subscribe to full calendar
- iOS app
- android app
- auto-reconciliation

# Code Review Items (2026-03-28)

## Security
- Move auth tokens from URL query strings to Authorization header
- Move Pusher API key to environment variable
- Reduce cookie expiry from 7300 days to 7-30 days

## Code Quality
- Extract shared axios error handler; replace window.alert() with toast/notification UI
- Decompose DataStore into focused sub-stores
- Compute generateTimes() as module-level constant instead of inline in render

## Accessibility
- Remove button:focus { outline: none; }
- Change `<a onClick>` elements to `<button>` in header.jsx, guest_dropdown.jsx

## Toast / Error Handling (2026-04-01)
- Backend returns HTTP 400 for third-cook warnings, but the action succeeds (cooks are saved). This is semantically wrong — 400 means "Bad Request" / the server couldn't process it. The correct response is HTTP 200 with the warning in the body. The current approach forces the frontend through the `.catch` path for a successful operation, which is why `handleAxiosError` now returns a type and `submitBills` bolts a success toast onto an error handler. Changing to 200 would let `.then` fire naturally, make the success toast straightforward, and remove the need to overload an error handler with non-error concerns. This is a coordinated backend + frontend change.
- `handleAxiosError` name is misleading — it now handles warnings (successful actions) too, and callers use its return value to determine success state. Renaming it (e.g., `handleApiResponse` or `handleAxiosFailure`) would touch 25+ call sites across the codebase.
- E2e tests for toast behavior have ~15 lines of duplicated setup across 3 tests in error-handling.spec.js. Could extract a shared helper.
- No e2e test for the success toast appearing alongside the warning toast on the meal edit page (would require mocking the bills endpoint with complex meal page setup).

## Dependencies
- Upgrade react-router-dom from v5 to v6+

# Note

- icons from https://iconsplace.com/orange-icons/letter-j-icon-11/
- https://www.ssllabs.com/ssltest/analyze.html?d=comeals.com
