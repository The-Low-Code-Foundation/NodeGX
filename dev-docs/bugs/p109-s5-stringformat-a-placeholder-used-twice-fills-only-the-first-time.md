---
id: P109-S5-STRINGFORMAT
title: String Format fills a placeholder used twice only the first time
status: open
severity: low
area: `noodl-runtime/src/nodes/std-library/stringformat.ts:88-93` (`replace` with a string pattern), documented at `:53`
found: P109 s5, 2026-10-02 — ISL-005's census (finding 2), re-read at HEAD
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ (ISL-009 §8 s5, ISL-005 §8 s5, ISL-005-CENSUS-2026-10-02.md)
---

`formatted.replace('{' + name + '}', …)` replaces the first occurrence only; the port description says so (*"a
placeholder used twice fills only the first time"*) and the code says *"Kept verbatim"*. A word table ("{name} has
{count} robots; {name}'s garden…") cannot use String Format, which is one reason the island's 28 Functions paste a word
helper instead (ISL-005 census; Richard ruled "Native nodes first" on 2026-10-02, which names this gap).

**Plain words:** *"If your sentence uses the same blank twice, the second one stays as {name}."*

**Proposed:** replace every occurrence (`split/join`), with the description updated; check the export's String Format
emitter matches.
