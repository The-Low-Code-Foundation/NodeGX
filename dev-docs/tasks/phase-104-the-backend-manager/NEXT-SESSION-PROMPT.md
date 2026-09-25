# P104 — next session

**Written 2026-09-25 (end of s3).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, built
BMG-001; s3 built and drove BMG-007 (API keys).

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless | ✅ `9b72fbaf` |
| BMG-001 the shell | ✅ s2 | ✅ headless, AC1–8 (§6) | ✅ `b3a064e7` |
| BMG-007 API keys | ✅ s3 | ✅ headless, AC1–7 (§6) | ✅ s3 (see `git log -1 -- packages/nodegx-backend/src/admin/app/scopes.ts`) |
| BMG-002…006, 008…012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0 (check `git status -- packages/nodegx-backend/src/admin`
before believing this — a peer session may have touched it).

**Rulings:** R1 (a) Preact app · R2 editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed. All in README §4/§8 with the question each answered.

**Gate readings (2026-09-25):** `packages/nodegx-backend` `npm run typecheck` exit 0; `npx jest
tests/admin-app tests/admin-dashboard.test.ts tests/bmg-007-key-update.test.ts
tests/brg-002-api-key-roundtrip.test.ts tests/ops-audit.test.ts tests/fed-005-mcp-acts-as.test.ts
tests/feed-drive.test.ts` → 11 suites, 123/123; bundle 35,080 gzip of 160,000. Full `npx jest`:
180 suites passed, 1 skipped, 1 red — `tests/ops-rate-limit.test.ts`'s reviewed route tally, which
every new admin route moves by one (bumped with a review sentence in the follow-up commit). 🔴 A
new `/admin/...` route in BMG-004 onward owes that tally line AND an `audit-actions.ts` entry.

## Do this, in order

1. **BMG-004 Users** (R3 yes). Start with the finding in its §2: `GET /admin/schema` omits
   `_User`; find out why in `byob-admin.ts` before building on the assumption that the Schema
   page can add fields to it. The `disabled` flag is a backend change (users/, server/users.ts,
   the login path, sessions revoked on the press) — measure the login path first. BMG-007's
   `tests/bmg-007-key-update.test.ts` is the shape for a locked-backend route spec (the
   `LOCKED` config; a dev-open backend bypasses key scopes and will bypass a user flag too until
   you measure otherwise).
2. Then BMG-002, BMG-005, BMG-006, BMG-008, BMG-003, BMG-009, BMG-010, BMG-011 (R4 yes), BMG-012.
   One commit per task, a §6 *Built* with what each AC measured, shots in `shots/`, drives in
   `drives/<task>/`.

## How to drive a page (`drives/bmg007/` is the freshest recipe)

`drives/bmg007/run.sh <label> [seed] [script.mjs]` writes a LOCKED `security.json` into a scratch
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

## Working-tree note

`git status` at the start of s3 showed STAGED deletions of the whole `phase-102-the-token-composer/`
directory (task files and shots) that s3 did not make. They were left untouched and NOT swept
into BMG-007's commit (temp-index commit by pathspec). Whoever owns them decides.
