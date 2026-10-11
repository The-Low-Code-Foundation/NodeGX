---
id: P78-D81
title: The library Date picker keeps a picked day when the next record's day is empty too
status: fixed
phase: P109
task: ISL-046
severity: medium
area: templates / library Date picker (TPL-008 todo list, TPL-010 planning)
found: P78 TPL-010-B s11, 2026-09-23 (read from the script); reach into TPL-008-RC §4, 2026-09-23
regression: scripts/library/drives/date-picker.js §11 (the prefab); packages/nodegx-backend/tests/isl046-d81-routine-dates-drive.test.ts (TPL-008's routine pane)
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

**Measured (P109 s43, 2026-10-11), the first time it was driven:**

- *Does a Function re-run when an input is set to the value it already holds?* No. `setScriptInputValue` asks
  `shouldRunOnValueChanged`, which needs the value to differ (DEF-046). So the proposed one-line fix (compare with
  `S.committed`) could never see the second `''`, and it would have wiped a pick whenever another input re-ran the
  script. A signal wired straight into the Function does not reach the script either: a pulse lands on a value
  input as `true` then `false` in one pass.
- **The prefab** (`date-picker.js` §11, Value from a Variable): empty record, pick the 30th, *next record* (the
  Variable set to `''` again) → the field still showed the 30th. The same with a record holding the 14th, opened
  twice. Both red on HEAD; the control (another input re-runs the script, the aria-label moves, the pick stays) green.
- **The shipped template** (TPL-008's routine pane, which stays drawn while the person picks another routine): on
  Pilates, an end date before its start is refused and the record keeps an empty end; then *Take the tablets* showed
  Pilates' refused day as its end. Red on HEAD's `todo-list-demo`.

**Fixed:** a `Reset` signal on the picker, counted by a second small Function the way `mounted` already is. The
count moving makes the script show `Value` again, over a pick or a half-typed date; `Changed` does not fire. TPL-008's
Routine summary takes the open routine's id and sends `Reset` to both its date fields when it changes. Both drives
green after. TPL-010's project form keeps its `1900-01-01` while-closed workaround (Planning is set aside). The other
TPL-008 forms re-draw per record or write each pick back. Regenerated: the prefab, `todo-list`, `todo-list-demo`,
`planning` and `planning-demo`. `templates/nightbook` (P78's untracked pile) was not regenerated. Its copy changes
the next time its generator runs.

Found beside it: `P109-S43-ROUTINEREFUSAL`. The refusal sentence follows the person to the next routine.
