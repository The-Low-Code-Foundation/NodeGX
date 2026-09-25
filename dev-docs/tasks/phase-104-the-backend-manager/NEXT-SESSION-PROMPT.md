# P104 — next session

**Written 2026-09-25 (end of s7).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, built
BMG-001; s3 built and drove BMG-007 (API keys); s4 built and drove BMG-004 (Users, R3 disable);
s5 built and drove BMG-002 (Collections); s6 built and drove BMG-005 (Roles); s7 built and drove
BMG-006 (Permissions).

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless | ✅ `9b72fbaf` |
| BMG-001 the shell | ✅ s2 | ✅ headless, AC1–8 (§6) | ✅ `b3a064e7` |
| BMG-007 API keys | ✅ s3 | ✅ headless, AC1–7 (§6) | ✅ s3 |
| BMG-004 Users | ✅ s4 | ✅ headless, AC1–9 (§6) | ✅ `6f69b64f` |
| BMG-002 Collections | ✅ s5 | ✅ headless, AC1–9 (§6) | ✅ `cff004a9` |
| BMG-005 Roles | ✅ s6 | ✅ headless, AC1–6, 27/27 checks (§6) | ✅ `67de1ede` |
| BMG-006 Permissions | ✅ s7 | ✅ headless, AC1–7, 37/37 checks (§6) | ✅ s7 (see `git log -1 -- packages/nodegx-backend/src/admin/app/permissionsModel.ts`) |
| BMG-003, 008…012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0. Check `git status -- packages/nodegx-backend/src/admin`
before believing that: a peer session may have touched it.

**Rulings:** R1 (a) Preact app · R2 the editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed. All in README §4/§8, with the question each answered.

**Gate readings (2026-09-25, s7, before the commit):** `packages/nodegx-backend` `npm run typecheck` exit 0
(both configs). Full `npx jest --maxWorkers=4`: **189 suites PASS, 1 skipped (`fed-003-live-cache`, needs a live key),
0 FAIL, 2214 tests, exit 0, 354 s** — it ended on its own this time. Bundle builds; route tally unchanged at `admin: 92`
(no new route). Drive `drives/bmg006/run.sh ac seed` 37/37 twice (before and after the layout fix).
🔴 A new `/admin/...` route still owes the tally line in `ops-rate-limit.test.ts` AND an
`audit-actions.ts` entry (`ops-audit.test.ts` walks the live table for it). BMG-006 added none.

## Do this, in order

1. **BMG-008 Triggers.** Depends on 001 only. The schedule builder it specifies is what BMG-011's sweep
   and backup schedules reuse, so build it as a composer (`composers/`), not inside the view. Reuse
   `KeyValueEditor`/`ListEditor` for a payload as rows, `FilterRows` if a change-trigger takes a
   condition, `Switch` (new in s7, `ui.tsx`) for every yes/no.
2. Then BMG-003, BMG-009 (it reuses `FilterRows` for runs), BMG-010 (`drives/bmg005/smtp.mjs` is the
   mail sink), BMG-011 (R4 yes; the schedule builder from 008), BMG-012 (which also deletes the editor's
   `serverOwnedColumns.ts` AND its `panels/permissions/ruleVocabulary.ts` — the backend's
   `app/ruleVocabulary.ts` is the one copy now; the editor's `spr-001/ruleVocabulary.test.ts` moves or
   goes with it). One commit per task, a §6 *Built* with what each AC measured, shots in `shots/`,
   drives in `drives/<task>/`.

## What s7 settled

- **`PUT /admin/permissions` has a version tag now.** `GET` answers `etag` (body and `ETag` header, a
  digest of the stored JSON); a `PUT` with a stale `If-Match` is 412 with a sentence and saves
  nothing; no header = the old behaviour. `api()` takes a 4th argument of headers for it. Any other
  page that reads-patches-writes a whole document should do the same (`ops.json`, `email` config,
  `auth` config are candidates when BMG-010/011 touch them; measure whether their routes offer one).
- **The matrix has a *Default* column per row** because the storage inherits per operation; the
  task's matrix could not say it and would have rewritten inherited rows on Save (BMG-006 §6).
- ***Only the owner* is `authenticated` + creator-owns**, not `nobody` on Change: `checkClp` runs
  before any row is looked at, so `nobody` locks the owner out too.
- **The vocabulary writes a canonical atom order** (signed in, then roles). Anything comparing
  "stored" with "drawn" must compare through the model, never the bytes (`CollectionPage` `before`).
- `Switch` (`ui.tsx`) is the yes/no control; `RuleBoxes`/`RuleMatrix` live in `views/permissions.tsx`
  and could move to `composers/` if another page needs a rule (BMG-010's provider scopes are
  checkboxes of a different vocabulary, not this one).
- The drive's `setVal` now handles `<select>` (native setter + input + change).

## What s6 settled

- **`Picker` had an Enter race.** It searches 150 ms after the last key. Enter picked from the rows
  on screen, which answered the PREVIOUS query, so `bo`+Enter added `ann`. Enter now waits for the
  answer to what was typed (`picker.test.tsx` pins it). Every page with a `Picker` had it.
- `Picker` also gained `createWhen` (offer the create row only for a query it accepts) and
  `openOnFocus={false}` (a drawer focuses its first control, and a list of everyone was covering
  the drawer).
- **Roles now carry a description** (`_Role.description`, the idempotent `addColumn`) and
  `PUT /admin/roles/:name` changes only that. The name is not editable, because rules spell it.
  Rename belongs to BMG-006 if anywhere.
- `GET /admin/users?role=<name>` answers the members. `GET /admin/roles` answers `names` (the
  first three) and `createdAt`.
- The task's name rule said *"starts with a letter"*; the server does not enforce that, so the
  page does not either.
- **To drive invitations**, `drives/bmg005/smtp.mjs` is a 50-line SMTP sink, and the seed points
  the backend's email at it and turns sign-in links on. BMG-010 (email) will want it.

## What s5 settled
, including where the handoff or the task was wrong

- **The task said views live in "the backend's operational store".** That is the SQL store for
  idempotency keys. Views are operator state, so they are `views.json` in the data dir, beside
  `ops.json` (`server/admin-views.ts`). BMG-002 §6 records the deviation.
- **Two meanings the task's operator list did not settle:** SQL `!=` drops missing values, so
  *is not*, *≠* and *is no* each carry an "or missing" leg; and a list item is matched as its
  quoted JSON, so `red` does not match `redwood`. The spec's independent row reading catches both.
- **Backend defect fixed:** a signed file URL was refused (403) by the route gate whenever
  `files.read` is not `public`. The gate now verifies the signature (`HttpServer.signatureAdmits`,
  `tests/bmg-002-signed-files.test.ts`). The default posture (`read: public`) never showed it.
- The backend writes file URLs on its own loopback address. The page keeps only path + query
  (`fields.tsx samePath`). Anything else that renders a file URL in the browser needs the same.

## How to drive a page (`drives/bmg005/` is the freshest recipe; `drives/bmg002/` has more helpers)

`drives/bmg002/run.sh <label> [seed|keep] [script.mjs]`: a LOCKED `security.json` (devOpen false;
the default posture bypasses every key scope) in a scratch data dir, `dist/cli.js serve` on 8697
with token `t0k`, `seed.mjs` (Person, Tag, a Task collection with **every column type**, 12 Tasks
that split every filter, ann and bob through `/admin/users`, role `editors`), headless Chrome on
9333, the script through `drives/cdp.mjs`, then teardown. A label starting `second` gets a wiped
Chrome profile (AC4's second browser). `cdp.mjs` now also hands the script `requests` (every
request the page made) as well as `send`. The ac script has the helpers a new drive needs:
`setVal` (native setter + input/change, which works for Preact selects and dates), `pick` (types
into a Picker and mousedowns the row by its label), `setFile` (`DOM.setFileInputFiles`), `field(name)`
(the drawer's labelled field) and `jsonAtRest`.
**`npm run build` first**: `bin/` runs `dist/`, and the served page is the bundle baked into it.
Traps: a hash change does not reload the document (go through `about:blank` between two
`/_admin` loads); `document.body.textContent` includes the inlined bundle's source (measure `#main`,
`.drawer`, `.modal`); clicking several ✕ in one tick hands each a stale list (one at a time); never
the project's live backend; one heavy job at a time; tear down after.

## What to know about the app before touching a view

- `views/<id>.tsx` exports one component taking `{ params }`; `views/index.ts` lists all fourteen,
  and `nav.ts` says where each shows.
- Data goes through `api()` (it throws the server's own sentence, and a 401 signs out). Every
  mutating button is `WriteBtn`; `toast`/`fail` report. Use `confirmSimple` (a plain ask) or
  `confirmDestructive` (type the name); `openModal((close) => <Dialog…/>)`; a `Drawer` for a thing
  the URL opens; `EmptyState` for every empty list.
- **New in s5, reuse them:** `filters.ts` + `FilterRows` (BMG-006 and BMG-009 are meant to reuse
  them); `fields.tsx` `FieldControl` (a control per column type; `rawFrom`/`parseRaw`, structured
  raws for list/object/location/file/access) and `RelationEditor`; `searchRecords`/`pointerItem`
  (a record by what it says); `acl.ts` + `AclCard`; `format.ts` `displayValue` (words, never a
  JSON dump), `parseCsv` (preview only; the server parses the import), `fileLabel`.
- Rules the suite enforces: no `dangerouslySetInnerHTML`/`innerHTML`; no colour literal outside
  `:root` in `styles.css`; `var(--danger…)` only under a selector that says `danger` or `.bad`;
  bundle under 160,000 gzip; no `</script` in the bundle. `div.field input` is full width, except
  inside `.list-row` and `.field-line` (s5), where a row of controls stays a row.
- `useStore` re-reads after subscribing; do not "simplify" that away (BMG-001 §6).
- `tests/admin-app/dom.ts` is how a spec gets a DOM (import it first).
- `ugrep` (the default `grep` here) silently skips `HttpServer.ts` as binary: use `/usr/bin/grep`.
- People: never write `_User` through `/api/_User`; `/admin/users` is the door. Anything that signs
  someone in calls `isAccountDisabled` BEFORE it writes.

## Working-tree note

`git status` at the start of s3, s4 and s5 showed STAGED deletions of the whole
`phase-102-the-token-composer/` directory and of `packages/nodegx-project-contract/token-codecs/`,
plus modified phase-78 files and `tpl008-*` specs, none made by this phase. They were left
untouched and NOT swept into BMG-002's commit (temp-index commit by pathspec). Whoever owns them
decides.
