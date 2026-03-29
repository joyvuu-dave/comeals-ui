---
name: react-big-calendar upgrade history
description: react-big-calendar broke on even minor version bumps years ago -- must investigate before upgrading
type: project
---

User attempted a minor version bump of react-big-calendar (from 0.26.0) years ago and it completely broke. They could never figure out why. **Why:** Unknown root cause -- could be CSS import path changes, momentLocalizer API changes, or peer dependency conflicts with the old react-scripts/Webpack setup. **How to apply:** Before upgrading react-big-calendar, do a standalone investigation: check the changelog for breaking changes between 0.26 and target version, test in isolation, and consider that the old CRA/Webpack toolchain may have been the real culprit (which would be resolved after the Vite migration).
