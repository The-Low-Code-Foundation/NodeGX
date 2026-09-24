# BMG-012 — The editor lets go: six panels removed, two doors become deep links

**Opened 2026-09-24** (README R2, Richard's words at 18:16Z). **Depends on BMG-001 (deep links),
BMG-003 (the *Add a field* door), BMG-008 (the triggers door), BMG-011 (Secrets and Search).**
**Status: 📋 not started. Last build task.**

## 1. The person sentence

> **Someone's editor has one backend card: which backend, running or not, its functions, and
> one button into the manager. Anywhere the editor used to open a data panel, it now opens the
> manager at the right page, signed in.**

## 2. What is there, measured

- **Eight surfaces** are registered as transient side panels in
  `BackendServicesPanel/LocalBackendCard/backendSurfaces.tsx:109-118`: schema, data,
  permissions, triggers, email, auth, search, secrets. After BMG-000 the card reaches only
  Search and Secrets (⋯ menu, `LocalBackendCard.tsx:233-237`); *data, permissions, email,
  auth* have **no entry point but are still registered and bundled**.
- **Two doors remain:** `propertyeditor/components/SchemaAddFieldButton.tsx:34-46` opens the
  schema panel on a table (DEF-036, Richard's *"an Add a field button… straight into the
  table's schema editor"*), and the workflow canvas broadcasts `OPEN_TRIGGERS_SURFACE`
  (`backendSurfaces.tsx:160-190`).
- **The panels** (agent map §4): `databrowser/` (11 files), `schemamanager/` (10),
  `permissions/` (5), `triggers/` (4), `email/` (3), `auth/`, `search/`, `secrets/`; 6,135 lines
  in the five measured dirs; `models/BackendServices/` (~1,359 lines) and the IPC proxies in
  `BackendManager.js:176-309, 1001-1220` (`backend:getSchema`, `createTable`, `addColumn`,
  `renameColumn`, `queryRecords`, `saveRecord`, `deleteRecord`, `subscribeCollection`, …).
- **Tests that name them:** webpack `tests/databrowser/aclColumn.spec.ts`, `recordIdentity.spec.ts`;
  jest `tests-unit/spr-001/{aclJson,ruleVocabulary}.test.ts`, `aaq-011/schemaFailure.test.ts`,
  `def-036/accounts-table-columns.test.ts`, `tut-001/panel-render.test.ts`,
  `tut-002/database-fillers.test.ts`, `tut-005/lessonbackend.test.ts`.
- **Still needed by the editor** (not panels): `cloudFunctionRows.ts` / `CloudFunctionsSection`
  on the card (functions are components; they stay), `securityFor` (the switch dialog),
  `backendVisibility.ts`, the `BackendFinder`, `AddBackendDialog`, `useLocalBackends`. The
  MCP's backend tools use HTTP, not these panels.

## 3. What to build

1. **Deep-linked hand-off.** `backend:open-dashboard` takes `{id, hash}`; the card's button
   sends none; `SchemaAddFieldButton` sends `#/schema/<table>/new-field`; the workflow canvas's
   `OPEN_TRIGGERS_SURFACE` handler sends `#/triggers/new` (or `#/triggers/<id>` when it names
   one). The token hand-off is unchanged (BMG-000).
2. **Remove** the six panel dirs (`databrowser schemamanager permissions triggers email auth`)
   and, once BMG-011 ships, `search` and `secrets`; the `backendSurfaces.tsx` registry shrinks
   to nothing or goes; the ⋯ menu loses its last two items; the IPC proxies and
   `models/BackendServices/*` members only they used go (measure each with a grep for callers
   before deleting — `securityFor`, `dataBrowserAvailability`, and the tutorial fillers have
   other callers).
3. **Tests:** delete the specs that graded the deleted panels; **move** the pure ones the app
   now owns (`ruleVocabulary`, `acl`) to `packages/nodegx-backend` with their specs (BMG-002 and
   BMG-006 will have done this; verify nothing is graded twice). `def-036` becomes a spec that
   the server-owned list has **one** source (BMG-004 AC7). `tut-001` and `tut-002` name the
   panels in tutorial text — rewrite the steps to *"press Manage data & settings"*.
4. **Docs:** `docs/runtime/BACKEND-ADMIN-DASHBOARD.md` becomes the one page for managing a
   backend; the editor docs that describe the panels point at it.
5. **Tutorials** (`tut-*`): every lesson step that opened a panel opens the manager instead;
   the lesson backend fillers (`database-fillers.test.ts`) stay if they seed data through HTTP.

## 4. Acceptance criteria

1. `grep -rn "openSurface\|backendSurfaces" packages/noodl-editor/src` returns nothing outside
   tests that assert the absence.
2. *Add a field* on a Query Records node's table opens the browser at
   `#/schema/<table>/new-field` signed in (drive: the IPC call's argument and the page's route).
3. The workflow canvas's trigger door opens `#/triggers/new`.
4. Editor `typecheck` clean; `test:ci` green with the deleted specs gone and no new red;
   `test:main` green; the bundle shrinks (record the KB before and after).
5. The tutorials run end to end in the editor's `tut-*` harness with the new step text.
6. No IPC handler in `BackendManager.js` is unreachable (a spec lists handlers and callers).

## 5. Watch for

- Memory: an import added or removed can switch a sibling jest gate off (`Tests: 0`); after
  the deletions run `test:main` and read the suite **count**, not just the colour.
- `DataLineagePanel` is not a backend panel; leave it.
- The card's `dataBrowserAvailability('nodegx','managed')` gate (BCN-009) decided who may open
  a record grid; the manager's own auth now decides. Delete the gate with its reason recorded,
  not silently.
- Richard's DEF-036 words were about *reaching* the schema from the property panel; the deep
  link keeps that promise — say so in §6 when built.
