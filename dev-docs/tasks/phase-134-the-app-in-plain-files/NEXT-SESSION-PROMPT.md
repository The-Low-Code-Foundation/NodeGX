# Next session — Phase 134, the app in plain files

**Written 2026-11-03 by session 3 (HTX-002 done).** Read [README.md](README.md) §10 (sessions 1 to 3) first: how React's
constructs map onto `lib/core.js`, what the desks read, and what is not printed yet. Sessions used: 3 of at most 10.

## Before anything

1. **Is R4 ruled?** README §9/§10 session 1 ends with the question (double-click: Chrome and Firefox refuse; keep "any
   static server", or also write a bundled copy). If Richard has not answered, carry on: HTX-003 does not depend on it.
2. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2 paragraph, which now says "HTX-001 ✅ HTX-002 ✅ (3 of 10
   sessions), HTX-003 next"); React and Swift stay paused.
3. **The box.** Export suites are a heavy job: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). macOS has no `timeout`: a command wrapped in it prints nothing.
   `grep` here skips some `.ts` files as binary (`src/analyze/appState.ts`): use `/usr/bin/grep -a`.

## Then: HTX-003 ([task](HTX-003-LISTS-SHOW-HIDE-PAGES-INPUTS.md))

§C of `tests/html-state-and-scripts.test.ts` names the work by cell. Each row that HTX-003 fixes changes to "equal" in
the same commit:

1. **A field's Set and Clear** (`state-set` with `field`): C3 (the Signal Desk's Wipe, cells 3:3 and 8:3) and C4 (the
   Success Desk's Fill, 8:8 and 8:9). The printer throws `Unprinted` at `a.field !== undefined` in `statement`.
2. **Its typing chain and its mount announcement** (`changeHandlers`, `fieldMounts`): C5, the Arrival Desk's echo
   column 8. The loss reads "its text has no state row in the plan, so nothing reads what is typed".
3. **Focus** (`field-focus`): the field-desk spec (`the-field-does-what-it-is-told.test.ts`) has the steps for focus kept
   while typing. todo-list has 5 such chains (3 On Enter, 2 Did Mount).
4. **A For Each over Static Data** (`itemsStaticId`): C6, the Relay Desk. Then a keyed list in `lib/dom.js` (the task's
   Build 1), and the effect-count spec for show and hide (Build 2), which runs in the suite.

## Known

- The spec has 23 rows (about 32 s): §A Hook Desk; §C six desks, every differing cell pinned; §E the Global Store (Store,
  Bad, Header, Other key); §F the Bell (late writes); §B printed text; §D todo-list (≤ 101 unprinted).
- `tests/helpers/export-html-arm.ts` is the HTML arm: the runtime arm's readings (every `<p>`, then the fields, then
  `storage=` per key) and steps (a button's words, `type:`, `enter:`). `storage: { keys, seeds }` as the runtime arm's.
- Five library files are generated, never edited: `lib/core.js`, `lib/functionRun.js`, `lib/states.js`,
  `lib/animate.js`, `lib/persistStore.js`. After a change to `packages/nodegx-core/src`, `functionRunLib.ts`,
  `statesLib.ts`, `animateLib.ts` or `persistStoreLib.ts`, run
  `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts` in `packages/nodegx-export`.
- P134-HTX001-PRINTERDECIDES lists the twelve decisions copied from `component.ts`. Copy the next one the same way (a
  comment naming the React rule) and add it there.
- Three mutants survive, each a finding, not a gap (README §10 sessions 2 and 3): the SIBLINGVALUE delay, the "never
  twice" guard, and `storeKey`'s own change check. Each is redundant on every shape the plan prints today.
- A Function fed by a Subscribe of an untyped key is the plan's refusal (EXP-003), in every export: type the key with an
  Initial State when a desk needs a reader beside its Subscribe.
- Headless Chrome lays out at 500 px when asked for 390: shoot phone width through a 390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file; file every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`); update the memory `where-nodegx-fits-and-where-it-stops`; commit by pathspec.
