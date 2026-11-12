# HTX-002 — State and scripts

**Phase:** [134](README.md). **AC:** AC2 (logic). **Sessions:** 1–2. **Needs:** HTX-001.
**State:** ✅ done (sessions 2 and 3, README §10): the logic prints, and every desk the React export's logic is graded on
has an HTML arm. Hook, Set, Sibling, Store (fresh and over a stored copy), Header and Bell are equal to the runtime at
every reading; Signal, Success, Arrival and Relay differ only in cells pinned by name, all HTX-003's (a field's Set,
Clear and typing chain, a For Each over Static Data). Not HTX-002's: a Function that awaits or reads `Noodl`, the
session (HTX-004).

## The sentence

> "I typed in the field and pressed the button; the count went up and the Function I wrote ran, as written."

## Build

1. **The shared cores first** (README §7). List the `emit/*Lib.ts` helpers whose React output is a hook around a
   framework-free factory (Swift S7 found `stores/*`, `lib/history`, `lib/actions`). Where the core is inlined in the
   hook, move it out into a plain module both printers write. The React suite must stay green with the generated React
   app's behaviour unchanged (the React desks and the node-spec target are the proof); the React output's text may
   change only by the import line.
2. **The plan's state on `lib/core.js`**: state vars and Variables as `value()`, derived values as `derived()`, the
   plan's effects as `effect()`, lifts (a child's output into its parent) as the `outputs` object `mount<Name>` returns.
3. **Functions verbatim**: each body in `functions/<name>.js` inside the EXP-019 wrapper (`Inputs`, `Outputs`,
   `Noodl`, `this`), the same contract the React and Swift exports give. The scripts that touch the browser need no
   special case here: this is a browser.
4. **Component Inputs and Outputs**: `mount<Name>(element, inputs)` and `update(inputs)`; an output a parent listens to
   is a `value` the parent reads.

## Done when

- todo-list's logic components print and the desks that grade React's (`tests/helpers/*-desk.ts`: arrival, set, signal,
  store, hook, relay) have an HTML arm, each reading the same predictions. A difference is a finding, filed.
- The printer lines and the lines moved out of React's helpers are counted apart.

## Traps already known

- 🔴 A `Function` output publishes only when it changes (memory: a-javascript-output-publishes-only-when-it-changes):
  the HTML arm must keep React's rule, not `value()`'s own equality, wherever they differ. Measure both on one desk.
- 🔴 Don't edit `src/` while a peer's full suite runs (ts-jest compiles each file when reached).
