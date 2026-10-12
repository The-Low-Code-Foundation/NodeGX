---
id: P117-S1-UNWIREDOUT
title: "An output nobody is wired to has no live value in the in-page preview's trace, so a home-made editor cannot show it"
status: open
severity: low
area: preview / the in-page trace (`@noodl/preview` `onTrace`), read by every home-made editor
kit: preview
found: P117 TBM-000 s1, 2026-10-11 — the wall's gate asserted a Switch taken from the shelf was on after a press on the wire into its Flip; `last['switch1.out.state']` never appeared because nothing was wired to Current State
evidence: dev-docs/tasks/phase-117-tchac-boum/prototype/README.md §Limits; the removed assertion is a comment in prototype/check.mjs ("editing with real input")
---

A person takes a Switch from the shelf, ties the button's *clic !* to its *basculer*, presses — and the costume stays
dark. The runtime flipped it (the wire into Flip is in the trace), but the trace is a list of **wire** events
(`fromNode.fromPort > toNode.toPort = value`), so an output with no wire leaving it is never reported. The wall reads
every costume from the trace (`last[`${id}.out.state`]`), as Orbit reads its cards, so the first thing a kid does with a
new part — press and watch — shows nothing until a second string is tied from its output.

Where: `packages/noodl-preview/src/inPage/` (the trace the page bundle emits) and the runtime hook it reads; P112
OWN-004 §"live values through the observe protocol" describes the intent as "the last value on every wire", which is
exactly what it is and exactly what is missing.

Reproduce: `node dev-docs/tasks/phase-117-tchac-boum/prototype/serve.mjs 47911`, open the page, *L'étagère* →
*L'interrupteur*, drag a string from *Le gros bouton rouge* to it, pick *clic !* → *basculer*, press the red button: the
wire glows, the lamp on the new part does not. Tie its *allumé ?* to any sign's input: now it does.

Proposed fix, small-medium: either (a) the trace also reports an output write with no wire (`toNode` absent) so `last`
fills for every output, or (b) `preview.read(nodeId, port)` for the current value of any output, which a page polls for
the parts on screen. (a) keeps one mechanism and is what Orbit's cards want too. The gate for it is the wall's own
sentence: a Switch from the shelf lights with nothing wired (TBM-005).
