---
id: P107-C21
title: States — a transition setting that is not a curve makes every move into that state silently do nothing
status: fixed
severity: high
area: runtime / States
found: P107 NSP-013 s14, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.1g, §6.2
---

Give one of a States node's transitions (`transition-<state>-<value>` or the state's Default,
`transitiondef-<state>`) anything but a curve — `{ "dur": 300 }` with no `curve`, `"easeOut"`, `true`,
`{}`, or a curve whose x is outside 0–1 — and every move into that state is lost: State does not change,
no State Changed, no Done, no Failure, no Completed, and the next request for that state is lost the
same way. Any values listed before the bad one have already taken the new state's text/true-false
values; the rest have not. Nothing on the node says why; the console logs a `BezierEasing` error.

Where: `packages/noodl-viewer-react/src/nodes/std-library/states.ts` :811 calls `BezierEasing(curve)`
inside the frame-end callback; `bezier-easing` 1.1.1 throws for anything but four finite numbers with
x1, x2 in [0, 1]. The callback (scheduled at :688) has already spliced the queue, so the rest of the
frame's requests go too; `node.ts` :743-746 and `nodecontext.ts` :465-472 log the throw and go on.

Reproduce: `packages/nodegx-node-spec/scenarios/States.json`, the C21 scenario (on the runtime: after
`to-B` nothing moves and the next `to-A` reads Unchanged — the node never left A); the runtime
conformance run attributes 5 of 200 generated sequences to it (seed 20727).

Who reaches it: the curve editor writes `{ curve, dur, delay }`, so a person rarely does; an agent
writing parameters through MCP (`{ "duration": 300 }`, `"easeOut"`) or a wire from a `*` output does.

Proposed: read a transition the library refuses as the state's Default (or as a 0 ms jump — the spec
writes the jump), checked before `BezierEasing`; and report it once on the node, as the unreadable
colour is (`states/unreadable-color`).

**Ruled (Richard, 2026-10-01, P107 s16):** use the Default and warn. **Fixed:**

A transition that would animate along a curve `bezier-easing` refuses reads as the state's Default — or, when
the Default is the one refused or is refused too, the built-in ease-out over 300 ms — and raises
`states/unreadable-transition` once per port and value. A transition that sets its value at once (0 ms and no
delay, Use Transitions off, a state passed through) never reads its curve and is unchanged. The spec is v2, the
C21 scenario lost its `row` mark and two scenarios pin the Default paths; the runtime conformance test's known
row is gone. `packages/noodl-viewer-react/tests/p107-c21-states-unreadable-transition.test.ts` (7 tests, a
readable transition beside four refused shapes) — 6 red on the old code, 7 green after.
