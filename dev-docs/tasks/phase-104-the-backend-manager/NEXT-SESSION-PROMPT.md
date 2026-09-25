# P104 — next session

**Written 2026-09-25 (end of s4).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, built
BMG-001; s3 built and drove BMG-007 (API keys); s4 built and drove BMG-004 (Users, R3 disable).

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless | ✅ `9b72fbaf` |
| BMG-001 the shell | ✅ s2 | ✅ headless, AC1–8 (§6) | ✅ `b3a064e7` |
| BMG-007 API keys | ✅ s3 | ✅ headless, AC1–7 (§6) | ✅ s3 (see `git log -1 -- packages/nodegx-backend/src/admin/app/scopes.ts`) |
| BMG-004 Users | ✅ s4 | ✅ headless, AC1–9 (§6) | ✅ s4 (see `git log -1 -- packages/nodegx-backend/src/server/admin-users.ts`) |
| BMG-002, 003, 005, 006, 008…012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0 (check `git status -- packages/nodegx-backend/src/admin`
before believing this — a peer session may have touched it).

**Rulings:** R1 (a) Preact app · R2 editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed. All in README §4/§8 with the question each answered.

**Gate readings (2026-09-25, s4):** `packages/nodegx-backend` `npm run typecheck` exit 0; full `npx
jest` exit 0 — 182 suites passed, 1 skipped, 2,129 tests passed; bundle 38,836 gzip of 160,000.
Route tally now `admin: 88`. 🔴 A new `/admin/...` route still owes that tally line AND an
`audit-actions.ts` entry (`ops-audit.test.ts` walks the live table for it).

## Do this, in order

1. **BMG-002 Collections** — the grid BMG-004's custom `_User` columns are waiting on for in-cell
   editing (today they edit in the drawer). Collections now hides `_`-prefixed tables because
   `/admin/schema` lists `_User` (BMG-004 §6); keep it that way — people are edited where a
   password is hashed.
2. Then BMG-005, BMG-006, BMG-008, BMG-003, BMG-009, BMG-010, BMG-011 (R4 yes), BMG-012 (which
   also deletes the editor's `serverOwnedColumns.ts` — the backend's `users/accountColumns.ts`
   is now the one list, served on `whoami.accountColumns`).
   One commit per task, a §6 *Built* with what each AC measured, shots in `shots/`, drives in
   `drives/<task>/`.

## How to drive a page (`drives/bmg004/` is the freshest recipe)

`drives/bmg004/run.sh <label> [seed] [script.mjs]` (people seeded through `/admin/users`, `signup:
nobody`) and `drives/bmg007/run.sh` (keys) share a shape: each writes a LOCKED `security.json` into a scratch
data dir (devOpen false — the default posture bypasses every key scope), starts `dist/cli.js
serve` on 8697 with token `t0k`, seeds it (`seed.mjs`: Pet/Toy, ann and bob with a Pet each made
under their OWN sessions so creator-owns ACLs are real, one key, one trigger), starts headless
Chrome on 9333, runs the script through `drives/cdp.mjs` (which now also hands the script `send`
for raw CDP — `Browser.grantPermissions` for the clipboard), and tears both down. **`npm run
build` first** — `bin/` runs `dist/`, and the served page is the bundle baked into it. Traps:
a hash change does not reload the document; `document.body.textContent` includes the inlined
bundle's SOURCE (measure `#main`/`.drawer`); never the project's live backend; one heavy job at
a time; tear down after.

## What to know about the app before touching a view

- `views/<id>.tsx` exports one component taking `{ params }`. Register nothing: `views/index.ts`
  lists all fourteen; `nav.ts` says where each shows.
- Data through `api()` (throws the server's own sentence; 401 signs out); every mutating button
  is `WriteBtn`; `toast`/`fail` report; `confirmDestructive` for anything that destroys (5th arg
  is the verb); `openModal((close) => <Dialog…/>)`; `Drawer` for a thing the URL opens (open it
  from `params[0]`, close with `navigate(view)`); `EmptyState` for every empty list;
  `useSession().whoami.security.devOpen` when a page's promise is void on a dev-open backend.
- Rules the suite enforces: no `dangerouslySetInnerHTML`/`innerHTML` in the source; no colour
  literal outside `:root` in `styles.css`; `var(--danger…)` only under a selector that says
  `danger` or `.bad`; bundle under 160,000 gzip; no `</script` in the bundle. `div.field input`
  is full-width except checkbox/radio.
- `useStore` re-reads after subscribing — do not "simplify" that away (BMG-001 §6).
- `tests/admin-app/dom.ts` is how a spec gets a DOM; import it first. `keys-view.test.tsx` shows
  a controlled composer under test (re-mount on change) and a clipboard stub.
- `ugrep` (the default `grep` on this box) silently skips `HttpServer.ts` as binary: use
  `/usr/bin/grep` when a route "is not there".
- People: never write `_User` through `/api/_User` — it refuses a password now and hides the hash;
  `/admin/users` is the door (`SystemUsers` underneath). `format.ts isServerOwned` takes the
  served `accountColumns` as an argument (format.ts stays pure). `tableLabel('_User')` is
  *Users* — no page says `_User` to a person.
- Anything that signs someone in must call `isAccountDisabled` BEFORE it writes (BMG-004 §6 row
  4: a late check let rule 5 wipe a disabled account's password).

## Working-tree note

`git status` at the start of s3 showed STAGED deletions of the whole `phase-102-the-token-composer/`
directory (task files and shots) that s3 did not make. They were left untouched and NOT swept
into BMG-007's commit (temp-index commit by pathspec). Whoever owns them decides.
