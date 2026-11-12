---
id: P18-S139-MULTIFEED
title: When several placed components' values fed one input, the parent bound the input to the last one placed; the others were set into rows nothing read (84 inputs, 232 feeds in the templates; App store would have written Delete's value when Save sent the pulse)
status: fixed
severity: high
area: export / the lift pass (`src/analyze/plan.ts`, `liftInto`) and the emitter's lifted callbacks (`src/emit/component.ts`, `combinedLifted`)
found: P18 session 139, 2026-10-22, reading rocket-school's emitted Lists page once App store was emitted
fixed: P18 session 139, 2026-10-22; EXP-011 §109
commit: 63ed1a9bf
evidence: dev-docs/tasks/phase-18-code-export-v2/s139-persisted-store/README.md, merged.out
regression: packages/nodegx-export/tests/a-persisted-store-travels.test.ts
---

In the runtime an input holds whatever arrived last. rocket-school's Lists page wires Save question set's, Delete
question set's and the Header's `app` into App store's one `app`. Each feed is written when that hook's value changes,
and the hook's `done` then writes the store. `liftInto` gave each feed its own parent row, then bound the input to each
in turn: the last one placed won. On the Lists page App store was handed Delete's row. Save's row was set and never
read, so a saved list would have written Delete's last value over the store.

The templates have **84** such inputs, fed by **232** lifted values (planning 23 + 23, rocket-school 12, star-class 12,
todo-list 7 + 7; `merged.cts`, `merged.out`). todo-list's project lists each hand Link, Move and Save project their
`projectId`, five lists into each, so four of the five lists linked, moved and saved the wrong project.

Fixed: an input several lifted values feed reads one row that every feed's callback writes, so whichever changed last is
what it holds. A feed whose value also reaches another sink writes its own row and the shared ones through one stable
`useCallback` (54 in the templates). A stable callback matters: the child's push effect depends on it, and an inline arrow
would push on every render, so the last effect to run would win. Graded on the Store Desk (Add and Drop into one store
input, A5).
