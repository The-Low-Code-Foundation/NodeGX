---
id: P107-D22
title: A Record's Fetch with a null Id asks the backend for the record "null"
status: needs-ruling
severity: low
area: runtime / Record (`DbModel2`)
found: P107 (the node says what it does) s23, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.8 (row D22); scenario `DbModel2.json` "a null Id binds nothing but a Fetch asks the backend for it (D22)"
---

A Record's Fetch with a null Id asks the backend for the record `null`.

**Where:** `packages/noodl-runtime/src/nodes/std-library/data/dbmodelnode2.ts`. Binding treats `undefined`, `null` and
`''` alike as "no record" (`setModelID`, :310-314); the Fetch's guard checks only `undefined` and `''` (:411), so a
`null` Id — what a cleared wire usually carries — goes out as `fetch({ collection, objectId: null })` (:428-430).

**What the call shows (measured s23, runtime conforms to the spec on it):** the backend call is made with `objectId:
null`; on a REST backend that is a request for `/items/<Class>/null`, answered "No record with id null" — Failure with
the backend's sentence instead of the node's own `Missing Id.`.

**Plain words:** *"If the Id wire is empty (null) and you press Fetch, the Record asks the server for a record
literally called 'null' instead of saying 'Missing Id.'."*

**Proposed:** use the same empty test as the binding (`emptyId`). A behaviour change; ships alone.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules.
