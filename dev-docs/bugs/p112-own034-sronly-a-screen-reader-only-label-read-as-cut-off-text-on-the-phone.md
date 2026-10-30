---
id: P112-OWN034-SRONLY
title: OWN-034's phone check (B13) failed a visually hidden screen-reader label as "cut off" text
status: fixed
commit: 41315bb95
severity: medium
area: lab grader — dev-docs/tasks/phase-112-your-own-nodegx/own-034/grade.mjs (B13)
found: P112 OWN-034 s2, 2026-10-30 (the first app graded, D·code round 1)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-034/RESULTS.md §2; runs/d-code-1/ (app/index.html:34 and :114, grade/phone.png)
phase: P112 OWN-034
---

What happened: the first real app the grader saw (D·code round 1, DeepSeek in bare Cline) scored 12/13. B13 failed with
`cut off: Habit name`. The phone screenshot showed nothing cut off.

"Habit name" is the form's `<label class="sr-only">`. That is the standard visually hidden pattern: `position:absolute;
width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0)`. B13 checked every visible element that holds text for
`overflow-x` other than `visible` and `scrollWidth > clientWidth`. A 1×1 px box of label text meets both conditions
by design. So the check would have failed any app that labels its inputs for screen readers this way, which is the
accessible way to do it.

None of the six controls has an `sr-only` element, so the controls could not show this.

Fix (s2): B13 skips any element whose box is at most 1×1 px. Text in a box that small cannot be seen, and text that
really is cut off has a larger box. Re-measured after the fix:

| app | before | after |
|---|---|---|
| control/clean | 13/13 | 13/13 |
| control/scrolls-sideways | 12/13 (B13) | 12/13 (B13, the same reasons) |
| runs/d-code-1 | 12/13 (B13 `cut off: Habit name`) | 13/13 |

**The kit is not affected.** `render_report` (`nodegx-render-measure`) does not check each element's text for
clipping in this way.
