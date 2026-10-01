---
id: P107-C16
title: Date Add crashes and stays dead when Unit is a value it does not know
status: needs-ruling
severity: high
area: runtime / Date Add
found: P107 (the node says what it does) s11, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2 (row C16) — the row names how it is reproduced and pinned
---

Date Add crashes and stays dead when Unit is a value it does not know.

**Where:** Date Add (dateadd.ts :77-78; datemath.ts :88)

**What the wire shows:** a `Unit` that is not one of the eight and not empty — a wire can carry any string — is STORED, then `addToDate` THROWS inside the setter: the node is dead from then on (every later recompute throws). Date Difference, Date Compare and Date To String take the same value without throwing

**Plain words:** *"A Unit value Date Add does not know crashes the node in the setter instead of refusing or ignoring it."* 22 sequences counted; one scenario under the row

**Proposed:** refuse: `Invalid Date`-style failure, or read as days (`\|\| 'days'` already handles empty)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
