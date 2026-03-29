# Plan Execution Order

Recommended order for implementing the existing plans. Each plan should be
completed and verified before starting the next.

## 1. PLAN-version-banner.md — Fix VersionBanner After Vite Migration

Quick fix, 3 files, no dependencies on other plans. Gets the deploy-detection
banner working again.

## 2. PLAN-eslint-config.md — Fix ESLint Configuration

Establishes working lint tooling. Having ESLint in place catches issues
introduced by all subsequent work.

## 3. PLAN-form-loading-states.md — Add Loading/Disabled State to Forms

Small scope (6 form components), follows existing patterns from login.jsx.
Independent of other plans.

## 4. PLAN-replace-window-alert.md — Replace window.alert() with Toast Notifications

Larger refactor (17+ files). Includes extracting a shared axios error handler.
Benefits from ESLint being in place (#2). No dependency on #3 but doing
smaller changes first reduces risk.

## 5. PLAN-moment-dayjs-daypicker.md — Replace moment.js + Upgrade react-day-picker

Largest pre-React-19 change. Touches 12+ source files and replaces two
libraries. **Must complete before #6** because react-day-picker v7 is a
React 19 blocker. Easier to debug on stable React 18.

## 6. PLAN-react-19-upgrade.md — Upgrade React 18 to React 19

Depends on #5 completing (react-day-picker v9). Upgrades or replaces 6 more
dependencies, migrates react-router v5 to v6, switches to automatic JSX
runtime, then bumps React to 19. Should be done last so all other refactoring
happens on a stable React 18 base.
