# GAM-017 — A kit React node takes a signal and a size the way a built-in node does

**Status: 🟢 built (session 22, 2026-09-17).** s1 in the bridge, z3 in the docs, as ruled; the export keeps a Click into a kit signal; AC7 done in Rocket School. **Left:** AC4's editor half. **Source:** [P78 D70](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-002](../phase-87-the-first-play-test/RKT-002-THE-LOOK.md) §6 AC4 and [RKT-003](../phase-87-the-first-play-test/RKT-003-ONE-SCREEN-PER-QUESTION.md), 2026-09-13 · **Side:** product (React bridge / node-kit types, docs and scaffold)

Rocket School's kit wanted a `Burst` signal and got a console error, so the burst became a number that rises. The kit
wanted a height and got no size port, so the Race Track is sized by a Group wrapped around it.

## 1. The person sentence

**A kit author can give a React node a signal that the component reacts to, and a width and height a person sets in
the property panel, by following the docs, with no workaround.**

## 2. What was measured

Read at HEAD `eb12ebe99`, 2026-09-14. Nothing was run for this file.

| reading | where |
|---|---|
| The burst became `Boost A` / `Boost B` numbers *"because a kit React node cannot take a signal (the viewer logs 'Signals not supported as a react prop')"*. `Game/Race track`'s root Group is 30vh, capped at 56vw. **As recorded 2026-09-13, not re-read.** | RKT-002.md:125-128; RKT-003.md:73 |
| **The message.** An `inputProps` entry whose type is `'signal'` logs *"Signals not supported as a react prop"* and gets no setter, yet it is **still registered as an input**. Re-read at HEAD. | `noodl-viewer-react/src/react-component-node.ts:1989-2011` (message at `:2004`) |
| 🔴 **It logs when the kit registers, not when a signal is wired.** The check sits in `createNodeFromReactComponent`'s loop over the definition. The runtime then gives the port a no-op `set` (`nodedefinition.ts:35-37`), so it shows in the editor, can be wired, and does nothing. D70 says "a signal wired into a kit React node logs", and the log in fact appears whether or not anything is wired. Re-read at HEAD. | as above |
| 🔴 **A React node *can* take a signal, through `inputs` with `valueChangedToTrue`.** The bridge copies `inputs` unchanged (`react-component-node.ts:1983-1986`), and the runtime makes such a port a signal (`nodedefinition.ts:108-113`). Built-ins do exactly this: Text Input's `inputs` block (`text-input.ts:124`, signals at `:146`, `:205`, `:215`, `:226`), Video (`video.ts:56-106`), Checkbox (`checkbox.ts:82-91`). **So D70's first half does not hold as written.** What fails is a signal declared as a *prop*. What is missing is a documented route from that signal into the component. Not run: AC1 arm (ii) checks it. Re-read at HEAD. | as cited |
| **The types invite the shape that fails.** `ReactInputPropDefinition` extends `Omit<InputPortDefinition, 'set'>`, so it accepts `type: 'signal'` and `valueChangedToTrue`. The docs show a signal input only on a logic node. No kit tool checks for it: a grep of `nodegx-kit-scaffold`, `nodegx-kit-catalog` and `noodl-mcp` src for a signal `inputProps` check finds 0. Re-read at HEAD. | `example-node-kit/types/node-kit.d.ts:563-567`, `:586-600`; `docs-site/docs/custom-nodes.md:357-379` |
| **Size: `frame` is live but unexercised, not absent.** `frame.dimensions`, `position`, `margins`, `padding` and `align` register the shared port groups, and a node with `frame` runs `Layout.size` / `Layout.align` at render. The bridge's own comment says *"Nothing in the repository sets this, so `useFrame` is always false"*, and the types call it *"unexercised in-repo … live but lightly travelled"*. No shipped module sets `frame:` (grep: 0). Re-read at HEAD. | `react-component-node.ts:903-917`, `:842-848`, `:418-431`; `node-kit.d.ts:645-660` |
| A kit visual node inherits Width and Height **outputs** (the measured box) and no size inputs. Re-read at HEAD. | `custom-nodes.md:206-214` |
| **Why a kit avoids `frame`:** `addDimensions` writes `width` and `height` into `inputCss`, and the React export reads only `inputProps` and `inputs`. So a `frame` size would work in the editor and vanish from an exported app. `nodegx-charts` is built around this. Re-read at HEAD. | `nodegx-export/src/parse/kitSource.ts:269-300`; P84 register **P40** (UNOWNED); FLD-015-WHAT-WAS-BUILT §2 rule 1 |
| **Not read:** whether `Layout.size` under `frame` honours `vh` / `vw`, which the wrapper uses, and whether the Race Track's box-shape rule (`kit.js:938-942`) reads a `frame` size correctly. | — |

## 3. Where it bites a person

- **Signals:** every kit node that should respond to an event (play, reset, celebrate, focus, scroll-to) either takes a
  counter number, as Rocket School did, or declares a prop signal. That prop signal registers, wires cleanly and does
  nothing.
- **Size:** every kit node gets its size from a wrapper Group. That wrapper is one more node in every component, and it
  is a second reason for GAM-014's wrap.

## 4. Related work and collisions

- **P84 register P40** (UNOWNED): the export ignores `inputCss`. Any size fix through `frame` or `inputCss` repeats that
  divergence unless P40 is fixed or this task reports it. 🔴 **Nothing owns P40, so this task either takes it or says so
  in its docs.**
- **P84 [FLD-015](../phase-84-the-defects-the-field-report-found/FLD-015-WHAT-WAS-BUILT.md) ✅:** `nodegx-charts` chose
  `inputProps` for size, on purpose. It does not address signals or `frame`.
- **P84 FLD-004 ✅** (`a34d215e2`): the main-axis report now lives in `layout.ts` `size()`. A `frame` node would start
  receiving `wired-dimension-becomes-grow`, which is correct, and is part of AC3.
- **Phase 69 CN-012 ✅:** kit **logic** nodes send and receive signals. That measurement did not cover React nodes.
- **DEBT-006** (cited at `react-component-node.ts:421-431`): kept `frame` because modules may use it.
- **[GAM-014](GAM-014-A-KIT-NODE-DRAWS-WHEN-IT-IS-THE-WHOLE-COMPONENT.md)** (the same wrapper Group) and
  **[GAM-015](GAM-015-A-WIRED-SIZE-REACHES-A-KIT-NODE-AS-A-SIZE.md)** (size through `inputProps` px).
- Grep run: `grep -rnai --include='*.md' "Signals not supported\|no size port\|size ports\|frame:.\{0,30\}kit\|kit.\{0,40\}frame" dev-docs/tasks`
  → RKT-002, D70, P40 and FLD-015.

## 5. Design

**Signals**
- **(s1) The bridge.** An `inputProps` signal gets an edge-triggered setter that bumps a counter prop and re-renders,
  which is the `Boost A` pattern moved into the product. Any shipped kit that already declares one starts receiving
  props (AC5).
- **(s2) Types, docs and a check.** Remove `valueChangedToTrue` and `'signal'` from `ReactInputPropDefinition`. Document
  `inputs` + `valueChangedToTrue` + a re-render as the route, add it to the scaffold, and have `verifyKitSource` refuse a
  signal prop by name.

**Size**
- **(z1)** Exercise and document `frame: { dimensions: true }` with a spec and a drive, and fix P40 so the export keeps
  it.
- **(z2)** Give every React node Width and Height inputs by default, like a Group. This adds ports to every existing
  kit's panel and changes the node-kit surface.
- **(z3)** Document the wrapper Group as the way, and close the "size ports" half as disproved.

**Rulings and guards**
- 🔒 **Ruling for Richard:** s1 or s2 (or both). And for size, z1, z2 or z3, given that z1 and z2 split the editor from
  the export until P40 has an owner.
- **Do not** remove the console error without putting a working route or a refusal in its place.
- **Do not** touch `layout.ts`'s percentage-to-`flexGrow` conversion (FLD-004's trap).

> 🔒 **R17** **Ruled (2026-09-17, s19, asked in plain words): signals (s1), the bridge makes a declared signal prop work** (an edge-triggered re-render). **Size (z3): document the wrapper Group** and close the "size ports" half as disproved; no ports added, P40 not needed.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Reproduced RED at HEAD**, in a small project with one minimal kit (not beside the library), deployed and driven. (i) A React node with `inputProps: { play: { type: 'signal' } }`: record the registration log, and that a Button's Click wired into it changes nothing. The same Click reaching a Text Input's Focus is the known-firing control. (ii) The same node using `inputs` with `valueChangedToTrue` that bumps a prop and calls `forceUpdate`: record whether the component reacts. This settles D70's first half. (iii) A node with `frame: { dimensions: true }`: record the ports the editor lists, and the rendered box for Width typed as 200px, typed as 30vh, and wired from a Number. The same node without `frame` is the control. |
| AC2 | The ruled signal fix. **Reverted arm:** undo it, and AC1 (i) reads RED again by name. |
| AC3 | The ruled size fix. **Reverted arm** included. A wired size either takes effect or raises FLD-004's report; it is never silently dropped. |
| AC4 | **Person sentence, in the editor and on a deployed page:** a kit written as the updated docs show reacts when a Button's Click is wired into its signal, and takes the Width a person types. The screenshots are looked at. |
| AC5 | **Blast radius:** for every `reactNodes` definition under `library/modules`, count its signal `inputProps`, `inputs` with `valueChangedToTrue`, and `frame` use. Record the registration log lines per module before and after, each module in its own small project (D41). |
| AC6 | **Export:** a kit size port that goes through the ruled route is present in the React export, or reported there by name. If P40 stays unowned, the docs say so in a sentence and this AC records that. |
| AC7 | **Workarounds:** decide whether the Race Track's `Boost A` / `Boost B` become a signal (keep the numbers if a child's count still matters), and whether the `Game/Race track` wrapper's 30vh / 56vw budget can move onto the node. Re-drive `drive-rkt003-stage.js`, and update the kit and template gates. |

## 7. Traps

- 🔴 **The log fires at registration.** A drive that asserts "no log after wiring" passes even when the port is still dead.
  Assert the component's reaction.
- ⚠️ `valueChangedToTrue` runs on a false-to-true edge. Two identical pulses in one frame can read as one, so drive two
  separated pulses.
- ⚠️ A fix proved only in the editor, with `frame`, has not shown it survives the export (P40).

## 8. Record

### Session 22 (2026-09-17, over `8c7f57a06`) — built, s1 + z3

**AC1, RED at HEAD, through the caller.** `noodl-viewer-react/tests/gam-017-a-kit-node-takes-a-signal.test.ts`: two kit definitions
handed to the real `createNodeFromReactComponent`, placed in a `createCorpusGraph` graph with a node whose signal output stands in for
a Button's Click, pulsed twice in separate frames, and rendered with real React from the props the bridge wrote.

| arm | HEAD, jest | HEAD, deployed page (Chromium, 2 real clicks) |
|---|---|---|
| (i) `inputProps: { play: { type: 'signal' } }`, wired | prop `undefined` after 2 pulses; `propPath` twin `undefined` | prop `undefined`, reacted 0, after both clicks |
| (i) registration log | 2 lines, one per signal prop, **before anything is wired** | `Error: Signals not supported as a react prop. node: 'gam017.SignalProp' input: 'play'` once, on load |
| (ii) `inputs` + `valueChangedToTrue` bumping a prop + `forceUpdate` (known-firing) | 0 → 2 | 0 → 1 → 2, reacted 2 |
| (iii) `frame: { dimensions: true }` | **not run**: R17 ruled z3 before the build, so no `frame` route is shipped | — |

- 🔴 **D70's first half is false as written, measured.** A kit React node takes a signal through `inputs` today (arm ii, both
  instruments). What was dead was the signal declared as a **prop**, which is the shape the types invite.
- §7's trap held: the HEAD log fires at registration, so "no log after wiring" would have read the same with the port dead.

**Built (R17 = s1, z3).**
- `react-component-node.ts`: `defineSignalInputProp`. A signal prop gets a `valueChangedToTrue` (so the runtime makes the port a signal
  and gives each instance its own edge detector) that adds one to the prop, runs an authored `valueChangedToTrue` if there is one, and
  calls `forceUpdate`. The prop is seeded at `0` where defaults are seeded. `propPath` honoured. The console error is gone because a
  working route replaced it (§5's guard).
- `@nodegx/node-kit-types`: `ReactInputPropDefinition` says a signal port hands the component a count, with the `useEffect` read and
  the same-frame edge caveat. The 5 gated copies refreshed from the scaffold (4 `library/modules` + pixel-game).
- `docs-site/docs/custom-nodes.md`: "A signal port hands your component a count" with a **complete** sample (`burst-kit/index.js`, compiled
  by `docsamples.test.js`, so the fragment budget stays 8), and "Sizing a kit node: put it in a Group" (z3).

**AC2, reverted arms** (count-asserted exact replace, sha-restored; `scratchpad/g17/mutants.py`). Fix: 5/5.

| mutant | red |
|---|---|
| M1 the HEAD branch put back (log, no setter) | 4: counts, unwired, re-render, log |
| M2 no `0` seed | 2: starts at 0, unwired |
| M3 no `forceUpdate` | 1: re-render |
| M4 `set` instead of `valueChangedToTrue` | 3: **counts 2 per pulse** (true and false both count), unwired reads 4, the port is not a signal |
| M5 `propPath` ignored | 1: the nested prop |

**AC3 (z3).** The docs section is the fix: a kit node has no Width/Height inputs, a person sizes the Group around it (`px`, `%`, `vw`,
`vh`, read from `node-shared-port-definitions`), and a size a number decides stays GAM-015's `readPx` port. No code, so no reverted arm.
A wired size that is not a size is FLD-004's report, graded by GAM-015's spec. **The "size ports" half is closed as disproved:** no
shipped kit sets `frame` (AC5), and none needs to.

**AC4, deployed half.** Same project, deployed with `nodegx-deploy.cjs`, the engine swapped for the fix bundle (the peer's dev stack
rebuilt `src/external/deploy` from the tree at 15:50; the HEAD arm is session 20's 12:02 bundle; told apart by the error call, 1 vs 0,
and `defineSignalInputProp`, 0 vs 2). Fix: wired signal prop 0 → 1 → 2 and reacted each time, the **unwired** copy stays 0, the
control agrees click for click, **0 console errors**. Screenshot looked at: `signal-prop 2`, `signal-prop 0`, `inputs-route 2`.
**Editor half not driven:** a peer's dev stack was up, and two editors cannot share the CDP port.

**AC5, blast radius.** Every kit under `library/modules` loaded in a stubbed VM: 28 kits, 24 loaded, 14 React nodes, **0 signal
`inputProps`, 0 `frame`**, 3 `inputs` signals (marquee's Pause/Play/Toggle, unaffected). The 4 that do not load headless (chart-js,
lottie, rich-text-editor, simple-tooltips) read from source text: their signals are `outputProps`, `inputs`, or the SDK's
`signals → inputs`; none is a signal prop. Templates' own kits: 3, 0 signal props, 0 `frame`. **So the registration log was 0 lines
per shipped module before and is 0 after; no shipped kit changes behaviour.** Not driven per module (nothing to read).

**AC6, export.** z3 needs no size port, so P40 is not reached (R17). 🔴 **Found, not registered:** `nodegx export` of this project
drops a Button Click wired into a kit signal **for both routes**: `wire fire:onClick->signalProp:play has no deterministic translation
in step 5 (deferred to EXP-003)`, one line in the report, and the generated `Home.tsx` renders `<SignalProp />` with nothing on the
Button. This predates the fix (arm ii's route reads the same). CLI `dist` of 15:22.

**AC7, not done.** Rocket School's `Boost A` / `Boost B` could become signals, but the Race Track reads "a count that went up" and a
signal prop now delivers exactly that count, so the kit change is small. Its game-kit copy must stay byte-identical to the library's
(`tpl007Template.test.ts`) and the template has 257 uncommitted files: waits on Richard's Rocket School question. The 30vh / 56vw budget
stays on the wrapper Group (z3).

**Readings** (2026-09-17): spec HEAD 4 red / 1 green (control), fix 5/5; viewer `tsc --noEmit` 0; whole viewer suite 120 suites,
1605 ✓, exit 0; `nodegx-node-kit-types` 83/83 (the new sample compiled); `nodegx-kit-scaffold` 74/74 (types-copy gate on the 5 refreshed
copies). Scratch: `6ec64024-…/scratchpad/g17/` (`head.log`, `fix.log`, `mutants.py` + `M*.log`, `census*.js/json`, `browser/project`,
`deploy-{head,fix}`, `drive-signal.js`, `drive-{head,fix}.json`, `drive-fix-shot.png`, `export/`).

### Session 22, later (2026-09-17) — the export half, and AC7

**Richard: "Why does the export drop something? Please fix it."** Measured cause (a subagent mapped it, then read at source): the
export's handler pass (`plan.ts` Pass 2) claims a signal wire only when the target port is in its hand-written trigger tables
(`TRIGGER_PORTS`, `isTriggerWire`, a Script's own signal inputs). A kit node's port can never be on one, so the wire fell to Pass 6's
catch-all note. And the generated kit runtime had no way to pulse a node: it never called `valueChangedToTrue`, and it did not seed
a signal prop.

**Built.**
- `parse/kitSource.ts`: an `inputs` port with a `valueChangedToTrue` is a signal whatever its `type` says (the runtime does the same).
- `analyze/plan.ts`: `isTriggerInto` accepts a kit node's declared signal input; `compileKitSignal` mints one pulse-count row per wired
  kit input (`useState<number>(0)`), binds it to the port, and the handler is `state-set` `op: 'inc'` (a functional update).
- `emit/kits.ts`: a signal input is typed `number`; the runtime seeds a signal prop at 0 (the bridge's seed); `KitNode` runs
  `valueChangedToTrue` once each time an `inputs` signal's count rises (the count it mounts with is where it starts), and does not hand
  that count to the component as a prop.
- Emitted page for the fixture: `onClick={() => { setSignalPropPlay((v) => v + 1); setInputsRoutePlay((v) => v + 1); }}`,
  `<SignalProp play={signalPropPlay} />`, `<InputsRoute play={inputsRoutePlay} />`, and the unwired copy untouched.

**Spec** `nodegx-export/tests/gam-017-a-click-reaches-a-kit-signal.test.ts` over the new fixture `tests/fixtures/kit-signals` (the
GAM-017 page; its `inputs` signal declares no `type`): the page (no drop note, a count per wired input, the Click increments each,
the unwired copy has none, `typecheckEmittedApp` `[]`) and the **generated runtime run in jsdom** with the kit's own script. HEAD: 5
red by name beside the known-firing row and typecheck green. Fix: 8/8.

**Reverted arms** (7, sha-restored; `scratchpad/exp/mut.py`): not a trigger 3 · a literal set instead of inc 1 · no binding 2 · no
seed 1 · no edge call 2 · parse ignores `valueChangedToTrue` 2 · mount count treated as a pulse 1. The first pass left three arms green
(the spec did not check the increment, the fixture declared `type`, nothing mounted above 0): all three closed before recording.

**Regression:** whole `nodegx-export` suite 104/105 suites, 3590 ✓; the one red was HLS-001's golden, counted before it moved: one
project added (`kit-signals`), and only `src/kits/runtime.tsx` changed in `kits` and `charts`. After: HLS-001 + custom-nodes + FLD-015
54/54, `tsc --noEmit` 0.

**AC7, Rocket School's Boost** (Rocket School regenerated, session 22): game-kit's `burstA`/`burstB` are signal props now.
The Race Track's burst code is unchanged, because a signal prop hands it the rising count it already read. The page wires each rocket's
right-answer gate straight into Boost; rocket A's Counter stays (the result line reads it), rocket B's is gone (nothing else read it).
The course's 30vh / 56vw budget stays on its wrapper Group (z3).
Driven: `drive-rkt003-stage.js --reward --keys` at 1366×768 FR/EN, ALL PASS (the per-round burst clause and the end's landing,
result and Play-again clauses); the burst screenshot shows sparks behind the rocket after a right answer. `tpl007GameKit` pins Boost as
`signal` with no default; the template gate pins `rpBoostA/B ontrue → rpTrack.burstA/B`.

