---
id: P109-S18-REFRESHROWSTATE
title: A For Each Refresh rebuilds every row, so each row's own state starts empty even when its record did not change
status: needs-ruling
phase: P109
task: ISL-004
severity: low
area: runtime / For Each (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx, the `refresh` op's full teardown)
found: P109 ISL-004, session 18, 2026-10-05 (ruling 2's investigation, asked for by Richard)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-004-A-COMPONENT-KEEPS-ITS-OWN-STATE.md §8 s18; scripts/devtools/drive-isl004-remount.js on a deploy of packages/noodl-mcp/tests/isl004Remount.ts
launch: beta
---

A page with a For Each over two rows (ids `isl004-row-1`, `isl004-row-2`), each row a `Tally` component that keeps its
count in a Component Object. Tap row 1's + twice and row 2's once: 2 and 1. Give the For Each a fresh array of the
SAME two ids: 2 and 1, the same row elements (rows are diffed by id). **Press Refresh: 0 and 0, new row elements.**
Nothing in the rows' records changed. An app-wide Variable on the same page keeps its value (the known-firing control).

The For Each's own comment says the full teardown is deliberate (`foreach.tsx`, NDA-013: *"a cheaper Refresh that reused
the existing item nodes for records that didn't change is possible — but is a separate, riskier change against item-node
identity (component state, mounted DOM)"*), so this is a choice nobody has ruled on as a person sees it: someone presses
Refresh to re-read data, and every open panel, picked option or count in the list is reset.

Not the same as a row that leaves the list and comes back (a filter): that row is deleted and built again, and starting
empty is what every UI framework does with a removed row. The agent doctrine now says both (ISL-004 AC3).

**For a ruling:** keep it (and say so on the Refresh port), or make Refresh reuse the rows whose id is still in the list,
as an items write already does.
