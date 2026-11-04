# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 6 (HTX-004's Build done in jsdom).** Read [README.md](README.md) §10 (sessions 1 to 6)
first: how React's constructs map onto `lib/core.js`, how the client travels, what the desks read. Sessions used: 6 of at
most 10.

## Before anything

1. **Is R4 ruled?** README §9/§10 session 1 ends with the question (double-click: Chrome and Firefox refuse; keep "any
   static server", or also write a bundled copy). If Richard has not answered, carry on: nothing here depends on it.
2. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
3. **The box.** Export suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). Other sessions' editors (Electron) were running on 2026-11-04:
   look before you launch a browser, a backend or a build. `grep` here skips some `.ts` files as binary: `/usr/bin/grep -a`.

## Then: HTX-004's Chrome drive ([task](HTX-004-THE-BACKEND-THROUGH-THE-ONE-CLIENT.md), Done when)

todo-list in Chrome, three arms (the runtime, the React export, the HTML export), **one fresh real backend each**
(EXP-022 S4's rule): sign in, add, tick, delete, open a task's page and come back, reload. The wire read from the
backend's own request log, split by step; the three arms equal at every step, or the difference filed. The two writes
EXP-022 S6 fixed in both exports (add, and every dialog) work here too.

1. **Read EXP-022 S4 and S6 first** (`../phase-18-code-export-v2/EXP-022-THE-SAME-GRAPH-IN-SWIFT.md` §7–§9): how it
   started a fresh backend per arm, seeded a user, read the request log, and drove the runtime and React arms. Copy that
   recipe; add the HTML arm (a copy of todo-list bound to the backend, `nodegx export --target html`, served by
   `python3 -m http.server`).
2. The endpoint and app id: `env.js` in the HTML folder (`export const env = { VITE_NODEGX_ENDPOINT: …,
   VITE_NODEGX_APP_ID: … }`), `.env` in the React folder. Nothing generated is edited.
3. Grade HTX-003's sentence there too: the list right, the field keeping its cursor, nothing run twice.

## Known

- `tests/html-the-backend.test.ts` (22 rows, about 25 s): §A Record Desk (EXP-022 S3's prediction, the wire beside
  React's), §B Noodl Desk (`s134-noodlapi/EXPECTED.md`, signed in and out), §C what is printed, §D the client over every
  template bound to a backend, §E the Call Desk (a Cloud Function, beside React only: P134-HTX004-CLOUDARM).
- The HTML arm takes `backend: { spec, appId, session? }` and `allowErrors`, as the React arm does; `htmlBackendArm`
  hands back `{ readings, requests }`. `openHtmlExport(files, hash, stored, { prepare, allowErrors })`.
- todo-list bound to a backend: 29 HTML losses, none the backend's (`html-state-and-scripts.test.ts` D2, D3b). Unbound
  it sends the person to Sign in (D3): nobody can be signed in without a backend, as in every export.
- The client is `src/emit/html/client.ts` (`clientFilesEsm`): React's files, types out by Node's stripper,
  `closeStripped` for the blanks, hooks cut by name, `import.meta.env` → `env.js`. A module line it does not know throws.
- Options still wait on the plan (P134-HTX003-OPTIONSWIRED). Still undrawn: 38 custom nodes, 21 images, 18 icons, 15
  Columns. Next big losses across the templates: For Eaches fed by a Function (82, every export), `cssClassName` bound
  (37), Functions using script files (30), Conditions that test again (22).
- P134-HTX001-PRINTERDECIDES now lists thirty-two copied decisions and four imported. Add any new one there.
- Five library files are generated, never edited (`lib/core.js`, `functionRun.js`, `states.js`, `animate.js`,
  `persistStore.js`): regenerate with `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts`
  in `packages/nodegx-export` after a change to their sources.
- Headless Chrome lays out at 500 px when asked for 390: shoot phone width through a 390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file; file every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`); update the memory `where-nodegx-fits-and-where-it-stops`; commit your own delta only.
`dev-docs/BOARD.md` carries other sessions' uncommitted edits: commit it through a temporary index.
