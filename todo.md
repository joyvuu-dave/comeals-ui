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

## Dependencies
- Upgrade react-router-dom from v5 to v6+

# Note

- icons from https://iconsplace.com/orange-icons/letter-j-icon-11/
- https://www.ssllabs.com/ssltest/analyze.html?d=comeals.com
