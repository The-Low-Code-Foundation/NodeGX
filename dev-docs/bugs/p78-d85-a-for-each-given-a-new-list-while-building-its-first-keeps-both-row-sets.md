---
id: P78-D85
title: A For Each given a new list while it is still building its first draws both row sets
status: scheduled
phase: P109
task: ISL-001
severity: high
area: runtime / For Each (Repeater)
found: P78 TPL-011 s5, 2026-09-27 (Richard's screenshot); met again P108 IW-001 2026-09-29 and IW-008 s4 2026-09-30 (audit P109 F01)
evidence: dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md §D85; dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F01; ISL-001 §2
---

A list that gets a value as the page opens and another a moment later (a saved value, then a fresh load) draws rows
for both. The extra rows stay through every later change, with no error. Nightbook's feelings showed "bien au chaud"
twice (four words for three); the island's Teach pad drew 10 keys for 5; My robots drew 14 cards for 9. Giving every
row a stable id did **not** cure it.

**Where:** `packages/noodl-viewer-react/src/nodes/std-library/data/foreach.tsx:451-461` — `scheduleRefresh` queues
`() => { this.refresh(); }`, so the queue awaits `undefined`, drains and fires `Items Rendered` while the async
`refresh()` (`:716-793`) is still looping over the **live** collection (`:784-788`). A second `Items` value's
`scheduleCopyItems` → `collection.set` queues `add` ops that run beside that loop, so one record can be built twice.
F50's comment in `packages/noodl-runtime/src/collection.ts:503-519` names the shape; F50 fixed only the same array set twice.

**Reproduce:** TPL-011 reopened book (Variable already holds `[g1, g7, g4]`, the load sets them again) → four rows.
No spec reproduces it yet (ISL-001 AC1). Re-read at HEAD `d2b2f0101`: `foreach.tsx` unchanged since 2026-08-11.

**Workaround in templates:** TPL-011 replaced the For Each with three fixed slots; the island puts a 120 ms Timer and a
`Logic/Latch` Function in front of every list fed twice (`packages/noodl-mcp/tests/cg003Components.ts:633-656`).

**Proposed:** in `refresh()`, iterate a snapshot taken before the first `await`, and drop the `add`/`remove` ops
`scheduleCopyItems` queued while it ran (diff once at the end); make the queued op return `refresh()`'s promise.
Small–medium (one file plus a yielding corpus spec).
