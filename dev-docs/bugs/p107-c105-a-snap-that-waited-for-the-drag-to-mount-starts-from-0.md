---
id: P107-C105
title: A Snap To Position that waited for the Drag to mount starts from 0 — the element jumps to the edge, then animates
status: fixed
commit: 3049f95d5
phase: P109
task: ISL-048
severity: low
area: runtime / Drag (noodl-viewer-react/src/components/visual/Drag/Drag.tsx `snapToPosition` reads `this.state[axis]`; react-component-node.ts `_flushPendingInnerActions` runs the waiting action at the inner component's ref, after `componentDidMount` queued its `setState` and before it lands — the `constructor`'s `{ x: 0, y: 0 }`)
found: P107 NSP-016 s55, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.16; the runtime trace of the Drag scenario "Mounted off: Will Unmount; a Do waits and runs at the mount" — placed at Start Drag X 30, Mounted off, Snap To Position X Value 60 and Do, Mounted on: Did Mount and Done, then Drag X 0 at the next frame and 57.78 at 200 ms (Ease Out from 0, not from 30)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Drag.json "row C105 — Mounted off: Will Unmount; a Do waits and runs at the mount, from where the element starts"
---

**What a person sees.** A Drag is hidden (Mounted off) while something tells it to snap — a list resets its cards, say — and is
shown again. Instead of gliding from where it appears to the snap position, the element appears, jumps to the left (or top) edge,
and glides from there.

**Where.** A Do fired while the Drag is off the page waits for the component (`withInnerComponent`). At the mount the component's
`componentDidMount` queues `setState({ x: Start Drag X })`, and then the wrapper's ref callback runs what waited — while
`this.state.x` is still the constructor's 0. `snapToPosition` starts its timer from that 0.

**Proposed fix.** In `snapToPosition`, start from the position the element is drawn at — read the start the same way
`componentDidMount` does when the component has not committed a position yet, or run the waiting actions from `componentDidMount`
after its `setState` (a callback). Small. The Drag spec (v1) says the intent; the runtime carries it as a known row until then.

**Fixed (P109 ISL-048, s31, 2026-10-08), as proposed (the first reading).** `componentDidMount` keeps the position it puts the
element at (`mountedAt`) until its `setState` lands; a snap, and its "already there" check, read that (`positionOn`) before the
state. The spec already said so (R11); the C105 known row — the Drag's last — and the scenario's `row` are gone. Runtime 22 / 22 at
seeds 13 and 20732 with 0 generated divergences and no known row; interpreter mutants 0 survivors at both; control red on exactly
the C105 scenario.
