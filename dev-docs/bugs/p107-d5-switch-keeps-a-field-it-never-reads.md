---
id: P107-D5
title: Switch keeps a field it never reads
status: needs-ruling
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
