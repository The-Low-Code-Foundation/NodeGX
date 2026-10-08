---
id: P107-C135
title: A Repeater Script that sets `component` to something that is not text (a number, an object, `true`) stops the Repeater for good — no later Items, Template or Refresh is drawn or answered
status: open
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `getTemplateForModel` :524 `template.startsWith('./')` runs OUTSIDE the try around the Script (:507-521); the TypeError rejects `addItem`, and `_runQueueOperations` :815-860 catches nothing — C128's mechanism, reached by another line)
found: P107 NSP-016 s61, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.22; recorded on the runtime target (the s61 probe, case S7: `component = 7`, then `component = 'Row'` and a Refresh — no row, no Items Rendered, the Refresh never answered), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "the Script matrix — a Script whose component is not text (row C135); its frame ends at a settle"
---

**What a person sees.** A Repeater on Template Type Dynamic whose Script picks a component from the data — `component = item.kind`
where one record's `kind` is a number, or `component = item.template` where it is an object — draws nothing, and never draws again:
fixing the Script, new Items and Refresh change nothing, Refresh never fires Done or Failure, and Items Rendered never fires. A Script
that THROWS is handled (that item has no row, and an error is raised); a Script that returns the wrong kind of value is not.

**Where.** `getTemplateForModel` runs the Script inside a try, then — outside it — reads `template.startsWith('./')` and
`template.startsWith('../')` to resolve relative names. A truthy value that is not a string has no `startsWith`: the TypeError leaves
`addItem`, the queue's loop awaits it with no catch, and `runningOperations` stays `true` (C128).

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Treat a component that is not a string like a throw from the Script: raise `repeater/template-script-threw` (or a
new `repeater/template-not-a-name`) and give that item no row. C128's fix (catching in the operation) would also keep the queue alive,
but only if its catch spans `getTemplateForModel`, not just the build.

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Skip that item and report an error".** The same as a Script that throws.
