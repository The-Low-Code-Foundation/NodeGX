# What each arm should read (written before the variants ran, 2026-10-19)

The desk is `packages/nodegx-export/tests/helpers/root-desk.ts`. The main fixture's runtime readings were measured first
(the probe that built `tests/helpers/runtime-mounted-arm.js`); the variants below were predicted from it, then run.

A reading is every Text the document holds, in document order: said, seen, named, the flag box, then the Sheet, the Card,
the Ghost and the Gate where drawn.

Scenario S (the tree and the runtime): Open, Inside, Close, Reset, Open, Close. Scenario H (HEAD has no Inside button to
press): Open, Close, Reset, Open.

## The main fixture

| step | runtime = the tree |
|---|---|
| load | said nothing, seen nothing, named nobody, the flag box, the card |
| Open | said nothing, seen the sheet, named Ann, the flag box, the sheet, the card, the gate |
| Inside | said inside, seen the sheet, named Ann, the flag box, the sheet, the card, the gate |
| Close | said inside, seen the sheet, named Ann, the flag box, the card |
| Reset | said inside, seen nothing, named Ann, the flag box, the card |
| Open | said inside, seen the sheet, named Ann, the flag box, the sheet, the card, the gate (Did Mount again; the field announces no change) |
| Close | said inside, seen the sheet, named Ann, the flag box, the card |

HEAD, scenario H: every reading `said nothing, seen nothing, named nobody, the card, the gate`, except `seen nothing`
after Reset as before: the Sheet never drawn, the Gate always, the flag box never (`!!flag` of a Variable nothing sets).

## Variants

1. **The Sheet's root authored Mounted true** (the planning shape), its `shown` still wired from `open`, which nothing has
   set at load. Runtime: drawn at load (undefined is never delivered, so the root keeps its own true), so `seen the sheet`
   and `named Ann` at load. The tree: the parent passes `shown={!!openValue}`, `false`, so NOT drawn at load. **Predicted to
   diverge at load only**, a parent-side coercion, not the root's rule; after Open and Close both agree.
2. **The Mounted wire on an element inside the root** (`shBody`, authored false, holding the Sheet's children; the root
   plain). Runtime = the tree = the main fixture's readings. HEAD: the Sheet's text and button appear on Open, but `seen`
   stays `seen nothing` (the Did Mount under a value-mounted element was refused) and `named` stays `named nobody` (the
   field's announcement was refused).
3. **The control**: every root's Mounted wire and the flag box's removed (the Sheet and the Ghost keep their authored
   false). Runtime = the tree = HEAD: `said nothing, seen nothing, named nobody, the flag box, the card, the gate` at
   every step (Open draws nothing new).
4. **A Page's Mounted wired** (from `open`): still the router's; the plan drops the wire with "a router concern", the page
   is drawn.
