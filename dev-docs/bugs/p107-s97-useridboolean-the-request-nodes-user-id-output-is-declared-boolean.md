---
id: P107-S97-USERIDBOOLEAN
title: The cloud Request node's User Id output is declared `boolean` but carries the caller's id (a string, or whatever objectId the backend gave)
status: open
severity: low
area: cloud runtime / Request (`packages/noodl-viewer-cloud/src/nodes/cloud/request.ts` :129-137); the catalog the editor and the agent read
found: P107 s97, 2026-10-12 — writing the Request node's spec (NSP-022)
evidence: request.ts :131 `type: 'boolean'` beside :133 "Id of the user the session token resolved to"; measured through `CloudRunner.run`: User Id `u1`, `7` (a numeric objectId), or a random 10-character id; `nodegx-project-contract/typecasts.ts` :38-40 lets a boolean output wire into `number`, `string` and `signal` inputs
kit: node-spec
---

The port's type says it is a flag. The editor colours and casts it as one. An agent reading the catalog (`get_node_type`) is
told it is a boolean. A wire from it into a Number input carries the id as `NaN`. A wire into a signal input is allowed and
fires on the id's first truthy value. The spec (`cloud-request.ts`) keeps the runtime's declaration, R3 (a).

Not fixed: changing the type to `string` changes which saved wires are valid. R22 refuses a dead wire at both doors, so a
saved `userId → <signal>` wire would become refused. Count the saved wires from `noodl.cloud.request.userId` over the corpus
before changing it.
