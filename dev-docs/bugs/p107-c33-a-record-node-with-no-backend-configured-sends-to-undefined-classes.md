---
id: P107-C33
title: A Record node in a project with no backend configured sends its operation to `undefined/classes/…` on the app's own host, and off the browser is never answered
status: needs-ruling
severity: medium
area: runtime / Record family (Create / Update / Delete Record, Add / Remove Record Relation) — `CloudStore.forBackend`
found: P107 (the node says what it does) s21, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.2 (row C33) — the probe that measured it is described there
---

A Record node in a project with no backend configured sends its operation to `undefined/classes/…` on the app's own
host, and off the browser is never answered.

**Where:** `packages/noodl-runtime/src/api/cloudstore.js` `CloudStore.forBackend` (:509-518): no backend resolved and the
Backend input unset or `_active_` → "the legacy store is the honest answer" (`CloudStore.forScope`), whose endpoint is
`undefined` when the project has no `cloudservices`; `ParseWireAdapter._makeRequest` (:212-230) then builds
`endpoint + path`.

**What the wire shows (measured s21, a `zz-` probe on the runtime target, deleted):** a Delete Record with Class
`Lesson`, Id `r1`, pressed in a project with neither `backendServices` nor `cloudservices`:
- with an `XMLHttpRequest` (a browser): it opens `DELETE undefined/classes/Lesson/r1` — a RELATIVE url, so the
  request goes to the app's own host — and reports Failure with whatever that host answers on Error (`Not Found`
  for a 404);
- without one (Node — SSR; the catalog marks the family `ssr: safe`): the scheduled callback throws on
  `XMLHttpRequest`, nothing reports, and the press is never answered — an invocation with no outcome.

**Plain words:** *"If someone uses a Record node before they've set up a backend, the app quietly sends a request to
its own website with 'undefined' in the address, and the error the person sees is 'Not Found' — nothing says 'you
have no backend'. On the server it just hangs."*

**Proposed:** in `forBackend`, a project with no backend AT ALL answers `undefined` like a Backend that names nothing
— the family's existing sentence then reads `The backend this node is set to ("undefined") is not configured in this
project.` (better: a sentence of its own, "This project has no backend configured — add one in the Backend panel").
A behaviour change for every node on the legacy path; ships alone. ⚠️ The fallback is deliberate (:512-514: the
legacy store "reads `cloudservices` for itself when the deploy injects it later") — so the check belongs at the CALL
(no endpoint at the moment of the operation → the sentence), not at resolution, or a deploy that injects the endpoint
after start would be refused.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules. Outside the world the BACKEND seam plays (R9:
every play has at least one backend), so no spec scenario carries it; the fix would add one.
