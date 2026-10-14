---
id: P18-S104-KITTYPESDRIFT
title: The kit-author types do not publish `replacedBy`, which the runtime's node definitions declare since NSP-021 — node-kit-types' drift gate is red, unseen behind CI's bail
status: open
severity: low
area: packages/nodegx-node-kit-types (published kit-author types), graded by tests/drift.test.js
found: P18 session 104, 2026-10-14 — measuring P18-S102-NOEXPORTCI's cause with `lerna run test --no-bail`
evidence: `drift.test.js` › exactly mirrored types › "ReactNodeDefinition publishes exactly what the runtime declares (viewer)" and "NodeDefinitionOptions publishes exactly what the runtime declares (types)" — Expected has `replacedBy`, Received does not (2 failed / 116)
phase: P107 (NSP-021 s90, `7ce9223ee`, added the member); found by P18
---

`7ce9223ee` (P107 NSP-021 s90, 2026-10-12, R24/R25: "a retired type is named with its replacement") added a
`replacedBy` member to the runtime's node definition types (`NodeDefinitionOptions` in `@noodl/types` and the viewer's
`ReactNodeDefinition`). `@nodegx/node-kit-types` publishes a mirror of both for kit authors, and its drift gate fails
the day the two stop matching. That is what happened, but CI never showed it: `test:packages` bailed at
`@nodegx/project-contract` before this package ran (P18-S102-NOEXPORTCI).

**Reproduce:** `npx lerna run test --scope @nodegx/node-kit-types` (2 failed, 114 passed).

**Proposed:** either mirror `replacedBy` in the published types, or, if a kit author must not set it (a retired type
is the platform's to name), add it to the drift gate's declared-not-published list with that reason. That choice is
the owner's, so it is not made here.
