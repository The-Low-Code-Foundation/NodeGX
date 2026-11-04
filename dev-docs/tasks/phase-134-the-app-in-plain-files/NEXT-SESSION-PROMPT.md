# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 9 (HTX-006 done: a NodeGX menu inside a three.js page).** Read [README.md](README.md) §10
(sessions 1 to 9) first. Sessions used: 9 of at most 10, with one task left (HTX-007), one session.

## Before anything

1. **Three rulings wait on Richard (README §9).** R6: neither export can open a task (P134-HTX004-SELECTREFUSED, the
   plan's); recommended after HTX-007, as shared plan work counted apart. R7 (new): HTX-006's last line, the same menu
   bridge on a copy of one of his games; recommended ThreadSpace's. R4: static server or also a bundled copy; nothing
   depends on it. If he has ruled R6 "fix it now", the place is `plan.ts` around 16716 (Set Variable) and 16530 (Global
   Store Set) and the lifted outputs (`pendingLifted`, about 4574), then the whole package suite, graded with
   `htx-004/drive.cjs` (D2 to D2back). If he has said yes to R7, that is a short drive: `htx-006/drive.cjs` is the
   pattern, and the width changed on Studio's screen this time, not by a file write.
2. **HTX-007 needs his OK to use a copy of HiveClip** (closed source; the copy stays on this machine). Without it, stop
   and ask, in plain words, on one screen.
3. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
4. **The box.** Suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` skips some `.ts` files as binary here: use
   `/usr/bin/grep -a`. Chrome from Claude's bash needs the sandbox off.

## Then: HTX-007 ([task](HTX-007-HIVECLIP-OFF-NODEGX.md))

HiveClip's `ui/` exported to plain files on a copy (`~/vscode_projects/hiveclip-plain/`, never the real repo), put where
`shell/` reads `ui-dist/`, and `npm run check` in the copy's `shell/` passing on it as on the deploy. Then a stranger
agent on a model that is not Claude (Mistral in Vibe, OWN-026's harness) makes one change Richard names, in the exported
files. Start with `nodegx export --target html --dry-run <copy>/ui`: a refusal that blocks the window is the task.

## Known

- **`--component` (HTX-006)**: `nodegx export --target html --component <name> <project> --out-dir <folder>` writes the
  part, the box entry `<Name>.js`, the one stylesheet `<Name>.css`, the cut `styles/<Name>.floor.css`, and
  `nodegx-export.json`. Spec: `tests/html-one-part.test.ts`. Writer: `src/write/writePart.ts`.
- **Every printed component's `outputs` is filled now**: a `value` per value output and a `signal` per signal output, by
  the port's name. A NodeGX parent's callbacks are called first, as before.
- **The ledger** (`tests/node-spec-graph-html.test.ts`): 5 played, each React's trace; the 13 React plays and HTML does
  not are the printer's (a Log step, the streaming stores, On App Error with the parsers; README §10 session 8). Its
  pins read 86 scenarios; a new scenario turns all three ledgers red together.
- **The harness runs `flushSync` after each press and set** (`lib/core.js` exports it). Keep it if the target is copied.
- **The drives**: `htx-004/` (`./build.sh`, `node drive.cjs`, `python3 compare.py`, `node sheet.cjs`); `htx-006/`
  (`node drive.cjs`, `python3 compare.py`, about 25 s).
- Five library files are generated, never edited (`lib/core.js`, `functionRun.js`, `states.js`, `animate.js`,
  `persistStore.js`): regenerate with `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts`
  in `packages/nodegx-export` after a change to their sources.
- `bin/` runs `dist/`, which is stale: run the CLI from source with
  `npx ts-node --transpile-only -O '{"module":"commonjs"}' src/cli/main.ts export …` in `packages/nodegx-export`.
- Headless Chrome lays out at 500 px when asked for 390 by window size: use CDP device metrics or a 390 px iframe.
- Open rows: SELECTREFUSED, PROJECTSTAB, CLOUDARM, OPTIONSWIRED, TEXTKEEPS, BOXREMOUNT, PRINTERDECIDES (thirty-five
  copied decisions, four imported; add any new one there).

## At the end (the phase's last session)

Update README's state line and §10, the cost table (README §10 session 8's, with the final numbers), BOARD's lane 4
line, and this file (closing the phase or saying what is left and whose it is). File every bug in `dev-docs/bugs/` (one
file each, `node scripts/bugs.js`), update the memory `where-nodegx-fits-and-where-it-stops`, and commit your own delta
only. `dev-docs/BOARD.md` carries other sessions' uncommitted edits, so commit it through a temporary index.
