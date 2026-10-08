---
id: P107-C112
title: A reset that finds no components (or no start page) deletes every page but leaves Top Component Name and Stack Depth naming what was there
status: fixed
commit: cd5f66a1a
phase: P109
task: ISL-048
severity: low
area: runtime / Component Stack (noodl-viewer-react/src/nodes/navigation/navigation-stack.tsx `resetAsync` :507-546 — the pages are deleted before the two checks, and neither failure calls `setPageOutputs`)
found: P107 NSP-016 s56, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.17; recorded on the runtime target (the probe traces in §7.17), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Page Stack.json "row C112 — Components emptied after a push: the pages go, and Top Component Name '' and Stack Depth 0 say the stack is empty; a Reset is Failure"
---

**What a person sees.** After Components is emptied, the stack draws nothing — but Top Component Name still says Detail and Stack
Depth still says 2, so a title or breadcrumb wired to them shows a page that is gone.

**Where.** `resetAsync` deletes first and returns at the failure without writing the outputs (the stack's entries stay too).

**How to reproduce.** Play the `regression:` scenario on the runtime target.

**Proposed fix.** On either failure, empty the stack's entries and write Top Component Name `''` and Stack Depth 0.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed.** A reset that fails (no components, no such start page) has already deleted
every page; it now empties the stack's entries and writes Top Component Name `''` and Stack Depth 0 before its Failure
(`_resetLeftEmpty`). Page Stack spec v3. Runtime 145 / 145 at seeds 13 and 20732; control (navigation-stack.tsx before) red on
exactly the 3 scenarios whose trace changed.
