# Project Intake Form (Existing System)

**Document Type**: Brownfield System Documentation
**Generated**: 2026-04-11
**Source**: Codebase analysis of comeals-ui (`/Users/tejo/workspace/comeals-ui`)
**Analysis Method**: Automated (no `--interactive` flag; ambiguous fields marked Unknown)

---

## Metadata

| Field | Value |
|---|---|
| Project name | comeals-ui |
| Repository (GitHub) | git@github.com:joyvuu-dave/comeals-ui.git |
| Repository (Heroku) | https://git.heroku.com/comeals-ui.git |
| Current version | 2.0.0 (package.json) |
| First commit | 2018-07-04 |
| Last commit | 2026-04-11 |
| Total lifetime commits | 171 |
| Primary stakeholder | David Riddle (david@joyvuu.com) |
| License | MIT |

---

## System Overview

**Purpose**: Frontend web application for Comeals — a common meals management platform for cohousing communities. Enables community members to view meal schedules, track attendance, manage guest registrations, bill cook costs, and coordinate common house/guest room reservations.

**Current Status**: Production (deployed to Heroku, live users)

**Users**: Members of one or more cohousing communities (exact user count: Unknown — not detectable from this repo)

**Architecture Role**: This repo is the **frontend half** of a two-repo system. It is a Vite-built React SPA served by a small Express 5 server. All API requests are proxied to a separate backend application (presumed Ruby on Rails, running at configurable `API_URL`, not part of this repository). Authentication, data persistence, and business logic live in the backend.

**Tech Stack**:
| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.2.4 |
| State management | MobX + MobX-State-Tree | 6.13.7 / 6.0.1 |
| Routing | React Router | 7.13.2 |
| Build tool | Vite | 7.3.x |
| Static server | Express | 5.2.1 |
| Real-time | Pusher | 8.4.3 |
| HTTP client | Axios | 1.14.0 |
| Date handling | dayjs | 1.11.20 |
| Calendar component | react-big-calendar | 1.17.1 |
| Date picker | react-day-picker | 9.14.0 |
| Icons | FontAwesome 6 | 6.7.2 |
| Language | JavaScript (ES2022) | — |
| Node version | 24 | — |
| Package manager | npm | 11 |

---

## Problem and Outcomes

**Problem Statement**: Cohousing communities share common meals but lack tooling to coordinate schedules, track cook rotations, split food costs, and manage guest attendance. Spreadsheets and informal coordination create friction and errors.

**Target Personas** (inferred from component structure):
- **Residents**: View calendar, sign up/off meals, track dietary info, check costs
- **Cooks**: Manage meal details, enter costs, close billing
- **Admins**: Manage residents, guests, rotations (Unknown — admin features may live in backend)

**Key Features** (from component and store analysis):
- Meal calendar (monthly view, React Big Calendar)
- Meal detail: attendance, cooks, costs, menu, description
- Cook billing: cost entry, no-cost flag, closing meals, bill distribution
- Guest management: add/remove meal guests with vegetarian tracking
- Common house reservations (create/edit)
- Guest room reservations (create/edit)
- Community event calendar (view/create/edit)
- Meal history and cook rotation views
- WebCal subscription links (iCal export)
- Real-time updates via Pusher (meal changes, calendar changes broadcast to all viewers)
- Session expiry detection (401 interceptor → banner → re-login prompt)
- Version/deploy detection (polls manifest.json diff on re-focus to prompt refresh)

**Success Metrics** (Unknown — not documented; inferred):
- Community meals coordinated per month
- Cook cost accuracy (no manual reconciliation needed)
- User adoption within community (attendance tracking usage)

---

## Architecture (Current State)

**Architecture Style**: Client-server SPA

```
Browser
  └── React SPA (Vite build, served by Express)
        └── MobX-State-Tree (DataStore root)
              ├── MealStore → Meal, Bill, BillStore
              ├── ResidentStore → Resident
              ├── GuestStore → Guest
              ├── EventSource (Pusher channel config)
              └── ToastStore

Express server (server.js, port 3001)
  ├── Static assets (/assets/* — cache forever)
  ├── /.vite/manifest.json (deploy detection)
  ├── /version (Heroku release number)
  ├── /api/* → proxy → comeals-backend (Rails, port 3000)
  └── /* → index.html (SPA fallback)

comeals-backend (SEPARATE REPO — not analyzed)
  └── Rails API (all auth, data, business logic)

Pusher
  └── meal channel: community-{id}-meal-{date}
  └── calendar channel: community-{id}-{year}-{month}
```

**Frontend Component Modules**:
| Module | Components | Description |
|---|---|---|
| `app/` | error_boundary, private_route, scroll_to_top, session_expired_banner, toast_container, version_banner, confirm_modal | Global app infrastructure |
| `calendar/` | show, side_bar, webcal_links | Meal calendar views |
| `common_house_reservations/` | new, edit | Common house booking |
| `events/` | new, edit | Community events |
| `guest_room_reservations/` | new, edit | Guest room booking |
| `history/` | show | Past meals view |
| `meal/` | header, button_bar, attendees_box, cooks_box, date_box, info_box, menu_box, extras, guest_dropdown, close_button | Meal detail page |
| `meals/` | edit | Meal creation/editing |
| `residents/` | login, password_new, password_reset | Auth pages |
| `rotations/` | show | Cook rotation view |

**MST Data Models**:
| Model | File | Description |
|---|---|---|
| DataStore | data_store.js (682 LOC) | Root store — all state, actions, Pusher, axios |
| Meal | meal.js | Meal entity (date, closed, description, extras) |
| Bill | bill.js | Cook cost record |
| BillStore | bill_store.js | Map of Bill models |
| Resident | resident.js | Community member (attending, vegetarian, late, etc.) |
| ResidentStore | resident_store.js | Map of Resident models |
| Guest | guest.js | Non-resident meal guest |
| GuestStore | guest_store.js | Map of Guest models |
| EventSource | event_source.js | Calendar event source config |
| ToastStore | toast_store.js | Notification queue |

**Integration Points**:
| Integration | Purpose | Pattern |
|---|---|---|
| Pusher | Real-time meal/calendar updates | WebSocket pub/sub, 2 channels |
| comeals-backend API | All data CRUD + auth | HTTP proxy via Express `/api/*` |
| Browser sessionStorage / js-cookie | Auth session (cookie managed by backend) | Read-only from frontend |
| Browser localforage | Offline caching (inferred from dep) | Likely calendar data |
| Heroku Dyno Metadata | Deploy version for `/version` endpoint | Env var `HEROKU_RELEASE_VERSION` |

---

## Scale and Performance (Current)

**Current Capacity Estimate**: Small — designed for community scale (tens to low hundreds of users)

**Evidence**:
- No database in this repo (frontend only)
- No CDN configuration
- Pusher channels are community-scoped (one community = one set of channels)
- Single Heroku dyno (implied by `web: node server.js` in Procfile with no worker dyno)
- No Redis, no connection pooling (not applicable — frontend-only repo)
- localforage present for client-side caching

**Performance Patterns**:
- Vite build: code splitting, hashed assets with 1-year cache headers
- Version banner: polls manifest.json on tab re-focus to detect deploys
- Pusher for real-time updates (avoids polling)
- axios interceptor for 401 detection (auth expiry handled gracefully)

**Optimization Opportunities**:
- No CDN for assets (Heroku serves everything)
- React Big Calendar is a moderately heavy dependency
- No lazy loading beyond the existing React.lazy for route-level components

---

## Security and Compliance (Current)

**Security Posture**: Baseline

**Evidence**:
| Control | Status |
|---|---|
| Authentication | Cookie-based, managed by backend; 401 interceptor for session expiry |
| HTTPS | Heroku terminates TLS (standard for all Heroku apps) |
| Secrets management | Pusher keys via env vars; no hardcoded secrets detected |
| Security headers | None detected (no helmet.js, no explicit CSP headers in server.js) |
| Auth expiry handling | Present (axios interceptor → `setAuthExpired(true)` → banner) |
| Pusher encryption | `encrypted: true` in Pusher config |
| 0 known vulnerabilities | Confirmed — `npm audit` returned clean (2026-04-11) |

**Data Classification**: Internal (community member data; no payment processing, no PHI detected in this repo)

**Sensitive Data in This Repo**:
- User session cookies (read, not stored)
- Community member names and dietary info (vegetarian flag)
- Meal costs and billing data

**Compliance Requirements**:
- GDPR: Unknown (depends on community location; this repo doesn't handle consent/deletion)
- PCI-DSS: Not applicable (no payment processing in this repo)
- HIPAA: Not applicable
- No compliance documentation detected

**Security Gaps**:
- No CSP or security headers in Express server
- No rate limiting on the Express server (backend presumably handles this)
- No dependency scanning automation (CodeClimate eslint disabled; no Dependabot config detected)

---

## Team and Operations (Current)

**Team Size**: 1 (solo developer)

**Active Contributors** (last 30 days):
- David Riddle (96 commits + 1 as "Dave Riddle" — same person, historical git config variation)

**Development Velocity**:
- Last 30 days: 97 commits (active modernization burst)
- Prior 3+ weeks: 0 commits (dormancy period)
- Total lifetime: 171 commits over ~8 years
- Pattern: Periodic bursts of focused work, not continuous cadence

**Development Process**:
| Practice | Status |
|---|---|
| Version control | Git (main branch only, direct push) |
| Code review | None (solo) |
| Branch strategy | Trunk-based (commits directly to main) |
| CI/CD | GitHub Actions: lint → unit tests → E2E tests on push/PR |
| Heroku deploy | Manual (`git push heroku main`), no auto-deploy from GH |
| Pre-commit hooks | husky: lint + test before every commit |
| Pre-push hooks | husky: lint + test before every push to main |
| Formatter | Prettier 3.x (adopted 2026-04-11) |
| Linter | ESLint 9 (flat config) |
| Code quality | CodeClimate (duplication + fixme checks; ESLint disabled) |

**Documentation**:
| Artifact | Status |
|---|---|
| README | Minimal (setup, dev, prod — adequate for solo dev) |
| Architecture docs | None |
| API docs | None (this repo doesn't own the API) |
| Runbooks | None |
| Changelog | None |
| Contributing guide | None |

**Operational Support**:
| Capability | Status |
|---|---|
| Error tracking | None detected (no Sentry, Raygun, etc.) |
| APM/performance | None detected |
| Logging | Heroku platform logs (console.warn/console.error in JS) |
| Alerting | None (Heroku email alerts only, presumably) |
| On-call | Unknown (solo project) |

---

## Dependencies and Infrastructure

**Key Runtime Dependencies**: 23 direct

**Notable dependencies with version notes**:
| Package | Current | Latest | Risk |
|---|---|---|---|
| react + react-dom | 19.2.4 | Latest | Low |
| mobx-state-tree | 6.0.1 | 7.2.0 | **High** — major upgrade, breaking API changes likely |
| react-big-calendar | 1.17.1 | Latest | Medium — historically broke on upgrades (known issue) |
| vite | 7.3.x | 8.0.8 | Medium — tooling, test before upgrade |
| @vitejs/plugin-react | 5.2.0 | 6.0.1 | Medium — pair with Vite upgrade |
| eslint | 9.39.4 | 10.2.0 | Low — tooling |
| @fortawesome/* | 6.7.2 | 7.2.0 | Low — visual icons only |

**Infrastructure**:
| Component | Details |
|---|---|
| Hosting | Heroku (single web dyno) |
| Deployment | `git push heroku main` |
| Port | `$PORT` (Heroku sets), default 3001 |
| API proxy target | `$API_URL` (default http://localhost:3000) |
| Environment vars | `VITE_PUSHER_KEY`, `VITE_PUSHER_CLUSTER`, `PORT`, `API_URL`, `HEROKU_RELEASE_VERSION`, `NODE_ENV` |
| CI platform | GitHub Actions (3 parallel jobs) |
| CI triggers | Push to main, PR to main |
| CDN | None |
| Database | None (frontend-only; backend owns data) |
| Caching | None server-side; client-side via localforage |
| Message queue | None (real-time via Pusher instead) |

---

## Known Issues and Technical Debt

**Active Hotspot**:
- `src/stores/data_store.js` — 682 LOC, 22 changes in last 30 days. Largest source file and most-churned. Good candidate for eventual decomposition into model/view and action files.

**Pending Major Upgrades**:
- mobx-state-tree 6 → 7 (breaking changes, high-effort, high-risk)
- vite 7 → 8 + @vitejs/plugin-react 5 → 6 (paired upgrade, test thoroughly)
- eslint 9 → 10 (may affect flat config compat)
- @fortawesome 6 → 7 (icon API may change)

**Test Coverage Gaps**:
- React component layer: 0% unit test coverage (all 182 unit tests target stores only)
- Components exercised only via Playwright E2E
- `handle_axios_error.js`: 30% coverage
- `data_store.js`: 59.55% function coverage (lines 635-674 uncovered)

**Missing Operational Tooling**:
- No error tracking (Sentry or equivalent)
- No performance monitoring (APM)
- No dependency update automation (Dependabot)
- No security header enforcement (no helmet.js)

**No Active Code Debt Markers**:
- 0 TODO/FIXME/HACK/XXX in entire codebase (confirmed by grep)

---

## Why This Intake Now?

**Context**: Developer is exploring the AIWG (AI Writing Guide) SDLC framework for the first time, using this production application as a test subject to understand what value the framework offers for an established solo-developer project. No specific compliance, audit, or handoff trigger — this is exploratory documentation to establish a baseline.

**Goals**:
- Understand what SDLC framework components are relevant vs. overkill for a solo-dev cohousing community app
- Create documentation baseline that would accelerate onboarding if the project ever adds a collaborator
- Explore what AIWG tooling could automate or improve in future development work

**Constraint**: This is a volunteer/community-oriented project maintained in spare time, not a commercial product. Process overhead must be proportional to solo-dev capacity.

---

## Attachments

- Solution profile: [`solution-profile.md`](solution-profile.md)
- Option matrix: [`option-matrix.md`](option-matrix.md)
- Codebase: `/Users/tejo/workspace/comeals-ui`
- GitHub: https://github.com/joyvuu-dave/comeals-ui
- Heroku: https://comeals-ui.git.heroku.com (deployed app URL: Unknown)

---

## Next Steps

1. **Review** this document for accuracy — particularly the inferred sections (user count, business metrics, compliance status)
2. **Consider** adding Sentry or similar error tracking (zero-config risk for a production app)
3. **Plan** the mobx-state-tree 6 → 7 migration before the MST dependency becomes a blocker
4. **Decide** on SDLC adoption level: see `option-matrix.md` for recommended approach
