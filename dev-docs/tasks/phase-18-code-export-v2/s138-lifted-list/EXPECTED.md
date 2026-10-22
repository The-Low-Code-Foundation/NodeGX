# s138 — predicted before either arm ran

Written 2026-10-22, before `a-logic-component-is-a-hook.test.ts` ran the extended Hook Desk on either arm.

## What the desk gains

- **Shelf** (`/Logic/Shelf`, `n` ← bump.n): a logic component, a Function with no Run:
  `rows = ['a','b','c'].slice(0, (Number(n) || 0) + 1).map(k => ({ id: k, name: 'pick ' + k }))`.
- **For Each** `shelfEach` on the page, after `rows`, items ← Shelf's `rows`, template `/Row/Item`: a Text and a Button,
  both showing the row's `name`; the Button sends the row's signal `pick`; the row's value output `id` is its input `id`,
  passed through.
- **Picker** (`/Logic/Picker`, `which` ← `shelfEach.itemOutput-id`, `go` ← `shelfEach.itemOutputSignal-pick`): Run by `go`,
  `picked = 'picked ' + which`. The page's Text `picked` (last) reads it.

Steps: the old five (More, Go A, Go B, Go A, More), then `pick b`, `pick a`, `More`, `pick c`.

## The readings (every Text in document order)

The first seven columns are BASE's, unchanged; for the four new steps they hold the last row's values
(`'4', 'y is 4', 'total 2', 'total 10', 'dones 3', 'echo total 2', 'rows 6'`, and after the second More `'6', 'y is 6', …,
'rows 9'`). Then one Text per row, then `picked`:

| step | rows | picked |
|---|---|---|
| load | `pick a` (n unset ⇒ one row) | `Text` (runtime default; `''` in the export) |
| More (n 1) | `pick a`, `pick b` | Text |
| Go A, Go B, Go A | unchanged | Text |
| More (n 2) | a, b, c | Text |
| pick b | a, b, c | `picked b` — the row's id arrives with its signal |
| pick a | a, b, c | `picked a` |
| More (n 3) | a, b, c (three is all there are) | `picked a` |
| pick c | a, b, c | `picked c` |

## HEAD's export (the control)

The list draws no rows (`instance output "rows" feeds For Each.items, which has no static binding`): no row Texts, no
`pick …` buttons; the arm finds no button to press, and `picked` stays `''`.

## The mutants that must be seen

- the `itemsLifted` → `itemsExpr` assignment in `liftInto` removed ⇒ no rows (A8).
- the row value into a placed component's input not bound (the new pass skipped) ⇒ `picked undefined` (A9).
- the relay write not prepended (emitter) ⇒ `picked undefined` (A9).
- `compileInstanceSignal`'s row guard removed ⇒ the plan row C8 (bot-garden's shape on the desk: a row value computed
  inside the row) reads the pulse attached.
