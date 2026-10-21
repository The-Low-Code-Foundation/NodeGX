---
id: P18-S136-CHAINWATCH
title: A Function's ticked input fed by a call's answer, read inside that call's chain, was watched by an effect outside the chain — a local no line there declares (TS2304)
status: open
severity: low
area: export / the ticked run's watch (`tickedPiecesOf`, `src/analyze/plan.ts`), a Function's input expressions resolved once
found: P18 session 136, 2026-10-21, tplbuild after EXP-021 slice 1 (members-area's `Members/Standing`: `myStandingAnswer.standing` in a ticked effect)
evidence: dev-docs/tasks/phase-18-code-export-v2/s136-hooks/README.md; tests/a-logic-component-is-a-hook.test.ts E3; mutant arm I
---

A Function's input expressions are resolved once, the first time the Function compiles. When that is inside a Cloud
Function's (or HTTP, Record, file) answer chain, a read of the call's output is the chain's local (`myStandingAnswer`),
which `exprValidIn` admits everywhere on the grounds that the local "cannot escape the action it is minted in". The
ticked run's effect, outside the chain, reused those expressions as what it watches: TS2304, the app does not build.

Since session 136 such an input is refused by name ("… is read from a call's answer inside that call's chain — the export
watches what a render reads"), so the Function is not exported. The faithful fix: the watch reads the answer's row
(`cloudAnswerStateOf`), the form a render reads. Template reach: members-area's Standing (its Function and what it feeds).
