---
id: P107-D22
title: A Record's Fetch with a null Id asks the backend for the record "null"
status: fixed
commit: 1b367e1fa
phase: P109
task: ISL-029
severity: low
area: runtime / Record (`DbModel2`)
found: P107 (the node says what it does) s23, 2026-10-02
kit: node-spec
regression: packages/nodegx-node-spec/scenarios/DbModel2.json "a null Id binds nothing, and a Fetch with it is Missing Id. — nothing asked (v4, D22)"
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

**Ruled 2026-10-05 (Track F rulings page), as recommended: "Say 'Missing Id.'".** Fetch uses the same test for an empty Id that the rest of the node uses. No request goes out and the node's own sentence shows. A one-line change. The question as asked: *"Should Fetch say 'Missing Id.' when the Id is empty in this way too?"* (https://claude.ai/artifact/CPcSy8ABRQpn2dMZYuvXDH)

**Fixed 1b367e1fa (P109 ISL-029, 2026-10-06), as ruled.**
