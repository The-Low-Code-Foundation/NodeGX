# BMG-000 — The hand-off: the card hands over, Collections and Schema edit visually

**Opened 2026-09-24 18:16Z** by Richard, in the session before this phase was scoped.
**Status: ✅ built s0 (2026-09-24), driven headless, 32/32 on the dashboard gate; ✅ committed s2
(2026-09-24) after the whole-editor `tsc --noEmit` (exit 0) and `tut-001`/`def-047`/`def-036` (87/87).**
AC6 (the card pressed in the real editor by a person) is still open; BMG-013 carries it.

## 1. The person sentence

> **Someone opens their backend from the editor with one press and lands signed in. They add a
> record by filling in a form, change a cell by clicking it, and shape a collection with rows of
> choices — never a JSON body.**

## 2. What was asked, in his words

18:16Z — *"I think I was wrong to insist that the 'backends' tab has like 'data' and 'schema'
buttons. The web interface you made for the backend management is actually way better. can we make
it that the backend services tab is just to manage which backend is running and attached to the
project, start and stop buttons, and the data, schema, etc. stuff is just one button that says like
'open backend manager' … that opens the default browser to the localhost backend manager page?"*

19:01Z — *"It works! One important change though. The 'Collections' tab asks you to create a new
record in JSON. Not cool, nobody will know how to do that. in the editor it was a nice visual record
creation thing. Can we bring the schem and collections tabs in line with the visual editing features
that were in the editor's data views?"*

## 3. What was built (s0)

**The card** (`LocalBackendCard.tsx`, `BackendManager.js`):
- Data / Schema / Access buttons and the Triggers / Email / Sign-in menu items are gone. One button,
  **Manage data & settings ↗**, calls IPC `backend:open-dashboard`; the main process resolves the
  admin token from `secrets.json` (`ServiceSupervisor.adminToken()`, `:355-366`) and opens
  `${endpoint}/_admin#token=…` with `shell.openExternal` (`BackendManager.js:963-977`). The token
  never enters the renderer. The page reads the fragment once and scrubs it (`index.html:2904-2951`).
  A rejected token is no longer left in `sessionStorage`.
- Search and Secrets stay in the ⋯ menu because the page has no screen for either (BMG-011 gives
  it both; BMG-012 then removes these).

**Collections** (`index.html:685-1082`): a typed form per record (`fieldInput`, `:511-681`) — text,
number, checkbox, `datetime-local`, a Pointer select of real records; required marks; click-to-edit
cells with Enter/Esc; booleans flip; ids shortened to 8 with the full id on hover; Edit/Delete
column pinned. JSON stays for Object/Array/ACL/File/GeoPoint (BMG-002 replaces those) and the
filter stays JSON behind a disclosure (BMG-002 replaces it).

**Schema** (`:1110-1496`): *New collection* as name + field rows (name, type, → target, required,
default); rename in place; change type in place with a conversion warning; indexes as rows of
selects with Unique and order (FED-002's JSON editor is gone); *Open records* deep-links by
`S.openCollection`.

Shots: `shots/bmg000-*.png`. Drives: `drives/collections.js`, `drives/schema.js`, `drives/d1-3.mjs`
over `drives/cdp.mjs` against a throwaway backend (`bk2/`).

## 4. Acceptance criteria — what s0 measured

1. ✅ From the card, the browser opens the page signed in, token gone from the address bar
   (headless drive, three cases: with token, without, wrong).
2. ✅ New record with a Pointer, inline edit, bulk delete, CSV export — each save read back
   through `GET /api/:table/:id` (`drives/collections.js`).
3. ✅ New collection with a Pointer field, add field, rename, type change, unique index, *Open
   records* lands on the collection (`drives/schema.js`).
4. ✅ `admin-dashboard.test.ts` 32/32 including the size gate (39,067 of 48,000 gzip).
5. ✅ `LocalBackendCard.tsx` typechecks alone (`tsconfig.card.json`).
6. ⏳ **Not done:** the card pressed in the real editor (s0 restarted the editor at 19:00Z and
   said so; nobody pressed it). `npm run typecheck` for the whole editor. `test:main` for
   `tests-unit/tut-001/panel-render.test.ts` and `def-047`, which render the card.

## 5. What the next session does with it

1. Run the editor typecheck and `test:main` (the two `tests-unit` suites above by name).
2. Commit the five files **through a temporary index** (the real index holds a sibling's staged
   deletions of phase-102 files that are not ours): `index.html`, `styles.css`,
   `LocalBackendCard.tsx`, `BackendManager.js`, plus this phase's docs. One commit:
   `feat(p104/bmg-000): the card hands the backend to its own page; Collections and Schema edit visually`.
3. Ask Richard to press the button once (AC6). If R1(a) is ruled, note that the page built here is
   the one BMG-001 ports, so its two views are the first two components.

## 6. Watch for

- The running backend serves the page it was started with. After a rebuild of `nodegx-backend`
  (`npm run build` in the package — the html is inlined by esbuild), Stop and Start the backend
  from the card before reloading the tab.
- `pointerInput` fetches 200 records per Pointer field on form open (`:647-672`). Fine for a
  drive; BMG-002's picker replaces it.
