---
id: P107-C13
title: A consumed Children or Siblings event stops only inside the component that consumed it
status: needs-ruling
severity: medium
area: runtime / Send Event
found: P107 (the node says what it does) s10, 2026-09-30/10-01
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
