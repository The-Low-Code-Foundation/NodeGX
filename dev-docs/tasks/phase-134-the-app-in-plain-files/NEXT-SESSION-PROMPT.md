# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 11 (the HTML export's reach measured; the printer's own gaps 346 → 166).** Read
[README.md](README.md) §9 and §10 (sessions 1 to 11) first. Sessions used: 11 (past ten by R6, and by Richard's ask of
session 11: "if nobody can export any kind of complex app or game, we're in trouble").

## Before anything

1. **Measure where it stands:** `cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only -O
   '{"module":"commonjs"}' ../../dev-docs/tasks/phase-134-the-app-in-plain-files/census/own.ts` (the printer's own gaps per
   app, beside the shared and the plan's). `census-after-s11` is in `census/own-after-s11.txt`. `hive.ts` breaks down
   HiveClip; `kinds.ts` every loss kind.
2. **Rulings:** R4 still open, nothing depends on it. R7 ThreadSpace, HiveClip on a copy: both stand, and wait behind
   the order below.
3. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
4. **The box.** Suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` skips some `.ts` files as binary here: use
   `/usr/bin/grep -a`. Chrome from Claude's bash needs the sandbox off. The shell is zsh: a list in `$F` does not split.
5. **Four reds in the package suite are not this phase's** (filed open, session 10): P134-S10-SENDSIGNAL,
   P134-S10-SIGNINERROR, P134-S10-STUDIOSOCKET, P134-S10-PARAMFLOOR. Anything else red is new: look at it.

## The order (Richard, session 11: "let's do that and see how far it gets us")

1. **The rest of the printer's own gaps** (README §10 session 11, "Left"): custom kit nodes (38), a Condition that tests
   again on every change (31), Functions with script files (30), External Link, Drag (HiveClip's cover), the value kinds,
   the video's play and pause. The pattern for each: copy the React printer's way, grade on a desk against React's arm
   (or the runtime's rule), one mutant. `tests/helpers/skeleton.js` reads a page the same way in both arms.
2. **The plan's HTTP URL on a wire** (shared with React): HiveClip's 13, how its window reaches the engine. It blocks
   HTX-007 in both exports; it is plan work, counted apart as R6's was.
3. **HTX-007** (below), then ThreadSpace's menu (R7).

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
