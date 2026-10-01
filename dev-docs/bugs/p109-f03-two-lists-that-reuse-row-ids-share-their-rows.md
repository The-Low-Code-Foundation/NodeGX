---
id: P109-F03
title: Two lists whose rows reuse the same ids (`l0`, `l1`…) silently share rows — one list shows the other's data
status: scheduled
phase: P109
task: ISL-003
severity: medium
area: runtime / For Each (Repeater) + Model
found: P106 IG-006 §7 s2 lane C, 2026-09-29 (audit P109 F03)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F03; ISL-003 §2; dev-docs/tasks/phase-106-the-island-grows/IG-006-OLIVE-READS.md:166-167
---

Five lesson cards all showed one card's lines. Each card's list used ids `l0, l1…`; a row is a Noodl Object that is
global by `id`, so the last list written wins for every list. No error, no warning, and nothing in the docs says row
ids are app-wide.

**Where:** `packages/noodl-runtime/src/model.ts:218-252` (`Model.get` returns one module-wide record; `Model.create`
writes every field onto it); a Repeater converts plain rows with `Model.create` (`collection.ts:544`); rows re-render on
the shared record's `change` (`foreach.tsx:585-617`). The sharing is relied on on purpose elsewhere (P107 NSP-012 S1).

**Reproduce:** two For Each nodes fed `[{id:'l0',text:'a'}]` and `[{id:'l0',text:'b'}]` → both rows show `b`.

**Workaround:** hand-made id prefixes on every row (`cg003Scripts.ts:328-331, 1250-1254`).

**Proposed:** 🔒 ISL-003 asks Richard: per-list rows, or keep shared plus a warning when one id arrives with different
data (recommended, with GAM-005's "shared on purpose" escape) and a docs line. Small–medium.
