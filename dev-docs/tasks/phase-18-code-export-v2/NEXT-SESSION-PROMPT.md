# Next session — session 127 (2026-10-19, BOARD lane 6) fixed **P18-S126-INSIGNAL**: a signal a parent sends into a placed component runs the chain inside. The parent counts its pulses and keeps the count the child has taken; the child runs the chain when one passes the other. Graded against the runtime's own component instances rendered by real React. Templates 101 nodes gained, 0 lost.

## ✅ Session 127: the signal arrives in the component

Read EXP-011 §94. In short:

| what | where |
|---|---|
| Measured first: 87 template nodes refused with a Component Inputs trigger, 115 wires (a Set Variable 48, a Function's Run 20, a field's Clear/Set/Focus 18, States 6, Delay, kit, Counter 4 each); 859 wires into a placed component's signal input with no sentence of their own; the prop typed `() => void` | `s127-insignal/census.ts` |
| `instanceSignalInputOf`: a placed component's signal input (target with a visual root) is a trigger port; `compileInstanceSignal`: a count per wired port (`op: 'inc'`) and a ref of the count taken, passed as `{ sent, taken }` (`INPUT_PULSE_TS_TYPE`) | `src/analyze/plan.ts`, `src/emit/component.ts` `instanceAttrs` |
| Inside: a Component Inputs signal port is a trigger in the attach pass; one effect per port, `if (x === undefined \|\| x.taken.current === x.sent) return; x.taken.current = x.sent; …`, keyed on `x?.sent` (`plan.inputPulses`) | `plan.ts`, `component.ts` |
| A pass-through is the child's own pulse to its child; a count with no attached sender is pruned; a refused sender does not defer the placed component (restored after the attach pass) | `plan.ts` |
| Spec, 19 rows: the Signal Desk (temp folder) against the runtime's component instances, States, Counter, Condition, real React under StrictMode, press by press; a Condition variant; a control; 9 mutant arms each killing rows. The export arm gained `settled: true` (async act; the States library drains in a microtask) | `tests/the-signal-arrives-in-the-component.test.ts`, `tests/helpers/signal-desk.ts`, `s127-insignal/mutants.py` |

- 🔴 **The first build lost a pulse sent with the click that draws the component.** It booted the child's ref with the count
  at mount. 14 of the 29 pulsed placements in the templates sit under a condition in their parent (`condpulse.py`): the
  choosers, the player form, the Round. The count taken lives in the parent now. Mutant D is the first build (A6, A7).
- 🔴 **The probe found two other bugs in the fixture's first draft**, filed instead of built: a Set Variable's Done is not
  carried at all (P18-S127-SETDONE, 54 template nodes; rocket-school's game and race `start`), a Clear does not send the
  empty text on (P18-S127-CLEAROUT).
- 🔴 **The first reach read 127 gained and 56 lost.** The 56 were placed components (and one Expression reading one)
  deferred because a sender into them was refused: the attach pass writes its sentence on the sink, and a placed
  component is drawn whatever a sender does. Restored after the pass: 127 gained, 0 lost. Then 26 of the 127 were in chains
  that pulse a logic component, which draws nothing and has no file: a target must have a visual root, 101 gained.
  Then the emitted diff showed counts nothing adds to (every sender refused, the compile runs before the sender is ruled
  on): pruned. Each is a mutant (G, I, H).
- 🔴 **Reading the diff found a chain that runs on inputs it is not given**: todo-list's Dialog flow writes from
  `listTaskId` and its siblings, which the page drops (another placed component's output into an input, 90 template
  wires): P18-S127-SIBLINGVALUE.
- The States library schedules in a microtask: the synchronous export arm read the Banner closed. `settled: true` presses in
  an async act (and lends jsdom a `MessageChannel`, and exits explicitly, or the process hangs).

Readings: the spec 19 / 19 (9 mutant arms, each killing rows); neighbours green (EXP-011 §94.5); `run-tasks` re-pinned
(a Run Tasks template's `Do` is typed as the pulse pair); hls001 one key, predicted (batch-desk's `Notify.tsx`), regenerated;
the templates' typecheck gate 3 / 3, every row 0; all 19 (`tplbuild.ts`) 1 error in 1 (nightbook STYLENULL, as before);
`parameter-coverage` 9. Package `tsc --noEmit` 0; the ratchet holds. Whole package (`nice -n 19 --runInBand`, JSON 17:08):
**143 / 143 suites, 4,958 passed, 0 failed, 3 pending.**

Reach (`dispdiff.ts`, base `a59d3e4d5` against the tree): **templates 101 gained, 0 lost; corpus 69 gained, 0 lost.**
`census.ts` 87 → 0 (115 → 0 wires). rocket-school's Feedback banner still never opens: its `show` comes from `/Logic/Grade
answer`'s Done, a logic component (named on its marker now).

Filed: **P18-S127-SETDONE** (medium), **P18-S127-SIBLINGVALUE** (medium), **P18-S127-CLEAROUT** (low). Fixed: P18-S126-INSIGNAL.

**Next (BOARD lane 6):**
1. **P18-S127-SETDONE**: a Set Variable's Done (54 template nodes; rocket-school's game and race start). Small, and the
   Signal Desk's first draft is its fixture.
2. **P18-S127-SIBLINGVALUE**: another placed component's value output into an input (90 template wires).
3. The Mounted feeders left (EXP-011 §93.6), and the logic components behind the Feedback banner (Tier B).
4. P18-S127-CLEAROUT, P18-S126-PROPUNDEF, PAGEGROUP, UNDEFCOMPUTED, P18-S125-STYLENULL, P18-S124-RUNINPUTS, LATEMARKER
   (small); the §87 Conditions; the low ones as listed in session 126.
5. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 126 (2026-10-19, BOARD lane 6) carried **the Mounted wires of component roots**: a root's Mounted binds as any element's (only a Page's is the router's), a Did Mount under a value-mounted element runs on every mount, a field there announces the first time. Graded against the runtime's own nodes rendered by real React. Templates 54 nodes gained, 0 lost.

## ✅ Session 126: the root is mounted when it says

Read EXP-011 §93. In short:

| what | where |
|---|---|
| Measured first, by feeder: 157 template nodes refused for an unreached trigger; a Function reading the Noodl API 64 (needs EXP-003 Tier B), a source the export cannot read 33, members-area's Standing 26, a value-mounted Did Mount 16, a root mounted from an input 7. And **72 wires into a component root's Mounted, all refused as "a router concern"**: 24 roots never drawn, 48 always drawn | `s126-mounted/census.ts`, `roots.ts` |
| `routerMounted`: only a Page's root is the router's (12 sites) | `src/analyze/plan.ts` |
| The root guard `if (!cond) return null;` after every hook | `src/emit/component.ts` |
| `mountedCondOf`: an element authored Mounted true keeps it while a read source (prop, store, row field) is undefined, `(x === undefined \|\| x)`; the runtime never delivers `undefined` | `component.ts` |
| A Did Mount under a value-mounted element: an effect keyed on the gates, its ref reset when they say unmounted (s124 refused it); a field there announces the first time (`FieldMountPlan.gates`; it was refused) | `component.ts`, `plan.ts` |
| A page's sole Group's Mounted is still dropped: a Did Mount or field under it is refused by name in plan and emitter alike | `UNCARRIED_PAGE_GROUP` |
| Spec, 19 rows: the Root Desk built in a temp folder; real React under StrictMode against the viewer's own Group, Text, Button, Text Input and the runtime's component instances (a new arm), press by press; a control; 11 mutant arms each killing rows | `tests/the-root-is-mounted-when-it-says.test.ts`, `tests/helpers/root-desk.ts`, `tests/helpers/runtime-mounted-arm.js`, `s126-mounted/mutants.py` |

- 🔴 **The viewer's own nodes render in jsdom.** `runtime-mounted-arm.js` renders the corpus graph's root with real React:
  a visual node re-renders on the frame's END (`forceUpdate` waits for `frameEnd`, so `graph.frame()`, not `settle()`),
  and React commits, and the viewer sends Did Mount, as an `act` scope closes: the frames run again in a new scope until a
  reading repeats. The next mount-shaped question can use it instead of stand-ins.
- 🔴 **Reading the emitted diff found a field lost.** The first build gated the Did Mount and not the field: rocket-school's
  Editor lost its two fields' mount announcements (HEAD announced them; the value-mounted rule refused them). The count
  said 54 gained, 0 lost all along: the field mount is not a disposition. Read the code, every session.
- 🔴 **The undefined arm is for a read only.** Around a Date Compare's call it printed (and ran) the call twice
  (deadline-desk, the one hls001 key the predictor did not foresee); around an Expression's answer it is noise. A read
  only now; the golden did not move.
- 🔴 **A mutant arm can crash the file instead of failing rows**: A's export arm threw at load on a button the base never
  draws ("0 total"). The arms now return the error as a reading. G broke a narrowing and did not compile: reshaped.
- The parent still coerces a boolean input with `!!` (P18-S126-PROPUNDEF): the one divergence left in the arms' 24
  readings (base 18).

Readings: the spec 19 / 19; re-pinned `the-ticked-input-runs-it-again`, `controlled-state` (2), `the-undrawn-trigger-is-refused`
B1, `the-field-announces-at-mount` (2), `drag` C13, `untyped-store-key`, `untyped-variable`; neighbours green (EXP-011 §93.5); hls001 4 / 4, unchanged (predicted 0); the
templates' typecheck gate 3 / 3, every row 0, all 19 1 error in 1 (nightbook STYLENULL, as before). Package `tsc --noEmit`
0; the ratchet holds. Whole package (`nice -n 19 --runInBand`, JSON 14:55): **139 / 142 suites, 4,936 passed, 3 failed, 3
skipped**: `drag` C13, `untyped-store-key`, `untyped-variable` pinned the base's `{!!x && (` for an authored-true Mounted
fed by an untyped store (fixtures mutated in memory, so hls001 never saw them); re-pinned, 84 / 84 alone. 🔴 The
neighbour list missed them: a print change reaches every spec that mutates a fixture, so grep the specs for the old
print before the whole run.

Reach (`dispdiff.ts`, base `3476642d6` against the tree): **templates 54 gained, 0 lost; corpus 14 gained, 0 lost.**
`census.ts` 157 → 132. In the emitted apps: 22 roots authored false now drawn when their input says (gram's Nav, todo-list's
Note dialog and Money sheet, bot-garden's Form, rocket-school's Result), 46 authored true now hidden when it says
(planning's sheets, rocket-school's screens), 208 elements kept drawn while their source has no value.

Filed: **P18-S126-INSIGNAL** (medium: a signal sent into a component runs nothing, 87 template nodes; the Feedback banners
never open), **P18-S126-PROPUNDEF**, **P18-S126-PAGEGROUP**, **P18-S126-UNDEFCOMPUTED** (low).

**Next (BOARD lane 6):**
1. **P18-S126-INSIGNAL**: a signal into a component (87 template nodes, 115 wires; todo-list 26, rocket-school and
   star-class 14 each). Grade it with `runtime-mounted-arm.js`'s real component instances.
2. The Mounted feeders left (EXP-011 §93.6): members-area's `/Members/Standing` logic component (26 through the Chrome),
   nightbook's kit-fed Expressions (33), and, largest and Tier B, the Functions reading the Noodl API (64).
3. The §87 Conditions still waiting; P18-S126-PROPUNDEF, P18-S126-PAGEGROUP, P18-S126-UNDEFCOMPUTED, P18-S125-STYLENULL,
   P18-S124-RUNINPUTS, P18-S124-LATEMARKER (small); P18-S120-TEXTAREA, P18-S118-NUMBERFIELD, P18-S121-ONEUPDATE,
   P18-S113-LISTLIVE, P18-S115-DYNPROBE; STUBORDER, TEXTDEFAULT, BUTTONLOOK, INPUTLOOK (low).
4. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 125 (2026-10-19, BOARD lane 6) fixed **P18-S122-TPLBUILD**: every tracked template's export passes its own `tsc -b` (189 → 0 type errors in the 16; all 19 shipped templates 203 → 1). A Function's wrapper is in its own file, as Richard ruled.

## ✅ Session 125: the templates' exports build

Read EXP-011 §92. In short:

| class | count | fix | where |
|---|---|---|---|
| TS2554 | 42 | an Expression with no inputs is called with none (`False()`) | `component.ts` `jsArgsObject` |
| TS2345 | 35 | a lifted push of an untyped value is cast to the port's type (`castTo`, decided by `exprTsType`) | `plan.ts` `PushEffectPlan`, `component.ts` |
| TS2786 | 39 | a component whose root is removed returns `null` (it returned `{}`, which React throws on) | `component.ts`, the return |
| TS2448 + TS2454 | 44 | a render local that reads a hook prints after it (it was read in the hook's dead zone, a ReferenceError) | `component.ts`, the render locals |
| TS7006 + TS7053 | 7 | **the ruling**: each Function wrapper is `src/functions/<dir>/<fileBase>/<fnName>.ts`, one-file `// @ts-nocheck`, the signature typed | `component.ts` `functionFileSource` |
| TS17001 | 12 | an input called `key` binds as `keyProp` (React withholds `key`) | `naming.ts` `propIdentifier` |
| TS2440, TS2322 | 4 + 7 | a kit import named as its component is aliased; a kit `object` input takes an array; an untyped animation option is cast to number | `component.ts`, `kits.ts`, `plan.ts` `castToNumber` |

- 🔴 **Two classes were crashes, not types.** A component returning `{}` throws at render ("Objects are not valid as a
  React child"): gram's Nav on four pages, bot-garden's Pad and WinCard, rocket-school's Result. A render local read above
  its hook's `const` is a ReferenceError: rocket-school's Round and Adopt, todo-list's ProjectEditor. Those pages render now.
- 🔴 **The `key` fix changes what arrives**: 22 components' "key" input was `undefined` in the export and arrives now, as in
  the runtime; planning's MoneySheet no longer remounts its editors when their key changes.
- 🔴 **A type error can hide another.** The RaceTrack's four TS2322 were checking `burstA` against the wrong `RaceTrack`
  (the name conflict); with the alias they left and one dbt row behind its own conflict surfaced (10 → 3, not 10 → 6).
- 🔴 **A spec row passed with its subject gone.** `the-function-sends-its-signals` §A cut the wrapper out of the page with
  `indexOf`, got an empty slice once the wrapper moved, and still passed. It fails now if the wrapper is not found.
- The move hides exactly the 7 body errors, measured with the directive taken off: no body reads a name from the
  component's scope (no TS2304).

Readings: the gate 3 / 3, every row 0; hls001 0 keys for six classes, the Function move 19 moved, 9 added, 0 removed
(predicted, exactly those); `dispdiff.ts` templates 19 projects 13,432 nodes **0 changed**, corpus 226 projects 27,789 nodes
**0 changed**; 10 mutant arms, each red on the gate. Neighbours green (EXP-011 §92.4). `parameter-coverage` fixed: the
three Upload File ports are `gap`s named by P121-TWO001-EXPORTREADERS and P121-TWO003-EXPORTSHRINK (9 / 9).
Re-pinned to the Function's own file: `stores-events`, `jsfun`, `the-function-sends-its-signals`, `isl-005-script-files`,
`in-code-markers`, `on-app-error`. Whole package (`nice -n 19 --runInBand`, JSON written 13:35): **141 / 141 suites, 4,920
passed, 0 failed, 3 skipped**; package `tsc --noEmit` 0. Tooling: `s125-tplbuild/`. Commits on `l6-tplbuild` from
`a2c4fc09c`, one per class.

Filed: **P18-S125-STYLENULL** (low: nightbook's last row, an Expression's `null` into a style colour). Fixed:
P18-S122-TPLBUILD.

**Next (BOARD lane 6):**
1. **The Mounted wires the export does not carry**, the named blockers of 166 template nodes (EXP-011 §91.5): a Function
   reading the Noodl API (gram's and the marketplace's refusal pages), an instance output its component does not lift
   (members-area's `/Members/Standing`, the Chrome's menu, nightbook's Tonight panels), an Inverter of a maybe-undefined
   operand. Rank by those counts. The gate now also holds every template edit to 0.
2. The §87 Conditions still waiting (members-area's Post, Unsubscribe; landing-pages' contact; the Site Builder's Setup).
3. P18-S125-STYLENULL, P18-S124-RUNINPUTS, P18-S124-LATEMARKER (small); P18-S120-TEXTAREA, P18-S118-NUMBERFIELD,
   P18-S121-ONEUPDATE, P18-S113-LISTLIVE, P18-S115-DYNPROBE; STUBORDER, TEXTDEFAULT, BUTTONLOOK, INPUTLOOK (low).
4. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 124 (2026-10-19, BOARD lane 6) fixed **P18-S123-UNDRAWNTRIGGER and P18-S122-DEADROW**: a trigger the export never runs (an element it never draws, a Did Mount it does not run, a Function row nothing it runs writes) is refused by name instead of counted exported. Then **P18-S122-TPLBUILD's gate**: the tracked templates' exports typecheck, by count, and the largest class is fixed (311 → 189 errors).

## ✅ Session 124: a trigger the export never runs is refused

Read EXP-011 §91. In short:

| what | where |
|---|---|
| Measured first: **151** template nodes collapsed into an element never drawn (the bugs named 10), 186 such elements, 5 value-mounted Did Mounts; 19 printed rows, 11 never written. Every undrawn element has a Mounted wire the export does not carry | `s124-deadrow/census.ts`, `../s122-holdtheid/deadrow.py` |
| Decided after render, attach **and the lift phase** (a Mounted the parent's lift binds is known only there): `planProject` plans, lifts, asks `unreachedTriggersOf`, and plans a component again with its unreached triggers refused up front (names given back first), until nothing new | `src/analyze/plan.ts` |
| `undrawnReasonOf` (the emitter's own rule, as a sentence); Pass 2 refuses a wire from an undrawn owner or a gated Did Mount, keeping any node another trigger claims; Pass 4e drops a drawn read of a dead row with the Function's sentence; a handler's read is kept and noted | `plan.ts` |
| An undrawn element's marker says "is not drawn (why)", not "renders" | `src/emit/component.ts` |
| Spec, 16 rows: a built fixture (temp folder, the corpus golden does not move), four unreached triggers each beside a shared node, the lifted variant, a control; 11 mutant arms each killing rows | `tests/the-undrawn-trigger-is-refused.test.ts`, `s124-deadrow/mutants.py` |
| TPLBUILD gate: every tracked template emitted and typechecked, count per template, a ratchet both ways (rise names the errors, fall asks for the row) | `tests/the-templates-typecheck.test.ts`, `s124-deadrow/tplbuild.ts` |
| TPLBUILD class 1: a lifted output's callback is `(value: T \| undefined) => void` (the push sends undefined before its source has a value): 122 TS2345 gone, none added | `component.ts`; hls001 regenerated (CheerMeter, BenchEmitter: predicted, exactly those) |

- 🔴 **The bug files said 10; the census said 151, and 166 once the readers' consequences counted.** The rest had been
  counted exported for as long as their pages existed. Measure the artefact, not the bug's own number.
- 🔴 **The first rule refused the dead row's Function, and with it a chain that worked** (5 older Site Builder copies,
  "The slug to show", reads the URL's slug and the dead home slug only as a fallback: 15 corpus nodes). Only drawn reads
  are refused now. Found by classifying every corpus loss, not the templates' (the templates had none of it).
- 🔴 **A decision inside `planComponent` would have been wrong**: members-area's moderator tools are mounted by an
  instance output the lift phase decides. Mutant H (findings before the lift) kills A5/A6.
- 🔴 **Two pre-existing holes surfaced once the dead-row reads were gone**, both filed, not fixed: a Page Inputs read
  only in a Function's run says "nothing reads" (P18-S124-RUNINPUTS), and a refusal filed after an element's marker
  printed never reaches the file (P18-S124-LATEMARKER).
- 🔴 **Scratch copies of the package inside `packages/` turn `hls006-every-listener` red** (each copy's `serve.ts` is a
  socket nobody enrolled). Remove `packages/.nx-ctl-*` and `packages/nx-mut-*` before the whole suite, or read that
  failure as yours.

Readings: the spec 16 / 16; the gate 3 / 3; re-pinned `the-ticked-input-runs-it-again` (the Did Mount note is the plan's
now), `controlled-state` (CheerMeter's callback type). Neighbours green (`the-failure-runs-its-chain` 23, `the-id-is-held`
22, `the-function-sends-its-signals` 38, `jsfun` 47, `the-condition-remembers-its-answer` 40, `export-report` 30,
`custom-nodes` 34, `typecheck-emitted` 67, `hls001` 4). `parameter-coverage`: the same 2 failures as on HEAD (measured on
a HEAD copy): the committed catalog's three Upload File ports are not in the ledger; reaching 1,236 = the floor.
Whole package (`nice -n 19 --runInBand`, JSON written 11:16, after the
TPLBUILD commit): **140 / 141 suites, 4,916 passed, 2 failed (those two), 3 skipped**; package `tsc --noEmit` 0. (The run
after the first commit read 138 / 140 with `hls006-every-listener` red for this session's scratch copies; alone after
removing them, 4 / 4.) Commits `f342b3df2`, `9bb16f905`, `c31409e27`.

Reach (`dispdiff.ts`, HEAD `e7e3e77db` against the tree): **templates 166 nodes leave the exported count, none join,
8 re-pointed to a drawn trigger; corpus 73 leave, none join, 5 re-pointed.** Printed rows never written: 11 → 0.
Template exports' type errors (`tplbuild.ts`, tracked templates): 311 in 11 of 16 → 189 in 9 of 16. All 19 (nightbook and the two materialized): 337 in 13 → 203 in 12.

Filed: **P18-S124-RUNINPUTS** (low), **P18-S124-LATEMARKER** (low). Fixed: P18-S123-UNDRAWNTRIGGER, P18-S122-DEADROW.
P18-S122-TPLBUILD stays open (the gate and class 1 done).

**Next (BOARD lane 6):**
1. **P18-S122-TPLBUILD, the next classes** (tracked templates, 188 errors): a Function Expression called with an
   argument it does not take (`monsterWalking.set(False({}))`, TS2554, 42, rocket-school and star-class), a component
   whose body returns `{}` used as JSX (TS2786, 39), a render local used before the States hook that declares it
   (TS2448/TS2454, 44: rocket-school's Adopt `foldedOrOpen`), the last lifted pushes of `unknown` or `null` (TS2345, 35),
   a repeater's `key` printed twice (TS17001, 12), a kit wrapper and a component with one name (TS2440, 4). Lower the
   gate's rows as each lands. The body class (TS7006, an author's untyped parameter, 6) waits for Richard's ruling.
2. **The Mounted wires the export does not carry**, now the named blockers of 166 template nodes: a Function reading the
   Noodl API (gram's and the marketplace's refusal pages), an instance output its component does not lift
   (members-area's `/Members/Standing`, the Chrome's menu, nightbook's Tonight panels), an Inverter of a maybe-undefined
   operand. Rank by the counts in EXP-011 §91.5.
3. The §87 Conditions still waiting (members-area's Post, Unsubscribe; landing-pages' contact; the Site Builder's Setup).
4. P18-S124-RUNINPUTS, P18-S124-LATEMARKER (small); P18-S120-TEXTAREA, P18-S118-NUMBERFIELD, P18-S121-ONEUPDATE,
   P18-S113-LISTLIVE, P18-S115-DYNPROBE; STUBORDER, TEXTDEFAULT, BUTTONLOOK, INPUTLOOK (low).
5. Not this lane's, for Richard: P18-S119-TOKENCLAIM, the ruling P18-S119-FIRSTWRITE asks, and the TPLBUILD body class.

---

# Next session — session 123 (2026-10-17, BOARD lane 6) built **the Failure chain**: a record or user verb's Failure runs its chain in the export, and a click's later wires run before the request answers. The Sign-in pages of members-area, todo-list, the Site Builder and the planner show their refusal now; nightbook's Me toggles work.

## ✅ Session 123: the failure runs its chain

Read EXP-011 §90. In short:

| what | where |
|---|---|
| Measured first: the deferred §87 Conditions wait on a Delete's Failure, Log In's and Sign Up's; every verb refused a wired Failure whole | `s123-failchain/conds.ts` |
| `api-call.failThen`, compiled by the record, relation and user verbs (`verbFailChainOf`), printed in the catch after the Error row and the raise; the verb's Error inside it is the catch's local | `plan.ts`, `component.ts` |
| **The order**: an awaited call a later action follows is `detached` (`void (async () => { … })();`); a later wire writing what the call sends is refused by name | `plan.ts` (the last pass, `lateQueryFetchWrite`), `component.ts` `actionCode` |
| **The cache**: a compile that reads a Failure scope's local is kept under that scope's key (`compiledOf`) | `plan.ts` |
| **The Value wire**: a Set fed by several reads the chain's own sender's (`lastValueWireOf`, `chainSenders` in `doneChainOf`), else is refused by name | `plan.ts` |
| Spec, 23 rows: real React under StrictMode with requests the test answers, against the runtime's own Delete Record, Condition, Variable and Set Variable with a store the test answers; `fixtures/fail-desk` and five variants; two controls | `tests/the-failure-runs-its-chain.test.ts`, `helpers/export-answer-arm.js`, `helpers/runtime-failure-arm.js` |
| Drive, three arms, two runs: with a backend that fails, runtime == fixed export at every step; HEAD's Remove unwired | `s123-failchain/` |

- 🔴 **"22 gained, 0 lost" hid three defects**, each found by reading the emitted diff of every gained node: the clear
  after an awaited call ran after the answer (todo-list's refusal vanished as it showed; HEAD's digital-bricks-training
  Settings said "preparing" for ever), one Set Variable compiled once carried Log In's catch local into Sign Up's catch,
  and a Set fed by two wires wrote the first. Read the code every gain prints, every session.
- 🔴 **A blanket refusal lost a right export.** "Two wires into Value ⇒ refuse" cost nightbook's "Another one", which HEAD
  exported correctly (the first wire happened to be the sender's). The runtime's rule is "last writer", and at a
  sender's pulse that is the sender's own wire. Measure the losses of a new refusal before keeping it.
- 🔴 **The compiled-sink cache is keyed by node and port, so any chain-dependent read leaks into the next chain that
  runs the sink.** §90 keys the Failure scope and the Value wire; the other 13 chain-scope maps (§89) still share.
- 🔴 **A drive's arms must fail the same way.** Run 1 (no backend) compared the runtime's synchronous "no backend
  configured" with the export's async stub: a real divergence, but not the one under test (P18-S123-STUBORDER). Run 2
  declared a backend at a dead port and both failed on the network.
- 🔴 **An async `act` in jsdom needs Node's `MessageChannel`, and then holds the process open**: the export arm exits
  once it has written. The app's own `raiseAppError` logs to `console.error`; the arm counts those as raises.
- Mutants B, D, G, I first read "0 total" (they did not typecheck): reshape (`&& value.length < 0`), as s122 did.

Readings: the spec 23 / 23; re-pinned to the new claim `record-verbs` 11, `user-family` 5.4,
`set-user-properties-magic-link` C1, `relation-pair` D10 / D11; `the-action-bus` unchanged (a signal into Value is not a
writer). hls001 predicted (fail-desk in, record-desk's Home.tsx) and regenerated: exactly those two. EXP-008's floor
1,235 → 1,236 (`DeleteDbModelProperties.modelId` reaches). 13 mutant arms, each killing rows (control 23 / 23). Whole
package (`nice -n 19 --runInBand`, JSON written 20:27): 138 / 139 suites, 4,897 passed, 2 failed, both
`parameter-coverage` on the P121 peer's three uncommitted Upload File ports. Package `tsc` 0. Commit `3d44078e8`.

Reach (`dispdiff.ts`, HEAD against the tree): **templates 26 gained, 0 lost** (16 reachable: four Sign-in pages, nightbook
Me; 10 behind an element never drawn: members-area's Remove ×8, nightbook Tonight ×2); **corpus 134, 0 lost**.

Filed: **P18-S123-UNDRAWNTRIGGER** (medium: a node collapsed into an element the export never draws is counted exported;
members-area's moderator can never remove), **P18-S123-STUBORDER** (low); fixed and filed P18-S123-AWAITORDER (high),
P18-S123-FIRSTWIRE (low).

**Next (BOARD lane 6):**
1. **P18-S122-DEADROW** and **P18-S123-UNDRAWNTRIGGER** together: decide rows and collapses after the render and attach
   passes (a node collapsed into an undrawn element, a row whose run never attaches), refused by name.
2. **P18-S122-TPLBUILD**: a gate over the templates' exports by count, then the three emitter classes; the body class
   needs Richard's ruling.
3. The §87 Conditions still waiting: members-area's Post (New Record's access-control rules, a clock read), Unsubscribe
   (a Function's own Failure), landing-pages' contact (`/Site/Field`), the Site Builder's Setup (a ticked Condition).
4. P18-S120-TEXTAREA, P18-S118-NUMBERFIELD, P18-S121-ONEUPDATE, P18-S113-LISTLIVE, P18-S115-DYNPROBE; STUBORDER,
   TEXTDEFAULT, BUTTONLOOK, INPUTLOOK (low).
5. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 122 (2026-10-17, BOARD lane 6) built **"Hold the id"**: a Function's id, read by nodes that are not drawn, exports. members-area's Announcement and Meeting fetch their record and say when it is not available; the Site Builder's PageEditor fetches the page, lists its sections and says draft or published.

## ✅ Session 122: the id is held

Read EXP-011 §89. In short:

| what | where |
|---|---|
| Measured first: on the Announcement one wire was the whole blocker (the hold's id into the second Function); the Record's Id is read inside `ready`'s own chain | `s119-fnchain-measure/dump.ts`, a cut copy |
| The runtime measured: a reader holds the last delivered value across a run that returns early; **a Set Variable fired by the same click reads the run's new value whichever wire comes first** | `s122-holdtheid/probe.ts` |
| An unrendered reader reads the row: only a Function's, and only readers that read at their own trigger or ask again on change (`isRowReader`); HEAD's own rule kept where it materialized; a read in its own signal's refused chain names that chain; the same click with the reader first refused | `plan.ts` `compileJsRun` |
| A Function's input fed by a Run-wired, materialized Function (`jsFunReadExpr`); feeders compiled first in the sink loop, only those an element's event or a Did Mount runs (`compileFunctionFeedersOf`) | `plan.ts` |
| A handler read prints `<fn>Node.delivered.x`; a materialized run keeps its node (FRESHOUTPUTS, half); an effect is keyed on the field, not the row | `component.ts` |
| Spec, 22 rows: real React under StrictMode against the runtime's own nodes over `fixtures/held-desk` and six variants, two controls; plus a Query row in `the-query-reads-its-wires` | `tests/the-id-is-held.test.ts` |
| Drive, three arms: runtime == fixed after load; HEAD blank | `s122-holdtheid/` |

- 🔴 **Forcing a feeder's compile from inside a reader's resolution re-enters sinks already compiling** (nightbook's three
  toggles share one Set Variable: one lost export, "its trigger chain is cyclic"). Compile feeders at the top of the sink
  loop, where no chain is open, and never from a resolution: 13 chain-scope maps would leak into it.
- 🔴 **A first measurement said 16 gained, 0 lost, and hid two holes.** The Add buttons of todo-list's lists sent `add`
  without the title (a Component Outputs value), and the Site Builder's Home link read a row nothing writes. Each was
  found by reading the emitted diff of every gained node, not by the count. Read the code a gain prints.
- 🔴 **For a Function every `out-*` is a "value output", signals included** (`isJsValueOutput`): a signal wired into a
  drawn Text is a drawn stray. Build a refused-signal row into an undrawn target.
- 🔴 **A mutant that does not typecheck grades nothing** (A, C, D first read "0 total"): reshape it (`&& x.toId === ''`).
- 🔴 **A jest copy of the package needs its own package name** (`npx` refuses two workspaces called `@nodegx/export`);
  call `node_modules/.bin/jest` directly.
- The runtime shows a wired Text's default "Text" until its first value (P18-S122-TEXTDEFAULT); the spec's stand-in
  hid it, the drive found it.

Readings: the spec 22 / 22; neighbours (`the-function-sends-its-signals` 38 with two re-pinned and one new,
`jsfun` 47 with two re-pinned, `the-query-reads-its-wires` 141 with one new), hls001 regenerated after predicting (0
lines out, held-desk's 17 in); package `tsc` 0. 12 mutant arms, each killing rows (control 248 / 248). Whole package
(`nice -n 19 --runInBand`, JSON written 18:46): 137 / 138 suites, 4,856 passed, 2 failed, both `parameter-coverage` on
the P121 peer's three uncommitted Upload File ports (reaching 1,235, the floor).

Reach (`dispdiff.ts`, HEAD against the tree): **templates 15 gained, 0 lost; corpus 129, 0 lost**. One gain is nominal
(nightbook's "A fresh form": its Did Mount is refused by name, so it never runs).

Filed: **P18-S122-DEADROW** (high: a row whose run never attaches is read as nothing, silently: 10 of 15 template rows,
members-area's Landing 8 reads), **P18-S122-TPLBUILD** (high: 13 of 19 template exports fail their own `tsc -b`, 337
errors; the templates were never gated), **P18-S122-TEXTDEFAULT** (low).

**Next (BOARD lane 6):**
1. **The senders the 18 remaining §87 Conditions wait on**: a Record verb's Failure chain first (the Announcement's and
   Meeting's Remove: the second Function exports now and stops at Delete Record's Failure), Log In's / Sign Up's, an
   External Link's Done.
2. **P18-S122-DEADROW**: decide a row after the attach pass (or re-plan with the name sets restored).
3. **P18-S122-TPLBUILD**: a gate over the templates' exports by count, then the three emitter classes; the body class
   needs Richard's ruling.
4. P18-S120-TEXTAREA, P18-S118-NUMBERFIELD, P18-S121-ONEUPDATE, P18-S113-LISTLIVE, P18-S115-DYNPROBE; BUTTONLOOK,
   INPUTLOOK, TEXTDEFAULT (low).
5. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 121 (2026-10-17, BOARD lane 6) fixed **P18-S119-TICKEDRUN** and, in front of it, **P18-S121-DIDMOUNT**: a Run-wired Function also runs when a ticked input gets a new value, and an element's Did Mount chain runs once per mount, where HEAD compiled it and then dropped it.

## ✅ Session 121: the ticked input runs it again

Read EXP-011 §88. In short:

| what | where |
|---|---|
| Measured first: 46 such Functions in the templates, 68 in the corpus, **every one refused already by something else**. The fix alone exports none; "Hold the id" waits on two more blockers | `s121-tickedrun/census.ts` |
| The runtime measured: an arrival at creation runs it; `undefined` never arrives; the same value does not, the same object does; two arrivals or an arrival and a Run in one update are one run (the Run's, with Done); a literal runs it once at load; in the viewer the arrival's run comes before Did Mount's | `tickprobe.out`, `readings.json` |
| `tickedArrival(held, values)` in `src/lib/functionRun.ts`; `tickedWatchOf`, `tickedRunPieces`, `TickedRunPlan` (a `useEffect` keyed on the watched sources, reading them fresh); a Run records what it read | `plan.ts` `compileJsRun`, the pass after attach; `component.ts` |
| Did Mount: once-guarded mount effects, post-order, after the ticked runs, a Page's merged Group included; refused by name under a bound Mounted | `component.ts` `mountChains` |
| P18-S121-SAMEOUTPUTS: a pulsed run hands its §4f state a copy (React kept the same record) | `component.ts` `jsfun-run` |
| Spec, 30 rows: §A the emitted app bundled and rendered by real React under StrictMode in jsdom (`helpers/export-react-arm.js`) against the runtime's own Function, Variable and Set Variable (`helpers/runtime-ticked-arm.js`), eight variants of `fixtures/ticked-desk`, a control | `tests/the-ticked-input-runs-it-again.test.ts` |
| Drive, three arms: runtime == fixed in every step; HEAD blank until Again | `s121-tickedrun/` |

- 🔴 **Search `tests/fixtures/` before naming a fixture.** The generator's first run wrote over `tick-desk` (§39's Timer
  fixture). hls001 showed its files gone; git restored it. The fixture is `ticked-desk`, ids `…0501–0503` (gate-desk
  holds `…0401–0403`).
- 🔴 **A format-4 project with a Run-wired node's box unset reads UNTICKED** (NDA-017's migration, applied by the editor's
  load and by `parseProject`). `render-from-disk.js` skips it and reads ticked. Write the boxes out in a fixture.
- 🔴 **A jest copy of the package in a dot-named folder reads "Tests: 0 total"**, and it needs the package's
  `*.json` ledgers beside `src`. The mutant copy is `packages/nx-mut-s121`, removed straight after.
- 🔴 **A text field's value is control state, so an effect can watch it.** A ticked input fed by a field exports (each
  keystroke runs it, as the runtime's does: the Site Builder's Setup token is that shape, P18-S119-TOKENCLAIM). The only
  handler-only source left is a received payload.
- 🔴 **A Run printed as a one-liner broke when the record went in front** (`() => a; b`): a run that records is a
  statement now (`actionIsStatement`, the sixth instance of that hazard).
- The export arm is real React now: esbuild bundles the emitted page, jsdom renders it under StrictMode. It caught what
  the hook stand-in could not (effect order, the seed's second mount).

Readings: the spec 30 / 30; neighbours green (the-function-sends-its-signals 37 / 37 with two rows re-pinned, drag
52 / 52 with C12 re-pinned, twelve more 566 / 566); hls001 regenerated after predicting (1 path moved, ticked-desk in);
package `tsc` 0. 15 mutant arms, each killing rows (control 30 / 30). Whole package (`nice -n 19 --runInBand`, started 16:44, JSON written 16:52):
136 / 137 suites, 4,814 passed, 2 failed, both `parameter-coverage` on the P121 peer's three uncommitted Upload File ports
(reaching 1,235 = the floor, as in s110–s120); two suites read "focused" for their environment `it.skip`s (hls006-serve's LAN
cases, node-spec-conformance), not failures.

Reach (`dispdiff.ts`, HEAD against the tree): templates none gained or lost; corpus 3 gained (ticked-desk), none lost;
about 80 refused nodes now name the refused Function behind their signal. **20 Did Mount effects** print in the shipped
templates (HEAD 0), 4 refused by name, 0 dropped.

Filed: **P18-S121-ONEUPDATE** (medium: inside one update the runtime runs at the end and per write), **P18-S121-SEEDTWICE**
(low: StrictMode re-seeds a Variable over a later mount write), **P18-S121-FRESHOUTPUTS** (low, 0 reach),
**P18-S121-STATENAME** (low, 0 reach).

**Next (BOARD lane 6):**
1. **"Hold the id"** (members-area Announcement and Meeting, the Site Builder's PageEditor): its id read by a Record
   ("its out-announcementId output is consumed outside the Run chain by an unrendered sink") and the second Function fed
   by the first ("JS-node chains are not translated"). `s119-fnchain-measure/dump.ts` on `templates/members-area
   Pages/Announcement` shows the graph.
2. **The senders the 18 remaining §87 Conditions wait on** (a Record verb's and Log In's / Sign Up's Failure chains, an
   External Link's Done).
3. P18-S120-TEXTAREA (small), P18-S118-NUMBERFIELD, P18-S121-ONEUPDATE, P18-S113-LISTLIVE, P18-S115-DYNPROBE; BUTTONLOOK
   and INPUTLOOK (low).
4. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 120 (2026-10-16, BOARD lane 6) built **the Evaluate-driven Condition** (P18-S120-SNAPCOND): a Condition with its box unticked that shows a confirmation or a refusal exports now, and the call in front of it with it. The Site Builder's contact form exports whole: Send sends the message and says whether it went.

## ✅ Session 120: the Condition remembers its answer

Read EXP-011 §87. In short:

| what | where |
|---|---|
| The idiom measured: every one in the shipped templates is a literal Condition (`true` shows, `false` puts away), Evaluate from a signal, Is True into a Group's or Text's Mounted; two often share one element. The corpus adds Visible | `s120-snapcond/census.ts` |
| The runtime measured: `null` reaches the element before the first Evaluate, over anything authored (so it starts hidden); every Evaluate sends again, same answer included; two Conditions on one element are last-pulse-wins | `s120-snapcond/condprobe.js` → `condprobe.out` |
| `snapshotVerdicts` (a fixed point: one Condition that fails takes the others on its element with it, naming the cause first), `snapshotCellOf` (one boolean cell per element port, `origin: 'condition'`, boots false) | `src/analyze/plan.ts` |
| Each Evaluate writes its answer into each cell before its arms; a literal one prints flat (`branch.flat`, expanded by `expandActions`), a wired one is a branch read at the press; Pass 4c binds the element to the cell | `plan.ts` `compileConditionBranch`, Pass 4c; `src/emit/component.ts` |
| Spec, 40 rows: §A the emitted page rendered with a `useState` stand-in against the runtime's own Condition and Switch running the same page (`tests/helpers/runtime-condition-arm.js`), 6 scenarios × 4 variants, a control that HEAD disagrees; §B shapes; §C refusals; §D arms and cells | `tests/the-condition-remembers-its-answer.test.ts`, `tests/fixtures/gate-desk` (from `s120-snapcond/gen-gate-desk.py`) |
| Drive, three arms, `EXPECTED.md` first, no backend: runtime == fixed in all nine steps; HEAD showed "Not yet" at load and never changed | `s120-snapcond/` |

- 🔴 **An arm that throws while the suite is collected reads "0 total", like a broken compile.** The export arm ran in
  the `describe` body, so mutant J (no writes, so no `onClick`) killed the suite rather than its rows. The arm is now
  caught there and rethrown in each row (`exportArmOrError` / `readingsOf`). Run the arm inside the rows, or catch it.
- 🔴 **A refusal's reason names the first feeder it finds, and that can be the partner it just refused.** The fixed
  point first named "Condition.result" (its refused twin) where the cause was a Switch. Name a feeder that is no
  snapshot first, then a refused partner by id.
- 🔴 **"Not drawn" was wrong for a Variable.** Check the port before the drawn-ness: a Variable's Value is not an element.
  `logic.test.ts`'s row wires into `noteDraftVar`, which is not a node of Mood; its sentence is "feeds a missing node.value".
- 🔴 **A fix can move EXP-008's floor.** `parameter-coverage` read `Condition.condition` as reaching (the probe wires
  Evaluate, refused before): it leaves the ledger's silent list and the floor rises 1,234 → 1,235 in the same commit.
- `innerText` drops `visibility: hidden` text; the drive reads each Text from the DOM as absent / hidden / shown.

Readings: `the-condition-remembers-its-answer` 40 / 40; twelve neighbours 375 / 375 (`logic` re-pinned, `hls001`
regenerated after predicting: 0 lines out, 17 in, gate-desk's). Package `tsc` 0. 14 mutant arms, each killing rows
(control 40 / 40). Whole package (`nice -n 19 --runInBand`, 438 s, JSON written 22:56): 134 / 136 suites, 4,765 passed. The
reds: `parameter-coverage` (the P121 peer's three uncommitted Upload File ports, as in s110–s119; that run also read
`Condition.condition` reaching, before the ledger moved, and the re-run after shows only the peer's three) and
`hls006-every-listener` (it scanned my two package copies under `packages/`; 4 / 4 once they were removed, straight after). Commit `71b0891e5`.

Reach (`dispdiff.ts`, HEAD against the tree): **26 template nodes** newly exported (18 Conditions, 5 Cloud Functions,
3 Functions: the Site Builder's ContactForm whole, members-area Account, Setup, Join, the Announcement's and Meeting's
confirmations), **115 in the corpus**, none lost. 18 of the 36 template Conditions still wait on their sender.

Filed: **P18-S120-TEXTAREA** (medium: a Text Area field exports as a one-line `<input type="textArea">`; 33 in the
shipped templates, the contact forms' message boxes among them).

**Next (BOARD lane 6):**
1. **P18-S119-TICKEDRUN**: a Run-wired Function that also runs on a ticked input (the PageEditor's and the members
   pages' "Hold the id"; the runtime's coalescing and first delivery).
2. **The senders the 18 remaining Conditions wait on**: a Record verb's and Log In's / Sign Up's Failure chains as
   handler chains, an External Link's Done, a Function fed by a component's output (landing-pages' "Write the email").
   `census.ts` with `V=1` lists them; `dispdiff.ts` over `templates/` and the materialized two measures each.
3. **P18-S120-TEXTAREA** (small: a `<textarea>` with the input's handlers), P18-S118-NUMBERFIELD, the 54 Functions whose
   reads sit partly off their own signals, GAM-009's remount rule, P18-S113-LISTLIVE, P18-S115-DYNPROBE, BUTTONLOOK and
   INPUTLOOK (low).
4. Not this lane's, for Richard: P18-S119-TOKENCLAIM and the ruling P18-S119-FIRSTWRITE asks.

---

# Next session — session 119 (2026-10-16, BOARD lane 6) measured **the Function-chain gap** and found it was something else: a Function run by an event whose own signals (`Outputs.go()`) drive actions was refused whole. Those signals run their chains now, reading the Function's outputs in the runtime's lockstep. 27 nodes in the shipped templates export that did not.

## ✅ Session 119: the Function says go

Read EXP-011 §86. In short:

| what | where |
|---|---|
| The gap measured: every wired filter stopped at a Function is a copy of the Site Builder (3 in the current template, not 42). Behind them: 134 Functions "consumed outside the Run chain by an unrendered sink", 130 of which send a signal of their own into an action | `s119-fnchain-measure/` (scripts + README) |
| `pulseChainsOf`: each consumed signal of a Run-wired Function is an arm (`jsfun-pulse`) inside one `jsfun-pulses`, first in the run's `then`. Refused by name, the Function's: a ticked/unset value box; one port fed by two signals. The signal's own: its chain does not compile. **A refusal refuses the signals, not the run** (`pulseRefusals`, read where the attach pass reports a trigger) | `src/analyze/plan.ts` |
| `scanActions` had no case for a Function's chains (a Cloud Function called from Done never earned its export); the control-state rule's eleventh family (a Function run from another element reads its `in-*` there) | `plan.ts` |
| `src/lib/functionRun.ts`: `functionNode(signals)` + `runFunction(body, inputs, node)`, the runtime's change test, held writes, C3 and C7 lockstep | `src/emit/functionRunLib.ts` |
| The wrapper takes `Outputs` as a parameter; a `useRef(functionNode…)` per pulsed Function; the run, then one `for … of <fn>Run.pulses` with an arm per signal; arms read `<fn>Pulse.values.x`, Done reads `<fn>Run.outputs.x` | `src/emit/component.ts` |
| Spec, 37 rows: §A `runFunction` against the runtime's own Function over 16 bodies (`tests/helpers/runtime-function-arm.js`), a control that "last value" is wrong on six; §B the fixture `tests/fixtures/pulse-desk`; §C refusals; §D a Cloud Function from a pulse | `tests/the-function-sends-its-signals.test.ts` |
| Drive, three arms, `EXPECTED.md` first, no backend: runtime == fixed in all six steps; HEAD did nothing on Send | `s119-pulse-drive/` |

- 🔴 **Measure the current template, not its copies.** The corpus held 18 stale copies of the Site Builder's PageEditor
  (made before SBR-016 ticked the query's box). `materialize.ts` writes any `*.content.json` out through the editor's own
  `ProjectExporter`; `templates/` holds the rest. The real surface was 27 template nodes; the corpus moved 0.
- 🔴 **A new refusal can take exports away.** The first version refused the whole run when a signal's chain failed; the
  disposition diff over the shipped templates showed 3 gram nodes going collapsed → deferred (HEAD exported them half,
  and reported the rest). Fixed by refusing the signals, not the run. Diff dispositions HEAD vs tree over `templates/`
  before calling a refusal safe (`dispdiff.ts`).
- 🔴 **A mutant that survives names a case you do not have.** Arm E (held writes not published) survived 15 cases: held
  vs "keep the last delivered" read the same unless a later write queues behind the held one. Added that case,
  predicted it, the runtime agreed.
- 🔴 **`compileJsRun` reads only the FIRST stray read** (`find`): a Function whose first stray sink renders materializes,
  and an unrendered stray behind it falls to pass 6's generic note. Not silent, but the reason is generic. Not changed.
- 🔴 `onEnter` has no DOM event in the export ("no DOM event equivalent"); a control that runs a Function from a field's
  own event must use Text Changed.
- Two bugs filed: **P18-S119-TOKENCLAIM** (high: the Site Builder's Setup sends `claimSite` on every keystroke of the
  token, before the account exists; the template ticks the box) and **P18-S119-FIRSTWRITE** (needs a ruling: reset then
  set before a signal hands the target the reset; visible in the drive). And **P18-S119-TICKEDRUN** (open: a Run-wired
  Function never re-runs on a ticked input in the export).

Readings: `the-function-sends-its-signals` 37 / 37; neighbours (jsfun, controlled-state, emitted-syntax,
cloud-function, stores-events, hls001 and the other Function specs) green; package `tsc` 0, strict and loose. Whole
package (`nice -n 19 --runInBand`, 494 s, JSON written 17:25): 134 / 135 suites, 4,708 passed, 2 failed, both
`parameter-coverage` on the P121 peer's three uncommitted Upload File ports, as in s110–s118. 17 mutant arms in a
copy, each killing rows (control 36 / 36, then 37 / 37). `hls001` regenerated after predicting: 0 lines out, 19 in
(pulse-desk). Commit `740d3ed36`.

**Next (BOARD lane 6):**
1. **The Evaluate-driven Condition**: a Condition whose box is unticked and whose Evaluate a call's Done or Failure
   sends, its result into a Group's or Text's Mounted ("its value outputs are snapshots of the last Evaluate… only a
   live comparator translates"). 36 in 11 components of the shipped templates (the Site Builder's ContactForm,
   landing-pages' Contact, todo-list's Sign in, eight members-area pages), 122 in the corpus (`snapcond.ts`). It is
   the next step on the Site Builder's contact form: Send → Function → `go` → submitContactForm now compiles, and the
   form stops at these two Conditions. Measure with `dispdiff.ts` over `templates/` and the materialized templates
   before and after.
2. **P18-S119-TICKEDRUN**: a Run-wired Function that also runs on a ticked input (the PageEditor's and the members
   pages' "Hold the id"; the runtime's coalescing and first delivery).
3. P18-S118-NUMBERFIELD; the 54 Functions whose reads sit partly off their own signals (§4f state read by a logic
   sink, Todo's commands); GAM-009's remount rule; P18-S113-LISTLIVE; P18-S115-DYNPROBE; BUTTONLOOK and INPUTLOOK.
4. Not this lane's, for Richard: **P18-S119-TOKENCLAIM** (the template's box; P77's template) and the ruling
   P18-S119-FIRSTWRITE asks.

---

# Next session — session 118 (2026-10-16, BOARD lane 6) fixed **P18-S116-FIELDMOUNT**: an exported text input announces its Value as it mounts, as the runtime's does. s116's drive re-run: the runtime and the export agree in every step, S0 included.

## ✅ Session 118: the field says what it holds as it appears

Read EXP-011 §85. In short:

| what | where |
|---|---|
| `FieldMountPlan` / `plan.fieldMounts`, registered beside the variable seeds: each rendered text input with a change chain, its `start` (the control boot's `String(startValue ?? '')`) and, where a sync effect carries a wired Value, its `source` | `src/analyze/plan.ts` |
| Refused by name in the notes (typing still runs the chain): the field or a group it sits in mounted from a wire; a wired Type; a Number field (→ P18-S118-NUMBERFIELD); a wired Value the export does not carry. Authored Mounted false on it or an ancestor: never drawn, nothing announced, nothing refused | `plan.ts` |
| One guarded mount effect per field (`announced` ref: StrictMode), after the sync effects: the field's own `changeHandlers` chain with `input-text` printed as the announced value (`announcedCode`), a wired Value coerced as the sync effect does (`undefined` → start, `null` → `''`, else `String`) | `src/emit/component.ts` |
| Spec, 31 rows: §A against the runtime's own field (`tests/helpers/runtime-field-arm.js`: GAM-009's corpus-graph + jsdom + `createRoot` harness in a child process; it records every Value write and Value Changed from the first paint), 8 authored + 7 wired cases; §B shapes; §C refusals | `tests/the-field-announces-at-mount.test.ts` |
| `withoutAnnouncement(page)`: neighbouring specs that are about something else on the page read it without the block (with its own control row) | `tests/helpers/fieldMount.ts` |
| Drive, three arms, `EXPECTED.md` first: runtime == fixed in every step; HEAD showed all eight vips at load | `s118-fieldmount-drive/` |

- 🔴 **A negative row is wider than its claim the day something legitimate lands in its population.** Six rows broke
  on the field's guard and its import: `not 'if ('` meant "no Condition branch", `not 'useRef'` "no timer ref",
  `not 'useEffect'` "no effect of its own". They now assert the claim (the page without the announcement, the call
  `useEffect(` and not the word an import carries). Check what a red negative row MEANT before re-pinning it.
- 🔴 **The fifth "0 total" mutant**, and the first one was the harness: the mutant copy lacked `coverage-ledger.json`
  (`src/ledger.ts` imports it), so even the control read "0 total". Copy the ledgers with `src`. Arm K as `if (false)`
  failed the typecheck too; reshaped as `if (node.id === '')`.
- 🔴 **A control row on a test helper caught my own arithmetic**: I expected the stripped page to lose 9 lines, it
  loses 8 (the block). The control is what said the helper works, not the rows that passed through it.
- 🔴 **This shell's `grep` skips some `.ts` files as binary** (`appState.ts` read as empty: "isTextInputType is
  defined nowhere"). Use `/usr/bin/grep -a`.
- ✅ **The runtime's React component can be graded from the export's jest**: a child process, ts-node with
  `jsx: 'react'`, jsdom by hand, the viewer's own node module through `createCorpusGraph`. Reuse
  `runtime-field-arm.js` for any other control's mount behaviour.

Readings: `the-field-announces-at-mount` 31 / 31; whole package (`nice -n 19 --runInBand`) 133 / 134 suites, the red
`parameter-coverage` (the P121 peer's three uncommitted Upload File ports, as in s110–s117). Package `tsc` 0. Thirteen
neighbour suites changed for this and only this: five hand-written targets carry the announcement, three import pins
gained `useRef`, six negative rows narrowed, `hls001` regenerated after counting (25 files, each the block and its
import only). Eleven mutant arms, each killing rows (control 30 / 30). Commit `f0562400f`.

**Next (BOARD lane 6):**
1. **The Function-chain gap**: 18 of the 22 Fetch-wired filters and 42 of §83's 84 read a Function's output ("a value
   that only exists inside a handler"). Measure what those Functions are first.
2. **P18-S118-NUMBERFIELD**: a Number field's Value as `outwardValueForFieldType('number', text)` at every read (21
   fields, 19 into a record's `navOrder`); then lift FIELDMOUNT's Number refusal (the spec's §C row says where).
3. GAM-009's remount rule in the export (§85.5.2, not measured); P18-S113-LISTLIVE; P18-S115-DYNPROBE;
   P18-S117-BUTTONLOOK and P18-S118-INPUTLOOK (low: read both with `getComputedStyle` first).

---

# Next session — session 117 (2026-10-16, BOARD lane 6) fixed **P18-S116-QUERYFETCH**: a Query Records whose Fetch is wired asks when Fetch is sent, from the sender's chain, and at mount only where the runtime does. Driven on a real backend: the runtime and the export agree on every row and request in six steps.

## ✅ Session 117: the query asks when it is told to

Read EXP-011 §84. In short:

| what | where |
|---|---|
| The Fetch as a handler action (`query-fetch`): `DbCollection2: 'storageFetch'` in `TRIGGER_PORTS`, `compileQueryFetch` at the sink dispatch, carrying the filter's wired values | `src/analyze/plan.ts` |
| When else it asks (`QueryPlan.fetchWired`): `mount` where the Class box is ticked or unset, the Query settings box with a setting authored, or a Page's Did Mount sends Fetch (`pageMountFetch`, consumed where the query lands); `onValues` where the wired values' boxes are ticked | `plan.ts` `fetchWiredOf` |
| §83's QUERYFETCH refusal gone; with Fetch wired an unticked value box is fine, disagreeing boxes refused by name | `src/analyze/querySettings.ts` |
| A later write in the same chain or handler to a value the filter reads, refused by name (the runtime's `scheduleFetch` reads after the pulse's writes) | `plan.ts` `lateQueryFetchWrite`, in `snapActionList` and at the DOM / receiver attach |
| `void fetch<Plural>(…).then(set<Plural>)`, the `where` from the values as the handler reads them (`city.get()`); an effect only where `queryHasEffect`; no `useEffect` / `useValue` a page no longer needs; a Fetch into a query not kept prints nothing | `src/emit/component.ts` |
| Spec, 38 rows: §A box by box against the runtime node's own setters (the child-process arm's new **creation mode**); §B emitted shapes; §C the handler's `where` vs `getStorageFilter`; §D refusals | `tests/the-query-fetch.test.ts`, `tests/helpers/runtime-query-arm.js` |
| Driven, three arms, `EXPECTED.md` first, a fresh backend per arm: runtime == fixed in all six steps; HEAD had no list, no request, no POST | `s117-queryfetch-drive/` |

- 🔴 **A drive whose arms share a backend reads its own leftovers.** The first run's export arm showed a Zed the runtime
  arm had created. The rows differed and the requests did not. That is a harness artefact, not a reading. The drive now
  starts the backend again before each arm.
- 🔴 **A handler is assembled wire by wire.** A chain-level guard in `snapActionList` never sees a button's sibling
  actions. Each DOM handler and receiver gets one wire's action at a time, so a rule about order within a handler has to
  be asked where `plan.handlers[...]` is appended.
- 🔴 **The fourth "0 total" mutant.** Arm M as `false && …` broke a narrowing and graded nothing. It was re-shaped as
  `… && query.nodeId === ''` and killed 4 rows.
- 🔴 **The whole-package run found a defect that the drive and the spec run before the last change could not.** Removing a
  page's now-unused `useValue` also removed the Variable's import. The handler-side import walker (`collectExprUse`, an
  if-chain by action kind) had no `query-fetch` case. The drive's page imported `city` through the box's own
  `city.set`, so the drive missed it. Re-run the whole package after the last emitter edit, not before it.
- ✅ The runtime arm can replay the node's own setters, not only its read methods. Creation mode records the boxes
  through `setRunOnValueChange` first, as `nodescope.ts` does, and then counts `scheduleFetch`.

Readings: `the-query-fetch` 38 / 38; `the-query-reads-its-wires` 140 / 140 (one row re-pinned: a wired Fetch is no
longer refused); `the-query-asks`, record, record-verbs, the-live-record, relation-verbs, filter-records,
hls001-corpus-identity, emitted-syntax all green; package `tsc` 0, strict and loose. Thirteen mutant arms, each killing
rows, in a copy removed straight after (control 178 / 178). Whole package (`nice -n 19 --runInBand`, 542 s): 131 / 133
suites; the reds were `parameter-coverage` (the P121 peer's three uncommitted Upload File ports, as in s110–s116) and
the import defect above, fixed and re-run green (`the-query-fetch` 38 / 38 and five neighbours 305 / 305).

**Next (BOARD lane 6):**
1. **P18-S116-FIELDMOUNT**: a text input's Value at mount (`outwardValueForFieldType(type, startValue ?? '')`) to each
   translated sink of it. Re-run `s116-queryparams-drive`: S0 should then agree. (`s117-queryfetch-drive`'s S0 already
   agrees: the box is unticked.)
2. **The Function-chain gap**: 18 of the 22 Fetch-wired filters and 42 of §83's 84 read a Function's output ("a value
   that only exists inside a handler"). Measure what those Functions are first.
3. P18-S113-LISTLIVE (20 of the 61 Fetch-wired queries tick Record changes); a query's Fetched / Failure chains (19 / 10
   consume them); P18-S115-DYNPROBE; P18-S117-BUTTONLOOK (low).

---

# Next session — session 116 (2026-10-16, BOARD lane 6) fixed **P18-S115-QUERYPARAMS**: a Query Records whose Filter reads a wired value builds its `where` in the page, and asks again when the value changes. Driven on a real backend. It reaches none of the corpus's 84 wired filters yet, and why is the next row.

## ✅ Session 116: the filter reads its wires

Read EXP-011 §83. In short:

| what | where |
|---|---|
| The runtime's translator, run once per combination of the wired values being set or unset (≤ 3 values), a marker for each set value; a marker must land whole under a plain comparison (`$eq` … `$gte`), else refused by name | `src/analyze/querySettings.ts` `wiredWhereOf`, `placeMarkers` |
| Each value's wire resolved with `resolveExpr` (the States `follow` path); consumed **before pass 6** for a query that lands (`queryLands`, shared with the disposition pass); a cycle guard | `src/analyze/plan.ts` `querySettingsFor`, `wireQueryValues` |
| One effect: `const where = <conditional per value> ;` `fetch<Plural>({ where, … })`, deps the values'; a render local is used as it is (`const x = x` was the first emit) | `src/emit/component.ts` `wiredWhereExpr` |
| `filterValue(value, dateColumn)` in the client: the translator's `parseValue` | `src/emit/emitApp.ts` `FILTER_VALUE_SOURCE` |
| Refused by name: wired Fetch (QUERYFETCH), unticked box, two wires, wired + typed-in, > 3 values, a marker outside a plain comparison, an unreadable source, a cycle | |
| Spec, 140 rows: §A evaluates the **emitted page's own `where` line** with the emitted `filterValue`, against the runtime node's `getStorageFilter` (the child-process arm now takes `values`) over 10 filters × 11 values / 12 pairs | `tests/the-query-reads-its-wires.test.ts`, `tests/helpers/runtime-query-arm.js` |
| Driven, three arms, `EXPECTED.md` first: S1–S4 runtime == fixed (same rows, same `where`); HEAD had no list | `s116-queryparams-drive/` |

- 🔴 **Measure the fix's reach, not the refusal's.** The row said 105 of 125. After the fix, 0 of 84 wired filters export
  on this machine. Each one stops earlier: 42 at a Function chain, 21 at a wired Fetch, 18 in a logic component, 3 at
  the clock. The mechanism is right and graded; the corpus needs QUERYFETCH first.
- 🔴 **The runtime arm found what no spec could.** At load the runtime queries twice, because the City box publishes
  `""` when it mounts (`TextInput.componentDidMount` → `setText`). The export's box writes only on `onChange`. That is
  the writer's defect, not the query's: P18-S116-FIELDMOUNT, 792 wires on this machine.
- 🔴 **Pass 6 runs before the query disposition pass.** A wire consumed in the disposition pass is already reported as
  "no deterministic translation". Consume before pass 6, under the same "lands" test.
- The CDP drive typed with `Input.insertText` and cleared with a Backspace key event, with
  `Emulation.setFocusEmulationEnabled` on the same connection.

Readings: `the-query-reads-its-wires` 140 / 140; `the-query-asks` 64 / 64; package `tsc` 0, strict and loose (the
editor's gate). Twelve mutant arms, each killing rows, in a copy removed straight after (control 204 / 204). Whole
export package: see the commit.

**Next (BOARD lane 6):**
1. **P18-S116-QUERYFETCH**: a wired Fetch is a handler action in its sender's chain (Did Mount, a record's Done, a
   row's Changed, a component input), reading the wired values at that moment. 112 of 281 Query Records; it unblocks
   21 of the 84 wired filters.
2. **P18-S116-FIELDMOUNT**: a text input's Value at mount (`outwardValueForFieldType(type, startValue ?? '')`) to
   each translated sink of it; GAM-009's remount rule. Re-run `s116-queryparams-drive`: S0 should then agree.
3. P18-S113-LISTLIVE (for a wired filter, match against the `where` of the current values); P18-S115-DYNPROBE; the
   Function-chain gap (42 of the 84; a JS node fed by another).

---

# Next session — session 115 (2026-10-16, BOARD lane 6) found and fixed **P18-S115-QUERYFILTER**: an exported Query Records fetched the whole class, whatever its Filter, Sort and Limit said. Driven on a real backend: the runtime and the fixed export show the same three rows.

## ✅ Session 115: the query asks for what the node says

Opened to do P18-S113-LISTLIVE. LISTLIVE needs the query's own filter and sort in the browser, and the exported query
had none: `query('<Class>')` with no parameters, silently. Measured on `puppy-test-3`: Filter (both shapes), Sort,
Limit/Skip, the Javascript filter, Search and Total Count all left the export byte-identical. Reach: 43 projects,
323 Query Records, 125 with a Filter (105 of them reading a wired value), 62 with a Sort, 12 with a Limit.
Read EXP-011 §82.

| what | where |
|---|---|
| The request, from the runtime's OWN translator at export time (`visualQueryToNeutral` / `savedFilterToNeutral` + `toParseWhere`), sort, limit and skip as the node computes them | `src/analyze/querySettings.ts` |
| `@noodl/backend-contract` added as a `file:` devDependency (bundled; one lockfile line) | `package.json`, `package-lock.json` |
| The refusals by name: JS filter, Search, a wired filter, sort or limit input, a wired filter value (QUERYPARAMS), a relation with no class, points-to, a filter the translator itself refuses | `querySettings.ts`; `plan.ts` `querySettingsFor` at the three read sites |
| `fetch<Plural>(params?)` only where a site passes them; an unfiltered query emits byte-identical output | `emitApp.ts`, `component.ts` `queryParamsLiteral` |
| Spec: 64 rows, runtime arm = the node's own `getStorageFilter` / `getStorageLimit` / `getStorageSkip` in a child process (ts-jest cannot typecheck the runtime) + `ParseWireAdapter.query`'s body | `tests/the-query-asks.test.ts`, `tests/helpers/runtime-query-arm.js` |
| Driven, three arms, `EXPECTED.md` first: runtime == fixed (Cleo, Eve, Gus; same body bar `count`); HEAD showed all ten | `s115-query-drive/` |

- 🔴 **"0 gap ports" was about static ports.** The probe varies `CatalogNode.inputs` of `translated` types. Query
  Records is `stubbed` in the coverage ledger (an exemption from before EXP-009), and every one of its inputs is
  dynamic. 63 translated picker nodes declare dynamic ports. Filed P18-S115-DYNPROBE.
- 🔴 **A mutant that breaks a narrowing grades nothing**, a third session running: arms I and M read "0 total". Every
  mutant runner now prints the Tests line, and "0 total" counts as a failed arm, not a kill.
- ✅ The runtime loads in a plain Node child (ts-node transpile-only), so a spec can call the runtime node's own
  methods on a stand-in `this`. That is cheaper than a NodeContext harness and stronger than restating the runtime.

Readings: `the-query-asks` 64 / 64; eleven neighbouring suites 397 / 397; `hls002-pack-and-run` 7 / 7 (the tarball
bundles the translator); package `tsc` 0, strict and loose. Thirteen mutant arms: twelve kill rows, and F is
equivalent (recorded). Whole package (`nice -n 19 --runInBand`, 424 s): **130 / 131 suites** once the mutant copy was
gone; the one red is `parameter-coverage` on the P121 peer's three uncommitted Upload File ports, as in s110–s114.
Commit `dd1a31c49`.

- 🔴 **A mutant copy in `packages/` turns a repo-wide gate red.** `hls006-every-listener` found
  `.nx-mut-s115/src/cli/serve.ts` as an unenrolled socket. Remove the copy as soon as the arms end, before any
  whole-package run; a peer running that gate sees it too.

**Next (BOARD lane 6):**
1. **P18-S115-QUERYPARAMS**: the `where` built in the app from wired values, re-run as each changes (105 of 125).
2. **P18-S113-LISTLIVE** on top of it: the store's events in the client, `matchesQuery` / `compareObjects` against
   the `where` and sort the plan now carries.
3. P18-S115-DYNPROBE; then P18-S112-NATIVESELECT, MOUNTPULSE, §77.5, the graph line.

---

# Next session — session 114 (2026-10-16, BOARD lane 6) fixed **P18-S113-IDBINDREAD** and drove it: a Record whose Fetch is unwired binds to the app's copy of its record, as the running app's does; it no longer reads the backend on every Id change.

## ✅ Session 114: the Id binds, it does not read

Read EXP-011 §81 for the whole record; in short:

| what | where |
|---|---|
| The bind: `useEffect(() => { … return subscribeRecord<T>(id, setRow); }, [id])`; unticked, `subscribeRecord(…)()` (the copy once at the bind). No request, no Error, no Done; an empty or unheld Id leaves the row as it was | `component.ts` `recordBinds` |
| A Done or Failure wired with Fetch unwired is refused by name (0 of 83 in the corpus); shared with `recordWillFire` | `plan.ts` `recordBindRefusal` |
| No `fetch<Type>ById` (and no "Source:") for a binding Record; no empty `import {  } from './client'`; held records ship wherever a Record binds | `emitApp.ts`, `RecordReadPlan.binds` |
| A `record-out` render read earns its row in both walkers (the read action had been the only earner) | `component.ts` |
| Spec: `record.test.ts` §B, eight rows; re-pinned rows in file-record, relation-pair, variable-seed, the-live-record | |
| Driven, three arms, `EXPECTED.md` first: runtime == fixed on every title in seven steps, 2 PUTs and no GET in both; HEAD made six GETs | `s114-idbind-drive/` |

- 🔴 **A mutant that does not compile grades nothing, again.** Arm B (`kind !== 'never'`) was a TS2367 and every suite
  "failed to run" with 0 tests. s113 recorded the same trap. Re-shaped as `(… || true)`. Shape a mutant so it compiles.
- 🔴 **A peer can be in your package.** `src/emit/style.ts` changed under this session (07:26, a narrowing fix in the
  Placeholder-opacity code): not ours, left out of the commit. The mutant arms ran in a copy (`packages/.nx-mut-s114`,
  `node_modules` symlinked, removed after) so no peer's run ever saw a mutant.
- **Re-measure a relayed sentence.** §43.3 says "outputs read undefined the moment a new Id arrives"; the runtime flags
  only the keys the new record holds, so outputs keep the old values (D5 measured it).

Readings: `record.test.ts` 34 / 34; `the-live-record` 21 / 21; HLS-001 4 / 4 after regenerating (8 hashes moved, as
predicted; with HEAD's three sources back, 4 / 4 on the old golden); package `tsc` 0; twelve mutant arms, each killing
rows (B and F only after the fixes above). Whole export package (`nice -n 19 --runInBand`, 430 s): **128 / 130 suites,
4,378 passed, 4 failed, 3 skipped**. Two failures were this change's: `relation-verbs` §17's two Record rows pinned
`fetchPuppyById` on a Fetch-unwired Record; re-pinned to the bind, that suite is 24 / 24 (the whole package was not
re-run after it). The other red is `parameter-coverage` on the P121 peer's three uncommitted Upload File ports
(`photoQuality`, `readers`, `shrinkTo`; total 1,399 vs 1,396), as in sessions 110 to 113.

**Next (BOARD lane 6):**
1. **P18-S113-LISTLIVE**: the store's create / save / delete events in the exported client (`bindStoreEvents`), with the
   query's filter and sort applied in the browser (`QueryUtils.matchesQuery` / `compareObjects`). Drive it with a runtime
   arm (`s114-idbind-drive/` is the newest harness).
2. P18-S112-NATIVESELECT; when P121 commits Upload File's three ports, classify them; the two `unexamined` ports.
3. Then the backlog: P18-S109-MOUNTPULSE, §77.5, the graph line, the 112 unprobed ports, the four low rows.

---

# Next session — session 113 (2026-10-15, BOARD lane 6) closed **EXP-008's last gap port, P18-S111-RECORDLIVE**, driven: reaching **1,233 → 1,234 of 1,396, 0 gap ports**. Found two rows of the same family on the way.

## ✅ Session 113: a Record shows the app's one copy of its record

Read EXP-011 §80 for the whole record; in short:

| what | where |
|---|---|
| The exported client holds one copy of each record, keyed by the id alone (`Model.get(id)`): `fetchOne` / `query` / `create` merge into it field by field (`_fromJSON`); `update` writes before the save, merges the answer, and puts back on failure (P107-C34). Shipped only where a live Record is | `emitApp.ts` `HELD_RECORDS_SOURCE`, `HELD_UPDATE_SOURCE` |
| A Record with "Record properties" ticked subscribes its row: `useEffect(() => … subscribeRecord(row.id, setRow), [row?.id])` | `component.ts` `liveRecordRows`; `plan.ts` `RecordReadPlan.live` |
| Spec, 21 rows (§C runs the emitted client against a scripted wire in the runtime's order); eight mutant arms, each killing its own rows | `tests/the-live-record.test.ts`, `tests/fixtures/record-desk` |
| Driven, three arms (runtime, HEAD-equivalent control, fixed) on a real backend: runtime == fixed on every title in every step | `s113-recordlive-drive/` |
| Fixed beside it: P18-S113-IDREADTWICE (an Update Record whose Id is a Variable read twice did not typecheck) | `component.ts` `api-call` |

**Found, filed (open):** **P18-S113-IDBINDREAD** (medium): §43's effect form (Fetch unwired) reads the backend on
every Id change; the runtime only binds to the copy it holds. Measured in the drive's run 1, and the published doc says
so. **P18-S113-LISTLIVE** (medium): an exported Query Records list never sees a create / save / delete made elsewhere;
the runtime's follows them (`bindStoreEvents`).

- 🔴 **An export drive owes a runtime arm.** §43's effect form passed its own 72-cell drive in s71, graded against a
  sheet written from the same misreading of `runOnValueChange: { controlSignal: 'fetch' }`. Only the runtime arm showed
  that the running app never reads on an Id change. The control signal governs whether the Id *rebinds*.
- 🔴 **A mutant that breaks a narrowing fails to compile and kills nothing.** Arm G first read 0: `cond` → `false` lost
  the narrowing that typed `action.errorState`. Change the leaf test, never the guard.
- 🔴 **The parser settles a box the way the editor does.** A wired Fetch with "Record properties" unstated is settled
  unticked (NDA-017's migration, `settleComponent`), so page-desk's wired Record is correctly not live. To drive a live
  wired Record, tick the box by hand (record-desk's Shown does).

Readings: `the-live-record` 21 / 21; HLS-001 4 / 4 (8 hashes moved, exactly `client.ts` + `Home.tsx` in the four
effect-form projects, plus record-desk); package `tsc` 0. Whole export package (`nice -n 19 --runInBand`, 382 s):
**129 / 130 suites, 4,375 passed, 3 skipped**; the one red is `parameter-coverage` on the P121 peer's three uncommitted
Upload File ports (`photoQuality`, `readers`, `shrinkTo`; total 1,399 vs 1,396), as in sessions 110 to 112. The first
whole-package run (on a source without the backend gate) was red in exactly the no-backend rows; see EXP-011 §80.3.

**Next (BOARD lane 6):**
1. **P18-S113-IDBINDREAD**: the effect form becomes a bind (the row is the held copy for the Id via `subscribeRecord`:
   no request, no Error, no Done). Moves the four effect-form fixtures (due/gallery/link/page-desk) and re-grades
   `record.test.ts`'s effect rows and §43.6. Drive it with the runtime arm (`s113-recordlive-drive/` is the harness).
2. **P18-S113-LISTLIVE**: the store's create / save / delete in the exported client, with the query's filter and sort
   applied in the browser (`QueryUtils.matchesQuery` / `compareObjects`).
3. P18-S112-NATIVESELECT; when P121 commits Upload File's three ports, classify them (P121-TWO001-EXPORTREADERS /
   -TWO003-EXPORTSHRINK); the two `unexamined` ports (Radio Button icon colour and size).
4. Then the backlog: P18-S109-MOUNTPULSE, §77.5, the graph line, the 112 unprobed ports, the four low rows.

---

# Next session — session 112 (2026-10-15, BOARD lane 6) closed **nine of the ten gap ports**: reaching **1,225 → 1,233 of 1,396**; one gap port left, **P18-S111-RECORDLIVE**. Found three new rows on the way.

## ✅ Session 112: the last silent parameters, each one rendered or measured first

Read EXP-008 § *Session 111* onward for the whole record; in short:

| row | commit | what |
|---|---|---|
| EVALATLOAD | `52318ee89` | An exported Expression holds what the editor's Result holds at load; unticked, still refused by name |
| NOWRAP | `d0c50d483` | **Rendered first** (`s112-nowrap-render/`): every exported Text wears the runtime's `white-space` arm by size mode, Text Overflow is carried, and `jsxText` keeps a typed line break (JSX turned it into a space). HLS-001: 103 CSS modules moved, 0 TSX |
| ROUTERSELF | `8ca7aef05` | **Counted first**: 1 Router of 227 authors any of the six. Url Path carried into the routes and every `navigate(…)`; Mounted and the Router's own Background / Clip / CSS Class / CSS Style **said** by name (`routerNotes`). No wrapper element (it would move every page's layout) |
| PLACEHOLDEROPACITY | (s112, see `git log`) | **Rendered first** (`s112-placeholder-render/`): fade 0.5 / 1 / 0.3 in the runtime, 1 / 1 / 1 at HEAD, 0.5 / 1 / 0.3 patched. A `:has(> option[hidden]:checked)` rule mixes the select's text colour toward transparent. The port is `gated`, not reaching: no probe context sets a placeholder |

**Found, filed:** P18-S112-FLEXELLIPSIS (runtime, medium: a Text set to Ellipsis never draws its "…", because the
runtime's Text is `display: flex`); P18-S112-BLANKURLPATH (runtime, low, measured on the real `matchPageFromUrl`:
a cleared Url Path `''` pushes `#/home` and matches nothing); P18-S112-NATIVESELECT (export, low: the exported
Dropdown is the native select, so its box is ~22 px not 32, the chevron is native, and its text is `FieldText` not
`--foreground`).

- 🔴 **A probe that sees nothing may be right.** The placeholder carry is real and rendered, and the probe still reads
  the port silent, because the rule only exists with a placeholder and no probe context sets one. That is `gated` by
  the ledger's own taxonomy; do not raise the floor for it, and do not build a probe context just to move a number.
- 🔴 **Read a node's own ports at emit time, not from a parse-time summary.** `RouterIR` is built once at parse; the
  probe and every spec vary the node's parameters. A carry that read `RouterIR` would have looked fixed to nothing.
- 🔴 **After `/clear`, the "peer" on your lane can be you.** This session found uncommitted lane-6 work three minutes
  old and a jest run under way, and treated it as a live peer, until a background task's notification arrived for a
  tool-use id in the pre-clear transcript. Check that before standing down.

Readings: the whole export package, run after each fix (`nice -n 19 --runInBand`): the only red each time is
`parameter-coverage` on the P121 peer's three uncommitted Upload File ports (`photoQuality`, `readers`, `shrinkTo`;
total 1,399 vs 1,396), as in sessions 110–111. NOWRAP's run also turned two hand-written targets red (PuppyCard,
sty004 AC4.7), which pinned a Text's exact CSS; both re-pinned to the arm each Text's size mode gives.

**Next (BOARD lane 6):**
1. **P18-S111-RECORDLIVE**, the last gap port: Record's "Record properties" box defaults ticked, and the exported client
   has no shared record cache, so a write elsewhere never reaches a Record. Sized as an EXP-011 section, not a cheap close.
2. **P18-S112-NATIVESELECT**: `color: inherit` beside `base.css`'s `font: inherit` closes the text colour (it moves every
   project's `base.css`); the box and chevron want `appearance: none` and the runtime's padding, rendered against the runtime.
3. When P121 commits Upload File's three ports, classify them (their rows P121-TWO001-EXPORTREADERS / -TWO003-EXPORTSHRINK).
4. Then the backlog: P18-S109-MOUNTPULSE, §77.5, the graph line, the 112 unprobed ports, the four low rows.

---

# Next session — session 111 (2026-10-15, BOARD lane 6) closed **seven rows** (six of the per-parameter check's ten gap rows, and -STORENOTES): reaching **1,215 → 1,225 of 1,396**, gap ports **21 → 10**. Next: the last ten, which are not cheap.

## ✅ Session 111: the silent parameters, cheapest first

Read EXP-008 § *Session 111* for the whole record; in short:

- **Refused by name** (each setter's own emptiness rule, each twin's sentence shape): Object / Record / Array Filter /
  Variable with an unticked Run On Value Change box (P18-S110-RUNONCHANGE, 6 ports; Record's only with Fetch unwired);
  Create Record's Upsert On; Set Record Properties' Only If Unchanged; a For Each whose Template Type is dynamic.
- **Carried:** Navigate's Open In New Tab → the runtime's own bare `window.open(url, '_blank')`; no `useNavigate`
  in a file that has no in-place navigate.
- **Said:** a Global Store declarer's notes reach the app notes and the report (`StoreNote`, routed in `emitApp`);
  a Run Tasks whose template declares its error output gets a per-node note that the value is dropped.
- **Reclassified, not reaching** (by construction, recorded): `For Each.templateScript` → `refused-with`,
  `RunTasks.taskErrorOutput` → `gated`. **Split out:** Record's "Record properties" box is a gap on its *ticked*
  default side, so no refusal closes it: **P18-S111-RECORDLIVE** (a shared record cache in the exported client).
- 🔴 **A probe that varies a box can only see the side it flips to.** Record's box defaults ticked and the export
  already behaves as if it were unticked, so varying it to `false` never moves the export: the gap is on the side
  the probe starts from. Read every remaining gap for which side holds the defect before refusing anything.
- 🔴 **Two rows are wider on the default side:** no exported Text has a `white-space` rule at all (P18-S110-NOWRAP),
  and a Dropdown placeholder's default opacity is 0.5 (P18-S110-PLACEHOLDEROPACITY). Both are written into the rows.

Readings: `tests/silent-parameters-closed.test.ts` 18 / 18 (mutant controls: weakening each fix turns exactly its own
cases red, 2 and then 3). `parameter-coverage` red on exactly the P121 peer's three uncommitted Upload File ports
(`photoQuality`, `readers`, `shrinkTo`; total 1,399 vs 1,396), as in session 110. At HEAD's catalog the ledger is exact:
silent 59, floor 1,225. Package `tsc` 0, and the specs typecheck. Whole export package (`nice -n 19 --runInBand`, 446 s):
**124 / 125 suites, 4,168 passed, 3 skipped**. The one red is that same gate on those three ports.

**Next (BOARD lane 6):**
1. **P18-S110-EVALATLOAD**: read `plan.ts` ~:6055's old refusal first (the row says it predates GAM-001 and also
   drops a value at the default).
2. **The Text `white-space` rule** (NOWRAP, widened): one rule per arm in `emit/style.ts`, then regenerate HLS-001
   and count the diff. Render one Text with a typed line break on both sides first: the row's default-side claim is
   from reading, not yet from a render.
3. **Dropdown placeholder opacity**: carry it (module CSS on the empty option being checked, text only) or note it on
   every placeholder Dropdown. A ruling for Richard only if the carry turns out to cost visual fidelity elsewhere.
4. **-ROUTERSELF** (6 ports, a Router's own box), **P18-S111-RECORDLIVE** (sized as an EXP-011 section).
5. When P121 commits Upload File's three ports, the gate asks for their classification (their rows
   P121-TWO001-EXPORTREADERS / -TWO003-EXPORTSHRINK are the `gap` rows to cite). Then the 112 unprobed ports, and the
   backlog session 110 listed (MOUNTPULSE, §77.5, the graph line, the four low rows).

---

# Next session — session 110 (2026-10-15, BOARD lane 6) built **EXP-008's per-parameter check**: **1,215 of 1,396 parameters reach the export (87.0%)**, 21 real silent drops filed as 10 rows. Next: close the gaps, cheapest first.

## ✅ Session 110: the per-parameter check

Read EXP-008 § *The per-parameter check* for the whole record; in short:

- **`tests/helpers/parameter-probe.ts`** varies every non-signal input of every translated picker node, re-runs `emitApp`,
  and reads whether the files or notes moved (a refusal sentence counts — silence is what it forbids); a silent port is
  retried under each boolean / enum sibling and under its whole panel group switched on. Contexts: alone on `cheer`'s
  Home, then fully wired, then every placed instance in the 57 fixtures.
- **`parameter-ledger.json`** holds the 69 silent ports, each adjudicated against the runtime (gap 21, gated 21,
  refused-with 23, inert 2, unexamined 2), and the 112 unprobed ports with their types. **`tests/parameter-coverage.test.ts`**
  (9 specs, ~40 s) holds both lists to the measurement BY NAME in both directions and the reaching count to
  `parameterCoverageFloor` exactly; a mutant emitter that drops Font Size is its control.
- 🔴 **The instrument had three traps of its own, each a false defect** (found because every silence was read against the
  runtime before filing): `indexPageStacks` caches per IR object (fresh shallow copy per emit now), a childless Drag never
  draws, a Router added after parse is not in `ir.project.routers`.
- **Filed** (all open, `node scripts/bugs.js --from "P18 EXP-008"`): P18-S110-ROUTERSELF (6 ports), -RUNONCHANGE (7),
  -NEWTAB, -EVALATLOAD, -DYNAMICTEMPLATE, -ONLYIFUNCHANGED, -UPSERTON, -TASKERROR, -NOWRAP, -PLACEHOLDEROPACITY; beside
  them -STORENOTES (a store plan's notes have no reader), -BREAKPOINTS, -VALUECHANGED.

Readings: the new spec on this checkout **7 / 9, red on exactly the predicted rows** — a P121 peer's uncommitted catalog
edit adds Upload File's `photoQuality`, `readers`, `shrinkTo` (all silent; total 1,399 vs 1,396). The ledger was measured
against HEAD's catalog, so it is green at HEAD; **when that peer commits the three ports the gate asks them to classify
them** (their own rows P121-TWO001-EXPORTREADERS / -TWO003-EXPORTSHRINK are the `gap` rows to cite). Package `tsc
--noEmit` 0. `bugs.js check`: 0 problems in the 13 new rows (90 pre-existing elsewhere). Whole-package export jest
(`nice -n 19 --runInBand`, 439 s): **123 / 124 suites, 4,150 passed, 3 skipped** — the one red is the new spec on exactly
those three peer ports.

**Next (BOARD lane 6):**
1. **Close the gaps, cheapest first.** Each closed or refused-by-name row leaves `silent` and raises the floor by the
   count §A prints. Cheapest: -RUNONCHANGE (the twins' refusal, four call sites), -NEWTAB (External Link's shape one node
   over), -ONLYIFUNCHANGED and -UPSERTON (refuse by name, or carry the option), -STORENOTES (route the notes).
2. The 112 unprobed ports: a probe value per structured type (array, object, component, stringlist…).
3. P18-S109-MOUNTPULSE; the Dispatcher's built-ins (§77.5); raising the graph line; rows P18-S106-PARSERAISE,
   -S104-FEEDCOUNT, -S105-KITHEAD (low), -S104-PACKRUNTIMENPX.

---

# Next session — session 109 (2026-10-15, BOARD lane 6) built **EXP-011 §79: Sign In With export** — picker **130 / 130**, the last row. Next: the per-parameter check before anyone quotes 100%.

## ✅ Session 109: §79, Sign In With

Read EXP-011 §79 for the whole record; in short:

- **The exported client gained the sign-in return leg** (`emitApp.ts` `authReturnLegSource`): ParseAuthAdapter's
  handover and `consumeAuthReturn`, run once when `src/api/client.ts` is evaluated, shipped where a Sign In With or a
  Request Magic Link can start a sign-in. The exchange is its own request, read as `_makeRequest` reads (not `request()`).
- **`src/lib/signIn.ts`** (`src/emit/signInLib.ts`, from session 109 scratchpad `signinlib/signIn.ts` + `gen.js`):
  the launcher and the receiver; **table row 14**. A return read at mount sets values and raises but calls no listener,
  because the runtime reports it before `nodescope` attaches the wires.
- **Graded:** `tests/the-sign-in-with.test.ts` (§B 36 page loads against the runtime's own adapter; §C 18 scripts against
  the runtime's own node in a `NodeContext`; mutants). **Driven** against the real backend through a real OIDC issuer
  (the backend suite's FakeOidcProvider plus a consent route), both arms: the control lands with the code unexchanged;
  the fixed arm signs in, Done fires, the session is stored, a deny shows the reason with no Failure pulse.
- **Found:** an exported magic link never signed anyone in (P18-S109-MAGICRETURN, fixed); in the runtime, a cancelled
  provider sign-in never fires Failure (P18-S109-MOUNTPULSE, open). The alpha sentence reads "All 130 nodes you can
  place export today." at a complete picker.

Readings: `the-sign-in-with` 72 / 72; HLS-001 red on exactly the predicted paths (the 56 projects' README for the alpha sentence, account-desk's `src/api/client.ts`, signin-desk's 21 new entries), golden regenerated and its diff counted (57 out, 80 in), green after; 20 floor pins moved; the eight re-pointed specs and the magic-link spec green. Whole-package export jest **123 / 123 suites, exit 0** (4,143 passed, 3 skipped; `nice -n 19 --runInBand`, 497 s). `export-ledger:check` OK (137 translated); `export-ledger:picker --check` holds at **130 / 130**; package `tsc` 0; editor `tsc --noEmit` 0 (empty log).

🔴 Run a whole-package suite as `nice -n 19 npx jest --runInBand`.

**Next (BOARD lane 6):**
1. **The per-parameter check (EXP-008's open question, §75.5 #3 / §79.6 #2).** 130 / 130 counts nodes; four parameter
   gaps were found green behind a `translated` row. One session: a per-parameter ledger check, so the number can be
   quoted.
2. P18-S109-MOUNTPULSE, if a runtime session takes it: the fix is in `signinwith.ts`'s `initialize`, and the export's
   mount read (`applyReturn(s, current, false)`) moves with it.
3. The Dispatcher's built-ins (§77.5); raising the graph line (t01's three, the harness clock, the one-component limit).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (low), P18-S104-PACKRUNTIMENPX. P121's sessions
   filed export rows of their own on 2026-10-15 (`node scripts/bugs.js --from P121`), uncommitted at this hand-off.

---

# Next session — session 108 (2026-10-15, BOARD lane 6) built **EXP-011 §78 part 2: Optimistic Update export** — picker **129 / 130**, graph line **10 of 85 conform, 17 played**. Next: §79 Sign In With, the last picker row.

## ✅ Session 108: §78 part 2, Optimistic Update

Read EXP-011 §78.6–§78.10 for the whole record; in short:

- **`src/lib/history.ts` grew the patches and the fourth node** (plain source: session 108 scratchpad
  `historylib/history.ts`, same `gen.js`, round trip byte-exact, 1,211 → 1,689 lines). `globalstore.ts`'s
  apply / commit / rollback / getOpenPatches over §78's seam (`ABSENT` kept apart; a rollback under a newer open patch
  hands it the value), then `optimisticupdatenode.ts`'s shell (supersession, oldest-open, the deadline, When Removed).
- **Table row 13**: Optimistic Value is the data port carried by Apply; Key / Error Message / Transaction Id / Timeout /
  When Removed are config; Store Name is the store module. No new refusal sentence.
- **Graded:** `tests/the-optimistic-update.test.ts` 18 / 18. The differential drives the **runtime's own node** in a
  `NodeContext` over its own `globalstore.ts` (300 scripts × 42 steps, 0 differ; 0 of 1,000 one-off), a reach control,
  three mutants caught. Fixture `optimistic-desk`. NSP-008: **t03's two clock-free scenarios play and pass.**
- **Found:** the export graph target drew `Math.random` from the real generator; it now installs the world's seeded one,
  as the runtime target does (the line moved by exactly the two). **One recorded difference**, pinned on both sides in
  §D: after an Apply with no Optimistic Value, a delete of the key supersedes the update in the runtime only.

Readings: whole-package export jest **122 / 122 suites, exit 0** (`nice -n 19 --runInBand`, 1,261 s); HLS-001 red on
exactly the predicted 77 paths, golden regenerated and its diff counted (56 out, 79 in), 4 / 4 after; 19 floor pins
moved; `export-ledger:check` OK (136 translated); `export-ledger:picker --check` holds at 129 / 130; package `tsc` 0;
editor `tsc --noEmit` 0.

🔴 **Run a whole-package suite as `nice -n 19 npx jest --runInBand`.** Richard (2026-10-15): `--maxWorkers=4` was
"murdering my CPU".

**Next (BOARD lane 6):**
1. **§79 Sign In With**, the last picker row. EXP-011 §45.6 / §75.5 #2: the exported client needs the return leg first
   (the runtime client's constructor consumes it, `_consumeAuthReturn`), then the node is a launcher plus a mount-time
   receiver. The backend has a GitHub provider (`auth/github.ts`); a drive of the redirect's return leg against the real
   backend is the grade. If a provider needs credentials Richard holds, that is a ruling to ask for in plain words.
2. The Dispatcher's built-ins (§77.5).
3. Raising the line: t01's three are the store translation itself; the harness clock's advance (t04 ×2, t03 ×1); the
   one-component limit (17).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (all low), P18-S104-PACKRUNTIMENPX.

---

# Next session — session 107 (2026-10-15, BOARD lane 6) built **EXP-011 §78: State History, Undo / Redo and State Snapshot export** — picker **128 / 130**, graph line **8 of 85 conform, 15 played**. Next: Optimistic Update (§78 part 2), then §79 Sign In With.

## ✅ Session 107: §78, the history family's three (`b629c2953`)

Read EXP-011 §78 for the whole record; in short:

- **`src/lib/history.ts`** (from `src/emit/historyLib.ts`): a **store seam** over `@nodegx/core`'s `store()` that gives
  the history what `globalstore.ts` gives the runtime's (changed keys, a write that changed nothing is no commit, a key
  filter, a deep snapshot with its by-reference keys, a full replace that deletes, the runtime's key order); then
  `statehistory.ts`'s manager near-verbatim over it; then the three node shells and their hooks. A deleted key is
  written as `undefined`. Generated from session scratchpad `historylib/history.ts` + `gen.js` (round trip byte-exact).
- **Store Name is the store module**: the hook is handed `store: app` and the component imports `../stores/app`;
  `appState.ts` counts the three as naming their store (`historians`). Refused by name: a wired Store Name; a store that
  defers as a whole. Target Index rides Jump To; Snapshot Name rides Save and Restore.
- **Graded:** `tests/the-state-history.test.ts` 20 / 20, including a differential against the runtime's own
  `statehistory.ts` over its own `globalstore.ts` and `model.ts` (300 seeded scripts × 30 steps, a reach control, two
  mutants it must catch). NSP-008: **t02's four scenarios play and pass** on the export.
- **Found:** the store's key order leaks into By-Reference Keys and a restore's Changed description (26 / 300 differed
  until the seam kept the runtime's order); the graph harness could not load `../stores/<name>` and had no clock — it
  now serves store modules over a cleared registry and installs the world's clock (no advance).

Readings: whole-package export jest 119 / 121 on the full run, the two reds counted and fixed: `streaming-trio`'s
table invariant caught Store Name missing from the row (now `StreamNodeSpec.store`; 60 / 60), and HLS-001 moved on
exactly the 54 README coverage sentences and history-desk's 20 files (golden regenerated, diff counted, 4 / 4).
`export-ledger:check` OK, 135 translated; picker 128 / 130; package and editor `tsc` 0.

**Next (BOARD lane 6):**
1. **§78 part 2, Optimistic Update** (`optimisticupdatenode.ts`, 822 lines, over `globalstore.ts`'s `applyPatch` /
   `commitPatch` / `rollbackPatch`). Build the patches on `history.ts`'s seam (a patch is a `writeKeys` with the values
   each key held before; overlapping patches hand values to each other). t03's two clock-free scenarios will grade it;
   its third needs the harness clock to advance. Same recipe: plain-source lib, a differential against the runtime's own
   `globalstore.ts` patches, the fixture, refusals by sentence, ledger + floor + the 19 floor pins + HLS-001 (55 → 56).
2. §79 Sign In With; the Dispatcher's built-ins (§77.5).
3. Raising the line: t01's three are the store translation itself (Global Store outputs not lifted; a number write to a
   number-typed key refused); the harness clock's advance (t04 ×2, t03 ×1); the one-component limit (17).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (all low), P18-S104-PACKRUNTIMENPX.

---

# Session 106's handoff (2026-10-15, BOARD lane 6) put the graph-scenario ledger line on P18's README, then built **EXP-011 §77: Action Dispatcher and Action Handler export** — picker **125 / 130**, graph line **4 of 85 conform, 11 played**.

## ✅ Session 106, part 2: §77 (`7c2a9ed1a`)

Read EXP-011 §77 for the whole record; in short:

- **`src/lib/actions.ts`** (from `src/emit/actionsLib.ts`): the runtime's registry and queue near-verbatim, both nodes'
  setters / values-before-signals / outcome contract / delete listeners, and `useActionDispatcher` /
  `useActionHandler`. One module-level registry, so the two meet across components by channel name. The lib was
  generated from a plain `.ts` (session scratchpad `actionslib/actions.ts` + `gen.js`); the array round-trips byte-exact.
- **Plan:** two STREAM_NODES rows. Refused by name: built-ins enabled or Enabled Built-ins wired, and a wired Result
  with Auto Complete on.
- **Found:** a streaming node nothing pulses whose own chain reads its own value read as "its trigger chain is cyclic"
  (§54's trap); the trigger-side loop now registers it. The graph harness now loads a lib's `./errors`.
- **Graded:** `tests/the-action-bus.test.ts` 24 / 24, including a seeded differential against the runtime's own
  `action-dispatcher.ts` (8 option rows × 60 scripts). NSP-008: t04's two Dispatcher scenarios **pass** on the export.

Readings: **whole-package export jest 120 / 120** (the full run read 119 / 120, HLS-001 red on exactly the corpus count
and 53 README coverage sentences; golden regenerated and its diff counted: 53 README lines out and in, action-desk's 19
added; HLS-001 4 / 4 after). `export-ledger:check` OK, 132 translated; `export-ledger:picker --check` holds at 125 / 130;
package and editor `tsc` 0.

🔴 **A peer's uncommitted edit sits in `packages/noodl-types/src/node-catalog*.json`** (Upload File's photo ports,
2026-10-14 20:17). It is not this phase's and was not committed; the HLS-001 run showed it moves no emitted byte.

## ✅ Session 106 (2026-10-15, BOARD lane 6): the second ledger line, pinned (`d2773e022`)

Session 103's report said "CONFORM" with 81 of 85 outside, and 67 of the 81 were the **harness's** limits, not the
exporter's. Three of them are lifted in `tests/helpers/node-spec-target.ts`:

| limit | now |
|---|---|
| a `set` step "is not drivable" | the set input is a Component Inputs port `<id>_<port>` wired into the node; `set` re-renders with the prop moved |
| any `world` puts a scenario outside | an **empty** world (`{}`) is admitted: it seeds nothing (25 scenarios declared `{}`); a seeding world is still outside |
| a node with no reducer spec is outside | the probe is built from the exporter's catalog ports (`graphPorts`) |

A scenario the exporter emits but whose observed outputs it will not lift is outside **in the exporter's words**, not
refused. The line is a pinned test in `tests/node-spec-graph.test.ts`, and it prints:

> P18 ledger: 2 of 85 graph scenarios conform on the export — 9 played (2 conform, 3 differ as declared, 0 known rows,
> 4 fail on filed rows); 30 outside on the exporter's verdict, 46 on this harness's limits

C10 now plays and passes. t07's four On App Error scenarios play and **fail**: the export's parsers never raise on the
app error channel. That is **P18-S106-PARSERAISE** (low, reach 0), and the four are pinned to it by name (`FAILING_ROWS`).
Of the 30 exporter-verdict scenarios, **9 are EXP-011's seven** (Action Dispatcher 3, State History 3, State Snapshot 1,
Optimistic Update 2), plus 3 more of theirs that need a world clock. The 46 harness limits: 23 seed a world, 17 need
more than one component (NSP-015 AC2), 3 advance a clock, 3 make a wire after mount.

Readings: node-spec-graph 7 / 7 exit 0; node-spec-conformance 6 passed, 2 skipped; package `tsc --noEmit` 0; editor
`tsc --noEmit` 0. The whole-package export jest was **not** run (only the helper and its two suites changed).

**Next (BOARD lane 6):**
1. **EXP-011 §78, the history family**: State History, Undo / Redo, State Snapshot, Optimistic Update (runtime
   `statehistory.ts`, `undonode.ts`, `statesnapshotnode.ts`, `outcome.ts`). They work on a Global Store, so the store
   module (`src/stores/<name>.ts` over `@nodegx/core`'s `store()`, which has no delete) is the seam. 6 graph scenarios
   (t02 ×4 incl. Snapshot, t03 ×2) sit outside on the exporter's verdict and will grade it; t03's third needs the
   harness clock. Same recipe as §77: measure the table fit, a plain-source lib graded by a differential, the fixture,
   refusals by sentence, ledger + floor + the 17 pins + HLS-001's count (54 → 55) in one commit.
2. §79 Sign In With; the Dispatcher's built-ins (§77.5).
3. Raising the line: the harness clock (t04 ×2, t03 ×1 and others) or the one-component limit (17).
4. Rows: P18-S106-PARSERAISE, P18-S104-FEEDCOUNT, P18-S105-KITHEAD (all low), P18-S104-PACKRUNTIMENPX.

---

# Session 105's handoff (2026-10-15, BOARD lane 6) CLOSED ISL-043 and ISL-035 and fixed RESPONSETYPE: five ledger rows, one commit each, export jest **119 / 119**.

## ✅ Session 105 (2026-10-15, BOARD lane 6): ISL-043 closed (8 / 8), RESPONSETYPE fixed, ISL-035 closed (2 / 2)

| row | commit | what it was, and how it was graded |
|---|---|---|
| P109-S21-EXPORTBLENDNAN | `aeb49e430` | A wired Blend Value prints `blendColorKept(<ref>, …)` over a per-node `useRef`, recorded by both walkers. 🔴 **The ledger's design was wrong about `undefined`:** `Node.sendValue` drops it, so an unset source delivers nothing and the runtime keeps blending with the blend it last *received*. The ref holds the last blend and the last colour; a NaN keeps the colour, and before any blend the colour is the colours at blend 0. Graded step by step against one `colorblend.ts` instance; NaN back in the parity grid; each walker red alone. Golden: 6 lines predicted, 6 counted |
| P18-S104-RESPONSETYPE | `86fca0a03` | The plan reads `responseType` (`value \|\| 'auto'`, unknown reads as Auto) and `httpFunction` emits the matching arm; JSON's bad-body sentence is read out of `httpnode.ts` by the test. Run against a stub `fetch` over every type. Golden 0 |
| P109-S15-ARRAYFILTERPATHEXPORT | `4c1800cb0` | A dotted filter key prints `rowField(row, "owner.id")`, the runtime's `fieldOf` appended as a hoisted function; graded against `fieldOf` cut out of `filtercollectionnode.ts`. Sort stays flat (the runtime's `sorter` is). Golden 0 |
| P109-S17-EXPORTKITDEPS (high) | `90ee40009` | `parseProject` asks the deploy injector itself (`toInjectModules`) for the dependency list; `index.html` gets a classic `<script>` per entry before the app. Graded against `buildInjectionTags` over the same project on disk. Golden 0. **Not done: a built, served export with the library seen running** |

ISL-043 and ISL-035 are closed in their task files (AC4: `node scripts/bugs.js --from P109` lists none of their rows).
Filed on the way: **P18-S105-KITHEAD** (low, reach 0 of 2001 manifests: `browser.head` / `browser.styles` dropped).
Checked and *not* a defect: HTTP Request's `conditional` (If-None-Match) is not exported, and the runtime's own port
description says the browser ignores it too.

Readings: export jest `Test Suites: 119 passed, 119` (exit 0, ~6 min) after the last fix; editor `tsc --noEmit` 0 after
each. **Any red in this package from here on is new.**

**Next (BOARD lane 6), in order:**
1. **The ledger line "N graph scenarios conform on the export".** 81 of 85 are *outside* today (session 103 below), and
   outside must not count as conforming. Read the outside reasons (`npx jest tests/node-spec-graph.test.ts`, the console
   block); most are the harness's limits (no world, one component, no `set`). Make more playable, then put the line on
   P18's ledger with played, conforming and declared-different counted apart.
2. **EXP-011's seven** (§77 Action Dispatcher / Handler first; then Optimistic Update, State History, State Snapshot,
   Undo / Redo, Sign In With).
3. Open P18 rows when a session has room: P18-S104-FEEDCOUNT (low), P18-S105-KITHEAD (low, reach 0),
   P18-S104-PACKRUNTIMENPX (noodl-preview's, the D82 mechanism).

---

## ✅ Session 104 (2026-10-14, BOARD lane 6): all four P18-S102 rows fixed, then 7 of ISL-043's 8. Export jest 118 / 118

| row | commit | what it was |
|---|---|---|
| NAVENCODE | `e767962a1` | The exported Navigate To Path transcribed the pre-D21 node. The query half is now encoded and a null is left out; the path half stays as written (D20). §15.7 reads the url back with `URLSearchParams` and runs the wired loop. |
| DATEHARNESS | `42d0f5530` | 🔴 **The stub hid a real defect.** With a real `require`, the export blanked a timestamp the app renders (ISL-032 / D14). The emitted `dateToString` now reads through `toDate`. Golden: 2 lines predicted, 2 counted. |
| CATALOGNAME | `3b02233b0` | The P109-S5 spec's stand-in file wore the real catalog's name. AC4's count is unchanged. |
| NOEXPORTCI | `1300fdbd2` | 🔴 **The premise was wrong.** CI does run this suite (`test:packages` scopes `@nodegx/export`). Nx **bailed** at `@nodegx/project-contract`, the first package and red on VERBSPECCED, and listed the other 19 "not run". The fix is `--no-bail`. It also found `@nodegx/node-kit-types` red (P18-S104-KITTYPESDRIFT, filed, P107's). |

Readings: whole-package export jest `Test Suites: 115 passed, 115` (exit 0, 543 s), package `tsc --noEmit` 0.
**Any red in this package from here on is new.** CI's `test:packages` job is still red (VERBSPECCED, KITTYPESDRIFT),
but each package's result can now be read in it.

**Then ISL-043, in the same session: 7 of its 8 rows fixed.** All eight still fired at HEAD (AC1).

| row | commit | note |
|---|---|---|
| SNAP | `0b313f736` | **Two** TDZs: the snapshot helpers became hoisted `function`s, and `chainSnapshots` / `chainSnapshotFor` moved above `statesPlanOf`. *Landing page test V2* and its 3 copies export; the shipped CLI's dry-run now exits 4 (it ran, with things left out), not 2 |
| D82 | `272fda402` | Reproduced off Windows with `env PATH=/nonexistent node build.mjs` (`spawnSync npx ENOENT`). tsc now runs via `process.execPath` |
| EXPORTBADBODY | `7ace943da` | Graded by running the emitted `fetchQuote` against a stub `fetch` |
| EXPORTDATEUNITWIRED | `86b7a744b` | `unitOrDays` in the emitted lib also fixes a *literal* unknown unit |
| VARIANT | `101041369` | An export-side `PRESET_MARKERS`, held equal to the editor's by a text-reading spec |
| EXPORTFEEDZONE | `5ae68f683` | D16 dates, plus D17. The differential's runtime side was a hand copy of the OLD node, so the drift was invisible |
| EXPORTSTATESRUN | `e4504cb99` | C22, plus D19 (which *did* reach the export) |

Filed on the way: **P18-S104-RESPONSETYPE** (medium: the export ignores Response Type entirely), **-FEEDCOUNT** (D18:
Items and Count de-duplicated by guid), **-PACKRUNTIMENPX** (the D82 mechanism in noodl-preview), **-KITTYPESDRIFT**
(P107's). Final readings: export jest **118 / 118**, editor `tsc` 0.

**Next (BOARD lane 6), in order:**
1. **EXPORTBLENDNAN**, the last ISL-043 row. The design is in its ledger file: a per-node `useRef`, recorded by
   **both** walkers (`collectExprUse` and `hookExprSources`). Then ISL-043 AC4 (`node scripts/bugs.js` lists none of its
   rows), and close ISL-043.
2. **P18-S104-RESPONSETYPE**, the one medium finding: an HTTP Request's Response Type is silently dropped.
3. ISL-035 (ISL-043's sibling).
4. For the ledger line "N graph scenarios conform on the export": 81 of 85 are *outside* today, and outside must not
   count as conforming (s103 below).
5. Then EXP-011's seven (§77 Action Dispatcher / Handler first).

---

## ✅ Session 103 (2026-10-14, BOARD lane 6): `P18-S102-GRAPHNOSPEC` fixed (`b01053e2b`). NSP-008 runs on the export again

**The cause was in the shared runner, not the export.** The export's `canPlay` already puts an unspecced node outside.
But `74a73de91` (P112 s8, 2026-10-11) made `runGraphScenarios` ask `graphReach` eagerly, beside `canPlay`. The
export's `graphReach` builds the graph, so it threw on the scenarios `canPlay` had excluded, and the run ended there.
Fixed in `nodegx-node-spec/src/runner/graph.ts` by putting the order back. A regression is in the node-spec kit
(`tests/graph.test.ts`, "a scenario canPlay puts outside is never asked its reach"): red on the eager line, green on
the fix.

**Under the throw, G1 was stale** from `8a177580d` (ISL-033 corrected C6; the export's atomic And was never declared).
It is declared now: c06 `divergence.export`, CONTRACT.md Part 2 C6 ⚠️ partial, and the node-spec gate's set is
C6/C7/C8.

Readings: the export graph runs 6/6 (**CONFORM: 1 passed, 3 diverged as declared, 81 outside, 0 failed of 85**).
That is ISL-043's instrument, working. Node-spec graph 129/129, runtime graph 102/102. **The whole-package export
jest reads `Test Suites: 3 failed, 112 passed, 115`**, and the three by name are `hls001-catalog-cardinality`
(CATALOGNAME), `date-family` (DATEHARNESS) and `navigate-to-path` (NAVENCODE). Any fourth red is new.

**Next, in order:** `P18-S102-NAVENCODE`, then `-DATEHARNESS`, then `-CATALOGNAME` / `-NOEXPORTCI`, then ISL-043.
For ISL-043, note that 81 of 85 graph scenarios are *outside* on the export, so only 4 are graded today (1 passed,
3 declared differences). "CONFORM" counts outside as conforming; the ledger line must not. The outside
reasons are all in the report (`npx jest tests/node-spec-graph.test.ts`, the console block). Most are the harness's
own limits (no world, one component, no `set`), not the exporter's.

---

## ✅ Session 102 (2026-10-14, BOARD lane 6): the owed gates are read and session 101's pile is COMMITTED

Everything below this section that says "uncommitted" or "owed gates" is history now: both gates ran. The
whole-package jest had 6 suites red. Two were the pile's (the 16th floor pin, and the HLS-001 golden that did not
know `pattern-desk`), and both are fixed in the same commit. Four are red at HEAD without the pile, each from
another phase. `test:ci` passed 3017 / 0. The record is in EXP-011 §76.5.

**Next, in order (BOARD lane 6):**
1. `P18-S102-GRAPHNOSPEC`: NSP-008 on the export throws on a node it has no spec for. This is ISL-043's instrument.
2. `P18-S102-NAVENCODE`: the exported Navigate To Path sends Query values unencoded. The runtime has encoded them
   since D21.
3. `P18-S102-DATEHARNESS`: date-family's runtime harness stubs `require`, so the export has gone ungraded since ISL-032.
4. `P18-S102-CATALOGNAME`, `P18-S102-NOEXPORTCI`: small.
5. Then ISL-043, and §77–§79 below.

`node scripts/bugs.js --from P18` lists them. The whole-package suite should read `Test Suites: 4 failed` (those
four, by name) until they are fixed. Any fifth red is new.

---

**(Session 101's hand-off, kept as written.)** Session 101's work was uncommitted at hand-off. Session 102 committed it.

## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 101 ran individual specs only (`the-pattern-extractor.test.ts`
39/39, the nine re-pointed no-rule specs 353/353, `browser-utilities.test.ts` 55/55 after the crypto verbs'
signatures changed, package `tsc --noEmit` 0, `export-ledger:check`/`--picker` both green) and the editor's
`tsc -p tsconfig.json --noEmit` (exit 0, empty log — the gate the §75 handoff owed). **It did NOT run the
whole-package `nodegx-export` jest (101+ files) or the editor's `test:ci`** — a peer session held the box for
the whole drive and no slot opened before this session closed. Session closed on the user's own instruction
("Close out here, just update docs") rather than push through a busy box.

## 🔴 The next session's FIRST job: the two owed gates, before building anything else

1. `cd packages/nodegx-export && npx jest` — whole package, once. Expect green: nothing under `src/` was
   touched after the individual specs above went green, and the fifteen `pickerCoverageFloor` pin comments
   were moved by the same session that moved the ledger's own number (never by hand). If it is NOT clean,
   that is this session's own miss — read the failing file's own reasoning before assuming a peer's collision.
2. `cd packages/noodl-editor && npx webpack-cli --config=webpackconfigs/webpack.test-ci.js && node scripts/run-electron-tests.js --ci` (`npm run test:ci`) — the editor's own gate, which typechecks this package's tests
   under a different tsconfig dialect (`the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests`).
   The plain editor `tsc --noEmit` already ran clean this session; `test:ci` is the one that has not.

Only after both read clean should the next session move to building a further row — building on top of an
unread gate is exactly the trap `a-read-before-pointer-is-a-precondition-not-a-label` and
`a-run-list-is-not-a-log` name.

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 |
| EXP-008 | ✅ `export-ledger:check` OK — **180 types, 130 translated, 32 deferred, 1 stubbed, 17 backend-only**. 🔴 Open: no per-parameter coverage (§75.5 #3 / §76.4 #4 restate it — do not quote 100% without it) |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **123/130 (94.6%)** — §76 built `Pattern Extractor`. **7 left**: Action Dispatcher, Action Handler, State Snapshot, State History, Undo / Redo, Optimistic Update, Sign In With |
| EXP-014 / 015 / 016 / 017 | 🟢 |

## What session 101 did (EXP-011 §76 — read it; this is the summary)

1. **Measured `Pattern Extractor` against `Hash`'s shape (§59) before writing anything.** Both are
   `crypto-call`: an action port, an outcome pair, a raise on Failure. The extractor differs in degree, not kind:
   SEVEN value outputs where Hash has one (each SEEDED by `initialize`, unlike Hash's row, which boots
   undefined), and a third signal pair — `Found`/`Not Found` — sent *before* `reportOutcome('done')`, so two
   more chain arms compile off one Extract. `CryptoNodeKind` widened to `'hash' | 'random-bytes' | 'pattern'`;
   `CryptoCallAction` gained `foundThen`/`notFoundThen` and `materializeByPort`.
2. **`src/emit/patternLib.ts` → emitted `src/lib/pattern.ts`**: one verb, `tryExtract`, transcribed from
   `stream-parsers.ts`'s `extractPattern` plus the node's own setters/getters. Generated from a real `.ts` file,
   typechecked strict with no ambient types, graded by a 5,280-cell differential against the runtime before
   being turned into the string-array form.
3. 🔴 **Found writing the differential, not by reading: every crypto-family call needed optional arguments.**
   The emitter already drops trailing `undefined`s (`tryHash()` for an unconfigured Hash), but `tryHash`/
   `tryRandomBytes`'s own signatures still *required* every parameter — so that printed call was one the
   exported app's own strict `tsc` refused. No existing gate caught it (`browser-utilities.test.ts` E2 asserts
   the printed text, never typechecks it). Fixed in the same session: both verbs' signatures now take optional
   arguments, with the reason at the call site.
4. **The fold whitelist's hazard, in the opposite direction from every prior instance.** §37/§59/§75 each found
   a row that NEEDED the `?? ''` fold and silently didn't get one. The extractor's rows are all seeded — never
   undefined — and the first emit printed `{percentError ?? ''}` anyway: a fold that was never needed, applied
   because `outcome-error`'s existing rule read `viaState !== undefined` with no way to say "and this one is
   seeded". Fixed with a `seeded` marker on the expression, read in both `plan.ts` and `component.ts`.
5. **Nine tests across the package had borrowed `net.noodl.Hash` or `net.noodl.PatternExtractor` as their
   "node with no rule" example** (§59 and prior sessions re-pointed some of these already, moving the target as
   each phase translated the previous one). Re-pointed to `net.noodl.user.SignInWith` — the next untranslated
   row down the §75.5/§76.4 order — and re-run 353/353.
6. **`tests/the-pattern-extractor.test.ts` 39 rows**: §A the fixture whole (17 files, pattern lib shipped,
   crypto lib absent, app typechecks, every row prints bare), §B the differential (11×12×8×5 grid, 5,280
   cells), §C nine wire-shape variations, §D nine refusals by exact sentence, §E the two findings pinned, §F
   the ledger and earned-not-shipped controls. Ledger: one row → translated, fifteen pins moved, floor 122 →
   123.

## Uncommitted at hand-off

**Everything from session 101 is uncommitted.** `git status --short` in the repo root shows, under
`packages/nodegx-export/`:
- Modified: `coverage-ledger.json`, `src/analyze/plan.ts`, `src/emit/component.ts`, `src/emit/cryptoLib.ts`,
  `src/emit/emitApp.ts`, and fifteen `tests/*.test.ts` files (the floor-pin moves and the nine re-pointed specs).
- New: `src/emit/patternLib.ts`, `tests/the-pattern-extractor.test.ts`, `tests/fixtures/pattern-desk/` (the
  fixture directory, incl. a `Components/MatchRow` template).

Also under `dev-docs/tasks/phase-18-code-export-v2/`: this file, `README.md` (headline number + the §3
strike-through), and `EXP-011-PICKER-COVERAGE.md` (§76 appended, §3's list amended).

PEERS' work, untouched and heavy, is also sitting uncommitted in the same working tree (unrelated to this
phase): `dev-docs/tasks/phase-78-the-templates/**`, `packages/nodegx-backend/tests/**`,
`packages/noodl-mcp/tests/**`, `package.json`/`package-lock.json`, and others outside `nodegx-export` and this
phase's docs. 🔴 **Commit through a temporary index with pathspecs that name only this session's files**;
never `git add -A` or a plain `git commit` on this tree (`commit-your-delta-through-a-temporary-index`,
`a-pathspec-commit-skips-untracked-files` — the new files above need explicit paths, not just the modified
ones).

## 🔴 Do this next (BUILD) — after the two owed gates in §76.3/above

1. **§77 `Action Dispatcher` / `Action Handler`** (`agent/action-dispatcher.ts` 963 + `actiondispatchernode.ts`
   673 lines) — an in-app bus; read `Send Event`/`Receive Event`'s translation first, it is the nearest shape.
2. **§78 the history family** — `State Snapshot`, `State History`, `Undo / Redo`, `Optimistic Update`
   (`statesnapshotnode.ts`, `statehistory.ts`, `undonode.ts`, `outcome.ts`). Two sessions; stateful.
3. **§79 `Sign In With`** — the §48 reason ("waits on a provider decision") is STALE: `nodegx-backend/src/
   auth/github.ts` exists and `RestAuthAdapter.signInWithProvider` is implemented. Needs a drive of the
   redirect's return leg (`_consumeAuthReturn`) against the real backend, not a spec alone.
4. **Before anyone quotes 100%:** EXP-008's per-parameter coverage question (§75.5 #3 / §76.4 #4) — one
   session on a per-parameter ledger check.
5. Still queued from earlier sessions: §74.5 #1 (the `unknown`-into-a-typed-store-key sink), §69.4 #1 (the
   cascade sentence), §71.5 (Richard's ruling).
6. **No drive was run this session** (§76.4 #6) — the built `pattern-desk` export has not been served/driven
   headless. Not blocking (the differential + emitted-app typecheck graded it), but owed before the row is
   called fully proved the way §59's utility-desk was.

## Earlier hand-off (session 100), kept for the record

# Next session — session 100 (2026-09-26) BUILT §75: the four parsers (`Parse CSV`, `To CSV`, `Parse XML`, `Parse Feed`) — picker **118 → 122 of 130 (93.8%)**, the first move on the headline number since GAM-013. Richard's ruling this session: *"Can we not finish the code export nodes? If we had 100% coverage that would be a big deal"* — **every remaining picker row is a target now**; §50.3's exclusion list is reversed (EXP-011 §3 and §50.3 amended, §75.0).

**Session 100's commit: `fcf68a1c7`** (feature); this handoff's own commit follows it.

## 🔴 Read this first — Richard, 2026-09-02: *"Stop fucking up the CPU."*

One heavy job at a time on this 16 GB box. Session 100 ran single specs, ONE whole-package jest (13 files red, all pins/goldens this
section moves, each counted first), a 14-file rerun, package tsc, the ledger gates and the dist build — and did NOT run the editor
tsc or `test:ci`, because a peer's headless Chrome drive held the box at load 16–22 for the whole gate window. **The next session owes
those two before it builds** (the editor's webpack typechecks this package's tests: `the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests`).

## The board, re-derived from the task files

| task | status |
|---|---|
| EXP-001 `@nodegx/core` | ✅ Published `0.1.0` (4 `0.1.1` rows carried) |
| EXP-002 / 003 / 005 / 006 / 007 | unchanged |
| EXP-004 | 🟡 built + driven; drill-down panel + the comprehension test remain (Richard's); §69.4 #1 |
| EXP-008 | ✅ `export-ledger:check` OK — **180 types, 129 translated, 33 deferred, 1 stubbed, 17 backend-only**. 🔴 Open: no per-parameter coverage (§75.5 #3 restates it — do not quote 100% without it) |
| EXP-009 / EXP-010 / EXP-012 / EXP-013 | 🟢 |
| EXP-011 picker coverage | 🟡 **122/130 (93.8%)** — §75 built the four parsers. **8 left, ALL targets by the 2026-09-26 ruling**: Pattern Extractor, Action Dispatcher, Action Handler, State Snapshot, State History, Undo / Redo, Optimistic Update, Sign In With |
| EXP-014 / 015 / 016 / 017 | 🟢 |

## What session 100 did (EXP-011 §75 — read it; this is the summary)

1. **Measured the shape first.** The four parsers re-parse on every arrival and hold nothing else — Tier 2.7's `util-call`, with
   SEVERAL value outputs each, so `UTIL_NODES` gained a trailing-selector field (`select: true`, `DATE_NODES`' idea) rather than the
   export gaining a kind. `Pattern Extractor` is NOT this shape (outcome-token action with `Found`/`Not Found` — `Hash`'s family, §59)
   and was deliberately left for its own section.
2. **`src/emit/parseLib.ts` → emitted `src/lib/parse.ts`**: `csv.ts`, `xml.ts`, `feed.ts` and the four node files transcribed; one
   helper per node answering the output named by its last argument; a one-entry memo per helper; typed overloads (`any[] | undefined`
   for a list, `number` for a count, `unknown` where it can be undefined). Generated from a real `.ts` file (typechecked strict, graded by
   the differential) into the string-array shape.
3. **The dependency decision the `Parse XML` ledger row said to take first — taken (§75.2):** the exported `package.json` earns
   `fast-xml-parser: 4.5.7` (the interpreter's exact pin) when a component calls `parseXml`/`parseFeed`. First third-party dependency an
   emitted lib has declared. `typecheckApp.ts` resolves it for real. Richard can overrule; the reasons are in §75.2.
4. **Plan/emitter clauses:** selector appended; `Changed`/`Failure` defer with the date family's recomputation sentence; `required`
   port unwired+unauthored defers with `dateReadExpr`'s sentence; a parser's code-editor text (`script` param) read as the literal it
   is; `To CSV` admitted as a named array's list reader; a parser's list output kept OUT of Pass 4c's `LOGIC_VALUE_OUTPUTS` so Pass 5 §4e
   binds it to a For Each; `listExprFields` knows a feed's twelve fields; the util import split by module; `withDependencies`.
5. **The one divergence, reported where it can happen:** on a failed parse the interpreter keeps the previous answer beside the Error,
   the pure call cannot — noted at a parser whose text is WIRED, never at a literal.
6. 🔴 **Found by the differential, not by reading: `feed.ts:365` hashes with a NUL byte** (a literal U+0000 between the quotes, drawn as a
   space). The emitted module writes `'\u0000'`; §A pins the runtime byte. Registered §75.5 #1, owner NONE, product side — **tell Richard**:
   a "fix the odd character" edit in the runtime silently re-mints every hash-rung feed id FED-002's index keys on.
7. **`tests/the-parsers.test.ts` 25 rows** (§A differential over 120 CSV cells, 16 To CSV shapes, every runtime XML/feed fixture × 3;
   §B translation rows and five refusals by sentence; §C `tests/fixtures/sheet-desk` typechecked whole). Ledger: 4 rows → translated,
   floor 118 → 122, twelve pins moved, subscribe-to-changes F2 rewritten (no scheduled row remains — pinned empty), relation-verbs'
   untranslated-feeder example is now `Pattern Extractor`, HLS-001 golden regenerated (49 README hashes + the new project, counted first).

## Uncommitted at hand-off

Nothing of session 100's after its commits (see `git log`). PEERS' work, untouched and heavy: `dev-docs/tasks/phase-78-the-templates/**`
(TPL-011 nightbook, a 600-file pile incl. `templates/planner-demo` deletions), `packages/nodegx-backend/tests/**`, `packages/noodl-mcp/tests/**`,
`scripts/devtools/drive-*.js`, `package.json`/`package-lock.json`. 🔴 Commit through a temporary index with pathspecs; never plain `git commit`.

## 🔴 Do this next (BUILD) — the order is by what a refusal silences and by runtime size

0. **Owed gates first:** editor `tsc -p tsconfig.json --noEmit` and editor `test:ci` on this tree (see the CPU rule above).
1. **§76 `Pattern Extractor`** — `Hash`'s shape (§59 `CRYPTO_NODES` / `crypto-call` / `crypto-out`), generalised: seven value outputs
   (`match`, `matches`, `groups`, `firstGroup`, `namedGroups`, `matchCount`, `error`), the outcome pair (`done`/`failure`, code
   `pattern-extractor/extract-failed`), PLUS `found`/`notFound` — two result pulses off one Do. Runtime: `agent/pattern-extractor.ts` +
   `agent/stream-parsers.ts` (`extractPattern`). One session; the crypto table's `node` union and single `output` are what have to widen.
2. **§77 `Action Dispatcher` / `Action Handler`** (`agent/action-dispatcher.ts` 963 + `actiondispatchernode.ts` 673 lines) — an in-app
   bus; read `Send Event`/`Receive Event`'s translation first, it is the nearest shape.
3. **§78 the history family** — `State Snapshot`, `State History`, `Undo / Redo`, `Optimistic Update` (`statesnapshotnode.ts`,
   `statehistory.ts`, `undonode.ts`, `outcome.ts`). Two sessions; stateful.
4. **§79 `Sign In With`** — the §48 reason ("waits on a provider decision") is STALE: `nodegx-backend/src/auth/github.ts` exists and
   `RestAuthAdapter.signInWithProvider` is implemented. Needs a drive of the redirect's return leg (`_consumeAuthReturn`) against the
   real backend, not a spec alone.
5. **Before anyone quotes 100%:** EXP-008's per-parameter coverage question (§75.5 #3) — one session on a per-parameter ledger check.
6. Still queued from s99: §74.5 #1 (the `unknown`-into-a-typed-store-key sink), §69.4 #1 (the cascade sentence), §71.5 (Richard's ruling).

---

