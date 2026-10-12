---
id: P107-C54
title: Cloud Function — a success whose body is JSON null throws, and the Call is never answered
status: fixed
commit: 307bdc69d
phase: P109
task: ISL-026
severity: medium
area: viewer / Cloud Function (`cloudfunction2.ts` :292, :301 — `res !== undefined`, then `res.result`)
found: P107 (the node says what it does) s32, 2026-10-03
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/CloudFunction2.json "C54: a success whose body is JSON null is no result — Done, nothing moves"
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.34–§6.36 (row C54); scenario "C54: a success whose body is JSON null …" (packages/nodegx-node-spec/scenarios/CloudFunction2.json); measured on the runtime target with the world's XMLHttpRequest — and first in a stand-in probe, where the throw escaped as `TypeError: Cannot read properties of null (reading 'result')`
---

Cloud Function's success handler checks only that the body parsed (:292, `res === undefined`) and then reads
`res.result` (:301):

```ts
if (res === undefined) { … }
else {
  const results = res.result || {};
```

A 200 or 201 whose body is the JSON text `null` parses to `null`, which is not `undefined`, so `null.result` throws.
The throw is inside the XHR's `readystatechange` handler, so nothing catches it: no result moves, `Done` never fires,
`Failure` never fires, and `Completed` never fires. A graph waiting on the call waits for ever. DEF-026 made the ERROR
path total over everything the XHR can hand it; the success path has this one hole left.

Who sends `null`? A function whose Response node answers with nothing on a backend that serialises "no result" as
`null`, or a proxy in front of the backend.

Measured s32: the hand scenario reproduces it; the generated sequences hit it 3, 2 and 4 times in 200 on seeds 20729,
13 and 20730. Every other answer conforms.

**Plain words:** *"If a cloud function's answer is the single word `null`, the Cloud Function node hangs: no Done, no
Failure, nothing. Treat it like an empty answer (Done, nothing changes)?"*

**Proposed:** `const results = (res && res.result) || {};` — Done with no output moved, as for an empty body. The spec
already states that reading (spec v1); the fix closes the row with no spec change.

**Ruling:** R3 (a) — the runtime wins until Richard rules.

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Treat it as empty".** Done fires and nothing changes, the same as an empty answer today. A one-line change. The question as asked: *"Should an answer of null be treated like an empty answer, firing Done with no outputs changed?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 2026-10-06 (P109 s21, ISL-026), as ruled.** A success whose body is JSON `null` takes the empty-answer branch: Done, nothing moves. Runtime 200: conforms 18 / 18, mutants 26 / 26. Control: the C54 scenario fails on HEAD's file.
