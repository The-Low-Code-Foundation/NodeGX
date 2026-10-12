---
id: P109-S35-PARAMARRAYS
title: An input set as an expression (`Arrays.items.length`) reads the array as a record named like it — `undefined`, and it never re-runs when the array changes
status: fixed
commit: 024e2ee55
task: ISL-051
phase: P109
severity: low
area: runtime / expression parameters (noodl-runtime/src/expression-evaluator.ts `createNoodlContext` — `Arrays` was a Proxy over `scope.get(prop).data`, a RECORD's data; read through node.ts :340 `evaluateExpression`, subscribed through node.ts :366 `subscribeToChanges`)
found: P109 s35, 2026-10-09 (fixing P107-C150 — the same subscription serves both paths)
evidence: packages/noodl-runtime/test/expression-evaluator.test.js "hands Arrays.x as the array, as window.Noodl.Arrays does" — red on the pre-fix file (`Arrays.c150Context` was not the array), green after
regression: packages/noodl-runtime/test/expression-evaluator.test.js "createNoodlContext › hands Arrays.x as the array, as window.Noodl.Arrays does"
---

**What a person sees.** An input written as an expression rather than a value — `Arrays.items.length > 0` on a Visible, say — reads
nothing: `Arrays.items` there was the data of a *record* called `items`, not the array, so `.length` is `undefined` and `.size()`
throws. The Expression node reads the same text correctly (it is handed `window.Noodl`, where `Arrays.items` is the array).

**Where.** The expression-parameter path evaluates through `createNoodlContext`, whose `Arrays` proxy called `scope.get(prop).data`. Its
subscription (`subscribeToChanges`) listened to that record too — consistent with the wrong read. P107-C150's fix moves the
subscription to the array for the Expression node; left alone, this path would have read a record and listened to an array.

**Fix.** `Arrays.x` is `Collection.get('x')` in `createNoodlContext` too — one table for the app, as `window.Noodl.Arrays` is — and both
paths listen to the array's `change`. Not graded by a spec (no spec models expression parameters); the unit tests above, with a control.
