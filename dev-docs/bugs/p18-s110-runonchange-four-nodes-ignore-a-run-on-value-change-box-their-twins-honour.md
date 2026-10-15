---
id: P18-S110-RUNONCHANGE
title: Object, Record, Array Filter and Variable ignore a Run On Value Change box their twin nodes honour
status: open
severity: medium
area: export / Run On Value Change
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: Model2.runOnChange-modelId, -object; DbModel2.runOnChange-modelId, -record; Filter Collection.runOnChange-array, -items; Variable2.runOnChange-variable
---

NDA-017's per-input boxes (`noodl-runtime/src/run-on-value-change.ts`) are honoured on some nodes of the export and silently
ignored on four:

- **Object** (`modelnode2.ts` :268, :107-116): unticked Id → the props stay empty until a Fetch; unticked Object → outputs freeze
  after a write. `objectNodeGate` (`plan.ts` :5202-5215) never checks either; Component Object refuses the same box (:5515).
- **Record** (`dbmodelnode2.ts` :271, :136-145): unticked Id → never bound; the export fetches anyway. Ticked Record (the
  DEFAULT) → the runtime re-reads the row after an in-process write; the export row is written only by the fetch.
- **Array Filter** (`filtercollectionnode.ts` :201-205, :245-250): unticked Array / Items → no re-filter; the export filter is
  always live. Filter Records defers on any unticked box (`plan.ts` :7899-7905); `filterReadOf` (:8109-8122) never checks.
- **Variable** (`variablenode2.ts` :64-69): unticked Variable → a reader keeps its old value after a Set; `plan.ts` :8851-8853
  reads live.

Fix: the twins' rule — refuse by name on an unticked box the slice cannot honour (and the Record row's default-side behaviour
needs its own decision).
