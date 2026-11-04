# Next session — Phase 134, the app in plain files

**Written 2026-11-04 by session 5 (HTX-003 finished).** Read [README.md](README.md) §10 (sessions 1 to 5) first: how
React's constructs map onto `lib/core.js`, what the desks read, and what is not printed yet. Sessions used: 5 of at most 10.

## Before anything

1. **Is R4 ruled?** README §9/§10 session 1 ends with the question (double-click: Chrome and Firefox refuse; keep "any
   static server", or also write a bundled copy). If Richard has not answered, carry on: nothing here depends on it.
2. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2); React and Swift stay paused.
3. **The box.** Export suites are a heavy job: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` here skips some `.ts` files as binary: `/usr/bin/grep -a`.

## Then: HTX-004 ([task](HTX-004-THE-BACKEND-THROUGH-THE-ONE-CLIENT.md))

todo-list on a real backend, through the React export's own client type-stripped (Swift S3's route,
`emit/swift/client.ts`). Its Done-when now carries HTX-003's Chrome drive too: sign in, add, tick, delete, **open a
task's page and come back**, reload, three arms (runtime, React, HTML) on one fresh backend each.

1. **Measure first:** which of todo-list's 87 HTML losses are the backend's (`a record write (HTX-004)`, `cloud-call`,
   `api-call`, `awaits (HTX-004)`, `reads Noodl`, `a backend query (HTX-004)`), across all templates too (the census
   is a 30-line script over `emitHtmlApp(...).preflight.htmlLosses`; session 5's lists the top kinds in README §10).
2. The runtime arm already answers the runtime's `XMLHttpRequest` from `fake-parse-backend.js` (`backend:` option, P18
   s134); the HTML arm has no backend yet. Start there, as session 5 started with the arm.

## Known

- `tests/html-lists-fields-pages.test.ts` (20 rows, about 18 s): §A Field Desk ×4, §B Root Desk ×3, §C `lib/dom.js`
  alone, §D the caret, §E Back, §F the Checkbox Desk (F1 pins two cells every export holds, F3 the plan's three
  refusals in its words). Reuse `COUNTED_CORE` for any leak test.
- Runtime arm steps: a button's words, `type:`/`enter:` for a field, `tick:<name>` for a box (its label's text, `#1`
  unlabelled); readings `fields` and `boxes`. The HTML arm takes the same.
- A checkbox draws `<label class="…Label"><input type="checkbox" class="…">text</label>`; the box keeps the node's
  local, its label is `<local>Label` (`outerOf`, what a `when` removes).
- The plan carries a run-on-arrival Function's signal pulses only when its body keeps something (`this.`); a pure one's
  are refused by name. Not a bug; write desks the templates' way.
- Options: all 39 in the templates have wired items; the plan leaves them out of every export (P134-HTX003-OPTIONSWIRED).
  Do not print Options until the plan carries wired items.
- Still undrawn by the HTML printer: 38 custom nodes, 21 images, 18 icons, 15 Columns. Image and Icon copy React's
  `renderIcon` and `MEDIA_ATTRS`; the runtime arm mounts neither yet (teach the arm first, as session 5 did).
- P134-HTX001-PRINTERDECIDES lists twenty-four copied decisions. Copy the next one the same way and add it there.
- Five library files are generated, never edited (`lib/core.js`, `functionRun.js`, `states.js`, `animate.js`,
  `persistStore.js`): regenerate with `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts`
  in `packages/nodegx-export` after a change to their sources.
- Headless Chrome lays out at 500 px when asked for 390: shoot phone width through a 390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file; file every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`); update the memory `where-nodegx-fits-and-where-it-stops`; commit your own delta only.
`dev-docs/BOARD.md` carries other sessions' uncommitted edits: commit it through a temporary index.
