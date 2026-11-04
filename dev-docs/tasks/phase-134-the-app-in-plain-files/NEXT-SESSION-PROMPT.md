# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 13 (the printer's own gaps 54 → 38, all 38 kit nodes waiting on R8).** Read
[README.md](README.md) §9 and §10 (sessions 1 to 13) first. Sessions used: 13 (past ten by R6, and by Richard's asks of
sessions 11 to 13: "let's keep pushing and see how many gaps we can close").

## Before anything

1. **Measure where it stands:** `cd packages/nodegx-export && nice -n 19 npx ts-node --transpile-only -O
   '{"module":"commonjs"}' ../../dev-docs/tasks/phase-134-the-app-in-plain-files/census/own.ts` (the printer's own gaps per
   app, beside the shared and the plan's). After session 13: `census/own-after-s13.txt` (38, every one a kit node; 12's and
   11's beside it). `hive.ts` breaks down HiveClip; `kinds.ts` every loss kind.
2. **Rulings:** **R8 asked in session 12** (README §9), and now the only thing between the HTML printer and zero of its
   own: the 38 kit nodes are React components by their authors; leave them out, named (recommended), or carry React for
   them. Until he answers they stay named losses. If he picks "carry React", that is the next build (the React export's
   kit bridge, a box per kit node). R4 still open,
   nothing depends on it. R7 ThreadSpace, HiveClip on a copy: both stand, and wait behind the order below.
3. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
4. **The box.** Suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` skips some `.ts` files as binary here: use
   `/usr/bin/grep -a`. Chrome from Claude's bash needs the sandbox off. The shell is zsh: a list in `$F` does not split.
5. **Four reds in the package suite are not this phase's** (filed open, session 10): P134-S10-SENDSIGNAL,
   P134-S10-SIGNINERROR, P134-S10-STUDIOSOCKET, P134-S10-PARAMFLOOR. Anything else red is new: look at it. Session 13's
   suite: 172 of 181 suites green, the 5 red ones those rows exactly (4 more went red only because the laptop slept
   mid-run, and passed alone, 86 of 86).

## The order (Richard, sessions 11 to 13: "keep pushing and see how many gaps we can close")

1. **The printer's own is done but R8** (README §10 session 13). Two owed, both small: **a backend desk for a Record's
   Fetch and its columns** (session 12's; members-area's shape; copy HTX-004's Record Desk and `htmlBackendArm`), and
   **R9** (README §9, asked in session 13): P134-S13-CLICKBUBBLES, a wired Click inside a wired Click runs both in both
   exports where the app stops at the first (reach 45, planning's block sheet the most of it). Recommended: fix it in
   the plan and both printers now, counted apart, as R6 was; an HTML-only fix would make the desks read a difference
   from React.
2. **The plan's HTTP URL on a wire** (shared with React): HiveClip's 13, how its window reaches the engine. It blocks
   HTX-007 in both exports; it is plan work, counted apart as R6's was.
3. **HTX-007** (below), then ThreadSpace's menu (R7). HTX-007's drive is also the first time the Drag runs on a real
   layout (session 13 graded it in jsdom with the sizes React's own §B gives).

## Then: HTX-007 ([task](HTX-007-HIVECLIP-OFF-NODEGX.md))

HiveClip's `ui/` exported to plain files on a copy (`~/vscode_projects/hiveclip-plain/`, never the real repo; Richard
said yes), put where `shell/` reads `ui-dist/`, and `npm run check` in the copy's `shell/` passing on it as on the
deploy. Then a stranger agent on a model that is not Claude (Mistral in Vibe, OWN-026's harness) makes one change
Richard names, in the exported files. Start with `nodegx export --target html --dry-run <copy>/ui`: a refusal that
blocks the window is the task.

## Known

- **Session 13's carriers**: a Drag is `dragNode(l, el, source, options, listeners)` (`lib/drag.js`, React's `drag.ts`
  with `useDrag` cut off; the handle and its `div` made above the drawing by `dragHandle` in `printComponent.ts`, the
  drawing inserts the element); a Repeat is `repeatNode(l, source, options, listeners)` (`lib/repeat.js`, `printRepeats`,
  after the States machines). Both libs are generated (`htmlDragJs`, `htmlRepeatJs` in `tests/helpers/html-core-js.ts`)
  and need `lib/errors.js`, which a Drag- or Repeat-only app gets alone (not the whole client). The arms take
  `mouse:<down|move|up>:<x>:<y>` and `wait:<ms>` steps and a `dragLayout` (`tests/helpers/drag-steps.js`, shared). A Close
  Popup is `given.onClose`; a Fetch into an unkept query prints a comment, no step. Spec: `html-a-drag.test.ts` (16).
- **Session 12's carriers**: a re-tested Condition is an `l.watch` over its test's reads (`conditionDeps`, React's
  `effectDeps`), never the answer; script files are `lib/projectScripts.js` (React's loader, types stripped at export
  time), `lib/projectScriptFiles.js` and `project-scripts/<path>.js` (`src/emit/html/projectScripts.ts`); an Animate To
  Value is `createAnimatedValue` + `keep` + an `l.watch` (`lib/animate.js`, written whenever a part imports it);
  `lib/util.js` is the 8th generated lib. Specs: `html-a-condition-tests-again`, `html-script-files`,
  `html-the-small-kinds`.
- **The arms and time**: the React arm reads before an animation frame runs; the HTML arm waits for two readings to
  agree, so frames run. Grade a tween at Duration 0 and only where neither arm is mid-tween (§A of the small-kinds spec).
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
- Open rows: PROJECTSTAB, CLOUDARM, OPTIONSWIRED, TEXTKEEPS, BOXREMOUNT, HIDDENRUNS (new, s12), PRINTERDECIDES (thirty-five
  copied decisions, four imported; add any new one there).

## At the end

Update README's state line and §10, the cost table (README §10 session 8's, with the final numbers), BOARD's lane 4
line, and this file (closing the phase or saying what is left and whose it is). File every bug in `dev-docs/bugs/` (one
file each, `node scripts/bugs.js`), update the memory `where-nodegx-fits-and-where-it-stops`, and commit your own delta
only. `dev-docs/BOARD.md` carries other sessions' uncommitted edits, so commit it through a temporary index.
