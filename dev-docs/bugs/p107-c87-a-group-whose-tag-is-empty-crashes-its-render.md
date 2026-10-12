---
id: P107-C87
title: A Group whose Tag arrives empty (or null, 0, false) throws while React draws it, and the page stops drawing
status: fixed
commit: 31c78fe6e
phase: P109
task: ISL-038
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx render — `const { as = 'div', ...props } = this.props`)
found: P107 NSP-016 s52, 2026-10-06
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the first side-by-side run of the Group spec on the runtime target (a Text scenario carried over: Tag written "")
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "C87 — a Tag written empty draws a div, as no Tag does"
---

**What a person sees.** A Group's Tag is wired from data (a list of sections whose element type is stored per row, say)
and one row has no value — an empty text, or null. The page stops drawing: React throws `"" did not match the Name
production` (or "Element type is invalid" for null), and a render error with no boundary takes the app's root down with it.

**Where.** Group.tsx takes the tag with a destructuring default, `const { as = 'div', ...props } = this.props`. A default
applies only to `undefined`, so `""`, `null`, `0` and `false` reach `React.createElement`. The Text does the same thing with
`props.as || 'div'` (Text.tsx :50) and draws a `div`.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec says what the Text does (a Tag with
no value draws a `div`), so the scenario carries `row` and the runtime's throw is counted as known (`emptyTag`).

**Proposed fix (one line).** `const Component = (props.as || 'div') as React.ElementType`, as the Text does. When it is
fixed, remove the scenario's `row` field and the C87 entry from KNOWN_ROWS in the same commit.

**Fixed 31c78fe6e (P109 ISL-038, 2026-10-07).** Group.tsx reads the Tag `as || 'div'`, as the Text does, so an empty, null, 0 or false Tag draws a div. Graded on the runtime target at the landing commit's tree (P109 s29, 2026-10-07): the Group v3 conforms at seeds 13 and 20732 (1390 of 1395 scenarios, the five failing ones the open C79 row; 200 sequences, 0 divergences, every unkilled mutant a declared equivalent), and the Text, Shape and Image conform at both seeds with the new drag-drop.ts; the Group conforms on the interpreter (every mutant killed or declared); viewer 1807 / 1807; catalog parity + schema 342 / 342 with the visual batch. Control: HEAD's Group.tsx, drag-drop.ts and group.ts under the same scenarios are red on exactly the fifteen row scenarios of C86, C87, C88, C89, C90 and C95, and the nine twins pass on both.
