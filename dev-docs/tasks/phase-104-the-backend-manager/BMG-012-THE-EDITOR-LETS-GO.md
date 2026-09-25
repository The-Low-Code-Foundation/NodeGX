# BMG-012 — The editor lets go: six panels removed, two doors become deep links

**Opened 2026-09-24** (README R2, Richard's words at 18:16Z). **Depends on BMG-001 (deep links),
BMG-003 (the *Add a field* door), BMG-008 (the triggers door), BMG-011 (Secrets and Search).**
**Status: ✅ built and driven s14 (2026-09-25); §6.**

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

## 6. Built (s14, 2026-09-25)

**The deep links.** `backend:open-dashboard` takes `(id, route)`; `BackendManager.openDashboard`
composes `/_admin#token=<t>&route=<encoded path>` and accepts a route only as a plain path (one
leading `/`, never `//`, no `#`). The page's boot (`admin/app/api.ts readHandoff`/`bootSession`)
consumes the fragment, scrubs it, signs in, then sets `location.hash` to the route; a refused
route opens the home, still signed in. One editor module owns the routes:
`models/BackendServices/openBackendManager.ts` (`managerRoutes.newField(table)` →
`/schema/<table>/new-field`, `newTrigger()`, `trigger(id)`; `openBackendManager(id, route)`).
`SchemaAddFieldButton` calls it (DEF-036's promise — *straight into that table's schema editor* —
is kept: the page opens on the collection with the *Add a field* picker already up, §6 shot
`bmg012-ac2-new-field.png`); `WorkflowDocument.triggerActions` calls `openTriggerInManager`
(`TriggerBackendClient`) for *Add a trigger on …* and *Edit this trigger…*. `OPEN_TRIGGERS_SURFACE`
and the surface registry are gone.

**Removed.** The eight panel directories (`databrowser` 11 files, `schemamanager` 10,
`permissions` 5, `triggers` 4, `email` 3, `auth` 3, `search` 3, `secrets` 4 — 9,779 lines),
`backendSurfaces.tsx`, `installBackendSurfacePanels()` in `router.setup.ts`, the card's `openSurface`
and its last two ⋯ items (Search, Secrets), `models/triggers/triggerEditing.ts` (the form's model)
and `TriggerBackendClient`'s create / update / rotate / fire / targets / `isTargetResolved` /
`cronGloss` (the canvas keeps list, enable, delete, `webhookUrl`, `fetchBackendEndpoint`).
In `BackendManager.js`: 46 IPC proxies gone (`backend:get`, `getRecordCount`, `renameColumn`,
`deleteTable`, `createRecord`, `saveRecord`, `deleteRecord`, `subscribe/unsubscribeCollection`, all
of ACCESS CONTROL, SECRETS, SEARCH, SIGN-IN, EMAIL, and the trigger get/create/update/rotate/fire)
plus their methods — 1,462 → 1,120 lines; 32 handlers remain, each with a renderer caller.
`backend:reload-workflows` had NO caller before this task (a pre-existing unreachable handler) and
went with them. The record-grid gate `dataBrowserAvailability` / `SurfaceAvailability` in
`backendList.ts` and `BackendCard`'s always-disabled *Browse records* item went with the grid; the
reason is written where they were (§5 asked for that).

**The one gloss (handoff wrong).** The handoff said `cronGloss` dies with `TriggerFormFields.tsx`.
Measured: the CANVAS used it too (`workflowTriggerNodes.ts:64,114` — the entry node's sub-label and
its *when* row). Deleting it would have left the card reading a raw cron. Instead `TriggerDef` grew
`scheduleWords` — what `GET /admin/triggers` has decorated since BMG-008 (`cronWords`, the backend's
one gloss) — and the canvas reads `trigger.scheduleWords || trigger.schedule.cron`. The drive read
it live: *"Every day at 03:00"* for `0 3 * * *`. `workflowtriggernodes.test.ts` pins the label on
`scheduleWords` and the fallback, not a gloss table.

**Also wrong in the task file:** *"`models/BackendServices/*` members only they used go"* — the panels
imported NOTHING from `models/BackendServices` (they used IPC directly; their model imports were
`sidebar`, `triggers/*`, `workflow/*`). Nothing there was orphaned; nothing was deleted there but the
gate above. And the README's editor gate `npm run typecheck` does not exist (no such script);
`npx tsc --noEmit -p tsconfig.json` is the typecheck — README §7 corrected.

**Tests.** Deleted with their subjects: `tests/databrowser/*` (+ the `tests/index.ts` line),
`tests/workflow/triggerediting.test.ts`, `tests-unit/spr-001/{aclJson,ruleVocabulary}`,
`aaq-011/schemaFailure`, `def-036/accounts-table-columns` (its subject is the backend's
`users/accountColumns.ts`, pinned by `bmg-004-users.test.ts`, `bmg-014-first-admin.test.ts` and
`admin-app/schema-view.test.tsx` — one source, graded once), `sb-015/secrets-panel-model` (the model is
`admin/app/secretsModel.ts`, graded by `admin-app/storage-views.test.tsx`; `ruleVocabulary` by
`admin-app/permissions-view.test.tsx`). New: `tests-unit/bmg-012/the-editor-lets-go.test.ts` (9): AC1
by grep of the source tree and the eight directories' absence; AC6 as a census — every
`ipcMain.handle/on('backend:…')` has a renderer `invoke`/`invokeIPC`/`ipcInvoke`/`send` and vice versa,
plus the exact handler list; the button press invokes `backend:open-dashboard` with
`/schema/Pet/new-field` (rendered through `support/renderElements`, IPC and toasts mocked). Backend:
`tests/admin-app/handoff-route.test.ts` (6) — the reader against the router, the refusals.
`tut-001`/`tut-002`/`tut-005` unchanged and green (they never named the panels; the lesson TEXT did —
`log-a-thing/lesson.json` step 2 now says *press Manage data & settings … on its Schema page*).

**Docs.** `BACKEND-ADMIN-DASHBOARD.md` gains *From the editor* (the three doors, the hand-off
format, the deep links `#/schema/Pet/new-field`, `#/triggers/new`); `TRIGGERS.md`, `REALTIME.md`,
`BACKEND-FILES.md`, `BACKEND-AUTH.md`, `BACKEND-EMAIL.md`, `BACKEND-ACCESS-CONTROL.md` no longer send
people to an editor panel. `BACKEND-SERVICES.md` is still right: the panel is where a backend is added
and bound.

**Driven** (`drives/bmg012/run.sh ac seed` — a LOCKED throwaway backend with bmg003's seed, headless
Chrome, the hand-off composed exactly as `openDashboard` does): **15/15** (`ac-result.json`, shots
`shots/bmg012-*.png`).
- The first press on a brand-new backend meets BMG-014's setup step with the route already in the
  address bar and no credential; after *Create and sign in* the page lands on `#/schema/Pet/new-field`
  with the picker open (`bmg012-first-press-setup.png`, `bmg012-first-press-landed.png`).
- AC2: `#/schema/Pet/new-field`, credential scrubbed, Schema page drawn, drawer *Add a field to Pet*
  with the kind tiles. AC3: `#/triggers/new` with the *New trigger* drawer; `#/triggers/<id>` with
  *Nightly digest*'s drawer. A route `https://evil.example/x` opens the home (the first collection),
  signed in, nothing of it kept. A bare `#token=` opens the home (BMG-000 unchanged).
- AC2's editor half is the jest press above; the IPC argument measured there, the page's route here.

**Gates (2026-09-25, s14).** Editor `npx tsc --noEmit -p tsconfig.json` exit 0 (11 s).
Editor `npm run test:main`: **564 suites, 8,789 tests, 0 failed, exit 0, 27 s** (2026-09-25, s14, after every change; an earlier run had `fb-005/template-install-path` time out at 5 s under load — 248/248 alone). Editor `npm run test:ci`: **2,996 specs, 8 failures = the known floor by name (3 SUB-011, 3 SUB-006, 2 NDA-017), seed 43361** (2026-09-25, s14; the first run had 3 more — AAQ-011/F10's toast sentence and two WFA-005 card pins that expected the editor's own cron gloss — repointed at *backend manager* and `scheduleWords`; the run before that died in webpack on `tests/workflow/index.ts` still exporting the removed spec).
Renderer production bundle (`webpack.renderer.production.js`, `src/editor/index.bundle.js`):
**before 16,180,087 bytes (3,958,609 gzip) → after **15,930,371 bytes (3,908,307 gzip)** — 249,716 bytes (50,302 gzip) smaller (2026-09-25, s14, both builds 92 s)**. Backend `npm run typecheck` exit 0 (both configs); `npx jest tests/admin-dashboard.test.ts tests/admin-app --maxWorkers=4` **14 suites, 190 tests, exit 0** (the bundle gates read the rebuilt page); `tests/admin-app/handoff-route.test.ts` 6/6.

## 7. Candidates left

- **Open without the credential once an account exists** (BMG-014's note): every editor open still
  hands `#token=`; the page could be opened bare so it asks for email + password, or the editor could
  log in as a person. Not this task's (§3.1 says the hand-off is unchanged).
- The property panel's `SchemaAddFieldButton` keeps `backendName` only for its tooltip.
- `docs/runtime/BACKEND-SERVICES.md` could carry one line pointing at the manager for everything
  inside a NodeGX backend.
