---
id: P107-C150
title: An Expression that reads an Array (`Arrays.cart.size()`) never re-runs when the array changes — its Result stays stale; a Variable or an Object read the same way does re-run
status: fixed
commit: 024e2ee55
task: ISL-051
phase: P109
severity: medium
area: runtime / Expression (noodl-runtime/src/expression-evaluator.ts `subscribeToChanges` :273-281 — for each array name it subscribes to `scope.get(arrId)` with `scope = modelScope || Model`, a RECORD (Model) of that id, never the array: `Noodl.Arrays.x` is `Collection.get('x')` (noodl-viewer-react/src/noodl-js-api.ts :54-65), and a Collection notifies `add` / `remove` / `change` on itself (collection.ts :209, :221, :235, :241, :756, :780, :793). Called from nodes/std-library/expression.ts :564-579)
found: P107 NSP-017 s68, 2026-10-09
evidence: measured on the runtime target (noodl-runtime/test/helpers/node-spec-target.ts), the viewer's API installed as noodl-js-api.ts installs it (`window.Noodl` with Variables, Objects, Arrays), one Expression per case, the registry written elsewhere at 1 ms (world.ts REGISTRY). `Variables.v` 1 → write 2: re-runs, Result 2. `Objects.o.k` "a" → write "b": re-runs, Result "b". `Arrays.list.size()` with `list` = [a], then an `add` of b, or a `set` to [a, b]: no re-run, Result stays 1. `Arrays.list.get(0).k` 1, then a write of `k` = 2 on that member: no re-run, Result stays 1. Control: a Run pulsed after each array write reads the new value (Result 2, Done) — the array moved; only the Expression did not hear it. The Expression spec v4 says what the runtime does (R3 (a)): it subscribes to a RECORD named like the array — a write to that record re-runs it.
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/Expression.json "an Array the text reads is heard (row C150, v5): …" — conforms on the runtime at seeds 13, 20732, 20735, 7, 20734, 20733, 20729 and at 10,000 (20735); red on the pre-fix runtime. packages/noodl-runtime/test/expression-evaluator.test.js "subscribeToChanges on an Array (P107-C150)"
---

**What a person sees.** A person types an Expression such as `Arrays.cart.size()` (a badge count) or `Arrays.todos.size() == 0`
(an empty state) and wires its Result to a Text. The first value is right. Then the app adds an item to the array — an Array node, an
Insert Into Array, a Function's `Noodl.Arrays.cart.add(...)` — and the Text never changes: the count stays where it was. The same
Expression written over a Variable (`Variables.count`) or an Object (`Objects.user.name`) does update. Nothing warns: in the editor the
node even logs "Reactive dependencies detected: Arrays: cart", which says it is listening.

**Where.** `subscribeToChanges` treats every name it found as a record. For `Arrays.cart` it subscribes to `Model.get('cart')` — a record
called `cart` that nothing writes — while the array the text reads is `Collection.get('cart')`, a different table. A change to the array
notifies the array, and the record hears nothing. A change to a member's key (`Arrays.cart.get(0).qty`) is not heard either: the array
does not re-notify its members' changes.

**How to reproduce.** On the runtime target with `window.Noodl` installed as the viewer does: an Expression with text `Arrays.list.size()`,
the registry holding `list` = [a]; a registry write at 1 ms adding b. Result 1 at the first settle; nothing at the write; a Run after it
gives 2.

**Proposed fix.** In `subscribeToChanges`, subscribe to the ARRAY for an array name — `Collection.get(arrId)` (the model scope's
collection table where there is one), on `add`, `remove` and `change` — and decide, with the spec, whether a member's own change re-runs
it (`Arrays.list.get(0).k` reads a member: the Repeater's precedent is that a row hears its own record). The Expression spec's v4 says
what the runtime does today (R3 (a)); the fix moves it in the same commit, with the scenario changed to the new answer. No ruling needed
for the array itself — Variables and Objects already re-run, and the editor already says Arrays do; the member-key half may want one.

**Fixed (P109 s35, ISL-051).** `subscribeToChanges` subscribes to `Collection.get(arrId)`'s `change` — the array `Arrays.x` reads, one
table for the app (the model scope does not scope it: `window.Noodl.Arrays` is the global `Collection.get`). Every add and remove also
sends one coalesced `change`, so `change` alone is heard once per operation. Expression spec **v5**; the scenario's list replacement
made a real one (`[a, b, a]` dedupes to the members it already had, so it sent no change and tested nothing). The same subscription
serves expression parameters, whose `Arrays` read a record too — fixed with it, P109-S35-PARAMARRAYS.

**Not decided (Richard's):** whether a member's own key moving (`Arrays.list.get(0).k`) re-runs it. Today it does not — the array does
not re-notify its members — and v5 says so.
