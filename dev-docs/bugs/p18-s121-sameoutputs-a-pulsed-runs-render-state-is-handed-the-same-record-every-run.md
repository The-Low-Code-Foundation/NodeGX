---
id: P18-S121-SAMEOUTPUTS
title: An exported Function whose signals have chains hands React the same output record every run, so its rendered outputs go stale
status: fixed
commit: aaef09c6e
severity: medium
area: export / Function (§86 pulsed run, §4f materialized outputs)
found: P18 session 121, 2026-10-17, reading `component.ts`'s `jsfun-run` printer for P18-S119-TICKEDRUN
evidence: packages/nodegx-export/src/emit/component.ts (HEAD: `setXOut(xRun.outputs)`, and `runFunction` returns `node.outputs`, one object per node); tests/the-ticked-input-runs-it-again.test.ts variant "ready writes a constant" (mutation arm M)
---

A run whose signals have chains (EXP-011 §86) keeps the node's outputs in one record across runs, as the runtime's
node does, and wrote it into the §4f state with `setXOut(xRun.outputs)`. The record is the same object every run, and
React keeps a state it is handed again, so a render read of the Function's outputs showed the first run's values until
something else re-rendered the page. In §86's fixtures something always did (a Set Variable in the same chain), which
is why no row saw it. Fixed in session 121: the state is handed a copy. Reach before the fix: every §86 run that both
pulses and materializes (0 in the shipped templates exported; the ticked runs of §88 made it reachable).
