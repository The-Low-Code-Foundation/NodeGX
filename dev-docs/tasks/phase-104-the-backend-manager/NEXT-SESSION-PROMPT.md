# P104 — next session

**Written 2026-09-25 (end of s14).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, built
BMG-001; s3 built and drove BMG-007 (API keys); s4 BMG-004 (Users, R3 disable); s5 BMG-002
(Collections); s6 BMG-005 (Roles); s7 BMG-006 (Permissions); s8 BMG-008 (Triggers); s9 BMG-003
(Schema) and filed **R6** (README §8) for Richard; s10 BMG-009 (Workflows and Runs); s11 BMG-010
(Email and Sign-in); s12 BMG-014 (the first admin is a person); s13 BMG-011 (Storage, Backups with
Restore…, Secrets, Search, Server, Activity); s14 built and drove **BMG-012** (the editor lets go: eight
panels and 46 IPC proxies gone, the two doors are deep links into the manager, the canvas reads the
backend's schedule words) and filed **BMG-015** (S3 for uploads AND backups, Richard's ask).

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless | ✅ `9b72fbaf` |
| BMG-001 the shell | ✅ s2 | ✅ headless, AC1–8 (§6) | ✅ `b3a064e7` |
| BMG-007 API keys | ✅ s3 | ✅ headless, AC1–7 (§6) | ✅ s3 |
| BMG-004 Users | ✅ s4 | ✅ headless, AC1–9 (§6) | ✅ `6f69b64f` |
| BMG-002 Collections | ✅ s5 | ✅ headless, AC1–9 (§6) | ✅ `cff004a9` |
| BMG-005 Roles | ✅ s6 | ✅ headless, AC1–6, 27/27 checks (§6) | ✅ `67de1ede` |
| BMG-006 Permissions | ✅ s7 | ✅ headless, AC1–7, 37/37 checks (§6) | ✅ `806b53c5` |
| BMG-008 Triggers | ✅ s8 | ✅ headless, AC1–8, 41/41 checks (§6) | ✅ `71b177a4` |
| BMG-003 Schema | ✅ s9 | ✅ headless, AC1–8, 41/41 checks (§6) | ✅ `cb83fa7c` |
| BMG-009 Workflows and Runs | ✅ s10 | ✅ headless, AC1–5, 34/34 checks (§6) | ✅ `fb56efbf` |
| BMG-010 Email and Sign-in | ✅ s11 | ✅ headless, AC1–5 + 7, 42/42 checks (§6) | ✅ `1f84abdb` |
| BMG-014 The first admin is a person | ✅ s12 | ✅ headless, AC1–3 + 6, 33/33 checks (§6) | ✅ `aad1a80c` |
| BMG-011 Files, Backups, Ops | ✅ s13 | ✅ headless, AC1–9, 39/39 checks (§6) | ✅ `43efcd08` |
| BMG-012 The editor lets go | ✅ s14 | ✅ headless, AC1–6, 15/15 page checks + 9 jest (§6) | ✅ COMMIT_BMG012 |
| BMG-015 Storage off the disk (S3) | — (filed s14) | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0. Check `git status -- packages/nodegx-backend/src/admin`
before believing that: a peer session may have touched it.

**Rulings:** R1 (a) Preact app · R2 the editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed · **R6 OPEN (s9): on a collection that already has records, a
required field ASKS for a default (the engines require one) instead of AC5's "Required disables Default" — ask
Richard in plain words whether that is the rule, or whether Required should be refused there.** All in README §8.

**Gate readings (2026-09-25, s14):** editor `npx tsc --noEmit -p tsconfig.json` exit 0 (11 s; there is NO
`npm run typecheck` in the editor — README §7 was wrong, corrected). Editor `npm run test:main --maxWorkers=4`:
**564 suites, 8,789 tests, 0 failed, exit 0, 27 s** (2026-09-25, s14, after every change; an earlier run had `fb-005/template-install-path` time out at 5 s under load — 248/248 alone). Editor `npm run test:ci`: **2,996 specs, 8 failures = the known floor by name (3 SUB-011, 3 SUB-006, 2 NDA-017), seed 43361** (2026-09-25, s14; the first run had 3 more — AAQ-011/F10's toast sentence and two WFA-005 card pins that expected the editor's own cron gloss — repointed at *backend manager* and `scheduleWords`; the run before that died in webpack on `tests/workflow/index.ts` still exporting the removed spec). Renderer production bundle
`src/editor/index.bundle.js`: **16,180,087 bytes (3,958,609 gzip) before → **15,930,371 bytes (3,908,307 gzip)** — 249,716 bytes (50,302 gzip) smaller (2026-09-25, s14, both builds 92 s) after**. Backend
`npm run typecheck` exit 0 (both configs, 4 s); `npx jest tests/admin-dashboard.test.ts tests/admin-app` **14 suites, 190 tests, exit 0** (the new
`tests/admin-app/handoff-route.test.ts` 6/6 alone). Drive `drives/bmg012/run.sh ac seed` 15/15.

**Gate readings (2026-09-25, s13):** `packages/nodegx-backend` `npm run typecheck` exit 0 (both configs); full backend
`npx jest --maxWorkers=4`: **201 suites PASS, 1 skipped (`fed-003-live-cache`), 0 FAIL, 2433 tests, exit 0, 367 s** (2026-09-25, s13, after every change in this commit). Bundle 99,696 gzip (budget 160,000); route tally `admin: 98`
(`GET admin/files`, `GET admin/files/uses`, `DELETE admin/files/:name`, `GET admin/backups/archive`), `auth: 17`. Drive
`drives/bmg011/run.sh ac seed` 39/39. New specs: `tests/bmg-011-files-backups-ops.test.ts` 22, `tests/admin-app/storage-views.test.tsx` 24.

**Gate readings (2026-09-25, s12):** `packages/nodegx-backend` `npm run typecheck` exit 0 (both configs); Full backend `npx jest --maxWorkers=4`: **199 suites PASS, 1 skipped (`fed-003-live-cache`), 0 FAIL, 2387 tests, exit 0, 348 s** (2026-09-25, s12, after every change in this commit; the first run had `hlt-024-exchange-roles` red because a session-issuing response must carry `roles` — both new responses now do, through a `rolesForUser` dep, and the scan's known list grew the two sites).
Bundle 87,333 gzip (budget 160,000); route tally `admin: 94`, `auth: 17` (`POST _admin/setup`, `POST _admin/login`). Drive
`drives/bmg014/run.sh ac seed` 33/33.

**Gate readings (2026-09-25, s11):** `packages/nodegx-backend` `npm run typecheck` exit 0 (both configs); full backend
`npx jest --maxWorkers=4`: **197 suites PASS, 1 FAIL, 1 skipped (`fed-003-live-cache`), 2375 tests, 335 s** (2026-09-25, s11) — the one FAIL was `tpl002-notifications` pinning the OLD not-configured sentence (*Backend Services panel*), repointed at the new one and 29/29 alone. Bundle 85,835 gzip (budget 160,000); route tally unchanged at `admin: 93` (BMG-010
added no route: the templates list grew `variables`, the preview and the test send grew a draft, `GET /admin/auth` grew
`callbackUrlTemplate`). Drive `drives/bmg010/run.sh ac seed` 42/42.

**Gate readings (2026-09-25, s10):** `packages/nodegx-backend` `npm run typecheck` exit 0 (both configs); full backend
`npx jest --maxWorkers=4`: **196 suites PASS, 1 skipped (`fed-003-live-cache`), 0 FAIL, 2350 tests, exit 0, 346 s** (2026-09-25, s10, after every change in this commit). `noodl-viewer-cloud` `npx jest tests/execution-history.test.ts` 19/19 (its
store's WHERE was refactored). Bundle 79,508 gzip (budget 160,000); route tally unchanged at `admin: 93` (BMG-009 added
no route: `GET /executions` grew parameters, the run route grew `wait:false`). Drive `drives/bmg009/run.sh ac seed` 34/34.

**Gate readings (2026-09-25, s9):** `packages/nodegx-backend` `npm run typecheck` exit 0 (both configs); `noodl-runtime`
and `nodegx-backend-contract` `tsc --noEmit` exit 0. Full backend `npx jest --maxWorkers=4`: **194 suites PASS, 1 skipped
(`fed-003-live-cache`), 0 FAIL, 2327 tests, exit 0, 365 s**. Runtime `npx jest test/adapters` 328/328; contract `npx jest`
199/199. Bundle 76,836 gzip (budget 160,000); route tally unchanged at `admin: 93` (dropColumn is an action on the existing
route). Drive `drives/bmg003/run.sh ac seed` 41/41.
🔴 A new `/admin/...` route still owes the tally line AND an `audit-actions.ts` entry (an action, or a
`NOT_AUDITED` reason for a dry run); a POST a read-only admin should be able to make owes `readonly.ts` too.

## What s14 settled (BMG-012)

- **The hand-off carries a route.** `openDashboard(id, route)` → `/_admin#token=<t>&route=<encoded path>`;
  the page's `readHandoff` (api.ts) consumes both, scrubs the fragment, signs in, then sets the hash. A
  route is a plain path only (`/…`, never `//`, no `#`); a refused one opens the home, still signed in.
  🔴 The page's HOME is `#/collections/<first>`, not an empty hash — a drive check that expects `''` is wrong.
- **One door module:** `models/BackendServices/openBackendManager.ts` (`managerRoutes`, `openBackendManager`);
  `SchemaAddFieldButton` and `WorkflowDocument.triggerActions` (via `TriggerBackendClient.openTriggerInManager`)
  go through it. A NEW door owes `managerRoutes` a builder and `tests-unit/bmg-012` a line.
- 🔴 **The handoff's `cronGloss` claim was wrong:** the canvas used it (`workflowTriggerNodes.ts`), not only
  the form. `TriggerDef.scheduleWords` (decorated by `GET /admin/triggers` since BMG-008) is the one gloss now;
  the drive read *"Every day at 03:00"*. A "delete X with Y" claim owes a grep of X's callers first.
- **The panels imported nothing from `models/BackendServices`** (task §3.2 guessed they did) — they used IPC
  directly. Nothing there was orphaned. `backend:reload-workflows` had no caller BEFORE this task; gone.
- **AC6 is a census spec** (`tests-unit/bmg-012`): every `ipcMain.handle/on('backend:…')` ⇄ a renderer
  `invoke`/`invokeIPC`/`ipcInvoke`/`send`, plus the exact list of 32 handlers. A proxy left behind, or a
  caller of a deleted proxy, is a red row there rather than a runtime `No handler registered`.
- **The first press on a brand-new backend meets BMG-014's setup step** with the route already in the
  address bar; after *Create and sign in* it lands on the route (drive, `bmg012-first-press-*.png`).
- 🔴 **The auto-mode classifier refuses `rm -r` of tracked directories** ("irreversible local destruction")
  even though git holds them. `mv` into the scratchpad is the reversible equivalent it allows; the working
  tree reads the same to git (` D`). The moved copies are under `scratchpad/bmg012-removed/`.
- `tests-unit/fb-005/template-install-path` timed out (5 s) once under `--maxWorkers=4` and passed 248/248
  alone — a load flake, not this task's.

## What s13 settled (BMG-011)

- 🔴 **Restore over HTTP never reconnected the running database.** `BackupManager.doRestore` replaced `data/local.db`
  under the adapter's open handle: the process kept serving the OLD rows from the unlinked inode and every write after
  the "restore" went where nothing would read it — self-healing on the next restart, invisible to every arm that
  completes (a spec that restored into a CLEAN dir could not see it). Now `AdminBackupRoutes.restore` takes a
  `PersistenceControl` from `service.ts`: `adapter.disconnect()` → unpack → `adapter.connect()` + `ensureSystemTables()`,
  in `try/finally`. The adapter reopens the SAME path, so every holder of the facade sees the restored rows; the schema
  manager is REMADE by `connect()`, which is why `SearchIndexer` now takes a getter. The spec reads the file back through
  a SEPARATE `node:sqlite` connection (WAL: a plain read of `local.db` misses the bytes).
- 🔴 **A thumbnail was cached under the preset's NAME** (`thumbs/<hash>/sm.bin`): editing `sm` served the old render
  and the old ETag. The key and the ETag now carry name + size + fit. The jest spec MISSED it (a fresh preset name);
  the drive found it because the page had rendered `sm` before the edit. A cache pinned by a spec that only ever
  writes new keys pins nothing.
- **The refused-kinds vocabulary is the sniffer's** (`fileKinds.ts` ⇄ `storage/sniff.ts` literals, held equal by the
  spec). An upload is judged by its BYTES: a *Video* box would store `video/mp4` and match nothing. A custom type the
  sniffer never produces is kept and labelled *never identified*.
- **`GET /admin/files/uses?names=` is one walk per page**, never per row: every File-typed column of every user
  collection, `select`ed, for the names shown. `DELETE /admin/files/:name` is 409 `FILE_IN_USE` naming the records;
  `?clear=1` blanks the fields first. The public and admin deletes share `FileSubsystem.deleteStored`.
- **An `<a href>` cannot send the credential**: images use a signed URL + `&thumb=sm`; an archive download is fetched
  with the credential and handed to the browser as a blob. `GET /admin/backups/archive?file=` serves LISTED archives
  only (`..` is 404 by name); restore likewise takes a listed `file`/`path`.
- **Every ops section is read live** (`service.ts` getters, `logger.configure` on save, `applyCors` per request):
  nothing on the Server page needs a restart. `putOps` refuses `queries` (§7).
- **BMG-014 in a drive**: a fresh LOCKED backend shows the setup step on the first load; the drive makes the first admin
  by `POST /_admin/setup` before navigating. CDP `DOM.setFileInputFiles` fires `change` itself.
- The search wire is `POST /classes/:c {_method:'GET', search}` (FTS5), not a `$text` where-clause (that is a LIKE).

## What s12 settled (BMG-014)

- **A session can BE the admin.** `resolvePrincipal` upgrades a session whose `_User` row carries `adminAccess` to
  `{kind:'admin', userId, roles}` (`readonly:true` for `readonly`). Nothing else changed shape: every `kind === 'admin'`
  gate, the read-only dispatcher refusal, CLP/ACL bypass — all apply to the person. The audit actor is their id;
  `stampCreate` makes them owner of what they create. A bound API key acting as an admin person stays a user.
- **`adminAccess` is written by exactly one route** (`PUT /admin/users/:id`) and the setup; `SystemUsers` refuses it by
  name, signup and self-update strip it (`ADMIN_ONLY_USER_FIELDS`), `_User` is a system collection on the wire.
- **Setup is admin-gated, not unauthenticated** — BAK-005-NOTES' refusal stands. The editor's `#token=` handoff is what
  makes "the first page load asks for the account" true from the editor; on a server the operator pastes the printed
  credential once. 409 for good after the first full-access account.
- **Two credentials, one slot on the page** (`api.ts` `Credential`); the SSE stream takes `token=` for a session.
- 🔴 **The tally moved twice** (`admin: 94`, `auth: 17`) — `_admin/login` is in `AUTH_PATTERNS` because a password is
  presented there; `_admin/setup` is admin-gated and audited `admin.setup`.
- 🔴 **Every open from the editor is the credential** (`BackendManager.js openDashboard` still hands `#token=`; a new tab
  has an empty `sessionStorage`). BMG-012 candidate: the editor could log in as a person, or open without the token once
  an account exists so the page asks for email + password.
- The drive: `drives/bmg014/run.sh ac seed` — fresh LOCKED backend with `--readonly-token`, no SMTP; `BACKEND_LOG` is
  handed to the script for the CLI lines. 🔴 zsh prefix trap again: every path derived from `$S` is resolved BEFORE `S=`.

## Do this, in order

1. **BMG-013 Richard drives it** — his. Write him the prompt: the fourteen pages, the three doors from
   the editor (card button, *Add a field* on a Query Records node's table, *Add / Edit this trigger…* on the
   canvas), and the **R6** question (README §8) in plain words. Nothing to build until he has driven.
2. **BMG-015 Storage off the disk** (Richard, s14: *"otherwise file uploads and backups are going to be
   choking the VM disk"*). Read its task file: the uploads S3 driver EXISTS and the wire can switch it;
   the Storage page cannot, there is no *Test connection*, and backups are local-only
   (`backup/config.ts:41`). Build the page card + test route first, then backups to the bucket. Measure
   `StorageDriver` in `storage/types.ts` for a `list` operation before designing the archive listing.
3. Candidates: BMG-012 §7 (open without the credential once an account exists — BMG-014's note);
   BMG-011 §7 (`queries` on the Server page; a foreign-archive restore leaves `SecurityState`/`OpsState`
   in memory until restart).

## What s11 settled

- **The placeholder list is the backend's** (`email/templates.ts` `TEMPLATE_VARIABLES`, served as `variables` on
  `GET /admin/email/templates`). Each template's list is what its REAL sender passes — verifyEmail has no
  `expiresIn` because `email-routes.ts` never supplies one — and `bmg-010-email-signin.test.ts` pins the names per
  template. 🔴 A new template or a new variable in a sender owes this table a row, or the chip cannot exist.
- **One sample set** (`sampleVariables`) renders the preview AND *Send me this*, so the two cannot differ (AC2).
  The preview takes the unsaved draft in the QUERY (`?subject&text&html`; a blank field falls back like a save);
  the test send takes `{template, …draft}` on the existing `POST /admin/email/test` — no new route, no new audit
  action, and the read-only refusal it already has covers it.
- 🔴 **The bundle's external-origin gate** (`admin-dashboard.test.ts` *references no external origin*) lists
  every `https?://` in the bundle. The SMTP table's six credential pages are a REVIEWED allow-list in the test,
  held equal to the table; a scheme-only fragment in a sentence (*starts with https://*, *http://localhost*) is
  allowed as words. A new `<a href>` to an outside page owes that list a line.
- **`callbackUrlTemplate`** on `GET /admin/auth` (`…/oauth/{id}/callback`, from the same function as each row's
  URL) is how the wizard shows the URL to register before the provider exists.
- **A scope is never typed**: `providerWizard.ts` `scopeBoxes` groups a preset's scopes into sentences (identity
  locked, profile optional, GitHub identity); a scope no group knows becomes its own optional box, so a provider
  written by hand or by an agent shows and keeps everything it asks for.
- **Only three tiles**: `PROVIDER_PRESETS` has google, github, oidc. Microsoft/Apple are BMG-010 §7 candidates,
  not tiles that would save a record that cannot sign in.
- 🔴 **zsh prefix assignments apply left to right**: `S="$S/shots" … MAILBOX="$S/mailbox.jsonl"` on one command
  line gives MAILBOX the shots path. Resolve the derived path into its own variable first (bmg005 did; bmg010 now
  does).
- 🔴 **SMTP bodies are quoted-printable with CRLF**: comparing the sink's message to the page's words needs
  `=XX` and soft breaks decoded and CRLF → LF (`drives/bmg010/ac.mjs` `qp`/`plainPart`).
- The drawer's `.wizard-steps li` innerText is *1\nWhich* (two spans) — normalise whitespace before comparing.
- The `Chips` composer gained `normalise` (runs after `validate`; an origin from a pasted page URL).

## What s10 settled

- **`GET /executions` is the Runs page's whole query language**: `status`, `kind`, `name` (contains), `trigger`
  (`metadata.triggerId`), `workflowId`, `since`/`until` (ISO or ms), `minDurationMs`, `limit`/`offset`, and the
  count in **`X-Total-Count`**; the body is still a bare array (do not envelope it — `admin-dashboard.test.ts`
  reads the extraction out of the shipped bundle). `runsQuery` in `views/runs.tsx` is the page's translation;
  the filter rows are **`FilterRows flat`** with a **`choice`** kind and per-field `ops` — what a flat route
  cannot answer is not offered, and an *or* or a group is refused in words.
- 🔴 **A run's `kind` is DERIVED from metadata** (`execution/kind.ts` `executionKind` ⇄ the store's `KIND_SQL`;
  `bmg-009-runs.test.ts` holds them equal over old-shaped records). Every writer now stamps `metadata.kind`; a new
  writer of executions owes the stamp AND a fixture in that spec.
- **`wait:false` on the run route answers 202 with the record id** through FED-004's `onStarted`; the run goes on.
  Read only off the envelope form (`{payload, wait}`); a bare body is the payload. With the history off there is no
  id — the route waits and the page toasts the status instead of landing on a record.
- **A hash can carry a query** (`#/runs?trigger=<id>`, `route.query`, `hrefWith`). 🔴 `App.tsx`'s legacy-id
  normalisation compares `hashPath()`, not the raw hash — before that fix `#/runs?x=y` was "not `runs`" and the
  query was replaced away.
- **Cancelled is a word the engine stamps**, not a store status: `runStatusWord` reads `metadata.engineStatus` /
  `timedOut`; `EXECUTION_STATUSES` (the filter's list) is unchanged. `lastRuns` on the workflow list carries
  `engineStatus` for the same reason.
- **Executions are not a collection**: the realtime stream cannot carry them, so *live* is a 5 s poll with a
  chip while anything is `running` (§3 allowed it).
- **No *Open in the editor***: the editor's `nodegx://` handler opens `noodl:import/http…` only. A workflow deep
  link needs an editor-side handler first (a BMG-012 candidate, not this task's).
- 🔴 **A `let` declared AFTER a Promise executor that assigns it is a TDZ throw** the typecheck cannot see
  (`admin-workflows.ts run` — fixed before the spec ran; the spec would have caught it).
- Drive: `drives/bmg009/run.sh ac seed` — Greet (a `return` of `$path body.name`), Ping (wait 1 ms), Slow (wait
  20 s, for Cancel), Nightly digest (`stop` with `isError`), the function `hello` on a schedule trigger fired once.
  `requests` (from `cdp.mjs`) is how AC2 read the page's own query and re-asked the route with it.

## What s9 settled

- **The storage's check shapes grew** (`schemaCommon.ts` `CheckDecl`): `{field, oneOf}` (a Choice), `{field,
  maxLength}`, `{field, looksLike: 'email'|'url'}`, `{field, whole: true}`; the contract's `StorageCheckDecl`
  matches. A *Choice* is a String plus a `oneOf` rule; the page reads it back as a Choice (`kindOf`). No custom
  regex: SQLite has no REGEXP unless every connection registers one.
- **`dropColumn` exists on both managers and the contract**; `POST /admin/schema {action:'dropColumn'}` (no new
  route; tally 93). A column an index, a rule or the search opt-in reads is refused BY NAME (`COLUMN_IN_USE`);
  the page's ✕ counts the records holding a value (`where={col:{$exists:true}}&count=1&limit=0`) and asks for
  the typed name. `changeColumnType` is guarded the same way (§5).
- 🔴 **Two adapter defects fixed:** `addColumn` with a Relation did nothing on either engine (now creates the
  junction table + declares it); `declaredProperties` memoises by schema-object identity and the managers
  mutated in place — every schema mutation now stores a fresh object (`freshSchema`). A spec that adds a column
  must READ the collection first to see this class of bug.
- **Required is `NOT NULL`, Default is a stored `DEFAULT`** on both engines (the DDL), not a write-path rule;
  a DEFAULT backfills the rows already there; a missing required value is now 400 in words
  (`requiredViolationToHttp`, `reason:'required'`). Adding a required column over rows needs a default (R6).
- **`fieldKinds.ts` is the page's model** (the eleven `KINDS`, `withRules` → the record controls' `allowed`/
  `min`/`max`/`whole`/`maxLength`/`looksLike`); `format.ts` `RESERVED_WORDS` (the editor's list, BMG-012
  deletes the modal) refuses collection AND field names; `Column.description` is stored on the column.
- Per-column File limits, a Date default of *now*, and *on delete* for links were NOT built: nothing enforces
  them (an inert control teaches a lie). The Files page owns upload limits backend-wide.
- The drive: `drives/bmg003/run.sh ac seed` (seed: Owner, Tag, Empty with 0 records, Pet with 2). Tiles are
  `.drawer .tile input[value="<kind>"]`; options live under `#kind-options`; the confirm modal's button carries
  the action's own label (*Delete collection*, *Empty*, *Drop*).

## What s8 settled

- **`POST /admin/triggers/preview {cron, count?}`** answers `{valid, error, words, next[], from, timezone}`
  from `scheduler.ts` `nextFireTimes` (the scheduler's own `next()`, chained) and `cronWords`. A 200 with
  `valid:false` and the parser's sentence — the builder asks after every change. Bounded to 20 fires.
- **`GET /admin/triggers` decorates `scheduleWords` and answers `overlapDefault`.** `scheduleWords` is in
  `TRIGGER_KEYS` so a `GET → PUT` round trip is accepted (never stored, `bmg-008-triggers.test.ts` reads
  the disk). A NEW trigger's drawer takes `overlapDefault` and sends the policy explicitly on save.
- **The editor does not import this package** (`models/workflow/types.ts` says why: no path alias, a wire
  format typed structurally). So `cronGloss` did not "move" — `cronWords.ts` is the canonical copy with the
  task's sentences, and the editor's copy dies with its form in BMG-012.
- **The list keeps the Overlap column** (FED-004 AC7 pins it; `fed-004-overlap.test.ts` now pins
  `'Last run', 'Overlap', 'Enabled'`). The skip is also a warn chip in *Last run*.
- 🔴 **`.drawer-section` is a HEADING class** — uppercase, muted, 12px. The first drive read *EVERY DAY AT
  09:00* because the controls were wrapped in it. Wrap controls in `.when-body` (or a `.field`).
- **The execution store spells the trigger type `db_change`** (`noodl-viewer-cloud/src/execution-history/
  types.ts`); the registry spells `db-change`. A spec reading executions uses the store's word.
- **`Custom` opens on the cron the controls had just made**; `fromCron` reads what the modes emit (and
  ranges, names-as-numbers, Sunday-as-7) and opens everything else in Custom with the text kept.
- `PUT /admin/triggers/:id` has no version tag. `updatedAt` is WFA-008's token; nothing checks it. If
  BMG-009/012 touch the drawer again, an `If-Match` on `updatedAt` is the BMG-006 shape.

## What s7 settled

- **`PUT /admin/permissions` has a version tag now.** `GET` answers `etag` (body and `ETag` header, a
  digest of the stored JSON); a `PUT` with a stale `If-Match` is 412 with a sentence and saves
  nothing; no header = the old behaviour. `api()` takes a 4th argument of headers for it.
- **The matrix has a *Default* column per row** because the storage inherits per operation.
- ***Only the owner* is `authenticated` + creator-owns**, not `nobody` on Change: `checkClp` runs
  before any row is looked at.
- **The vocabulary writes a canonical atom order** (signed in, then roles). Compare through the model.
- `Switch` (`ui.tsx`) is the yes/no control; `RuleBoxes`/`RuleMatrix` live in `views/permissions.tsx`.
- The drive's `setVal` handles `<select>` (native setter + input + change).

## What s6 settled

- **`Picker` had an Enter race** (fixed; `picker.test.tsx` pins it); `createWhen`, `openOnFocus={false}`.
- **Roles carry a description** (`PUT /admin/roles/:name`); `GET /admin/users?role=<name>`.
- **To drive invitations**, `drives/bmg005/smtp.mjs` is a 50-line SMTP sink.

## What s5 settled

- Views are `views.json` in the data dir (`server/admin-views.ts`), not the SQL store.
- SQL `!=` drops missing values (*is not* carries an "or missing" leg); a list item is matched as quoted JSON.
- A signed file URL was 403 at the route gate when `files.read` ≠ public — fixed (`signatureAdmits`).
- The backend writes file URLs on its own loopback address; the page keeps only path + query.

## How to drive a page (`drives/bmg009/` is the freshest recipe — `requests` re-asked as the route's own query; `drives/bmg003/` next; `drives/bmg008/` has `pick`/`execFor`; `drives/bmg002/` more)

`drives/bmg008/run.sh <label> [seed|keep] [script.mjs]`: a LOCKED `security.json` (devOpen false) in a
scratch data dir, a deployed cloud function `hello` (`workflows/hello.workflow.json`) and a workflow
definition `Ping` (`workflow-defs/ping.workflow-def.json`) written BEFORE the backend starts,
`dist/cli.js serve` on 8697 with token `t0k` and `--backend-id bmg8`, `seed.mjs` (a `Pet` collection),
headless Chrome on 9333, the script through `drives/cdp.mjs`, then teardown. `cdp.mjs` hands the script
`requests` and `send`. The ac script's helpers: `setVal` (native setter + input/change; selects, dates),
`pick` (types into a Picker and mousedowns the row by its label), `execFor(triggerId)` (polls
`/executions` for `metadata.triggerId`), `rowsOf()` (the table as text cells).
**`npm run build` first**: `bin/` runs `dist/`, and the served page is the bundle baked into it.
Traps: a hash change does not reload the document (go through `about:blank` between two `/_admin` loads);
`document.body.textContent` includes the inlined bundle's source (measure `#main`, `.drawer`, `.modal`);
`innerText` carries CSS `text-transform` — an uppercased reading means a heading class wrapped a control;
never the project's live backend; one heavy job at a time; tear down after.

## What to know about the app before touching a view

- `views/<id>.tsx` exports one component taking `{ params, query? }` (`#/runs?trigger=x` → `query.trigger`);
  `views/index.ts` lists all fourteen, and `nav.ts` says where each shows.
- Data goes through `api()` (it throws the server's own sentence, and a 401 signs out). Every
  mutating button is `WriteBtn`; `toast`/`fail` report. Use `confirmSimple` (a plain ask) or
  `confirmDestructive` (type the name); `openModal((close) => <Dialog…/>)`; a `Drawer` for a thing
  the URL opens; `EmptyState` for every empty list.
- **Reuse:** `filters.ts` + `FilterRows` (`flat` for a route that answers *and* only; a `choice` field is a
  select; `ops` narrows a field's operators); `apiFull` when a header matters; `fields.tsx` `FieldControl` and `RelationEditor`;
  `searchRecords`/`pointerItem`; `acl.ts` + `AclCard`; `format.ts` `displayValue`, `parseCsv`,
  `fileLabel`; `KeyValueEditor` (`rowsFromObject`/`objectFromRows`, typed); **`ScheduleBuilder`**
  (+ `schedule.ts`: `toCron`, `fromCron`, `scheduleProblem`); `Switch`; `DangerZone`/`DangerAction`.
- Rules the suite enforces: no `dangerouslySetInnerHTML`/`innerHTML`; no colour literal outside
  `:root` in `styles.css`; `var(--danger…)` only under a selector that says `danger` or `.bad`;
  bundle under 160,000 gzip; no `</script` in the bundle. `div.field input` is full width, except
  inside `.list-row` and `.field-line`, where a row of controls stays a row.
- `useStore` re-reads after subscribing; do not "simplify" that away (BMG-001 §6).
- `tests/admin-app/dom.ts` is how a spec gets a DOM (import it first).
- `ugrep` (the default `grep` here) silently skips `HttpServer.ts` as binary: use `/usr/bin/grep`.
- People: never write `_User` through `/api/_User`; `/admin/users` is the door.

## Working-tree note

s14: **the main index was reset to HEAD (`git reset -q`, index only)** — against s9's note below. Measured
first: `git write-tree` of the index matched no commit; against `5004a0f6d` it was 486 files SHORT and its
15 modified rows were all OLDER content (`node-catalog.json` −350, `token-codecs/` gone) — a stale tree going
backwards, nothing in it newer than HEAD. So the reset lost nothing; the working tree was untouched and
`git status` now reads the tree honestly. What it revealed: `templates/planner/` and `templates/planner-demo/`
(419 files) are DELETED ON DISK (` D`), by a peer (phase-78's rename to `templates/planning/`?), not by this
phase — left alone, not committed. The s14 commit went through a temporary index by pathspec as before.

s12: the BMG-014 commit's pathspec reset (`git reset -q HEAD -- packages/nodegx-backend/src packages/nodegx-backend/tests
docs/runtime dev-docs/tasks/phase-104-the-backend-manager`) also un-staged the STALE deletions the index held under those
directories (BMG-008's files, the phase-102 shots) — the files are on disk and identical to HEAD, so nothing changed on disk;
`git status` under those paths now reads honestly. Phase-78's `tests/helpers/todo-drive.ts` and `tpl008-*` edits are untouched.

🔴 **The main git index is STALE (s9):** `git status` shows the BMG-008 files as staged deletions and hundreds of
`MM` rows because the index holds an old tree, not because anyone deleted anything (`git diff --cached --stat
806b53c54` = 486 files). Everything is on disk. Commit through a temporary index by pathspec (memory:
`commit-your-delta-through-a-temporary-index`); do NOT `git reset`/`checkout` the main index — a peer may own it.
`git status` at the start of s8 showed modified `packages/nodegx-backend/tests/tpl008-*.test.ts`,
`tests/helpers/todo-drive.ts` and two untracked `tpl008-recurring-*` specs (mtimes 23–24 Sep, phase-78's),
plus the phase-78 docs and the staged phase-102 deletions from earlier sessions. None made by this phase;
left untouched and NOT swept into BMG-008's commit (temp-index commit by pathspec). Whoever owns them decides.
