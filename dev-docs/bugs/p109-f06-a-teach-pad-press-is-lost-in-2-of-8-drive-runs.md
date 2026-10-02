---
id: P109-F06
title: A Teach pad press is lost in 2 of 8 drive runs (cause not measured — likely P78-D85's doubled keys)
status: scheduled
phase: P109
task: ISL-001
severity: medium
area: runtime / For Each (suspected) — template Teach pad
found: P106 IG-005 §7.7 s4 lane B, 2026-09-29 (audit P109 F06)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F06; ISL-001 §2 last row and AC7; dev-docs/tasks/phase-106-the-island-grows/IG-005-ROBOTS-FOR-THE-JOB.md §7.7
---

A child presses a direction on the Teach pad and the press does not land: in page-drive run 3 the program ended one
tile off (one `left` missing), and in modes run 1 three presses made two blocks. Both drives were green on the next
run with no change.

**Where:** not isolated. The pad's own comment (`packages/noodl-mcp/tests/cg003Components.ts:637-638`) says a doubled
key set meant "mamie-note's read twice, so no press landed", which points at P78-D85 (the pad drew 10 keys for 5); a
press read before the previous press's world was written is the other candidate (template). Not re-measured since
2026-09-29.

**Reproduce:** run the IG-005 Teach-pad page drive 8 times and count lost presses (ISL-001 AC7, before and after
D85's fix). One heavy job.

**Proposed:** none until measured. ISL-001 owns the measurement and a sentence saying whether this went with D85; if
it did not, file the cause as its own bug.

**2026-10-02 (P109 s3, ISL-001 AC7):** not reproduced — `drive-ig003-modes.js` 8× on the island with ISL-001's fix and
ISL-025 W3: 8 / 8 runs 90 / 90, every press / block clause green, 0 console errors. Consistent with F06 having been D85
(a pad list doubled mid-build), not shown by it; the cause is still unmeasured. Status left as it was.
