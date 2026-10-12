---
id: P107-D5
title: Switch keeps a field it never reads
status: wontfix
reason: ruled 2026-10-05 "Remove it with the next change" — no change now; the unused `_internal.initialized` field goes the next time Switch is changed for another reason
phase: P109
task: ISL-032
severity: low
area: runtime / Switch
found: P107 (the node says what it does) s3, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row D5) — the row names how it is reproduced and pinned
---

Switch keeps a field it never reads.

**Node:** Switch

**What, with the line:** `_internal.initialized` is set at :24 and read nowhere

**How it was found / where it is pinned:** by reading

**Proposed answer:** cosmetic; drop it with the next Switch change

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Remove it with the next change".** No change now. It goes the next time Switch is touched for another reason. The question as asked: *"Should this unused bookkeeping be removed now, or the next time someone changes Switch?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Closed 2026-10-06 (P109 ISL-032) as ruled:** nothing changed. Whoever next changes Switch removes the field in that commit.
