---
id: P112-OWN034-INNERWIDTH
title: A "does the phone scroll sideways" check that compares against innerWidth can never fire under mobile emulation, because Chrome grows innerWidth to the content; two lab graders do it
status: open
severity: medium
area: lab graders — dev-docs/tasks/phase-112-your-own-nodegx/own-019/grade-launch.mjs (phone check), dev-docs/tasks/phase-78-the-templates/todo-digitalbricks/staging-e2e.js (phoneOverflowX)
found: P112 OWN-034 s1, 2026-10-30 (the grader's own controls)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-034/RESULTS.md §1 ("One miss on the way"); control/scrolls-sideways/ (a page 486 px wide at a 390 px phone)
phase: P112 OWN-034
---

What happened: OWN-034's habit tracker grader had a check, B13, for "on a phone nothing scrolls sideways". It scored
13/13 on a control made to scroll sideways: each day cell was 60 px wide, so a row was 486 px on a 390 px phone. The
check read `document.documentElement.scrollWidth > innerWidth`.

Measured, in headless Chrome with `Emulation.setDeviceMetricsOverride({ width: 390, mobile: true })` on that page:

| | value |
|---|---|
| `innerWidth` | 486 |
| `document.documentElement.clientWidth` | 390 |
| `visualViewport.width` | 390 |
| `scrollWidth` | 486 |

On the clean page, all four read 390. With `mobile: true`, as on a real phone, `innerWidth` follows the content. So any
check of the form `scrollWidth > innerWidth`, or `rect.right > innerWidth`, reads a page that overflows as one that
fits.

The same comparison under `mobile: true` appears in:
- `own-019/grade-launch.mjs:394–406`: the `phone` check, `scrollWidth <= innerWidth + 1`, and `past` (leaves whose
  right edge is beyond `innerWidth`). Both halves are blind in the same way;
- `phase-78-the-templates/todo-digitalbricks/staging-e2e.js:233` (`phoneOverflowX`).

Not re-graded: OWN-019's past "phone" passes may include pages that scrolled sideways. Re-running them is not this
lane's work.

Fix: compare against the width the grader set itself, or against `document.documentElement.clientWidth`. OWN-034's
`grade.mjs` uses a `PHONE_W` constant.

**The kit is not affected.** `render_report`'s overflow check (`packages/nodegx-render-measure/src/index.js:165`)
already measures against `document.documentElement.clientWidth`. Only its `viewportArea` (:434) uses `innerWidth`,
which makes the coverage ratio of an overflowing phone page slightly low. No check fails or passes because of it.
