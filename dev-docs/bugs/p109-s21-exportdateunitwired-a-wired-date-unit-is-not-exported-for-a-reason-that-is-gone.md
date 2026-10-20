---
id: P109-S21-EXPORTDATEUNITWIRED
title: The export refuses a Date Add or Date Difference whose Unit is wired, for a reason that is gone (the runtime no longer throws on an unknown unit)
status: fixed
regression: packages/nodegx-export/tests/date-family.test.ts — §A "unitOrDays agrees with the interpreter…", "dateAdd and dateDifference count an unknown or empty Unit…"; §B "a wired Unit translates…", "a wired Granularity translates too" (4 red on HEAD's lib and plan)
phase: P109
task: ISL-043
severity: low
area: export / Date Add, Date Difference (plan.ts DATE_NODES, `enum: true`)
found: P109 s21 (ISL-026, the C16 / D15 fix), 2026-10-06
evidence: packages/nodegx-export/src/analyze/plan.ts :1015-1022 (the `DateArgSpec` docblock) and :7955-7962 (the defer)
---

An exported app does not translate a Date Add or a Date Difference whose Unit arrives on a wire. The export defers
the node, saying *"that input is an editor-constrained list, and the interpreter throws on a value outside it rather
than answering"*. That was true until P109 ISL-026 fixed P107-C16 and D15: the runtime now counts an unknown Unit as
days (`datemath.ts` `unitOrDays`) and shows the editor a warning, so the runtime has an answer an export can copy.

Not a crash and not a wrong answer: the node is reported as not translated, by name. The fix is P18's: emit the
helper with the runtime's rule (an unknown or empty unit counts as days) and drop the defer and its docblock reason.
Date Compare's Granularity carries the same `enum: true` defer; its runtime was not changed by ISL-026, so re-read
that one before touching it.

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** It still deferred at HEAD with the old sentence.
🔴 **The defect was wider than the wire.** The emitted `dateAdd` / `dateDifference` passed the Unit through as it came,
so a *literal* unit the list does not have (from an old project) answered `undefined` in the export. The runtime
counts it as days. The emitted lib now carries `unitOrDays`, transcribed and graded against the runtime's own
function over ten odd units, and both helpers apply it. The `enum: true` gate and its four docblock reasons are gone.

Date Compare's Granularity was re-read, as this file asked. It never threw: the node reads `granularity ||
'millisecond'`, and `truncateTo`'s switch has no default, so an unknown value truncates nothing. The emitted
`dateCompare` already answered the same, and the differential row for it passes on HEAD too. Only its gate and its
parameter type changed.

The "reads … from a source that can be empty — the interpreter keeps its previous answer" note is not printed for
Unit or Granularity, because their setters turn an empty value into the default and recompute, as the helpers do.
⚠️ Read but not changed: the same note looks false for **Amount** too (`Number(undefined)` is NaN, and NaN becomes 0
on both sides). That predates this row and is left for whoever owns the date notes.

Readings: `date-family` 49/49, with 4 red on HEAD's `dateLib.ts` and `plan.ts`. HLS-001 golden: 2 lines predicted
and 2 counted. The package's `tsc` is 0.
