---
id: P107-C89
title: Native platform scroll wired a truthy value that is not true (1, "false") starts the JavaScript scroller on children it never wrapped — Scroll To Index fails for every child, and clicks can be lost
status: open
phase: P109
task: ISL-038
severity: low
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `render` and `componentDidMount`)
found: P107 NSP-016 s52, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the runtime target's 200 runs (seeds 13 and 20730: five sequences, bisected to Enable Scroll and such a Native platform scroll)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "row C89 — Native platform scroll wired 1 is native: Scroll To Index 0 is Done (the runtime: the scroller runs on the unwrapped children and the scroll fails)"
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
