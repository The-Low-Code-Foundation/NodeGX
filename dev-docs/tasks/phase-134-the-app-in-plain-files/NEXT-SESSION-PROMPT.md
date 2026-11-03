# Next session — Phase 134, the app in plain files

**Written 2026-11-03 by session 4 (HTX-003, first half).** Read [README.md](README.md) §10 (sessions 1 to 4) first: how
React's constructs map onto `lib/core.js`, what the desks read, and what is not printed yet. Sessions used: 4 of at most 10.

## Before anything

1. **Is R4 ruled?** README §9/§10 session 1 ends with the question (double-click: Chrome and Firefox refuse; keep "any
   static server", or also write a bundled copy). If Richard has not answered, carry on: nothing here depends on it.
2. **BOARD.** Lane 4 is reopened for this phase only (BOARD §2: "HTX-003 half (4 of 10 sessions)"); React and Swift stay
   paused.
3. **The box.** Export suites are a heavy job: one at a time, `nice -n 19 … --runInBand`, busy-check by
   `ps -A -o pid,comm` (never `pgrep -f` in a wait loop). `grep` here skips some `.ts` files as binary: `/usr/bin/grep -a`.

## Then: HTX-003's second session ([task](HTX-003-LISTS-SHOW-HIDE-PAGES-INPUTS.md))

Measured at the end of session 4 across all templates (1,548 HTML losses): 38 custom nodes, **24 checkboxes** (planning
11, planning-demo 11, gram, nightbook), 21 images, 18 icons, 15 Columns, and Options (`select`) where it appears.

1. **The arm first.** `tests/helpers/runtime-mounted-arm.js` mounts the viewer's Group, Text, Button and Text Input only.
   Teach it the Checkbox (and the Options) from the viewer's own components, as it mounts the Text Input, and a step
   that ticks one (`tick:<label>`) in both arms (`tests/helpers/export-html-arm.ts` takes the same step).
2. **Then the printer**, copied from React (`component.ts` `renderNode`'s `role === 'checkbox'` and `renderSelect`,
   `changeAttrs` with `control-event`, `CONTROL_STATE_PARAM`): a checkbox is `<input type="checkbox">`, its row's
   `checked` written by an effect, a `change` listener writing the row then the chain (reading `el.checked`); with
   Use Label, the `<label>` wrapper `computeRoleCss` describes. Grade a small desk against the runtime, mutant included.
3. **Image and Icon** after, if the session has room: React's `renderIcon` and `MEDIA_ATTRS`.
4. **The Chrome drive** of the task's Done-when (add, tick, delete, open, back) waits on todo-list's backend: its lists
   are records (HTX-004). Say so in the task when HTX-003 closes, and do it in HTX-004's drive.

## Known

- `tests/html-lists-fields-pages.test.ts` (16 rows, about 15 s): §A the Field Desk ×4, §B the Root Desk ×3, §C
  `lib/dom.js` alone (keyed list; effect count after 100 toggles, through `COUNTED_CORE`, a `lib/core.js` that counts its
  `effect`s), §D the caret, §E Back on story-engine. Reuse `COUNTED_CORE` for any leak test.
- `tests/html-state-and-scripts.test.ts` §C: all six desks equal but the Arrival Desk's echo, which is **the plan's**
  refusal in every export (React's C3), pinned with its reason from `preflight.planRefusals`.
- todo-list's five For Eaches fed by a Function's output draw in no export (EXP-003); the loss says so. Not HTX-003's.
- A field's ref is `<label>FieldRef`; its element keeps its own local. A gated Did Mount prints at the end of its
  `when(…)` build. `list(l, parent, read, keyOf, mountRow, before)`: `keyOf` null keeps rows by place.
- P134-HTX001-PRINTERDECIDES now lists twenty copied decisions. Copy the next one the same way and add it there.
- `runOnChange-startValue` is reported as an unmapped parameter by the HTML preflight and by React's report alike.
- Five library files are generated, never edited (`lib/core.js`, `functionRun.js`, `states.js`, `animate.js`,
  `persistStore.js`): regenerate with `npx ts-node --transpile-only -O '{"module":"commonjs"}' tests/helpers/html-core-js.ts`
  in `packages/nodegx-export` after a change to their sources.
- Headless Chrome lays out at 500 px when asked for 390: shoot phone width through a 390 px iframe (htx-001/README).

## At the end

Update README's state line and §10, and this file; file every bug in `dev-docs/bugs/` (one file each,
`node scripts/bugs.js`); update the memory `where-nodegx-fits-and-where-it-stops`; commit your own delta only.
`dev-docs/BOARD.md` carries other sessions' uncommitted edits: commit it through a temporary index.
