---
id: P112-S4-TRACEARM
title: "The in-page preview can miss the values an app sends as it starts — a Number's only value never reaches a home-made editor's card"
status: fixed
severity: medium
area: preview / in-page live values (packages/noodl-preview/src/inPage)
kit: preview
found: P112 OWN-004 s4, 2026-10-10
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-004-THE-REAL-APP-BESIDE-IT.md §6.2
regression: packages/noodl-preview/tests/p112-s4-tracearm.test.ts
commit: 529684e32
---

A home-made editor shows the last value on every wire from the real app (OWN-004, `mountPreview(...).onTrace`). Some
values are sent once, as the app starts — a Number node's value, a constant fed into a States node — and in about one
page load in eight those values were not in the record at all, so the cards for those wires stayed empty for the whole
run. Measured on Orbit (`prototype/real/check.mjs`, which asks that every one of Orbit's wires is seen carrying
something): `34 / 36 missing ["focusLen.savedValue>phase.value-Focus-length", "breakLen.savedValue>phase.value-Break-length"]`
in one of four runs, both of them the two wires that only ever carry the start value.

**Where:** `src/inPage/index.ts` armed the runtime's trace from outside the app's frame: it polled every 10 ms for
`Noodl.Navigation._noodlRuntime` and then called `setTraceEnabled`. The runtime publishes itself there in the Viewer's
constructor and loads the project straight after (`noodl-viewer-react/src/viewer.jsx`: `NoodlJSAPI(noodlRuntime)`,
then `setData`), so whenever the first values went out before the next poll, they were never recorded.

**Fixed:** the preview writes a small script first in the app page's `<head>` (`src/inPage/armTrace.ts`) that catches
the assignment of `Noodl.Navigation._noodlRuntime` and arms the trace right there, before `setData`. Every getter
returns what was assigned, a runtime that throws on arming still loads, and nothing in the runtime changed. After the
fix: 10 page loads, every wire seen (5 runs × 2 poses of `check.mjs`). The regression is deterministic: it runs the
script in a fresh window with the deploy page's bootstrap and fails (2 of 4) with the script removed.
