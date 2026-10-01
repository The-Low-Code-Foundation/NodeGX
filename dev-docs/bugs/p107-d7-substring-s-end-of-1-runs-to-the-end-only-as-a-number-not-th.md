---
id: P107-D7
title: Substring's End of -1 runs to the end only as a number, not the text "-1"
status: needs-ruling
severity: low
area: runtime / Substring
found: P107 (the node says what it does) s4, 2026-09-30/10-01
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-011-BATCH-LOGIC-MATH-STRINGS.md §6 (row D7) — the row names how it is reproduced and pinned
---

Substring's End of -1 runs to the end only as a number, not the text "-1".

**Node:** Substring

**What, with the line:** Description (:57): "-1, the default, runs to the end of the string". The check (:93) is `=== -1` on the RAW value: End wired as the text `'-1'` (a text field, an expression) yields `''` — `substr(0, '-1' - 0)` is a negative length

**How it was found / where it is pinned:** scenario *End '-1' as text is not -1*

**Proposed answer:** **runtime bug, small**: `Number(value) === -1`, or convert on arrival

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules; each fix then ships alone, with the
scenario's `row` mark and the known-row predicate (packages/noodl-runtime/test/node-spec/conformance.test.ts)
dropped in the same commit. Plain-words question: README §7 of P107.
