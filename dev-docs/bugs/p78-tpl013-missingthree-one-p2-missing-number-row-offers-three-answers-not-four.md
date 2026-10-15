---
id: P78-TPL013-MISSINGTHREE
title: One P2 missing-number row (0 ? 10 15 20) offered three answers instead of four, and reddened SC-2's gate about once in 200 questions
status: fixed
severity: low
area: Star Class edition / P1–P2 generators (`packages/noodl-mcp/tests/tpl013Young.ts` `missingNumberQ`)
found: P78 TPL-013 s4, 2026-10-15
evidence: dev-docs/tasks/phase-78-the-templates/TPL-013-STAR-CLASS.md §6 s4
---

`missingNumberQ` builds its wrong answers from seven candidates and keeps those that are not below zero, not in the row
and not the answer. For exactly one row, step 5 from 0 with the hole second (`0 ? 10 15 20`, answer 5), five of the seven
fall away (−5 twice, 15 and 10 in the row, 5 its own digit flip) and only 25 and 30 remain: three buttons, not four.
Measured by running the generator 200 000 times per class: that row and no other, 996 times (about 1 in 200 of P2's
`missing-100` questions). SC-2's "four options" clause went red on a full run of the suite on 2026-10-15; it had been
green on the earlier runs by chance.

**Fixed:** after the candidates, the options are topped up with the next numbers above the answer that are not in the row.
Gated by `tpl013Edition.test.ts` "P78-TPL013-MISSINGTHREE", which finds that row and checks four options, none in the
row; with the top-up removed it is red (checked).
