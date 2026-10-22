# s141 — the Header writes the store (EXP-011 §111), and two defects measuring it found

P18 session 141, 2026-10-22, BOARD lane 6. The handoff's item 1: rocket-school's Header feeds one output `app` from three
placed components (two Update settings, a Delete profile), so the export refused the output and, with it, the Header's
`write` on the 8 pages that place it. Settings, rename and delete-player saved nothing in the exported app.

## Measured first

- `census.ts` (`census.out`, HEAD's templates, `git archive`; a peer edits the tree's rocket-school): **21 Component
  Outputs value ports fed by more than one wire, 17 of them only by placed components** (rocket-school and star-class:
  Header, Monster/Play, Race/Play, Moon/Care; bot-garden 5; todo-list and its demo: View's `projectId`, `openTaskId`).
  Each refused as "two wires feed value output … last-writer-wins is not statically ordered".
- The same census: **190 single pass-throughs** (s139's: a placed component's value straight into the component's own
  output) whose placement also sends a pulse into the same Component Outputs.
- The Header's three writers never run from one event: a setting (a Choice row's `changed`), Save on the form, Yes on
  the delete ask. Each changes its `app` only when it runs, so the last to change is the one that ran.

## The desk, predicted first

`tests/helpers/header-desk.ts`: Store and Show (the Store Desk's); **Header** places Mark (`a`), Mark (`b`) and Drop,
each on its own button, all three `app`s into its one output, all three `done`s into `write`; **Solo** places one Mark
(`s`) and passes it through, with the pulse its own run sends. `EXPECTED.md` was written from HEAD's emitted desk
(`work/desk-head`) before either arm ran. **Every cell read as predicted on the runtime and on HEAD's export** (`arms.sh`,
`readings-runtime.json`, `readings-head.json`):

| scenario | runtime | HEAD's export |
|---|---|---|
| fresh: Mark A, Mark B, Header drop, Mark A, Solo, Mark B | a; a,b; b; b,a; b,a,s; b,a,s,b | none ×4 (Header refused); Solo: none / `{}`; none / `{}` |
| `["kept"]` stored: Header drop, Solo | empty; s | kept; **none / `{}`, the stored copy written over** |
| fresh: Solo, Solo | s; s,s | none / `{}`; s (one press late) |

## P18-S141-PASSLATE (high, live on HEAD), fixed

s139's pass-through kept the value in a row of its own and pushed it on with an effect: two commits to the parent's
row. The pulse from the same run is a callback, counted at once and handed on one commit later. So the parent's Set ran
on the row from before: `undefined` over a persisted store on the first press. s139's desk (A6) could not see it, because
there the value was set by an earlier press.

## Built

| what | where |
|---|---|
| Several placed components into one output: each pending as a pass-through (`intoOutputs`); a feed from anything else keeps the refusal | `src/analyze/plan.ts` (the §4d child side) |
| Every pass-through **forwards**: the placement is handed this component's own callback (`instanceLifted` entry `forward`), no row, no push effect; if any writer into an output does not lift, all are refused by name ("another value into output … is not handed on") | `plan.ts` `liftInto` |
| A forward that also writes a row here, or needs a cast, goes through one stable `useCallback` whose dependency is the forwarded prop | `src/emit/component.ts` (`combinedLifted`) |
| **P18-S141-MOUNTEDIN** (below): a wired Mounted is handed in as `mounted` where the target declares it | `component.ts` `instanceAttrs` |

On the desk the fixed export equals the runtime at all 13 cells (`readings-fixed.json`).

## The drive: rename and delete the player in the built app

`build.sh head fixed` (HEAD's rocket-school, each arm built with its own `npm run build` against npm's packages,
s140's `work/deps`), `drive.cjs` (s140's, the Header's steps; Ada and Bob seeded). Runtime arm `render-from-disk` on the
viewer bundle of 07:42. One runtime-side commit came after it, 858900dfc, which only adds `deploy-config.ts` (a deployed
app's backend address), so the bundle was not rebuilt.

**The first drive stopped at H2 on both export arms**: Edit player closed the menu and drew no form. That is
**P18-S141-MOUNTEDIN**: the New player form mounts its root on its own `mounted` input (`m === true`), and the export
spent the Header's wire on the render wrapper alone. Reading the page did not show it; the drive did.

After the fix (`readings.json`):

| step | runtime | export-fixed | export-head |
|---|---|---|---|
| H2 Edit player | the form, name box `Ada` | the same | no form |
| H4 Save (`Ada Lovelace`) | stored `p1.name` changed, nothing else | the same | nothing |
| H7 Yes, delete | profiles [Bob], `activeId` `p2`, on the profiles page | the same | nothing |
| H8 reload | as H7 | as H7 | the seed |

**The stored JSON of export-fixed equals the runtime's at all 9 steps.** HEAD's equals the seed at every step. No
console errors on any arm. Read, not graded:

- The profiles page's path is `/` in the runtime and `/profiles` in the export (an older routing difference).
- While the menu or form is open the export draws none of the choices: languages, keyboards, sound, answers, skins,
  classes. A Static Data or a Function into a placed Choice row is refused ("not consumed by a rendered repeater";
  §101). **A setting still cannot be changed in the export**; that is the next blocker for "settings save".

## P18-S141-MOUNTEDIN (high), fixed

`mountedin.ts` (`mountedin.out`): 24 components in rocket-school and star-class read their own `mounted`; 77
placements, 42 wired. With `m !== false` (Choice row, Editor) an unset input draws, so they worked by accident. With
`m === true` (New player form, Hangar/Confirm) the component was never drawn: no edit-player form, no new-player form
on the Profiles page, and no "are you sure?" before a purchase in the Hangar or on the Moon. Graded on s126's Root Desk
plus Ask and Unless (`addAskAndUnless`, `ask.ts`), predicted in `EXPECTED.md`, read exactly: HEAD drew no ask after Open; fixed
equals the runtime at every step.

## Graded

- `tests/a-header-writes-the-store.test.ts`: **18 / 18** (§A the desk on both arms, §B emitted text, §C plan, §D
  typecheck, §E rocket-school, §F MOUNTEDIN).
- `mutants.py` (`mutants.out`, run on the final code): **4 / 4 killed**. M3 is the one to know: hand the forward as a
  fresh arrow each render and every writer re-pushes its last value on every render, Drop's `undefined` last, and the
  store reads `none` / `{}` from the first press (`work/mutant-logs/M3.log`).
- Moved, with the reason written in each: `a-persisted-store-travels.test.ts` B4 (the Editor forwards; no row, no push),
  E4 (the Header's write is no longer refused), E7 (View's callback writes its own forwarded output first).
- Reach (`wires.ts`, `wires.json`, HEAD's `src` against the tree, HEAD's templates): **50 wires gained, 0 lost**. The
  26 listed as lost are wires into six Component Outputs nodes that were refused under HEAD and still are (bot-garden's
  writers do not lift; todo-list View's `openTaskId`): they are now named one by one with the real reason (`nodes-ab.ts`
  shows each node's disposition under both). todo-list View's `projectId` now lifts; its one reader on the Todo page is
  still refused (§101), so nothing new runs there.
- `tplbuild`: 16 HEAD templates 0 errors; nightbook (untracked, from the tree) 1 (STYLENULL, the floor).
- Whole package (`nice -n 19 --runInBand`, JSON 14:00): **157 suites, 5,306 passed, 0 failed, 3 skipped**, as predicted
  (s140's 5,288 + 18). The first run (13:40, before MOUNTEDIN) read 5,301 / 1 failed: hls006 found a socket in
  `packages/.s141-base`, my HEAD copy of the export for the reach, not product code; deleted, and hls006 is clean.

## What it leaves

- 🔴 **The forward needs the parent's callback to be stable.** Every emitted parent passes a setter or a `useCallback`.
  Someone hand-editing an exported page to `onAppChanged={(v) => setApp(v)}` makes the Header wipe the store (M3). The
  same was already true of s139's merged rows. A ref-held relay in the forwarding component would remove the hazard.
- Writers that change in **one** event: last-writer is the export's effect order (placement order), the runtime's its
  own. Not measured across the 17 ports. Read: the Header's and Moon/Care's writers run on separate presses. Race/Play's
  and Monster/Play's Round and Finish run in one chain (Finish is run after Round's last answer, so its value comes a
  commit later in the export too), not graded. The Store Desk's Bad (two Functions on one press) stays refused.
- The settings: Choice rows draw no choices (Static Data and a Function's list into a placed component's `items`).
