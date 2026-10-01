---
id: P107-C22
title: States — a move that animates nothing, made while a move is still running, is overwritten by the old move
status: needs-ruling
severity: medium
area: runtime / States
found: P107 NSP-013 s14, 2026-10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.1g, §6.2
---

Move a States node A → B with a transition, and while it is still moving, move it back to A with
Use Transitions off (or to a state whose curves are all 0 ms): State says A at once, but the value never goes to A's value — the old
move carries on and lands on B's value, and Has Reached A fires twice (once at the move, once when
the old move lands). Measured: x = 0 in A, 100 in B, 100 ms move; at 50 ms Use Transitions off +
To A → x reads 50, 70, 100 and stays at B's 100 while the node is in A.

Where: `packages/noodl-viewer-react/src/nodes/std-library/states.ts` :824-829 starts the timer only
when something animates — and that is the only place it is stopped and restarted. A move that sets
every value at once (:799-808) leaves the running timer alone; its `onRunning` (:196-254) keeps
writing the values from the targets its `onStart` read for B, and `onFinish` (:255-258) names the
state the node is in by then.

Reproduce: `packages/nodegx-node-spec/scenarios/States.json`, "a move that animates nothing does not
stop a run still going" — the runtime and the spec agree (R3 (a): the spec writes what the runtime does).

Proposed: stop the timer at the start of every move after the first (`internal.animation.stop()` before
the value loop in `goToState`), as `jumpToState` (:586) already does.
