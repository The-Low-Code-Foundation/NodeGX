# P104 — next session

**Written 2026-09-25 (end of s8).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, built
BMG-001; s3 built and drove BMG-007 (API keys); s4 BMG-004 (Users, R3 disable); s5 BMG-002
(Collections); s6 BMG-005 (Roles); s7 BMG-006 (Permissions); s8 built and drove BMG-008 (Triggers).

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
| BMG-008 Triggers | ✅ s8 | ✅ headless, AC1–8, 41/41 checks (§6) | ✅ s8 (see `git log -1 -- packages/nodegx-backend/src/triggers/cronWords.ts`) |
| BMG-003, 009…012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0. Check `git status -- packages/nodegx-backend/src/admin`
before believing that: a peer session may have touched it.

**Rulings:** R1 (a) Preact app · R2 the editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed. All in README §4/§8, with the question each answered.

**Gate readings (2026-09-25, s8):** `packages/nodegx-backend` `npm run typecheck` exit 0 (both configs). Full
`npx jest --maxWorkers=4`: **192 suites PASS, 1 skipped (`fed-003-live-cache`), 0 FAIL, 2289 tests, exit 0, 394 s**. Bundle builds; route tally
`admin: 93` (`POST admin/triggers/preview`, in `ops-rate-limit.test.ts` with its reason, `NOT_AUDITED` in
`audit-actions.ts` as a dry run, and in `READONLY_SAFE_ROUTES`). Drive `drives/bmg008/run.sh ac seed` 41/41.
🔴 A new `/admin/...` route still owes the tally line AND an `audit-actions.ts` entry (an action, or a
`NOT_AUDITED` reason for a dry run); a POST a read-only admin should be able to make owes `readonly.ts` too.

## Do this, in order

1. **BMG-003 Schema.** Depends on 001 only. A field-type picker, per-type options, allowed values, drop a
   field, the relation dialog, checks, a danger zone. Reuse `FieldControl`/`fields.tsx` for defaults,
   `Chips` for allowed values, `DangerZone` for drop/delete, `Switch` for every yes/no.
2. Then BMG-009 (Workflows and Runs; it reuses `FilterRows` for runs — and Runs should link a row back to
   `#/triggers/<id>` from `metadata.triggerId`), BMG-010 (`drives/bmg005/smtp.mjs` is the mail sink),
   BMG-011 (R4 yes; **`ScheduleBuilder` from s8 is the sweep/backup schedule control** — hand it
   `preview={(cron) => api('POST', '/admin/triggers/preview', {cron})}` and it is done), BMG-012 (which
   also deletes the editor's `serverOwnedColumns.ts`, its `panels/permissions/ruleVocabulary.ts`, AND its
   `cronGloss` in `models/triggers/TriggerBackendClient.ts` with `TriggerFormFields.tsx` — the backend's
   `triggers/cronWords.ts` is the one gloss; the editor's `workflowtriggernodes.test.ts` pins on
   `cronGloss` go with it). One commit per task, a §6 *Built* with what each AC measured, shots in
   `shots/`, drives in `drives/<task>/`.

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

## How to drive a page (`drives/bmg008/` is the freshest recipe; `drives/bmg002/` has more helpers)

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

- `views/<id>.tsx` exports one component taking `{ params }`; `views/index.ts` lists all fourteen,
  and `nav.ts` says where each shows.
- Data goes through `api()` (it throws the server's own sentence, and a 401 signs out). Every
  mutating button is `WriteBtn`; `toast`/`fail` report. Use `confirmSimple` (a plain ask) or
  `confirmDestructive` (type the name); `openModal((close) => <Dialog…/>)`; a `Drawer` for a thing
  the URL opens; `EmptyState` for every empty list.
- **Reuse:** `filters.ts` + `FilterRows`; `fields.tsx` `FieldControl` and `RelationEditor`;
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

`git status` at the start of s8 showed modified `packages/nodegx-backend/tests/tpl008-*.test.ts`,
`tests/helpers/todo-drive.ts` and two untracked `tpl008-recurring-*` specs (mtimes 23–24 Sep, phase-78's),
plus the phase-78 docs and the staged phase-102 deletions from earlier sessions. None made by this phase;
left untouched and NOT swept into BMG-008's commit (temp-index commit by pathspec). Whoever owns them decides.
