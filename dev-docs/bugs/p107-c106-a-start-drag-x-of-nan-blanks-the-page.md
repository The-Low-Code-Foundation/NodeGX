---
id: P107-C106
title: A Start Drag X or Y of NaN blanks the page — the Drag's update compares NaN with itself and sets state until React gives up
status: open
severity: medium
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `componentDidUpdate`: `if (prevProps.inputPositionX !== props.inputPositionX) this.setState(…)` — `NaN !== NaN` is true at every update)
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; the runtime conformance run of the Drag (seed 20733): generated sequences with Start Drag X or Y NaN — written or placed — throw "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate"
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Drag.json "Start Drag X written NaN: the element is at NaN, and Drag X and Delta X say so (row C106 on the runtime: its update compares NaN with itself and loops until React throws)"
---

**What a person sees.** A Drag's Start Drag X is wired from a calculation that comes out NaN (an Expression dividing 0 by 0, a
number parsed from empty text). The page goes blank: React throws inside the Drag's update and unmounts the app.

**Where.** `componentDidUpdate` treats any `!==` prop as a change and sets state; the state change updates the component again,
and NaN is never `===` itself, so it never stops. Placing a Drag with a NaN start loops the same way at its first update.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The runtime's generated sequences withhold NaN on these
two ports until it is fixed (conformance.test.ts `WITHHELD`).

**Proposed fix.** Compare with `Object.is` (or skip NaN) in `componentDidUpdate`. One line per axis. When fixed, remove the two
`WITHHELD` entries, the C106 known row and the scenario's `row` in the same commit.
