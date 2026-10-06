---
id: P107-D7
title: Substring's End of -1 runs to the end only as a number, not the text "-1"
status: fixed
commit: 7761b440a
phase: P109
task: ISL-032
severity: low
area: runtime / Substring
found: P107 (the node says what it does) s4, 2026-09-30/10-01
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Substring.json "End '-1' as text runs to the end of the string, as the number -1 does (v3; was row D7: it yielded '')"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Treat it as -1".** End reads the text '-1' as the number, so it runs to the end. A one-line change, and nobody wants the empty result. The question as asked: *"Should Substring treat the text '-1' on End the same as the number -1?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 7761b440a (P109 ISL-032, 2026-10-06), as ruled.** `Number(end) === -1`. Substring v3.
