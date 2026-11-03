# Next session — Phase 134, the app in plain files

**Written 2026-11-03 by session 2 (HTX-002, nearly done).** Read [README.md](README.md) §10 (sessions 1 and 2) first:
how React's constructs map onto `lib/core.js`, what the seven desks read, and what is not printed yet. Sessions used:
2 of at most 10.

## Before anything

1. **Is R4 ruled?** README §9/§10 session 1 ends with the question (double-click: Chrome and Firefox refuse; keep "any
   static server", or also write a bundled copy). If Richard has not answered, carry on: nothing in HTX-002 or HTX-003
   depends on it.
2. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2 paragraph); React and Swift stay paused. BOARD's P134
   line was not touched in sessions 1 or 2 (peers had BOARD.md open); say "HTX-001 done, HTX-002 nearly" there if free.
3. **The box.** Export suites are a heavy job: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). macOS has no `timeout`: a command wrapped in it prints nothing.

## Then

1. **Finish HTX-002: the Global Store.** `store-key-get` (a read), `globalstore-set` (a Set Global Store), and the Store
   Desk (`tests/helpers/store-desk.ts`, graded by `a-header-writes-the-store.test.ts` and
   `a-persisted-store-travels.test.ts`) as §C's seventh row. React's store is `src/stores/<name>.ts` over `store()` from
   `@nodegx/core`, which `lib/core.js` already carries; Swift S7 printed it (`emit/swift/view.ts`, `storeMember`). Then
   a Function's late writes (`def.late`, `FunctionNode.late`; todo-list's minute clock), as Swift S2 printed them.
2. **HTX-003** ([task](HTX-003-LISTS-SHOW-HIDE-PAGES-INPUTS.md)): §C already names its work by cell: a field's Set and
   Clear (`state-set` with `field`), its typing chain and its mount announcement (`changeHandlers`, `fieldMounts`; the
   Arrival Desk's echo), focus (`field-focus`), and a For Each over Static Data (`itemsStaticId`; the Relay Desk). The
   field-desk spec (`the-field-does-what-it-is-told.test.ts`) has the steps for focus kept while typing.

## Known

- The specs: `tests/html-the-first-page.test.ts` (8, HTX-001) and `tests/html-state-and-scripts.test.ts` (18, about
  18 s; §A Hook Desk, §B printed text, §C six desks with every differing cell pinned, §D todo-list). A §C row that names
  a cell HTX-003 then fixes must be changed to "equal" in the same commit.
- `tests/helpers/export-html-arm.ts` is the HTML arm: the runtime arm's readings (every `<p>`, then the fields) and
  steps (a button's words, `type:`, `enter:`).
- Four library files are generated, never edited: `lib/core.js`, `lib/functionRun.js`, `lib/states.js`,
  `lib/animate.js`. After a change to `packages/nodegx-core/src`, `functionRunLib.ts`, `statesLib.ts` or
  `animateLib.ts`, run `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts` in
  `packages/nodegx-export`. Strip mode keeps a type named in a plain import (`Run`); the generator drops it by name.
- P134-HTX001-PRINTERDECIDES lists the eleven decisions copied from `component.ts`. Copy the next one the same way (a
  comment naming the React rule) and add it there.
- Two mutants survive on the Hook Desk, and that is a finding, not a gap (README §10 session 2): the SIBLINGVALUE delay
  and the "never twice" guard are redundant in the plain page today. A desk that mounts a placement twice would make the
  guard matter; none does yet.
- Headless Chrome lays out at 500 px when asked for 390: shoot phone width through a 390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file; file every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`); update the memory `where-nodegx-fits-and-where-it-stops`.
