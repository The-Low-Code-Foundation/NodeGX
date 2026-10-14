---
id: P109-S25-EXPORTSTATESRUN
title: An exported States move that sets every value at once leaves the previous move's animation running, which lands the old state's value
status: fixed
regression: packages/nodegx-export/tests/animation-pair.test.ts "A5 a move that sets every value at once stops the run still going, in both worlds" and "A5 a text a state leaves unset reads as the empty text…" (both frame by frame against the runtime's states.ts; both red on HEAD's lib)
phase: P109
task: ISL-043
severity: low
area: export / States (`nodegx-export/src/emit/statesLib.ts`, the emitted `goToState`)
found: P109 s25 (ISL-032, the P107-C22 fix), 2026-10-06
evidence: the emitted `goToState` calls `startRun(m.run)` only when something animates (`dur > 0 || delay > 0`) and never `stopRun` on a move that sets every value at once — the runtime's shape before 9e1d8afa7. Read, not run.
---

P109 ISL-032 fixed P107-C22 in the runtime (`states.ts`, ruled 2026-10-05 "Stop the running animation"): every move after
the first stops an animation still running, as `jumpToState` already did. The exported app's `goToState` has the old
shape: move A → B with a transition, then, while it runs, move back to A with Use Transitions off — the run carries on and
lands B's value while the node says A, and Has Reached fires a second time.

**Plain words:** *"In an exported app, jumping straight back to a state while an animation is still running lets the
animation finish at the old state's value."*

**Proposed:** `stopRun(m.run)` at the start of every move after the first in the emitted `goToState`, as its own
`jumpToState` does. The runtime's ruling covers it; no new question.

The same commit's other row, P107-D19 (a text a state leaves empty), probably does not reach the export: the emitted
value is React state, and an `undefined` text draws as nothing. Not measured.

**Re-measured and fixed 2026-10-14 (P18 session 104, ISL-043 AC1).** It still fired at HEAD, and it was graded by the
frame-by-frame differential against the runtime's own `states.ts`. To bright animates for 600 ms; at 300 ms To dim,
whose transition is zero, sets every value at once. The emitted `goToState` now calls `stopRun(m.run)` on every move
after the first, as its `jumpToState` does. The runtime's trace confirms the consequence: dim's values hold to the
end, and Has Reached bright never fires.

**D19 does reach the export,** against this file's "probably does not". The emitted `typedStateValue` returned the
state's value as it was, so a text the state leaves unset read `undefined` after a move into it, where the runtime
sends `''`. It is transcribed, with its own typed frame-by-frame row.

Readings: `animation-pair` 69/69, with exactly the two new rows red on HEAD's lib. HLS-001 golden: 1 line predicted
and 1 counted (`glow-desk/src/lib/states.ts`).
