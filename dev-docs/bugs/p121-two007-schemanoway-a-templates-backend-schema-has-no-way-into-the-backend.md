---
id: P121-TWO007-SCHEMANOWAY
title: A template's `backend/schema.json` has no way into the backend a person opens it with
status: fixed
commit: 11f53e7af
severity: high
area: editor / backend start (`ProjectBackendLifecycle`, `CloudFunctionDeployer`); templates that ship `backend/schema.json`
found: P121 TWO-007 s17, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-007-TWO-TUTORIALS.md §6
regression: packages/noodl-editor/tests-main/local-backend/backend-manager-project-schema.test.js
kit: core
---

Four templates ship their collections as `backend/schema.json`, the projection of their world (`docs/world/`), held
byte for byte by a spec: `marketplace`, `gram`, `learn-with-simple-rick`, `digital-bricks-training`. A person who
opens one in the editor and starts a backend gets the policy and the cloud functions, but not the schema:

- The policy arrives: the backend installs the project's `nodegx.security.json` at start when it has none
  (`packages/nodegx-backend/src/config.ts`, `projectDir`; `startLocalBackend.ts`).
- The cloud functions arrive: `CloudFunctionDeployer.onBackendStarted` pushes them.
- **Nothing reads `backend/schema.json`.** Searched 2026-10-15: no hit in `noodl-editor/src`, `nodegx-backend/src` or
  `noodl-mcp/src` (the only `schema.json` the editor writes is a new backend's empty `{ tables: [] }`,
  `BackendManager.js`). The admin app's Schema page creates collections by hand and can't import a file.

Two templates work round it with a terminal script, `tools/setup-backend.mjs` (`POST /admin/schema` per entry, with
the admin credential). Both belong to Richard's own apps. The marketplace and the gram have no script, so the person
they're for, a builder who knows no-code tools, would get a backend with none of the schema's unique indexes, link
types or columns. The marketplace's rule that a payment's reference is one payment (R11, TWO-004 §9.5) is such an
index.

**Measured s18 (2026-10-15):** with no schema applied, the backend makes each collection on its first write, and
keeps nothing the world says: two payments with the same reference are both kept, and a provider outside the world's
two is accepted (`nodegx-backend/tests/p121-r12-project-schema.test.ts`, "the control").

**The fix wants a ruling** (`config.ts`' docblock says `projectDir` is deliberately not a general "the project
lives here" channel and that anything else goes over HTTP):

1. The editor applies the project's `backend/schema.json` additively (`POST /admin/schema/apply`, never destructive)
   when it starts the bound backend, beside `CloudFunctionDeployer`. That fixes every template at once.
2. Each template carries a `tools/setup-backend.mjs`, as two do now. That needs a terminal and the admin credential.

## Ruled and built (s18, 2026-10-15)

**Richard, 2026-10-15 (P121 R12): the editor adds them.** Every collection `backend/schema.json` declares that the
backend doesn't have is created whole (columns, indexes, checks, description); one that exists is never changed or
deleted.

- `noodl-editor/src/main/src/local-backend/project-schema.js`: reads both shapes the templates use (a list of
  `createTable` pushes; Training's `{ tables }` snapshot), asks `GET /admin/schema`, pushes each missing collection
  with `POST /admin/schema`, in the file's order. A refused collection is named in the report and the rest go on.
  Not `/admin/schema/apply`: its diff would change an existing collection or call a missing one destructive.
- `BackendManager.startBackend` runs it once the service is up, with the supervisor's credentialled `request`, before
  the start resolves (the editor's function push comes after). It never fails a start; the status carries
  `projectSchema`. One place, so every start path that names the project (opening it, the panel's Start, a lesson)
  gets it. A backend that was already running is not touched (adopted, not started).
- Specs: `nodegx-backend/tests/p121-r12-project-schema.test.ts` (a real backend, the supervisor's real `request`: all
  four templates whole, R11's payment refused and its control, Training's cohort id, a second start changes nothing,
  a refused collection named) **12/12**; `noodl-editor/tests-main/local-backend/backend-manager-project-schema.test.js`
  (the wiring) **6/6**. Hand mutants: dropping the call 5 of 6 red; the snapshot losing its indexes, pushing existing
  collections, stopping at the first refusal: each red.
- **Not done:** nothing in the editor shows a refused collection to the person (the main process logs it). A template
  that ships a schema the backend refuses is the template's defect; a toast is the follow-up if one ever does.
- **Driven in the running editor (s19, 2026-10-16)**, a builder's path: a copy of the marketplace opened in the dev
  editor (throwaway profile), Backend Services → + → Built-in → Run one on this computer → named → Start backend. The
  main log: "Project collections on backend_…: **21 added, 0 already there**"; `GET /admin/schema` named all 21 plus
  `_User`, Payment's `idx_Payment_reference` unique and built. On that backend a first Payment was kept (201) and a
  second with its reference refused (**409**, "is unique"); the world's checks refused an `outcome` outside paid/failed
  and a Payment with no order (400). Stop → Start from the panel: "**0 added, 21 already there**", the payment kept.
  The 19 functions pushed, the policy on, the preview read the shop ("Nothing is on sale yet"). Shot
  `shots/two007-r12-3-backend-running.png`. The backend was deleted afterwards. On the way: P121-S19-NOHOME (the
  template opened on no home) and P121-S19-PLACEHOLDERTYPE (HEAD's dev build couldn't start Electron).
