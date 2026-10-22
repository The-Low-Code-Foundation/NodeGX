# s139 — a persisted store travels, and the write idiom over it (EXP-011 §109)

P18 session 139, 2026-10-22, BOARD lane 6. The handoff's item 1: EXP-021 AC4 (rocket-school's list editing), blocked by
`/Logic/App store`, a persisted Global Store the export refused whole.

## Measured first

- The runtime, read (`noodl-runtime/src/nodes/std-library/agent/globalstore.ts`): `configureStore` applies the stored copy
  (`noodl_store_<Storage Key or Store Name>`) over the initial state in one commit when Persist first turns on; every commit
  is saved on the next turn (`schedulePersist`, a coalesced `setTimeout(0)`), the whole state as JSON; a stored value that
  is not a plain object is a `load` error and ignored. The Set fires Done after its write, in the same scheduled frame.
- `reports.cts` (s137's), "browser-storage rehydration": **51** lines in 3 templates (bot-garden 33, rocket-school 9,
  star-class 9). The same refusal under another sentence, "is not lifted by /Logic/App store": **106** more (rocket-school
  40, star-class 40, bot-garden 26). App store feeds every page of rocket-school and star-class.
- Opening it (a scratch un-defer, then reading the emitted Lists page) found the rest of the idiom, each an AC4 blocker
  or a hazard behind it:
  1. App store's `app` output is a Subscribe of an untyped key: refused as "no statically-typed value" in a lift.
  2. App store's `app` input on the Lists page has three feeds (Save's, Delete's, the Header's): the parent bound it to
     the last one placed, **Delete's**, and Save's row was set and never read. Live on HEAD; harmless there only because
     the Set was refused.
  3. The Header's `write` pulsed the store while its `app` was refused (two wires feed the Header's own output): the
     export would have written what the input last held (`undefined` on a fresh mount) over the persisted app object.
  4. The Editor's `items` is its Parse question set's value passed straight to its own output: refused, so Save ran
     without the items.

## Built

| what | where |
|---|---|
| An authored Persist no longer defers the store: `StorePlan.persist = { storageKey }` (Storage Key, else the store's name). A wired Persist or Storage Key, and declarers that disagree, are refused by name | `src/analyze/appState.ts` |
| `src/lib/persistStore.ts`: load over the initial state at import, save each change on the next turn, `load`/`persist` errors as the runtime reports them with no listener; the store module calls `persistStore(<store>, '<key>')` | `src/emit/persistStoreLib.ts`, `src/emit/state.ts`, `src/emit/emitApp.ts` |
| A Subscribe's untyped key lifts through a Component Outputs port (§10's binding rule: a pass-through, the parent's sink decides; the push casts to the port's type) | `src/analyze/plan.ts` (the §4d child-side lift) |
| **P18-S139-MULTIFEED**: several placed components' values into one input are one row they all write (last-writer-wins, by when each changed); a source that also feeds another sink keeps its own row and writes both through one stable `useCallback` | `plan.ts` (`liftInto`), `src/emit/component.ts` (`combinedLifted`) |
| A placed component's value straight into a component's own output is passed on (`intoOutputs`, decided in `liftInto`); the lift pass runs children-first by placement (`placementRank`), so a parent sees its child's pass-through | `plan.ts` |
| **P18-S139-STALEPULSE**: a pulse from a placed component into another whose value it also hands that one, where the lift pass dropped the value and the target reads it, is refused by name in the next plan (`PlanExclusions.pulses`, the DEADROW rounds) | `plan.ts` |
| **P18-S139-HOOKNAME**: a logic component whose hook name is an imported hook's (`Store` → `useStore`) is `use<Name>Logic` | `plan.ts` (`IMPORTED_HOOK_NAMES`) |
| **P18-S139-MACHINELOCAL**: a States machine's local is reserved before the store-key locals (bot-garden's `renderer`, TS2451 ×4) | `component.ts` |
| Both arms: opt-in `storage: { keys, seeds }` (seeded before load, read after every step); the runtime arm loads the Global Store, Subscribe and Set and resets the store manager between scenarios | `tests/helpers/export-react-arm.js`, `runtime-mounted-arm.js` |

## Graded

- **Predicted first** (`EXPECTED.md`). The Store Desk (`tests/helpers/store-desk.ts`): rocket-school's idiom, smallest.
  Both scenarios read exactly as predicted on both arms (nothing stored; a stored copy). The Bad variant: the export read
  as predicted. The runtime did not: I predicted `bad`, it read `badA`. Bad's two Functions both feed one output, and the
  first one's value landed after the second one's `done`. That is the ordering the export refuses to guess. Recorded in
  A7, not adjusted.
- `tests/a-persisted-store-travels.test.ts` **28 / 28**. A9 is the hazard itself: a pulse over a stored copy before
  anything wrote the input. Unrefused (mutant M7), the stored copy becomes `{}`. C6: a sender whose output nothing feeds
  is `undefined` in the runtime too, so its pulse is not refused (the whole package found this; see below). E7: todo-list's
  five project lists, each `projectId` writing three shared rows through one `useCallback`.
- Mutants (`mutants.py`, `mutants.out`, run on the final code): **13, all killed**. M8 (the lift pass in the project's
  order) survived its first run, because the desk's own order was already children-first. C5 moves the Editor after the
  page and kills it.
- Rows moved: `global-store.test.ts` pinned "persist defers the whole store", the rule this slice reverses. Its first
  half now reads the store kept, and its refusal half moves to a wired Persist. `the-state-history` and
  `the-optimistic-update` named a whole-store deferral with an authored Persist; they use a wired one now.
- The first whole-package run (155 suites, 5,275 passed, **3 failed**, 3 skipped; predicted 5,278 / 0) found three rows:
  - `the-row-relays-its-values` A6, the control with no relayed value wire. STALEPULSE refused a pulse whose sender
    never feeds the port. The runtime never delivers a value there either, so nothing is stale. The rule now refuses
    only where the sender's output is fed inside it (C6, mutant M13), and A6 reads as before.
  - A7, a label computed inside the row. That one is STALEPULSE proper: the runtime hands the Shower the label with the
    pulse, and the export cannot. Before, it ran `show` half-fed (the id, and '' for the label). Now the pulse is
    refused by name. The row moved, as s138's ROWINTOINSTANCE moved its rows.
  - `node-spec-graph`'s ledger line: one more t01 Global Store scenario plays and conforms (played 17 → 18, conforming
    10 → 11, outside 22 → 21). Attributed by switching each change off in turn: it is the untyped Subscribe lift (M4).
- MULTIFEED's reach (`merged.cts`, `merged.out`): **84 inputs in 6 templates are fed by 232 lifted values** (planning
  23 + 23, rocket-school 12, star-class 12, todo-list 7 + 7). HEAD bound each to the last one placed. **54** placement
  ports write more than one row through one stable callback. No template logic component's hook name had to yield
  (HOOKNAME's reach is the desk).
- `tplbuild`: all 17 at the floor (1 in 1, nightbook STYLENULL). Before the MACHINELOCAL fix, bot-garden had 4 (TS2451).
  Package `tsc --noEmit` 0.
- Reach, HEAD's `src` (`packages/.s139-base`, deleted) against the tree. `wires.cts` (`wires.json`): **482 wires gained,
  115 lost**: rocket-school and star-class +107/−15 each, planning ×2 +68/−4, bot-garden +52/−25, todo-list ×2 +40/−25,
  nightbook −2. **Every lost wire is a STALEPULSE refusal**: a pulse HEAD ran on a value it never delivered (todo-list's
  Next renaming an action with no title, rocket-school's games grading and saving without the model). `dispdiff`
  (`dispdiff.json`, `dispdiff-corpus.json`): templates **32 nodes gained, 0 lost**, 23 re-worded; corpus **9 gained, 0
  lost**, 4 re-worded.

- Whole package, the final run (`nice -n 19 --runInBand`, JSON 12:13): **155 suites, 5,280 passed, 0 failed, 3 skipped**,
  as predicted (5,278 + C6 + E7).

## What it leaves

- **AC4 is translated, not driven.** The Lists page now hands App store one `app` row, the Editor's `items` reaches Save,
  and Save's and Delete's writes are kept. Next: drive it, as s137 drove todo-list (the exported rocket-school built
  with its own `npm run build`; a profile seeded in localStorage; edit a set; read the store).
- The Header's `app` (three wires into one output, "last-writer-wins is not statically ordered") is refused, and with it
  its `write` on 8 pages: settings, rename and delete-player do not save in the export. That is a refusal named in the
  report, not a stale write. The runtime itself writes whichever arrived last (the Bad desk read `badA`), so the honest
  translation needs the order each source fires in.
- App store's `written`: the Set's Done chain shares a port with the kit node `game-kit.KeepStorage`, which the export
  does not run. A Set Global Store's Done chain (P18-S127-SETDONE's shape) would carry it if the chain kept its other
  wires. The Profiles page's "go home after writing" waits on it.
- §101 proper: a parent's logic reading a hook's output (the Lists guard "Send them to the profiles?", the Editor's count
  line).
- The kit node itself (`game-kit.KeepStorage`, `navigator.storage.persist()`): refused by name, as every kit logic node is.
