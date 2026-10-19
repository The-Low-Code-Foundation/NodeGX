---
id: P18-S127-SETDONE
title: A Set Variable's Done runs nothing in the export (54 template nodes refused)
status: fixed
severity: medium
area: export / a Set Variable's `done` output as a chain (`src/analyze/plan.ts`, `compileSink`'s Set Variable case and the attach pass)
found: P18 session 127, 2026-10-19, the Signal Desk's first draft (Change's pulse sent from a Set Variable's Done)
fixed: P18 session 128, 2026-10-19, branch l6-setdone; EXP-011 §95
commit: ffd3d7179
evidence: dev-docs/tasks/phase-18-code-export-v2/s127-insignal/EXPECTED.md; `census.ts` there (`refusedBy["Set Variable"]`)
---

A Set Variable sends Done after it writes, and authors chain from it ("set the outcome, then show the banner"; "clear the
id, then fill the editor"). The export compiles a Set Variable's Do as a store write and never looks at its Done: every
wire out of Done is dropped, "the trigger is not a rendered element event or a receiver", and the node it drives refused
with that sentence.

Measured over the 19 templates on the tree after session 127: **54 nodes refused for a Set Variable trigger**
(rocket-school 19, star-class 19, nightbook 12, bot-garden, story-engine, todo-list, todo-list-demo 1 each). And wires
into placed components' signal inputs, which session 127 carries from every other sender: rocket-school's Lists page
(`lsSetEditId.done`, `lsClearId.done` into the Editor's `fill`), its Monster and Race pages (`zgSetPlaying.done`,
`rcSetPlaying.done` into the game's `start`), so the game's start chain never runs in the export (those wires are dropped
and named in the page's markers; the placed component is drawn).

Fix, its size: small to medium. `Set Variable`'s compile returns its `then` from `doneChainOf(node)`, as the record verbs
and a Function's Done do (an action list after the write); `ownsChainOutput` lists `done` for it so the attach pass does not
see the wire twice. Grade against `runtime-mounted-arm.js` (the Signal Desk's first draft is the fixture: Change → Set
Variable → Done → `show`).

**Session 128 (EXP-011 §95): fixed.** A Set Variable's Done chain, then its Completed chain, run after its write as
following statements (`store-set.then`, `withSetDone`): the runtime writes, notifies every Variable reading the name,
then sends Done and Completed, and a Done's target is flagged dirty with its sender and pulls it first, so the chain runs
before the click's next wire (measured; predicted the other way from the update loop alone). A chain the export cannot
run keeps the write and is named on each of its wires, the sink's own refusal first. Graded against the runtime's own
nodes with real React under StrictMode (`tests/the-set-runs-its-done-chain.test.ts`, 28 rows; the mutant arms in
`s128-setdone/mutants.py`). Over the 19 templates: **54 → 20 nodes refused with a Set's output as their trigger; 55
nodes gained, 0 lost** (corpus 104 gained, 0 lost). rocket-school's and star-class's game and race start now.

What is left, not this bug: a chain with a text field's Set in it (the Lists Editor's `fill`, P18-S128-FIELDSET), a chain
into a logic component, a Function the export refuses (the clock, the network), a Set whose value has no known source.
