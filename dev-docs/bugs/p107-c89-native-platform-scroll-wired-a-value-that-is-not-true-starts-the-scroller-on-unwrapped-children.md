---
id: P107-C89
title: Native platform scroll wired a truthy value that is not true (1, "false") starts the JavaScript scroller on children it never wrapped — Scroll To Index fails for every child, and clicks can be lost
status: fixed
commit: 31c78fe6e
phase: P109
task: ISL-038
severity: low
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `render` and `componentDidMount`)
found: P107 NSP-016 s52, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the runtime target's 200 runs (seeds 13 and 20730: five sequences, bisected to Enable Scroll and such a Native platform scroll)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "C89 — Native platform scroll wired 1 is native: Scroll To Index 0 is Done"
---

**What a person sees.** Native platform scroll is wired from data and arrives as `1` or the text `"false"`. Scroll To Index
reports Failure for every index, and with Block Pointer Events on a click on the Group no longer fires Click.

**Where.** Group.tsx reads the port two ways. `render` draws the children unwrapped when `props.nativeScroll` is truthy;
`componentDidMount` starts the JavaScript scroller when it is not exactly `true`. A truthy value that is not `true` gets both:
the scroller runs on the Group's element as if its first child were the wrapper, so `scrollToIndex` looks for the child inside
the first child, and the scroller's own click handling takes the click.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec reads the value as the render does
(truthy is native), so the scenario carries `row` and the runtime's difference is counted as known (`nativeScrollNotBoolean`).

**Proposed fix (one line).** Read the port one way in both places: `if (this.props.scrollEnabled && !this.props.nativeScroll)`
in `componentDidMount`, as `render` and `componentDidUpdate` already do. When it is fixed, remove the scenario's `row` field and
the C89 entry from KNOWN_ROWS in the same commit.

**Fixed 31c78fe6e (P109 ISL-038, 2026-10-07).** Group.tsx `componentDidMount` reads Native platform scroll as `render` and `componentDidUpdate` do (`!this.props.nativeScroll`), so a wired 1 is native and the scroller never starts on unwrapped children. Graded on the runtime target at the landing commit's tree (P109 s29, 2026-10-07): the Group v3 conforms at seeds 13 and 20732 (1390 of 1395 scenarios, the five failing ones the open C79 row; 200 sequences, 0 divergences, every unkilled mutant a declared equivalent), and the Text, Shape and Image conform at both seeds with the new drag-drop.ts; the Group conforms on the interpreter (every mutant killed or declared); viewer 1807 / 1807; catalog parity + schema 342 / 342 with the visual batch. Control: HEAD's Group.tsx, drag-drop.ts and group.ts under the same scenarios are red on exactly the fifteen row scenarios of C86, C87, C88, C89, C90 and C95, and the nine twins pass on both.
