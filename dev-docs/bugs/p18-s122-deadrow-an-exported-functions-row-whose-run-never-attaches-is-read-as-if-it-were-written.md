---
id: P18-S122-DEADROW
title: An exported Function whose Run never fires still gets a row, and everything that reads it shows nothing, with no note
status: fixed
commit: f342b3df2
regression: packages/nodegx-export/tests/the-undrawn-trigger-is-refused.test.ts §C (C1–C4) and §D (D1, D2); mutants C, J, K
severity: high
area: export / Function (§4f, the materialized row)
found: P18 session 122, 2026-10-17, measuring which rows "Hold the id" adds readers to
evidence: dev-docs/tasks/phase-18-code-export-v2/s122-holdtheid/deadrow.py over the shipped templates (the two `*.content.json` materialized); EXP-011 §89.6
---

A Run-wired Function whose output a drawn element reads gets a state row (§4f, "The last run of X"), written where its
Run chain runs. The plan compiles the run in the sink loop whether or not anything ever sends Run, and the row is
allocated there. When no trigger attaches (its Run comes from a Query Records' Fetched and the Query is refused, or
from a Did Mount refused because an element above is mounted by a value), **the emitted page never calls the row's
setter, and every reader shows nothing, forever.** Nothing says so: the Function's disposition is "collapsed", the
readers have no TODO, and the export report is silent.

**Reach, measured on HEAD `63ed6b0f6`:** of the 15 rows the shipped templates materialize, **10 are never written, and
6 of those are read (15 reads)**: members-area's Landing (8 reads: the association, or the invitation to set one up),
the Site Builder's Site (2: the site's name in the band and the foot), its Messages and Admin (1 each: the row-count
sentence), digital-bricks-training's AddALearner and the demo's TimelineRow (1 each). Session 122 adds one unread
row (nightbook's Coming, "A fresh form", under a refused Did Mount) and, by design, no read: its feeder-first compile
is limited to runs an element's event or a Did Mount sends, so the Site Builder's Home link, whose Function a refused
Query runs, stays refused as on HEAD.

**Fix, its size:** decide the row after the attach pass, or re-plan a component whose row's run never attached with
that Function refused ("its Run is never fired by a translatable trigger: <the trigger's reason>"). Re-planning needs
the project-wide name sets (`usedHttpNames` and the like) restored around the second pass. Medium. Until then, at the
least, a note at the row and on each reader.

**Fixed in P18 session 124 (EXP-011 §91).** `planProject` asks each finished plan which §4f rows a binding reads and no
printed list writes (`unreachedTriggersOf`, a walk of the whole plan that leaves out the lists of elements never drawn
and Did Mounts never run), and plans the component again: a drawn element's read of such a row drops its wire with the
Function's sentence ("it reads "Count" (queryFn), which the export never runs, so its outputs are never written: …") and
carries a marker. A handler's or a Function input's read is kept (refusing it lost the older Site Builder copies' "The
slug to show", which works from the URL's slug) and the report names it. Measured on the emitted templates with
`s122-holdtheid/deadrow.py`: **19 printed rows, 11 never written → 8 printed, 0 never written**. Members-area's Landing
shows its authored state (the "not connected yet" card) where it showed nothing.
