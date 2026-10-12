---
id: P107-C13
title: A consumed Children or Siblings event stops only inside the component that consumed it
status: fixed
commit: a7710e300
phase: P109
task: ISL-032
severity: medium
area: runtime / Send Event
found: P107 (the node says what it does) s10, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/graph/t05-send-receive-event.json "Consume = Always in the first child component stops a Children event reaching the second" (and its Siblings twin, added)
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-012-BATCH-ARRAYS-OBJECTS-STORES.md §6.2 (row C13) — the row names how it is reproduced and pinned
---

A consumed Children or Siblings event stops only inside the component that consumed it.

**Where:** nodescope.ts `sendEventFromThisScope` :573-581 (children), :597-605 (siblings)

**What the wire shows:** **a consumed Children or Siblings event stops only inside the component that consumed it**: `if (consumed) return true` sits in a `forEach` callback and returns from the callback, not the walk — `t05` "Consume = Always in the first child component…" records the second child firing

**Plain words:** *"Consume inside one child component does not stop the event reaching the next child."*

**Proposed:** fix: a `for…of` with an early return (one line each), ships alone

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Stop it there".** Consume works across components as its description says. A one-line change in each of two places. Only apps that set Consume to Always notice, and they asked for this. The question as asked: *"Should a consumed Children or Siblings event stop at the component that consumed it?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed a7710e300 (P109 ISL-032, 2026-10-06), as ruled.** The Children and Siblings walks in `sendEventFromThisScope` are indexed loops that return at the first consuming receiver.
