---
name: Minimal UI changes philosophy
description: User wants changes to replicate existing behavior as closely as possible — no new surfaces, no behavior changes beyond what's strictly needed
type: feedback
---

When replacing UI patterns (e.g., window.alert → toast), replicate existing behavior exactly. Do not surface errors that were previously hidden (console.error), do not change which errors users see, do not add new functionality. The existing UX works well — users are happy. Changes are only to fix specific reported issues (e.g., styling problems on mobile), not to "improve" things.

**Why:** Users are happy with current functionality. Changes that look like improvements can introduce unexpected behavior changes that upset a working system.

**How to apply:** When plans propose replacing one pattern with another, audit every call site for behavior changes. If a call site currently uses console.error, keep it as console.error. Only replace window.alert → toast, not console.error → toast.
