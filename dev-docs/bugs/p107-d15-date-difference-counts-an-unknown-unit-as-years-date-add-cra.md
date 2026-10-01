---
id: P107-D15
title: Date Difference counts an unknown Unit as years (Date Add crashes on the same value)
status: needs-ruling
severity: low
area: runtime / Date Difference
found: P107 (the node says what it does) s11, 2026-09-30/10-01
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
