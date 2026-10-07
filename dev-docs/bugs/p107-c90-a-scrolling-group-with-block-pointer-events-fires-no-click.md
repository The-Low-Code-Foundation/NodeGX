---
id: P107-C90
title: A Group with the JavaScript scroller (Enable Scroll on, Native platform scroll off) and Block Pointer Events on never fires Click — on itself or from a child
status: open
phase: P109
task: ISL-038
severity: medium
area: runtime / Group (noodl-viewer-react/src/components/visual/Group/Group.tsx `setupIScroll`, `click: true`) with pointerlisteners.ts's Block Pointer Events blockers (:113-133)
found: P107 NSP-016 s52, 2026-10-07
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.13; the runtime target's 10,000 run (seed 20733: seven sequences, shrunk to these three ports and a click), then measured with controls — the scroller alone fires Click, Block Pointer Events alone fires Click, the two together do not
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Group.json "row C90 — Enable Scroll on, Native platform scroll off and Block Pointer Events on: a click fires Click (the runtime: no Click, though Focused comes)"
---

**What a person sees.** A scrolling list with snapping (Native platform scroll off) sits inside a card that must not pass
pointer events to the page behind it, so Block Pointer Events is on. Tapping the list, or a row in it, does nothing the graph
can hear: Click never fires. Pointer Down, Pointer Up and Focused still do.

**Where (measured, and the likely path).** With `click: true`, better-scroll cancels the browser's own click on its element and
dispatches a constructed one when it saw a tap. Block Pointer Events puts a blocker with `stopPropagation` on every pointer event,
so the press and release do not reach the listeners better-scroll keeps for them, and no constructed click is sent. The focus
tracker's capture listener on the app root hears the browser's click before it is cancelled, which is why Focused still fires.

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec fires Click (a click is a click), so the
scenario carries `row` and the runtime's difference is counted as known (`scrollerBlocksClick`). The two twins beside it fire
Click on the runtime.

**Proposed fix.** Exempt the Group's own scroller from the blockers (let the blocker stop propagation after better-scroll's
listeners, e.g. by not blocking `pointerdown` / `pointerup` / `mousedown` / `mouseup` on the scroller element itself), or pass
`click: false` when Block Pointer Events is on and let React's own click stand. When it is fixed, remove the scenario's `row` field
and the C90 entry from KNOWN_ROWS in the same commit.

**Ruled 2026-10-07 (P109 s28, asked in one batch of four), as recommended: "Let the list's taps through".** The blocker stops presses after the list has seen them, so the list's tap-not-swipe check still works and Click fires; the page behind still gets nothing, and a swipe is still no click. Not chosen: turning the list's own tap check off (a mouse drag that scrolls could end as a Click). The question as asked: *"With Block Pointer Events and a snapping scroll list both on, which fix?"*
