---
id: P18-S136-NESTEDROWS
title: A Static Data field holding a list of lists was typed `readonly readonly number[][]` (TS1354)
status: fixed
severity: low
area: export / Static Data's row types (`staticTsType`, `src/analyze/plan.ts`)
found: P18 session 136, 2026-10-21, tplbuild after EXP-021 slice 1 (bot-garden's `Requests`: `among: [[…], […]]`)
fixed: P18 session 136, 2026-10-21; EXP-011 §106
commit: 7abdb4257
evidence: tests/a-logic-component-is-a-hook.test.ts E4; mutant arm J
regression: packages/nodegx-export/tests/a-logic-component-is-a-hook.test.ts
---

The element type of an array was printed after `readonly` unparenthesised, so a list of lists read
`readonly readonly number[][]`, which TypeScript refuses. Latent (no exported Static Data held one), reached when bot-garden's
logic component began to export. Fixed: an element type that is not a bare name is parenthesised,
`readonly (readonly number[])[]`.
