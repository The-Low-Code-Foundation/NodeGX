# The Arrival Desk — what both arms must read, written before either ran (s133, 2026-10-21)

`tests/helpers/arrival-desk.ts`. Steps: Bump · Set Bo · Set Bo · Bump · type:Name:Al. Each row is every drawn Text in
document order, then the field: A.count · B.count · runs · greeting · stamp · loaded · seen · bumped · echo · [Name] · focus.

From the runtime's own rules (`simplejavascript.ts`), for a Function with **no Run wire**:

- the `functionScript` setter runs `scheduleRun()` at load; every ticked `in-…` setter does too when the value changed
  (`shouldRunOnValueChanged`: `valueDidChange` and the box). `scheduleRun` coalesces (`runScheduled`) into one run after the
  node's inputs have updated, so a load whose wired values arrive in the same update is **one** run;
- `_this` is one object per node for its life; two placements are two nodes;
- a value equal to the one held runs nothing (DEF-046), so a second Set Bo is silent;
- a re-render delivers nothing to a Function (Bump), so it runs nothing;
- an author signal (`Outputs.isBo()`) runs its chain; with no Run there is no Done.

| after | A.count | B.count | runs | greeting | stamp | loaded | seen | bumped | echo | [Name] | focus |
|---|---|---|---|---|---|---|---|---|---|---|---|
| load | Ann 1 | B 1 | runs 1 | hi Ann | stamped | loaded 1 object | seen nothing | 0 | echo 1 _(trailing space)_ | '' | none |
| Bump | · | · | · | · | · | · | · | 1 | · | · | · |
| Set Bo | Bo 2 | · | runs 2 | hi Bo | · | · | seen Bo | · | · | · | · |
| Set Bo | · | · | · | · | · | · | · | · | · | · | · |
| Bump | · | · | · | · | · | · | · | 2 | · | · | · |
| type:Name:Al | · | · | · | · | · | · | · | · | echo 2 Al | Al | none |

(`·` = unchanged.) **The least sure cell is echo at load**: whether the field's Value reaches the Function in the creation
update (one run, `echo 1 `) or when the field mounts (`componentDidMount` → `setText`, s118), which could be a second run
(`echo 2 `) — or, if the field's first value is `''` both times, no second run. Predicted one run.

What each row kills:

- **runs 1 / loaded 1 at load, unchanged after Bump**: a body run at a read site (the reactive inline call) re-runs per
  render: runs climbs on every Bump, and `this.c` too.
- **Ann 1 / B 1 then Bo 2 / B 1**: one `self` per kept node; B never re-runs because its literal never changes.
- **unchanged after the second Set Bo**: an arrival that is not a change runs nothing (`tickedArrival`'s held value).
- **loaded 1 object**: a Function with no inputs still runs, once, at load — a watch over no values would never run.
- **seen Bo**: the arrival run's own signal runs its chain from the effect; never on Ann.
- **echo 2 Al**: a field's Value is an arrival.

**Measured after the runtime arm ran (before any build):** every cell as predicted except **echo at load: `echo 2`** — the
runtime runs the echo at creation (its Text input not yet delivered: `echo 1 undefined`), then again when the field mounts
and announces `''` (`componentDidMount` → `setText`, P18-S116-FIELDMOUNT's mechanism): two runs. The prediction named
this alternative and chose the other; recorded as the runtime's answer. After typing, `echo 3 Al`. (The arm trims a
Text's trailing space.)

Plan rows: every one of the five Functions exported (`collapsed`), none deferred; the classifier's slice-2 sentence gone.

## Added after the mutant arms (s133), predicted before the arms ran it

Two arms survived the first desk: the load run's guard (C: nothing made a watched value go away) and `pulsed` for a run
that writes nothing and sends nothing (D: every desk Function was pulsed by its row or its signal anyway).

- **Clear** (a step after typing): a Set Variable with no Value, Do'd on `name`. Predicted: the runtime sends no
  `undefined` down a wire (`node.ts` `sendValue`), so Tally A, the stamp and the watch hold what they had: **the row is
  unchanged** (A.count Bo 2, runs 2). A load run scheduled again on that re-render would read `undefined 3`.
- **The note** (a variant desk): `localStorage.setItem('arrival-note', String(Inputs.name))`, fed `name`, nothing wired
  out. Predicted: exported, kept (`pulsed`), one ticked run with a load run, `runFunction(The_note` in the page.

**Measured:** Clear read as predicted in the runtime (unchanged). In the export the Set is refused by name ("nothing is
wired into value"), so both arms do nothing, and arm C still survived: **no source on this desk can take a watched value
away in the export**, which is the only path to the guard. Kept, and said so: the guard is the runtime's rule that an
`undefined` runs nothing (`tickedArrival` skips it) applied to the load run. The note variant killed arm D (C7).

## The Bell variant — a body that writes after its run has returned (predicted before either arm ran it)

Reading the emitted code of the gained nodes found todo-list's minute clock writing `Outputs.now` from `setInterval` and
sending `Outputs.wake()` from a `visibilitychange` listener, and (slice 1's) planning's "Escape closes what is over the
week" sending its signal from a `keydown` listener: the export's run recorded only what the body did before it returned.
The variant adds, after the field: **The bell** (no Run, no inputs: `setTimeout(function () { Outputs.rung = 'rung ' +
typeof window; Outputs.rang(); }, 0);`, `rang` increases a Counter "Rings") and **The chime** (Run from a button "Chime":
`setTimeout(() => { Outputs.chimed = 'chimed'; }, 0);`). Texts: bell, rings, chimed. Steps: Chime.

| after | bell | rings | chimed |
|---|---|---|---|
| load | rung object | 1 | '' |
| Chime | · | · | chimed |

(The load cells assume the arm's reading comes after a zero timer; if it reads before, `''` / `0` at load and the values
one step later, the same in both arms.) HEAD's export, and this session's before the fix: bell `''`, rings `0`, chimed `''`
for ever.

**Measured (both arms, after the fix):** every cell as predicted, the zero timers fired before the load reading. One cell
the prediction did not write: the runtime shows the chime's Text as **"Text"** before its wire delivers (a Text with no
authored text shows the node's default) where the export shows nothing: P18-S132-AUTHOREDTEXT's shape, pinned by name in
the spec, not a new defect.
