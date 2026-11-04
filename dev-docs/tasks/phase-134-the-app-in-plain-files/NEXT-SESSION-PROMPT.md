# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 7 (HTX-004 done: todo-list in Chrome, three arms).** Read [README.md](README.md) §10
(sessions 1 to 7) first. Sessions used: 7 of at most 10, with three tasks left (HTX-005, HTX-006, HTX-007), one each.

## Before anything

1. **R6 (README §9).** Neither export can open a task (P134-HTX004-SELECTREFUSED, high, the plan's; 180 wires across
   the templates). Recommended: after HTX-005 to HTX-007, as shared plan work counted apart. If Richard has ruled
   "fix it now", do that first: `plan.ts` around 16716 (Set Variable) and 16530 (Global Store Set), the lifted outputs
   (`pendingLifted`, around 4574), then the whole package suite, because `plan.ts` is the React lane's. Grade it with
   `htx-004/drive.cjs` (D2 to D2back). If he has not answered, carry on with HTX-005.
2. **R4** is still waiting on Richard (static server, or also a bundled copy). Nothing depends on it.
3. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
4. **The box.** Suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). Other sessions' Electron editors and Chromes were running on
   2026-11-04. `grep` skips some `.ts` files as binary here: use `/usr/bin/grep -a`. Chrome from Claude's bash needs the
   sandbox off.

## Then: HTX-005 ([task](HTX-005-GRADED-THE-SAME-WAY.md))

A `GraphTarget` over the HTML printer's output in jsdom (`tests/helpers/html-graph-target.ts`), following React's
`node-spec-target.ts` and Swift's `swift-graph-target.ts` (EXP-022 S5: one package for every playable scenario, the
harness limits read off React's `canPlay`, the plan's verdict pinned word for word). The P107 scenarios played; the line
on P18's ledger beside React's (11 of 85) and Swift's (2 of 85), in the ledger's own words, never a bare number. A
mutant in the HTML printer must turn it red. The cost beside React's and Swift's (EXP-022 S5's table).

## Known

- **The drive** (`htx-004/`): `./build.sh`, `node drive.cjs`, `python3 compare.py`, `node sheet.cjs`. One fresh backend
  per arm on :8644 (S6's harness); the HTML arm is the exported folder over `python3 -m http.server`.
- `tests/html-the-backend.test.ts` (22 rows, about 25 s): Record, Noodl and Call desks; the client over every template.
  The four HTML specs: 76 of 76 on 2026-11-04.
- The HTML preflight now lists the shell's carried CSS Definitions apart from the plan's refusals
  (`preflight.carried`); `planRefusals` is only what is really left out.
- Filed in session 7: SELECTREFUSED (high), PROJECTSTAB (medium: todo-list's Projects tab needs `Noodl.Records.save`
  and `create` in the client). Still open from before: CLOUDARM, OPTIONSWIRED, TEXTKEEPS, BOXREMOUNT, PRINTERDECIDES
  (thirty-two copied decisions, four imported; add any new one there).
- Five library files are generated, never edited (`lib/core.js`, `functionRun.js`, `states.js`, `animate.js`,
  `persistStore.js`): regenerate with `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts`
  in `packages/nodegx-export` after a change to their sources.
- Headless Chrome lays out at 500 px when asked for 390 by window size: use CDP device metrics (the drive does) or a
  390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file. File every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`), update the memory `where-nodegx-fits-and-where-it-stops`, and commit your own delta only.
`dev-docs/BOARD.md` carries other sessions' uncommitted edits, so commit it through a temporary index.
