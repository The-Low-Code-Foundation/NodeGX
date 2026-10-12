---
id: P107-C16
title: Date Add crashes and stays dead when Unit is a value it does not know
status: fixed
commit: 4626b7c54
phase: P109
task: ISL-026
severity: high
area: runtime / Date Add
found: P107 (the node says what it does) s11, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.DateAdd.json "C16: a Unit that is not one of the eight counts as days, and the node keeps working: 2 then 3 fortnights land 2 and 3 days on"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Use days and warn once".** An unknown Unit counts as days, its default, and the node shows a warning once. This matches the earlier ruling for an unknown animation curve. Two small changes, one in each node. The question as asked: *"What should Date Add and Date Difference do with a Unit they do not know?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), with D15, as ruled.** `datemath.ts` `unitOrDays`: a Unit that is empty or not
one of the eight counts as days in Date Add and Date Difference, and `unknownUnitMessage` puts one warning on the
node (`setDiagnostic`, keys `date-add/unknown-unit` and `date-difference/unknown-unit`) until the Unit is one it
knows. Both specs are v2; the C16 known row and its predicate are gone. Runtime 200: both conform, mutants 33 / 33 and
44 / 44. Control (HEAD's date files, v2 specs): exactly the C16 and D15 scenarios fail. Unit tests:
`packages/noodl-runtime/test/nodes/cwf-011-date.test.ts` "an unknown Unit counts as days, with one warning" (2 of 3
red on HEAD; the third, an empty Unit with no warning, is a guard). The export defers a wired Unit and does not crash;
its stated reason is now stale (`P109-S21-EXPORTDATEUNITWIRED`, P18).
