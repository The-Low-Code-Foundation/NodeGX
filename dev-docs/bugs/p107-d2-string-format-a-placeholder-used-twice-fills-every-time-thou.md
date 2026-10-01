---
id: P107-D2
title: String Format: a placeholder used twice fills every time, though the description says only the first
status: needs-ruling
severity: low
area: runtime / String Format
found: P107 (the node says what it does) s3, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-004-THE-PILOT-FIVE.md §6.2 (row D2) — the row names how it is reproduced and pinned
---

String Format: a placeholder used twice fills every time, though the description says only the first.

**Node:** String Format

**What, with the line:** Port description (:52) and the code comment (:91-92): "**a placeholder used twice fills only the first time**". The loop (:89-94) runs once per MATCH and each `replace` fills the first occurrence still standing — `{a}{a}` with `a = x` gives `xx`. Every occurrence fills

**How it was found / where it is pinned:** scenario *a placeholder used twice fills EVERY time*; `tests/pilot.test.ts`

**Proposed answer:** **docs wrong**, and a comment that says "kept verbatim" about a behaviour the line does not have. The description is published on the port (an-example-description-is-published)

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
