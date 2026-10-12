---
id: P107-C140
title: A Repeater input mapping (Script under Input Mapping) that throws for a record stops the Repeater for good — that row and every later one is never drawn, and no Refresh is answered
status: fixed
commit: e22334e0d
phase: P109
task: ISL-049
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `addItem` :625-629 calls `_mapInputs` :538-555 after `await createNode`, with no try; the throw rejects `addItem`, and `_runQueueOperations` :815-860 catches nothing — C128's mechanism, reached by another line)
found: P107 NSP-016 s62, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.23; recorded on the runtime target (the s62 probe, case M15: `map({ label: function (o) { throw new Error('x') } })` on two records — no row, no Items Rendered, a later Refresh never answered), and the spec copies it (R3)
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "an input mapping that throws for a record: its row lands with what the mapping set before it, every other row is drawn, and a fixed mapping and a Refresh draw it again (row C140)"
---

**What a person sees.** A Repeater whose input mapping reads something a record may lack — `label: function (o) { return o.address.city }`
on a record with no address — draws nothing from that record on, and never draws again: new Items, a fixed mapping and Refresh change
nothing; Refresh never fires Done or Failure, and Items Rendered never fires. Nothing tells the author why.

**Where.** `addItem` builds the row, then maps its inputs (`_mapInputs`), outside any try. The mapping's throw leaves `addItem`; the
queue's loop awaits it with no catch, so `runningOperations` stays `true` and every later operation waits behind it for good (C128).
With chunked creation on, the rejection is also unheard (`runOps` is not awaited).

**How to reproduce.** Play the `regression:` scenario on the runtime target. The spec copies the behaviour (R3).

**Proposed fix.** Catch around `_mapInputs`: raise `repeater/input-mapping-threw` with the record's id and the message, keep the row
with the inputs it could map, and let the queue run on. C128's fix (a catch in the operation) also keeps the queue alive.

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed, with C128.** `_mapInputs` catches the mapping's throw and raises `repeater/input-mapping-threw` with the record's id; the row keeps the inputs set before the throw and lands. **The v2 regression never reached this row:** its registry list was empty, so the mapping ran on no record (replaced by one with three records; a throwing mapping is in the spec's pool now, so the generated sequences reach it too). Runtime conforms at seeds 13 and 20732 (296 / 296, 200 sequences each); interpreter mutants 0 survivors at both (254 / 255, one declared: an idle yield's set, which no step reads). Control (the base `foreach.tsx`) red on exactly the 27 scenarios the fix moved; the error codes are graded in viewer-react's `nda-012-visual-deployed-diagnosis.test.ts`, red on the base file on exactly its four new cases.
