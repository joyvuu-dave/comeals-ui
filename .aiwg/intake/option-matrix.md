# Option Matrix (Project Context & Intent)

**Purpose**: Capture what this project IS — its nature, audience, constraints, and intent — to determine appropriate SDLC framework application.
**Generated**: 2026-04-11 (from codebase analysis, no `--interactive`)

---

## Step 1: Project Reality

### What IS This Project?

**Project Description**:

> A production web application for cohousing community common meals management. Community members use it to view a shared meal calendar, sign up for meals, track dietary needs, manage cook rotations, enter cook costs, and reserve shared spaces (common house, guest room). The app has been in production since 2018, is maintained by a single developer in their spare time, and is tightly coupled to a separate Rails backend (not in this repo). It is currently undergoing a technical modernization pass after a period of dormancy.

---

### Audience & Scale

**Who uses this?**
- [x] Small team (2-10 known individuals) — **cohousing community members, all known personally to the developer**

**Audience Characteristics**:
- Technical sophistication: Non-technical (community members are not developers)
- User risk tolerance: Expects stability (meal coordination is time-sensitive for meal days)
- Support expectations: Best-effort (solo maintainer, community relationship)

**Usage Scale**:
- Active users: Unknown (not detectable from frontend repo; likely 10-50 community members)
- Request volume: Low (community-sized; real-time updates via Pusher, not polling)
- Data volume: Small (meals data, not transactional volume)
- Geographic distribution: Single location (one cohousing community; Pusher channels are community-scoped)

---

### Deployment & Infrastructure

**Deployment Model**:
- [x] Client-server (SPA + API backend) — React SPA + Express proxy server + separate Rails backend

**Where does this run?**
- [x] Cloud platform — Heroku (single web dyno)

**Infrastructure Complexity**:
- Deployment type: Single server (one Heroku dyno, Express static + proxy)
- Data persistence: None in this repo (all data in Rails backend)
- External dependencies: 2 meaningful (Pusher for real-time, Rails API for all data)
- Network topology: Client-server (browser → Express → Rails API; browser → Pusher)

---

### Technical Complexity

**Codebase Characteristics**:
- Size: ~12K LoC (source + tests), ~6K LoC source-only
- Languages: JavaScript only (ES2022, JSX)
- Architecture: Modular SPA (MobX-State-Tree central store, route-based component modules)
- Team familiarity: Brownfield (8-year-old codebase, original author still maintaining)

**Technical Risk Factors**:
- [x] Security-sensitive — session cookies, community member dietary/cost data
- [x] Integration-heavy — tightly coupled to separate Rails backend, Pusher real-time
- [x] Complex business logic — meal billing math, cook rotation, real-time state sync across clients

---

## Step 2: Constraints & Context

### Resources

**Team**:
- Size: 1 developer (David Riddle), no designers, no other roles
- Experience: Senior (30+ year career, deep backend, JavaScript competent)
- Availability: Part-time / hobby (spare time; periodic work bursts)

**Budget**:
- Development: Zero (personal project, volunteer time)
- Infrastructure: Low-cost (Heroku hobby tier or equivalent; Pusher free/small tier)
- Timeline: No deadline (organic maintenance and improvement)

---

### Regulatory & Compliance

**Data Sensitivity**:
- [x] User-provided content (names, meal preferences)
- [x] Personally Identifiable Information (community member profiles, dietary info)

**Regulatory Requirements**:
- [ ] None confirmed
- GDPR: **Unknown** — depends on whether any community members are EU residents; this repo has no consent/deletion handling (would be in backend if present)
- No PCI-DSS, HIPAA, SOX, or FedRAMP indicators

**Contractual Obligations**:
- [x] None — community-operated, no commercial contracts or SLAs

---

### Technical Context

**Current State**:
- Stage: Established (production since 2018, active user base, feature-complete for current scope)
- Test coverage: 31% overall (73% store layer, 0% component layer)
- Documentation: README only (minimal; adequate for solo dev, insufficient for handoff)
- Deployment automation: Manual Heroku deploy; automated CI (lint + unit + E2E on push)

**Technical Debt**:
- Severity: Minor-Moderate
- Type: Dependencies (7 outdated majors), Architecture (one large central store file), Tests (component layer uncovered)
- Priority: Should address — MST v7 migration especially; others can wait

---

## Step 3: Priorities & Trade-offs

### What Matters Most?

**Priority Ranking** (inferred from project context; no interactive input):

| Priority | Rank | Rationale |
|---|---|---|
| Quality & security | 1 | Real production users who depend on this; no room for data corruption or availability failures |
| Reliability | 2 | Meal coordination is time-sensitive; unexplained outages would affect community trust |
| Cost efficiency | 3 | Solo volunteer project; time and money both constrained |
| Speed to delivery | 4 | No competitive pressure; correctness over speed |

**Priority Weights**:

| Criterion | Weight | Rationale |
|---|---|---|
| Quality/security | 0.40 | Production with real users; community trust is the product |
| Reliability | 0.30 | Real-time coordination; failures are noticed immediately |
| Cost efficiency | 0.20 | Limited time budget; must be sustainable solo |
| Delivery speed | 0.10 | No external deadline or competitive urgency |
| **TOTAL** | **1.00** | |

### Trade-off Context

**Optimizing for**: Sustainable solo maintenance of a trusted community tool. Quality and reliability are non-negotiable because failures directly affect the community meals experience. Delivery speed and elaborate process are secondary.

**Willing to sacrifice**: Comprehensive SDLC documentation (no architecture SAD, no formal requirements docs, no RACI). Component-level unit tests (E2E covers behavior; component-level unit tests add work without proportional safety gain given the thin component layer).

**Non-negotiable**: The app must continue working reliably for community members. Upgrades and refactors must be tested before deployment. Production should never be left in a broken state.

---

## Step 4: Intent & Decision Context

### Why This Intake Now?

**What triggered this intake?**
- [x] Documenting existing project (never had formal intake)
- [x] Exploring AIWG tooling (developer is new to AIWG framework, using this project to learn what it offers)
- [x] Preparing for potential modernization (active modernization burst in progress — React 19, Vite 7, Prettier, coverage tooling all added recently)

**What decisions need making?**

1. **SDLC framework adoption level**: Which AIWG commands/flows/templates actually add value for a solo-dev community project vs. which create overhead without proportional benefit?
2. **Modernization prioritization**: With 7 outdated major deps and one large hotspot file, what order makes sense?
3. **Monitoring gap**: Is the absence of error tracking (Sentry) a meaningful risk that should be addressed now?

**What's uncertain or controversial?**

- **MST v7 migration**: Unknown breaking change surface area against a 682-line central store file. High-risk, can't be rushed.
- **Component test coverage**: 0% is defensible given Playwright coverage, but the trade-off depends on how thin the components actually are vs. how much logic has crept in.
- **GDPR exposure**: Community location unknown; if EU members use this, there may be compliance work needed in the backend that has upstream implications for this frontend.

**Success criteria for this intake**:

- Clear picture of what this project IS (vs. what it could be)
- Honest assessment of which AIWG tooling fits this scale
- A prioritized list of the 3-5 improvements that actually matter for this project's context

---

## Step 5: Framework Application

### Relevant SDLC Components

**Templates** (applicable to this project):
- [x] Intake (just generated) — establish baseline
- [ ] Requirements — unnecessary solo; changes are clear in scope
- [ ] Architecture SAD — worth considering before MST v7 migration; skip for routine
- [ ] Test strategy — documented informally above; formal doc adds no value solo
- [ ] Security threat model — worth running `security-audit` once; formal template is overkill
- [ ] Deployment runbook — **light version useful** (capture Heroku deploy steps, env vars)
- [ ] Governance/RACI — not applicable (solo)

**Commands** (actually useful):
- [x] `/codebase-health` — recurring check during modernization
- [x] `/project-health-check` — after major work batches
- [x] `npm run test:coverage` — baseline tracking (just set up)
- [ ] `/sdlc-accelerate` — designed for new projects; this is established production
- [ ] `/flow-*` phase transitions — overkill for solo dev with continuous deployments
- [ ] `/intake-from-codebase` — just completed; run again if project character changes significantly

**Agents** (worth using ad-hoc):
- [x] `security-auditor` — run once to find server.js gaps (helmet.js, error handling)
- [x] `code-reviewer` — useful for larger PRs/self-review before risky changes
- [x] `test-engineer` — useful if/when adding component tests
- [ ] Operations specialists — premature without monitoring infrastructure
- [ ] Enterprise specialists — no compliance/legal requirements

**Process Rigor Level**: **Minimal** (appropriate for solo, small community, no regulatory requirements)

---

### Rationale for Framework Choices

The project needs lightweight tooling that respects solo-dev capacity:

- **Intake documents** (this set): establish baseline for future reference and potential handoff
- **Recurring health checks**: `codebase-health` and `project-health-check` as lightweight review tools
- **Ad-hoc security review**: `security-auditor` once to address the helmet.js gap
- **Self-review**: `code-reviewer` for larger, riskier changes (MST migration especially)

**Skipping deliberately**:
- Phase gates and flow commands — design for coordinated team handoffs; solo dev doesn't need handoff gates
- Formal requirements and ADR templates — solo project with clear scope; overhead without audience
- Team health metrics — not applicable
- Compliance templates — no regulatory requirements detected

**Will revisit if**:
- A second developer joins → add architecture docs, onboarding docs, ADRs
- Community grows to multiple locations → add scaling/performance templates
- Commercial version emerges → add full SDLC, compliance review
- EU compliance question resolved → add GDPR compliance assessment

---

## Step 6: Evolution & Adaptation

### Expected Changes

**How might this project evolve?**
- [x] Feature expansion — cohousing features evolve with community needs
- [x] Technical modernization — ongoing (MST v7, Vite 8 in the pipeline)
- [ ] User base growth — unlikely (purpose-built for specific community)
- [ ] Team expansion — possible if the developer wants help or open-sources the project

**Adaptation Triggers**:

| Trigger | Framework addition |
|---|---|
| Second developer joins | Architecture docs, onboarding guide, code review formalization |
| MST v7 migration begins | `/flow-architecture-evolution` for planning the change |
| Community grows to 2+ locations | Performance profiling, multi-tenancy review |
| Error tracking (Sentry) added | `/reliability-engineer` guidance for SLO/SLI setup |
| GDPR exposure confirmed | Privacy compliance assessment templates |

**Planned Framework Evolution**:
- **Now**: Intake baseline (complete)
- **1-3 months**: Security improvements (helmet.js, Sentry), MST v7 research
- **3-6 months**: MST v7 migration (may benefit from `/flow-architecture-evolution`)
- **6-12 months**: Reassess based on whether project grows or remains stable

---

## Summary

| Dimension | Assessment |
|---|---|
| Project type | Established solo-dev production community app |
| SDLC maturity | Minimal (adequate for scope) |
| Biggest risk | MST v7 migration complexity + zero production error visibility |
| Biggest strength | Strong store-layer testing, clean CI pipeline, zero known vulns |
| Framework fit | AIWG useful for ad-hoc analysis tools; workflow automation is overkill |
| Priority action | Add Sentry + helmet.js; research MST v7 changelog |
