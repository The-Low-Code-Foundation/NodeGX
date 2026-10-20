---
id: P18-S110-RUNONCHANGE
title: Object, Record, Array Filter and Variable ignore a Run On Value Change box their twin nodes honour
status: fixed
commit: 78be5aed5
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

**Fixed, session 111 (EXP-008 § Session 111).** Six of the seven ports are refused by name when unticked, each with
its twin's rule: Object's Id and Object-properties boxes in `objectNodeGate`; Record's Id box where Fetch is unwired
(with Fetch wired the export already reads only on Fetch, as the runtime does); Array Filter's Items and
Array-changes boxes in `filterReadOf`; Variable's changes box at both read sites. Graded in `tests/silent-parameters-closed.test.ts`.
The seventh, Record's "Record properties" box, is a gap on its *ticked* (default) side that no refusal can close. It
moved to its own row, **P18-S111-RECORDLIVE**.
