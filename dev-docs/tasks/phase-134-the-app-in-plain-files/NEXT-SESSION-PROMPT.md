# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 8 (HTX-005 done: the ledger line, graded the same way).** Read [README.md](README.md) §10
(sessions 1 to 8) first. Sessions used: 8 of at most 10, with two tasks left (HTX-006, HTX-007), one each.

## Before anything

1. **R6 (README §9)** is still unanswered: neither export can open a task (P134-HTX004-SELECTREFUSED, high, the plan's;
   180 wires across the templates). Recommended: after HTX-006 and HTX-007, as shared plan work counted apart. If
   Richard has ruled "fix it now", do that first: `plan.ts` around 16716 (Set Variable) and 16530 (Global Store Set), the
   lifted outputs (`pendingLifted`, around 4574), then the whole package suite, because `plan.ts` is the React lane's.
   Grade it with `htx-004/drive.cjs` (D2 to D2back). If he has not answered, carry on with HTX-006.
2. **R4** is still waiting on Richard (static server, or also a bundled copy). Nothing depends on it.
3. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
4. **The box.** Suites and drives are heavy jobs: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` skips some `.ts` files as binary here: use
   `/usr/bin/grep -a`. Chrome from Claude's bash needs the sandbox off.

## Then: HTX-006 ([task](HTX-006-ONE-PART-INSIDE-ANOTHER-PAGE.md))

`nodegx export --target html --component <name> --out-dir <folder>`: one component, what it places, its CSS and the
`lib/` files it imports, no `index.html`, no router. A manifest (`nodegx-export.json`, every written file with its hash):
a re-export replaces and removes only its own files, and refuses by name, writing nothing, if one was changed by hand.
A small three.js page in `htx-006/` mounts a NodeGX settings menu (a volume slider, a Resume button the game listens to);
widen the menu in Studio, re-export, and `shasum` over the page's own files is equal before and after.

What is already there for it: every printed component is `mount<Name>(element, inputs, before)` returning
`update(next)`, `outputs` and `destroy()` (`src/emit/html/printComponent.ts`, the mount at about line 1883). Its lifted
outputs are callbacks in `inputs` today (`onXChanged`), and `outputs` is an empty object, so the task's
`menu.outputs.resume.subscribe(…)` is new: decide it by reading what `lib/core.js` gives (`value`, `signal`) and say the
decision. `tests/helpers/html-graph-target.ts` mounts a lone component in jsdom from an entry file it adds beside the
export (`graph-entry.js`): the same move a host page makes.

## Known

- **The ledger** (`tests/node-spec-graph-html.test.ts`, 10 rows, about 3 s of play, in the package suite): 5 played,
  each React's trace. The 13 React plays and HTML does not are the printer's: a Log step (1), the streaming stores (8),
  On App Error with the parsers (4); the carry for each is in README §10 session 8. Not scheduled: slack, or Richard's call.
- **The harness runs `flushSync` after each press and set** (`lib/core.js` exports it): without it two presses before a
  settle ran as one turn, which no browser does. Keep it if the target is copied.
- The pins of all three ledgers read 86 scenarios (P134-HTX005-LEDGERPIN); a new scenario turns all three red together.
- **The drive** (`htx-004/`): `./build.sh`, `node drive.cjs`, `python3 compare.py`, `node sheet.cjs`.
- Five library files are generated, never edited (`lib/core.js`, `functionRun.js`, `states.js`, `animate.js`,
  `persistStore.js`): regenerate with `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts`
  in `packages/nodegx-export` after a change to their sources.
- Headless Chrome lays out at 500 px when asked for 390 by window size: use CDP device metrics or a 390 px iframe.
- Open rows: SELECTREFUSED, PROJECTSTAB, CLOUDARM, OPTIONSWIRED, TEXTKEEPS, BOXREMOUNT, PRINTERDECIDES (thirty-two
  copied decisions, four imported; add any new one there).

## At the end

Update README's state line and §10, and this file. File every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`), update the memory `where-nodegx-fits-and-where-it-stops`, and commit your own delta only.
`dev-docs/BOARD.md` carries other sessions' uncommitted edits, so commit it through a temporary index.
