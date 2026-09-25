# P104 — next session

**Written 2026-09-25 (end of s5).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, built
BMG-001; s3 built and drove BMG-007 (API keys); s4 built and drove BMG-004 (Users, R3 disable);
s5 built and drove BMG-002 (Collections).

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless | ✅ `9b72fbaf` |
| BMG-001 the shell | ✅ s2 | ✅ headless, AC1–8 (§6) | ✅ `b3a064e7` |
| BMG-007 API keys | ✅ s3 | ✅ headless, AC1–7 (§6) | ✅ s3 |
| BMG-004 Users | ✅ s4 | ✅ headless, AC1–9 (§6) | ✅ `6f69b64f` |
| BMG-002 Collections | ✅ s5 | ✅ headless, AC1–9 (§6) | ✅ s5 (see `git log -1 -- packages/nodegx-backend/src/admin/app/filters.ts`) |
| BMG-003, 005, 006, 008…012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0. Check `git status -- packages/nodegx-backend/src/admin`
before believing that: a peer session may have touched it.

**Rulings:** R1 (a) Preact app · R2 the editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed. All in README §4/§8, with the question each answered.

**Gate readings (2026-09-25, s5, before the commit):** `packages/nodegx-backend` `npm run typecheck`
exit 0. Full `npx jest` **exit 0**: 185 suites passed, 1 skipped; 2,176 tests passed. After the last
UI edit: the admin-app, dashboard, bmg-002-*, ops-rate-limit and ops-audit specs, 11 suites,
130/130. Bundle 53,039 gzip (level 9) of 160,000. Route tally now `admin: 91`.
🔴 A new `/admin/...` route still owes that tally line AND an `audit-actions.ts` entry
(`ops-audit.test.ts` walks the live table for it).

## Do this, in order

1. **BMG-005 Roles.** It depends on 001 and 004, both done. Roles have names, members are people
   (picked with `Picker` over `/admin/users?q=`, as `AclCard` already does), and removing one uses
   the existing `DELETE /admin/roles/:name/users/:userId`.
2. Then BMG-006 (it reuses `FilterRows` and `filters.ts` for conditions), BMG-008, BMG-003,
   BMG-009 (it reuses `FilterRows` for runs), BMG-010, BMG-011 (R4 yes), BMG-012 (which also
   deletes the editor's `serverOwnedColumns.ts`; the backend's `users/accountColumns.ts` is the one
   list, served on `whoami.accountColumns`). One commit per task, a §6 *Built* with what each AC
   measured, shots in `shots/`, drives in `drives/<task>/`.

## What s5 settled, including where the handoff or the task was wrong

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

## How to drive a page (`drives/bmg002/` is the freshest recipe)

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
