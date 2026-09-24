# P104 — next session

**Written 2026-09-24 (end of s2).** s1 scoped; s2 committed BMG-000, got R1/R3/R4 ruled, and built
BMG-001 — the page is a Preact app now.

## Where it stands

| task | built | driven | committed |
|---|---|---|---|
| BMG-000 the hand-off | ✅ s0 | ✅ headless | ✅ `9b72fbaf` |
| BMG-001 the shell | ✅ s2 | ✅ headless, AC1–8 (§6) | ✅ (see the commit after `9b72fbaf` on `cline-dev`) |
| BMG-002 … BMG-012 | — | — | — |
| BMG-013 Richard drives | his | — | — |

Built-but-undriven: 0. Built-but-uncommitted: 0 (check `git status` for `src/admin/app` before
believing this — a peer session may have touched it).

**Rulings:** R1 (a) Preact app · R2 editor lets go · R3 disable a user: yes · R4 restore in the
browser: yes, behind the typed name · R5 filed. All in README §4/§8 with the question each answered.

**Gate readings (2026-09-24):** `packages/nodegx-backend` `npx jest tests/admin-dashboard.test.ts
tests/admin-app` → 47/47; `tests/feed-drive.test.ts` green; `npm run typecheck` (both tsconfigs)
exit 0; bundle 32,538 gzip of 160,000. The full `npm test` reading is in BMG-001's commit message.

## Do this, in order

1. **BMG-007 API keys** (smallest; Richard's own example). The kit is there: `Chips` for the
   scope picker is wrong — use grouped checkboxes with a select-all per group (the vocabulary is
   FIVE shapes, `security/model.ts:590`; `functions:<name>` needs `GET /admin/permissions/functions`);
   `Picker` over users for *acts as*; the secret behind a copy button (`copyText` in `ui/ui.tsx`).
   Read `views/keys.tsx` (the as-is port) and `views/collections.tsx` (how a page uses the kit).
2. **BMG-004 Users** (R3 yes). Start with the finding in its §2: `GET /admin/schema` omits
   `_User`; find out why in `byob-admin.ts` before building on the assumption that the Schema
   page can add fields to it. The `disabled` flag is a backend change (users/, server/users.ts,
   the login path, sessions revoked on the press) — measure the login path first.
3. Then BMG-002, BMG-005, BMG-006, BMG-008, BMG-003, BMG-009, BMG-010, BMG-011 (R4 yes), BMG-012.
   One commit per task, a §6 *Built* with what each AC measured, shots in `shots/`, drives in
   `drives/<task>/`.

## How to drive a page (BMG-001's recipe, `drives/bmg001/`)

`run.sh <label> [seed|fresh|keep] [script.mjs]` starts `dist/cli.js serve` on a scratch data dir
(port 8697, token `t0k`), seeds it (`seed.mjs`: Pet/Toy collections, ann/bob, roles, a key, a
schedule trigger fired once), starts headless Chrome on 9333, runs the script through
`drives/cdp.mjs`, and tears both down. **`npm run build` first** — `bin/` runs `dist/`, and the
running backend serves the page it was started with. Two traps met in s2: a drive that only
changes the hash does not reload the document (use `location.reload()`), and `fresh` must not
share the seeded data dir (it has its own now). Never the project's live backend; one heavy job
at a time; tear down after.

## What to know about the app before touching a view

- `views/<id>.tsx` exports one component taking `{ params }` (the route's parameters). Register
  nothing: `views/index.ts` already lists all fourteen; `nav.ts` says where each shows.
- Data through `api()` (throws the server's own sentence; 401 signs out); every mutating button
  is `WriteBtn` (disabled with an explanation for the read-only tier); `toast`/`fail` report;
  `confirmDestructive` for anything that destroys; `openModal((close) => <Dialog…/>)` for
  dialogs; `Drawer` for a thing the URL opens; `EmptyState` for every empty list.
- Rules the suite enforces: no `dangerouslySetInnerHTML`/`innerHTML` in the source; no colour
  literal outside `:root` in `styles.css`; `var(--danger…)` only under a selector that says
  `danger` or `.bad`; bundle under 160,000 gzip; no `</script` in the bundle.
- `useStore` re-reads after subscribing — do not "simplify" that away (BMG-001 §6).
- `tests/admin-app/dom.ts` is how a spec gets a DOM; import it first.

## Traps met this session

- The editor `dev:debug` stack under pid 37675 (this session) serves Richard's P103 drive project;
  it was left up on purpose. `dev:stop --list` before touching it.
- `node bin/nodegx-backend.js serve --help` starts a server; it does not print help.
- A temp-index commit leaves the real index stale: `git reset -q HEAD -- <your paths>` after, and
  confirm `git diff --cached --stat` on those paths is empty.
