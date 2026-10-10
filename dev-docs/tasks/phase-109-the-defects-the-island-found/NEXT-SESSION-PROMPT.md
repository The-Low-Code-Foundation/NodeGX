# Next session — P109 session 39

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 38 (2026-10-10, on `cline-dev`, primary tree):** board **31 of 52 closed** (ISL-012 ✅).

- **ISL-012 ✅** ([task](ISL-012-A-KIT-CAN-SHIP-A-MODERN-LIBRARY.md) §8 s38) — AC3's server render with hydration, driven: the docs'
  recipe rebuilt today (three 0.186.1 + OrbitControls, 762,803 B), deployed in the server-rendered layout, served by the
  folder's own `npm start`; the browser hydrated the server's own cube host (`adopted`), drew r186, a drag turned it (10,232 of
  102,400 px), no warning; screenshots looked at. Controls: the stamp changed to `0` → `adopted: false`; `public/` alone → no
  server DOM. **Found:** `P109-S38-SSRNOPAGES` (medium, open, P109's): a hydrated page logs *"This Router has no Pages
  configured"* as an error twice (the server too); neither control does; the page draws.
- **`deploy-from-disk --ssr`** (`4e0aa53db`): the editor's two passes (server at the root, browser app in `public/`). The devtool
  did not run at HEAD from the repo root (bootstrap import below editor imports; runtime folder found under the cwd) — fixed;
  `--external <dir>` names the runtime folder. The bundle (`scripts/devtools/deploy-from-disk.cjs`) is gitignored, rebuilt in the
  primary. A project with no `rootNodeId` is still refused by the devtool (the product's `nodegx deploy` guesses one).
- **P116-ONT-003-tsc fixed** (`4e0aa53db`): the ISL-010 drive spec typechecks; `typecheck:backend-tests` 4 errors → 0.
- **P112's `140bdeb41` had put back s37's last docs commit** (the four SCROLLROOM files, 10 s after `3b643c675`); restored
  `c4e7f965d`. SCROLLROOM's ledger row given its `commit:` and a `regression:` the check can read.

## Where s37's handoff was wrong

- *"Track G waits on Richard; the rest is his"* — **no.** ISL-034 (the door and the deploy say what went wrong, 6 bugs) and
  ISL-036 (the gates are green for the right reason, 6 low) are Track F, need no ruling, and have been ⬜ not started since
  2026-10-05; no handoff listed them. ISL-035 and ISL-037 hand over to P18 / P108, both live.
- Item 1 had already landed (`a54294a1d`, P116's `targetGoes.ts`).

## Do, in this order

1. **ISL-034** ([task](ISL-034-THE-DOOR-AND-THE-DEPLOY-SAY-WHAT-WENT-WRONG.md)) — its AC1 re-measures each of the 6 rows first
   (filed 2026-10-05, not re-measured since; some may be fixed by ISL-014/ISL-018 work — a none-owned row is the one most
   likely already fixed). Then build.
2. **ISL-036** ([task](ISL-036-THE-GATES-ARE-GREEN-FOR-THE-RIGHT-REASON.md)), the same way.
3. `P109-S38-SSRNOPAGES` once a task's AC needs it, or when 1–2 are done: the reading so far is in the bug file
   (`triggerDidMount` → Router `didMount` → `registerRouter` → `reset()` before `pages` is set). Its drive is
   `drive-isl012-cube.js <origin>`'s `messages` on the hydrated arm, with the two controls.
4. P109-S36-STALEMCPDIST's lasting fix, if Richard wants it now (about ISL-014's size).
5. **Track G** (ISL-039 … ISL-047) waits on Richard's order.

## What s38 learned

- **A devtool's bundle can be fine and its source broken.** The gitignored `deploy-from-disk.cjs` (2026-09-17) ran — from
  `packages/noodl-editor` only — while a fresh build of its entry threw at load. A bundle on disk says nothing about its source.
- **"It hydrated" needs a reading that can say no.** A page that draws after a server render may have been re-rendered from
  scratch (the client's fallback is silent but for one console line). Mark the server's element while the HTML parses and ask
  whether the live canvas is in it; the control that changes the stamp reads `false`.
- **A temp-index commit from an older base reverts whatever landed in between** — `140bdeb41` took back four files committed
  10 s before it. After a peer's commit lands beside yours, `git diff <yours> HEAD -- <your paths>`.

## Gate readings taken s38 (2026-10-10)

- Viewer prod build at `d97d9d5c8`+: `webpack.viewer.prod.js` compiled, 0 errors, exit 0, bundle written 09:12:43; deploy and SSR
  prod builds the same (09:15:53, 09:16:09).
- Viewer jest on `cline-dev` with no local patch: **150 / 150 suites, 1,837 / 1,837** (`-w 2`).
- `typecheck:backend-tests`: exit 2, 4 errors before; exit 0, 0 after (`4e0aa53db`). ISL-010 drive spec 2 passed, 2 skipped (no
  local model), the same at HEAD's version.
- `bugs.js check`: none of P109's s37/s38 rows (two older P109 rows still flagged: S17-EXPORTKITDEPS and S19-SCRIPTSUNBOUND's
  `regression:` lines are prose, not a path — cosmetic).

## Decisions for Richard (not yours)

- Carried from s35: an Expression reading `Arrays.cart.get(0).qty` does not re-run when that item's `qty` changes (recommended: yes,
  as a Repeater row hears its own record).
- Carried: the garden library entries at 1.0.0; C143's Refresh half; Track G's order; the layout of an unlabelled control in a real
  browser; `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY`, `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`,
  ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.
- New, recorded not asked: a person's Back or Forward to an entry whose address names the page on top now keeps the stack (ISL-048
  §13). A browser reaches it only through two entries with one address.

## Handed over (owed by another phase)

- **P107 (opennoodl-49), told s37:** ISL-052 landed as ruled. They fixed P109-S37-SCROLLROOM the same evening (`fd6385beb`: the
  model reads a scroll as the window unless the content is longer; the 30 ROOM boxes out of KNOWN).

- **P107 (opennoodl-49):** told C120/C126 landed and that `popstate` was sorted into `WORLD_KINDS`. Theirs: the day-seed survivors,
  the Video rows C96–C100, and the frame a landed back is heard in if the two targets ever disagree (they asked to be told).
- **P78 / TPL-011:** `packages/noodl-mcp/src/cloud/bundleEntry.js`'s D84 lines are still uncommitted (since 2026-09-26) and the
  shipped `cloud-bundle.cjs` depends on them.
- **P18 (export):** carried from s35 (Arrays in the export's Expression; the kit bootstraps; the Visual Function's reserved signal;
  s33's list).
- **P18 (export):** the scroll rule (ISL-052 §2) — an exported scrolling Group lays out as the runtime now does, or as the
  model does; theirs to decide when P107's model moves.
- **Release notes, add (s37):** a scrolling Group with Native platform scroll off keeps its gap and alignment and hides what lies
  outside it; inside any scrolling Group a "fill the rest" section grows with its content, a Fixed % is of the visible window
  (one slide per screen works), and a centred list too long to fit starts at the top.
- **Release notes, add (s36):** a Component Stack's Pop steps the browser's history back, and a Replace no longer adds an entry; a
  Reset goes to the start page; the agent's door says when it ticked a "run on value change" box. (s34's four and s35's three still
  owed.)

## Worktrees

`p109-isl049` (branch `p109-isl052`) is at the s37 docs commit, nothing unlanded; its viewer folder is a real copy now (not the
symlink), so a build there stays there; its untracked probes (`zz-s31-*`, `zz-s32-*`, `zz-s33-c114`)
— never commit them. 🔴 Its `packages/noodl-mcp/dist/` files are symlinks into the primary: do not `npm run build` there without
meaning to replace the primary's. The older worktrees are spent; remove with `git worktree remove` when convenient.

## Recipes

- **A server render, driven:** `node scripts/devtools/deploy-from-disk.cjs <project> --out <dir> --ssr` (the project needs
  `rootNodeId`; rebuild the devtool with `node scripts/devtools/build-deploy-from-disk.mjs` after a pull, and the deploy/SSR
  runtimes with `webpack.deploy.prod.js` / `webpack.ssr.prod.js` in noodl-viewer-react); in `<dir>`: `npm install && npm run build
  && PORT=<p> node server.js` (backgrounded); `node scripts/devtools/drive-isl012-cube.js http://127.0.0.1:<p>`. Stop the server
  by its LISTEN pid (`lsof -t -iTCP:<p> -sTCP:LISTEN`).

- **Land:** commit in the worktree; `git rebase cline-dev` there if it moved; in the primary tree, in ONE command:
  `merge-base --is-ancestor`, `git status --porcelain` each path the diff lists (abort on any), `git update-ref refs/heads/cline-dev
  <new> <old>`, `git checkout HEAD -- <each path>`. In zsh put the paths in an ARRAY (`P=(a b)`; `$P`) — a string does not split.
- **Grade one spec on the runtime:** `NSP_ONLY="<type>" NSP_SEED=<n> npx jest test/node-spec/conformance.test.ts` (noodl-runtime),
  then read the log's `scenarios: n / n` line — the test itself reports in 3 ms. Interpreter mutants: `TYPES="<type>" SEED=13,20732
  npx jest tests/zz-s31-mut.test.ts`. Every scenario's trace: `TYPES=… OUT=<file> npx jest tests/zz-s31-alltrace.test.ts`.
- **A control:** copy the fixed file aside, `git show HEAD:<file> > <file>`, run, copy back, `cmp`.
- **An agent over the stdio door:** `claude -p "<request>" --model claude-sonnet-5-5 --mcp-config <json> --strict-mcp-config
  --allowedTools "mcp__door" --output-format stream-json --verbose`, run from the project folder (the s36 scripts are in that
  session's scratchpad only). Build the door to a scratch name beside `dist/` if `dist/` is stale.
- **Editor drive without touching Richard's profile:** `NOODL_USER_DATA_DIR=<scratch>` with `firstRunLegal.json` copied in and a
  one-entry `recently_opened_project.json`; `cdp click "[data-test=launcher-project-card]"`; to open another, rewrite the entry and
  `cdp reload`; the preview is `--target=viewer`; `npm run dev:stop` after.
