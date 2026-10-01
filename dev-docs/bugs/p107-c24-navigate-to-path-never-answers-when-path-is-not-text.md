---
id: P107-C24
title: Navigate To Path never answers a press when Path is not text (null, a number) — the frame-end callback throws
status: needs-ruling
severity: medium
area: runtime / Navigate To Path (viewer)
found: P107 NSP-015 s17, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-015-BATCH-NAVIGATION-AND-COMPONENTS.md §6.1c, §6.2
---

Wire anything that is not text into Navigate To Path's Path — a `null` from a disconnected or empty
wire, a number — and press Navigate: nothing happens and the node says nothing. No Done, no Failure,
no Error; every press in that frame is lost for good (the next press with a text Path works again).

Where: `packages/noodl-viewer-react/src/nodes/navigation/navigate-to-path.ts` `navigate()`. The
`path === undefined` check (:151) catches only `undefined`; :162 then calls `internal.path.match(…)`,
which throws a TypeError for `null`, a number, a boolean or an object. The throw is inside the
frame-end callback, after the outcome tokens were drained (:147-148), so the scheduler logs it
(nodecontext.ts :466-472, `console.error`) and no token is ever reported.

Reproduce: `packages/nodegx-node-spec/scenarios/PageStackNavigateToPath.json`, "C24 — a Path that is
not text (null) …" (row C24); the runtime suite counts it every run (33 of 200 generated sequences on
2026-10-01's seed).

Proposed: read a Path that is not text as no Path — Failure `navigate-to-path/no-path`, Error "No path
to navigate to" (what the spec says). One line (`typeof formattedPath !== 'string'` at :151); ships alone.
