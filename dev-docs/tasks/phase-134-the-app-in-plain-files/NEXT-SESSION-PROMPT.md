# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 10 (SELECTREFUSED fixed in the plan: a task opens in both exports).** Read
[README.md](README.md) §9 and §10 (sessions 1 to 10) first. Sessions used: 10; Richard ruled R6 "now, first", so the
phase runs past ten, and §10 says so.

## Before anything

1. **Richard's rulings (README §9):** R6 done (session 10). R7 **ThreadSpace**. HiveClip **yes, on a copy**. R4 (static
   server or also a bundled copy) is still open; nothing depends on it.
2. **The order:** ThreadSpace's menu (HTX-006's last line, short), then HTX-007 (HiveClip).
3. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
4. **The box.** Suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` skips some `.ts` files as binary here: use
   `/usr/bin/grep -a`. Chrome from Claude's bash needs the sandbox off.
5. **The package suite is not all green, and four of its red causes are not this phase's** (filed open, session 10):
   P134-S10-SENDSIGNAL (ISL-006 and marketplace's typecheck), P134-S10-SIGNINERROR (the-sign-in-with §C, 9 rows),
   P134-S10-STUDIOSOCKET (hls006), P134-S10-PARAMFLOOR (parameter-coverage). Anything else red is new: look at it.

## Then: ThreadSpace's menu (R7, HTX-006's last line)

On a **copy** of `dev-docs/parked/threadspace/` (other sessions have many uncommitted edits in it: copy, never edit it in
place). Build its pause or settings menu in NodeGX, export it with `--component` into the copy's `public/`, and change its
width **on Studio's screen** this time (session 9 changed the file). `shasum` over the copy's own files equal before and
after; its drive (`tools/run-all.sh`) green on the copy. `htx-006/drive.cjs` is the pattern.

## Then: HTX-007 ([task](HTX-007-HIVECLIP-OFF-NODEGX.md))

HiveClip's `ui/` exported to plain files on a copy (`~/vscode_projects/hiveclip-plain/`, never the real repo; Richard
said yes), put where `shell/` reads `ui-dist/`, and `npm run check` in the copy's `shell/` passing on it as on the
deploy. Then a stranger agent on a model that is not Claude (Mistral in Vibe, OWN-026's harness) makes one change
Richard names, in the exported files. Start with `nodegx export --target html --dry-run <copy>/ui`: a refusal that
blocks the window is the task.

## Known

- **`--component` (HTX-006)**: `nodegx export --target html --component <name> <project> --out-dir <folder>` writes the
  part, the box entry `<Name>.js`, the one stylesheet `<Name>.css`, the cut `styles/<Name>.floor.css`, and
  `nodegx-export.json`. Spec: `tests/html-one-part.test.ts`. Writer: `src/write/writePart.ts`.
- **A placed component's value, read by a chain (session 10):** the row it lifts into; a chain its own signal runs is
  run one commit late (`LiftedPulseChainPlan`, `plan.liftedPulseChains`; React two effects, HTML two `l.watch`).
  Spec: `tests/a-value-sent-with-its-signal.test.ts` (the Select Desk). A child that does not lift the port refuses the
  read by name; about 37 template wires stand there, each its child's feed, and 63 under "two wires feed its Value
  input" (EXP-011 §90).
- **The HTML printer reads a Screen Resolution** (session 10, SCREENREAD).
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
- Open rows: PROJECTSTAB, CLOUDARM, OPTIONSWIRED, TEXTKEEPS, BOXREMOUNT, PRINTERDECIDES (thirty-five
  copied decisions, four imported; add any new one there).

## At the end

Update README's state line and §10, the cost table (README §10 session 8's, with the final numbers), BOARD's lane 4
line, and this file (closing the phase or saying what is left and whose it is). File every bug in `dev-docs/bugs/` (one
file each, `node scripts/bugs.js`), update the memory `where-nodegx-fits-and-where-it-stops`, and commit your own delta
only. `dev-docs/BOARD.md` carries other sessions' uncommitted edits, so commit it through a temporary index.
