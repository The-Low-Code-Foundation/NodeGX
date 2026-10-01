---
id: P78-D81
title: The library Date picker keeps a picked day when the next record's day is empty too
status: open
severity: medium
area: templates / library Date picker (TPL-008 todo list, TPL-010 planning)
found: P78 TPL-010-B s11, 2026-09-23 (read from the script); reach into TPL-008-RC §4, 2026-09-23
evidence: dev-docs/tasks/phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md §D81 (uncommitted on cline-dev); TPL-010-BILLING-MADE-CLEAR.md §5
---

A form with a Date picker is reused for a second record (a modal edit sheet, a new project after another). If the
first record's day was empty and the person picked one, and the next record's day is also empty, the day picked for
the first record is still in the field. TPL-010's project form would then say "the bill goes out" on a day nobody
chose for that project.

**Where:** `packages/noodl-mcp/tests/datePicker.ts:159-169`. The picker applies an arriving `Value` only when
`incoming !== S.lastIncoming`. A person's pick changes the field and `S.committed`, not `lastIncoming`, so a second
`''` is dropped. The same script ships inside the todo-list templates (`templates/todo-list-demo/components/Todo/Date
picker/nodes.json`). D78 is the same shape in `Text Input`. Re-read at HEAD on 2026-10-01: unchanged.

**Reproduce:** read from the script; not driven without the workaround. TPL-010 sends `1900-01-01` while the form is
closed (gated in `tpl010Template.test.ts` §9; `drive-tpl010-b.js` passes). TPL-008-RC's *Ends* field is reached only
after a refused pick and has no workaround. The Money editor's *Last date* field was not checked.

**Proposed:** compare against `S.committed` instead of `S.lastIncoming`, or add a `Clear` signal that resets both.
One line. Both templates are then regenerated and republished.
