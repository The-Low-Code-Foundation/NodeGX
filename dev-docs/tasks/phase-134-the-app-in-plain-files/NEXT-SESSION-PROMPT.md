# Next session — Phase 134, the app in plain files

**Written 2026-11-03 by session 1 (HTX-001, done).** Read [README.md](README.md) §10 first: what the HTML printer is,
what it reads in the plan, and what it does not print yet. Sessions used: 1 of at most 10.

## Before anything

1. **Is R4 ruled?** README §10 ends with the question (double-click: Chrome and Firefox refuse; keep "any static
   server", or also write a bundled copy). If Richard has not answered, carry on: nothing in HTX-002 depends on it.
2. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2 paragraph); React and Swift stay paused. BOARD's P134
   line was not touched in session 1 (a peer had BOARD.md open); say "HTX-001 done" there if it is free.
3. **The box.** Export suites are a heavy job: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). Chrome from Claude's bash needs the sandbox off.

## Then

HTX-002 ([task](HTX-002-STATE-AND-SCRIPTS.md)): the plan's logic on `lib/core.js`. The printer is
`packages/nodegx-export/src/emit/html/printComponent.ts`; its `UNPRINTED` list and the `lose(...)` calls are the work
list, and story-engine's `EXPORT-PREFLIGHT.md` names them by node (the logic component `/Story/Source`, the Variable
`storyCarrying`, the values a part sends out, the Text Input's sync). Start from the Swift printer's S2 (`emit/swift/
view.ts` and `scripts.ts`): it printed the same plan fields, and its `rootStatements`/`expr` are the map. The
Functions' wrapper is the one `emit/swift/scripts.ts` `functionFileJs` writes, already plain JavaScript.

Then todo-list (`templates/todo-list`): export it with `--target html` and read the preflight; it is HTX-002's real
work list, as it was Swift S2's.

## Known

- `tests/html-the-first-page.test.ts` is the gate (8 cases, jsdom, ~5 s). `tests/helpers/html-in-jsdom.ts` runs any
  HTML export's folder in jsdom from its own files; reuse it for the desks.
- `lib/core.js` is generated: after a change to `packages/nodegx-core/src`, run
  `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts` in `packages/nodegx-export`.
- P134-HTX001-PRINTERDECIDES: four decisions the HTML printer takes from `component.ts`. Copy the next one the same
  way (a comment naming the React line) and add it to that bug.
- Headless Chrome lays out at 500 px when asked for 390: shoot phone width through a 390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file; file every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`); update the memory `where-nodegx-fits-and-where-it-stops`.
