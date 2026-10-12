---
id: P107-C132
title: A number wired into a Columns' Medium Below or Small Below is refused unless a size was typed into that port first, and a number after a var(--token) is refused on any size port
status: fixed
commit: 11fef09c6
phase: P109
task: ISL-050
severity: medium
area: runtime / size ports (packages/noodl-runtime/src/node.ts `setInputValue` :430-437 merges a number only into a `{ value, unit }` the port already holds; nodedefinition.ts `initializeDefaultValues` :180-199 seeds one only for a port with a default; noodl-viewer-react/src/react-component-node.ts `defineRegularInputProp` :698-745 refuses a bare number)
found: P107 NSP-016 s60, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.21; recorded on the runtime target (the s60 probe traces), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/net.noodl.visual.columns.json "a bare number on Medium Below that has never held a size is read in pixels: Medium applies (v3, row C132)"
---

**What a person sees.** A Number node, an Expression or a States node wired into a Columns' **Medium Below** or **Small Below**
does nothing: the breakpoint never applies, and the only sign is a runtime error ("… is not a size … The previous value is kept").
Typing a value into the port in the property panel first makes the same wire work, because the port then holds `{ value, unit }`
for the number to merge into. The same happens on ANY size port after it was handed a `var(--token)`, a refused value or `null`
handed in place of a size: Horizontal Gap given `var(--gap)` and then `100` keeps the token.

**Where.** Medium Below and Small Below are the only Columns size ports with no `default` (columns.ts), so `initializeDefaultValues`
seeds nothing and `setInputValue` has no unit to merge a number into; the setter then takes the bare number for "not a dimension".
A string `'900'` is refused the same way. Once a port has held a token (no `.unit`), every later number is refused for the same
reason.

**How to reproduce.** Play the `regression:` scenario on the runtime target (and "a var(--token) Medium Below is kept as written
and reads as 0: inert; a number after it is refused"). The spec copies the behaviour (R3).

**Proposed fix.** Give Medium Below and Small Below a size to merge into — a `defaultUnit` seed of `{ value: undefined, unit: 'px' }`
without a value (or merge a bare number into the port's `defaultUnit` when the port holds no size at all, in `setInputValue`). A
ruling first: should a number on a size port that holds nothing (or holds a token) be read in the port's default unit?

**Ruled 2026-10-08 (P107 "Phase 107 Rulings" page), as recommended: "Read the number as pixels".** A bare number on a size input that holds no size, or last held a token, is read in the input's default unit.

**Fixed 2026-10-09 (P109 ISL-050 s33, `11fef09c6`).** `setInputValue` reads a finite number, or text that reads as one, on a size
port that holds no size (nothing yet, a `var(…)`, a refused value) as `{ value, unit: <the port's default unit> }`; the default unit
rides beside `hasUnits` from `nodedefinition.ts`. Anything else arrives as sent and is refused as before; a held size still merges.
Columns spec v3: four scenarios renamed for what they now show, one added (a refused value, then a number; blank and non-numeric text
still refused). Two older tests pinned the refusal — fb-019 rows 5 and 6, GAM-015's no-default row — and were restated to the ruling,
each red on the pre-fix runtime. Control: the pre-fix runtime against v3 is red on exactly the five C132 scenarios.
