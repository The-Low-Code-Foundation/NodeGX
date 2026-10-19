---
id: P18-S131-ROWLESSTRIGGER
title: A node run only by a row signal of a repeater that draws no rows in the export was counted collapsed into the repeater; no row callback is ever printed for it
status: fixed
severity: medium
area: export / `unreachedTriggersOf` (`src/analyze/plan.ts`), the owners an emitted app never draws
found: P18 session 131, 2026-10-19, reading the emitted templates after the row read (EXP-011 §100): 8 of the first 12 "gained" Sets sat in rows nobody draws
fixed: P18 session 131, 2026-10-19, branch l6-rowread; EXP-011 §100
commit: c6fa4a37b
evidence: dev-docs/tasks/phase-18-code-export-v2/s131-rowread/undrawn.ts (base 13 nodes, the first build 21, the fix 0)
---

A For Each whose items the export cannot read (fed by a logic component, a Function, an instance output) is drawn as a
`TODO(export)` marker: `renderRepeater` prints no rows, so no row's relayed-signal callback exists. The plan still
attached every chain off its `itemOutputSignal-*` ports and dispositioned the nodes "collapsed into" the repeater, so the
report counted them exported. At the base, 13 template nodes (bot-garden's Shop 5, nightbook's Me and Tonight 1 each,
planning and its demo 2 each, todo-list and its demo's `prMode` 1 each); the first build of the row read added 8 more
(rocket-school's and star-class's `lsSetEditId` among them: their list of lists is fed by `/Logic/List question sets`).

Fixed with the existing mechanism (P18-S123-UNDRAWNTRIGGER's): `rowlessReasonOf` (no feed the export reads, a script
mapping, no template) makes such a repeater an owner the export never draws, so the next plan round refuses its chains
by name ("its trigger, … (lsEach), is not drawn: it draws no rows in the export …"), unless another trigger runs the
node, which collapses it into that trigger (bot-garden's `shClearItem` into `shOpen`, nightbook's `tnMineShut` into
`tnMineClose`). Graded: `tests/the-row-is-read-where-it-fires.test.ts` C6, C7 (mutant I). Reach: templates 11
collapsed → deferred (each read: every one sits under a `TODO(export): For Each … deferred` marker in the emitted file),
2 collapsed → collapsed into their other trigger; corpus 0.
