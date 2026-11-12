---
id: P112-OWN026-EMAILCODESTALE
title: "`noodl-mcp/tests/backendTools.test.ts` lists the shipped email templates as three; P119 SRK-001 (b5fba6137) added `emailCode`, so the spec is red against any backend bundle built since"
status: fixed
commit: f2afd62b0
severity: low
area: test — `packages/noodl-mcp/tests/backendTools.test.ts` "list/set/reset a template"
found: P112 OWN-026 FIX-01, 2026-10-22, after rebuilding `nodegx-backend/dist` (the Oct 20 bundle predated b5fba6137 and hid it)
evidence: "Expected ['magicLink','passwordReset','verifyEmail'], received the same plus 'emailCode'"
---

A stale assertion, not a product defect. The bundle the spec drives is gitignored and was two days old, so the
spec stayed green until someone rebuilt it. Fixed by adding `emailCode` to the expected list.
