---
id: P107-C141
title: A Repeater input mapping that throws when a record changes throws into whatever wrote the record — another node's Set, a backend's save, a Query — which fails there, though the fault is the Repeater's
status: fixed
commit: e22334e0d
phase: P109
task: ISL-049
severity: medium
area: runtime / Repeater (noodl-viewer-react/src/nodes/std-library/data/foreach.tsx `addItem` :626-628 subscribes `_forEachModelChangeListener = () => this._mapInputs(itemNode, model)` to the record's `change`; `_mapInputs` :538-555 has no try, and a record notifies synchronously inside `set` (model.ts :329-337))
found: P107 NSP-016 s62, 2026-10-08
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-016-VISUAL-NODES.md §7.23; recorded on the runtime target (the s62 probe, case M16: a mapping that throws when `label` is `A2`, the record's label written to `A2` elsewhere at 1 ms — the WRITE throws `x`, so the play itself fails: "runtime threw: x")
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/For Each.json "an input mapping that throws when a record is written elsewhere: the write goes through, the row keeps what it had, and a Refresh draws it with what the mapping sets (row C141)"
---

**What a person sees.** An app where a Repeater maps its rows' inputs with a function, and some other part of the app changes a record
the Repeater shows — an Object node's Set, a Record's save, a realtime update. When the mapping throws for the changed record, the
error surfaces in the OTHER node: its write fails (and whatever it does after the write does not happen), and the Repeater, the actual
source, says nothing.

**Where.** Each mapped row listens to its record's `change` and re-runs the mapping in the listener. A record notifies its listeners
synchronously inside `set`, so the listener's throw unwinds through `set` into the caller.

**How to reproduce.** On the runtime target: place a Repeater with `inputMappingScript` `map({ label: function (o) { if (o.label === 'A2') throw new Error('x'); return o.label } })`
over a registry array, then write the record's `label` to `A2` from outside (world.ts REGISTRY `writes`, or any node): the write throws.

**Proposed fix.** The same catch as C140's around `_mapInputs`, raising `repeater/input-mapping-threw` on the Repeater, so a mapping's
throw never leaves the listener.

**Fixed (P109 ISL-049, s32, 2026-10-09), as proposed, with C128 and C140.** The same catch in `_mapInputs` serves the record's `change` listener, so a throwing mapping never unwinds into the writer. **A lone play can grade it after all:** the world's REGISTRY write is the writer, and on the base runtime that write throws and the scenario fails. Runtime conforms at seeds 13 and 20732 (296 / 296, 200 sequences each); interpreter mutants 0 survivors at both (254 / 255, one declared: an idle yield's set, which no step reads). Control (the base `foreach.tsx`) red on exactly the 27 scenarios the fix moved; the error codes are graded in viewer-react's `nda-012-visual-deployed-diagnosis.test.ts`, red on the base file on exactly its four new cases.
