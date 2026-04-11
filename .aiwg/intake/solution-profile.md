# Solution Profile (Current System)

**Document Type**: Existing System Profile
**Generated**: 2026-04-11
**Source**: comeals-ui codebase analysis

---

## Current Profile

**Profile**: **Production** (lightweight)

**Selection Rationale**:
- System is live on Heroku with real community users
- No active security/compliance requirements
- Solo developer, no team coordination overhead
- Process maturity adequate for scope: CI/CD present, pre-commit hooks, formatter adopted
- Lightweight production: community-scale app, not enterprise SLA-bound

**Actual Classification**: Small-scale production app maintained by a solo developer. Production semantics apply (real users, live data, Pusher real-time) but without the team coordination overhead that would require full SDLC rigor.

---

## Current State Characteristics

### Security

**Posture**: Baseline

| Control | Status | Gap? |
|---|---|---|
| Authentication | Cookie-based, delegated to backend | No gap (correct pattern) |
| HTTPS/TLS | Heroku terminates TLS | No gap |
| Secret management | Environment variables (no hardcoded keys) | No gap |
| Security headers (CSP, HSTS, X-Frame) | **Absent** — Express serves without helmet.js | ⚠ Gap |
| Dependency vulnerabilities | 0 known (npm audit clean) | No gap |
| Error/stack exposure in responses | Unknown (no error handler in server.js) | ⚠ Worth verifying |
| Rate limiting | None in this repo (backend handles) | Acceptable |
| Dependency scanning automation | None (no Dependabot) | ⚠ Minor gap |

**Recommendation**: Add `helmet()` middleware to server.js. 3-line change, meaningfully reduces attack surface. Then optionally configure Dependabot for automated dep PRs.

---

### Reliability

**Current SLOs**: Undefined (not monitored from this repo)

| Capability | Status |
|---|---|
| Availability monitoring | None detected |
| Error tracking | **None** (no Sentry, Rollbar, etc.) |
| Performance monitoring | None |
| Alerting | Heroku platform email only (presumably) |
| Logging | Browser console + Heroku dyno stdout |
| Deploy detection | Present — version banner polls manifest.json diff |
| Session expiry handling | Present — axios 401 interceptor → expiry banner |

**Monitoring Maturity**: Minimal. The app has graceful failure modes (session expiry banner, error boundary component) but zero observability into production errors or performance.

**Recommendation**: Add Sentry (or equivalent). The free tier handles a solo community app indefinitely. Sentry's `@sentry/react` catches unhandled errors, captures source maps, and alerts on production exceptions. This is the single highest-ROI improvement available.

---

### Testing & Quality

| Metric | Current | Target | Status |
|---|---|---|---|
| Unit test count | 182 | — | ✅ Solid |
| Overall line coverage | 31% | — | ⚠ Low headline |
| Store layer coverage | ~73% | 70%+ | ✅ |
| Component layer coverage | 0% | — | ⚠ (E2E compensates) |
| E2E test files | 11 Playwright specs | — | ✅ |
| Lint (ESLint) | Clean | Clean | ✅ |
| Formatting | Prettier 3.x (adopted 2026-04-11) | Consistent | ✅ |
| Coverage tooling | @vitest/coverage-v8 (added 2026-04-11) | Baseline tracked | ✅ |
| CI quality gates | lint + unit + E2E on every push/PR | — | ✅ |
| Pre-commit enforcement | lint + unit tests via husky | — | ✅ |

**Testing Strategy Assessment**: The 0% component coverage isn't a crisis — it's a deliberate pattern. Business logic lives in the MobX stores (well-tested at 73%), and the React components are thin renderers. Playwright E2E tests cover user-visible behavior end-to-end. This is a valid "functional core, imperative shell" approach.

**One gap worth noting**: `data_store.js` functions at 59.55% — the app's hotspot has meaningful untested paths (lines 635-674). Worth investigating whether those paths correspond to low-risk UI-only code or actual logic branches.

---

### Process Rigor

| Practice | Current | Notes |
|---|---|---|
| SDLC adoption | None (exploring) | Reason for this intake |
| Code review | None (solo) | N/A for solo dev |
| Branch strategy | Trunk-based (direct to main) | Appropriate for solo |
| Version control | Git, GitHub | ✅ |
| CI/CD | GitHub Actions (3 jobs) | ✅ Good for project scale |
| Formatting | Prettier (just adopted) | ✅ |
| Linting | ESLint flat config | ✅ |
| Documentation | README only | ⚠ No architecture/runbook |
| Semantic versioning | 2.0.0 in package.json | ⚠ Not tagged in git |
| Changelog | None | ⚠ |
| Dependency updates | Manual | ⚠ No automation |

---

## Recommended Profile Adjustments

**Current**: Production (lightweight, solo)

**Recommended**: Stay at Production (lightweight) — **no profile upgrade needed**

**Rationale**: The project is appropriately scoped for its audience (one cohousing community, solo maintainer, no regulatory requirements). Adding enterprise-grade process would create overhead disproportionate to the project's scale and team capacity.

**Selective Improvements** (add these without changing overall profile):
1. **Security headers** (helmet.js) — 3-line change, significant security win
2. **Error tracking** (Sentry free tier) — production error visibility, currently blind
3. **Dependabot** (GitHub config) — automate dependency security PRs
4. **Git tags** — tag releases at version numbers for traceability

---

## Improvement Roadmap

### Phase 1 — Immediate (next session or two)

| Item | Effort | Value | Notes |
|---|---|---|---|
| Add `helmet()` to server.js | 30 min | High | Security headers, low risk |
| Add Sentry error tracking | 1-2 hrs | High | Zero production visibility currently |
| Tag current release in git | 5 min | Low | `git tag v2.0.0` |

### Phase 2 — Short-term (next month)

| Item | Effort | Value | Notes |
|---|---|---|---|
| Research MST v7 migration | 2-4 hrs | High | Before it becomes blocking |
| Add Dependabot for npm | 15 min | Medium | Add `.github/dependabot.yml` |
| Investigate data_store.js lines 635-674 | 30 min | Medium | Assess if untested paths matter |
| Consider splitting data_store.js | 4-8 hrs | Medium | Only if churn continues |

### Phase 3 — When/If Relevant

| Item | Trigger | Notes |
|---|---|---|
| Add component unit tests | 2nd developer joins | Not worth it solo with Playwright covering behavior |
| Add architecture documentation | Team expands | Self-documenting for solo; needed for handoff |
| Formalize release process | User base grows | Current manual Heroku deploy is fine at current scale |
| Add CI coverage gate | After coverage baseline established | Currently 31%; set floor to prevent regression |
| GDPR compliance review | Confirm EU community members use app | Unknown — depends on community location |

---

## Notes for SDLC Framework Adoption

Given this project's reality (solo dev, production, community-scale, no compliance reqs), the right SDLC adoption level is **minimal**:

**Adopt**:
- `codebase-health` — useful recurring check as modernization continues
- `project-health-check` — useful after major work batches
- `security-audit` — worth running once to find gaps
- `pr-review` — useful even for solo self-review on larger changes
- `test-coverage` tracking — already set up

**Skip** (overkill for this project):
- Phase gates (inception/elaboration) — single developer, clear vision
- Formal requirements docs — unnecessary for known, small-scope changes
- Architecture SAD/ADRs — worth considering for major changes; skip for routine
- RACI, team health metrics — not applicable solo
- Compliance templates — no regulatory requirements detected

**Consider Later**:
- `flow-iteration-dual-track` — if a second developer ever joins
- `flow-architecture-evolution` — for the MST v7 migration or any major structural change
