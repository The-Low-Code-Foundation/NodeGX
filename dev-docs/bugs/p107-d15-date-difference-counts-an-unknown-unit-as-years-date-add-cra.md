---
id: P107-D15
title: Date Difference counts an unknown Unit as years (Date Add crashes on the same value)
status: fixed
commit: 4626b7c54
phase: P109
task: ISL-026
severity: low
area: runtime / Date Difference
found: P107 (the node says what it does) s11, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.DateDifference.json "D15: a Unit not in the list counts as days, as Date Add does (1,247 days, not 3 years)"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md §6.2 (row D15) — the row names how it is reproduced and pinned
---

Date Difference counts an unknown Unit as years (Date Add crashes on the same value).

**Where:** Date Difference (datemath.ts :98-115)

**What the wire shows:** a `Unit` not in the list misses every fixed unit and lands on the month path, whose last line reads anything but `'months'` as YEARS

**Plain words:** *"An unknown Unit on Date Difference is counted in years; the same value on Date Add throws (C16)."* One scenario

**Proposed:** the C16 answer, applied to both

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Use days and warn once".** An unknown Unit counts as days, its default, with a one-time warning on the node. Matches Date Add and the earlier ruling for an unknown animation curve. The question as asked: *"Should Date Difference treat an unknown Unit the same way as Date Add?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), with C16, as ruled.** `datemath.ts` `unitOrDays`: a Unit that is empty or not
one of the eight counts as days in Date Add and Date Difference, and `unknownUnitMessage` puts one warning on the
node (`setDiagnostic`, keys `date-add/unknown-unit` and `date-difference/unknown-unit`) until the Unit is one it
knows. Both specs are v2; the C16 known row and its predicate are gone. Runtime 200: both conform, mutants 33 / 33 and
44 / 44. Control (HEAD's date files, v2 specs): exactly the C16 and D15 scenarios fail. Unit tests:
`packages/noodl-runtime/test/nodes/cwf-011-date.test.ts` "an unknown Unit counts as days, with one warning" (2 of 3
red on HEAD; the third, an empty Unit with no warning, is a guard). The export defers a wired Unit and does not crash;
its stated reason is now stale (`P109-S21-EXPORTDATEUNITWIRED`, P18).
