---
id: P109-S21-EXPORTDATEUNITWIRED
title: The export refuses a Date Add or Date Difference whose Unit is wired, for a reason that is gone (the runtime no longer throws on an unknown unit)
status: scheduled
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
