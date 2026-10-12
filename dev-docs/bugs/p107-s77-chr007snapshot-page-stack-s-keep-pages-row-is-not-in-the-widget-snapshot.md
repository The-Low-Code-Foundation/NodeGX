---
id: P107-S77-CHR007SNAPSHOT
title: tests-unit/chr-007 is red at HEAD — Page Stack's Keep Pages When Unmounted row is in the catalog and not in the widget-class snapshot
status: open
severity: low
area: editor / property panel (tests-unit/chr-007/widgetDispatch.test.ts, its recorded snapshot of every catalog port's row class)
found: P107 NSP-019 s77, 2026-10-10
kit: editor-suite
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-019-RICHARD-READS-IT.md §5.1 (Gates) — `npx jest -w 1 tests-unit/chr-007`: 1 failed, 22 passed, exit 1
---

`tests-unit/chr-007/widgetDispatch.test.ts` "gives every catalog port the class it had before the refactor" fails at `HEAD`
(`991457d2d`): the current row classes carry `Page Stack.keepPagesWhenUnmounted: BooleanType` and the suite's recorded
snapshot does not.

**Where:** the row entered the catalog in `c22c9aceb` (P109 ISL-048, 2026-10-09: *a Component Stack can keep its pages
while Mounted is off*); `node-catalog.json` is clean in the working tree, so this is a committed drift, not a peer's open
edit. The suite still RUNS (23 tests) — it was measured as the one sibling suite that imports under `propertyeditor/`,
after NSP-019 added an import to `propertyeditor/index.tsx` (memory: an import added for a feature can switch a sibling
gate off). It did not; the red is the snapshot.

**What the wire shows:** `expect(current.nodes).toEqual(recorded.nodes)` — one added key, nothing else.

**Plain words:** *"A new boolean port on Page Stack gets the ordinary boolean row, and the snapshot that pins every port's
row class was not re-recorded with it."* Expected: a re-record of the snapshot in the ISL-048 commit, or a snapshot that
reads the catalog's new ports as "a port the refactor never saw" rather than as a difference.

**Proposed:** re-record the snapshot (the suite documents how) in the lane that owns ISL-048, and look at whether the
snapshot should tolerate a NEW port with the type's default row class — it will go red on every added catalog port
otherwise, which is every NSP-018 batch.
