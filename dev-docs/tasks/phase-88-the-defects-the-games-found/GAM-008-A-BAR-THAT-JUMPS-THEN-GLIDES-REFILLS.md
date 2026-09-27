# GAM-008 — An animated value asked to jump and then glide does both

**Status: 🟢 built, session 10 (2026-09-14, over `1f5c10c5b`), uncommitted.** AC1 isolated the cause: the setter is handed
both targets, and one pass collapses to a glide. RKT-006's "one target" and "a duration of 0 is not a jump" are both
excluded. R9's `Jump To` and `Jump Value` are built, and so is C. AC3 is graded by 4 reverted arms, AC4 by a census and
A4, and AC7 by 7 A4 rows plus a CONTROL. AC5's person sentence was driven in a real browser on a minimal page: the
fixed runtime is full within 32 ms of every press and then glides, and the old and sabotage runtimes never refill.
**Left:** AC2, AC5's Défi clause and AC6, which are Rocket School and the P87 peer's files. The export hook does not translate a jump yet (it is refused by name). The MCP bundle is not rebuilt. See §8.
**Source:** [P78 D67](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-006](../phase-87-the-first-play-test/RKT-006-RESTART-FROM-INSIDE-THE-RACE.md), 2026-09-13 · **Side:** product (runtime, `Animate To Value`)

Rocket School's Défi countdown bar has never refilled for a new question, in any build since TPL-007 session 1. The
bar read 0.50 and 0.63 as a fresh question appeared. The graph wrote "full", then "empty", in one pass, and the bar
just kept gliding down from where it was.

## 1. The person sentence

**Someone builds a countdown bar that jumps to full and then empties, and every new question starts with a full bar.**

## 2. What was measured

Readings are re-read at HEAD `eb12ebe99` (2026-09-14) unless marked. Template readings are from the working tree over that commit.

| reading | where |
|---|---|
| **Seen, as recorded 2026-09-13, not re-driven.** A question reached by Next showed the bar at 0.50 and 0.63 (session 6's deploy `rocket-p3`). The press-dated clause: *"bar 0.47 → 0.45 over 608 ms; last full 15691 ms before Next was pressed"* | RKT-006 §5 (build 1, build 4); RKT-007 §2 |
| RKT-006's explanation: *"its Animate saw one target, and a target equal to its end value is ignored"*. Its duration claim: *"a duration of 0 is not a jump"*, which it marks **inferred, not measured**. Build 2 changed both things at once (`cdKick`, a 40 ms Delay between full and empty; the jump takes 1 ms), so **which change was needed is not isolated** | RKT-006 §5; `packages/noodl-mcp/tests/tpl007Components.ts:1081-1084`, `:1145-1147` |
| The first target is adopted outright. A target equal to `_animation.endValue` returns early. Any other target sets `startValue = currentNumber`, `endValue`, then `start()` | `packages/noodl-viewer-react/src/nodes/std-library/animate-to-value.ts:111-116`, `:117-120`, `:122-124` |
| `start()` only **queues** the timer, once per frame (`scheduleTimer` dedups). It joins at the end of the next frame. `startValue`, `endValue` and `duration` are read when frames run, never when they are set | `packages/noodl-runtime/src/timerscheduler.ts:43-50`, `:87-95`, `:179-195`; `animate-to-value.ts:58-61`, `:133-135` |
| ⚠️ **"One target" does not hold by source outside a node's first update.** `queueInput` keeps every value, and consolidates last-wins only while `_isFirstUpdate`. The drain delivers each queued value in order through `setInputValue` | `packages/noodl-runtime/src/node.ts:1223-1270` (`:1239-1266`), `:675-737` |
| The chained writes do land in one pass. `Set Variable.do` stores through `Model.set(…, {forceChange})`. `notify` is synchronous. Variable2's listener `flagOutputDirty`s, `sendValue` queues on every connection, and `done` then fires the next Set Variable | `setvariablenode.ts:137-146`, `:204-210`; `model.ts:343-349`; `variablenode2.ts:60-66`; `node.ts:814-835`; `outputproperty.ts:151-165` |
| ⚠️ **"Duration 0 is not a jump" is not supported by source.** A zero-delay timer runs `onRunning(0)` (the start value) as it joins. The next frame, `duration 0` gives `t = 1` and the end value. That is the same two frames as 1 ms. **Not measured** | `timerscheduler.ts:139-143`, `:185-195` |
| **What source predicts for the pre-build-2 chain:** target 100 then 0, duration 0 then the limit, all in one pass. `set(100)` starts a run. `set(0)` differs from 100, so it restarts from `currentNumber`, which is still the old bar. The frame then reads duration = limit, and the result is a glide **from where the bar was**. Under this reading the cause is that a jump and a glide in one pass collapse to the glide, and neither of RKT-006's two causes is needed. **RKT-006's reading also fits every recorded drive number. Nothing yet excludes either** | the rows above |
| The P30 audit ruled the equal-target return **correct** (✅ A3). The export transcribes it, and a parity row pins it | [audit/animation.md](../phase-30-node-library-audit/audit/animation.md) `:33`; `packages/nodegx-export/tests/animation-pair.test.ts:322`, `:332`, `:351` |
| The deprecated `Transition` sibling has `setCurrentNumber`, a jump action. Animate To Value has none | audit/animation.md `:115` |
| Workaround gated: `cdSetFull.done → cdKick.restart → cdSetDur` and `cdIn.stop → cdKick.stop` | `tpl007Template.test.ts:624-631` (working tree) |

## 3. Where it bites a person

Every countdown, progress bar, meter or "reset then animate" built from Animate To Value: a quiz timer, a
loading bar restarting for the next file, a health bar refilled on respawn. The first run looks right, and every later
one starts wherever the previous run was. A Défi child had no true picture of their time for a whole play-test, and
the drives only saw it once a clause dated the refill.

## 4. Related work and collisions

- **No owner found.** Greps over `dev-docs/tasks`: `Animate To Value`, `animate-to-value`, `animatetovalue`, `cdKick`, `equal.*end value`, `one burst`.
- ⚠️ **[EXP-011 §49.1](../phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md)** transcribes the node's semantics into the export
  ("a target equal to the current end is ignored"), and `animation-pair.test.ts` A4 grades parity. Any runtime change owes that row.
- ⚠️ **[P30 NDA-012 Animation](../phase-30-node-library-audit/audit/animation.md)** A3 ruled the equal-target no-op correct. Its B3
  (the first target never fires At Target Value) is an adjacent open row, not this one.
- [REACTIVITY-CONTRACT](../../reference/REACTIVITY-CONTRACT.md) `:47-50`: *"Coalescing the animation is fine; coalescing the notification to nothing is not."*
  Collapsing a jump into a glide falls on the "animation" side, so the contract does not settle whether this is a defect.
- [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md) D40 (no ticker) is why the clock is built this way. RKT-007 reads its numeral off this same Animate.

## 5. Design

Order by dependency: AC1 decides which door is needed, and each door below answers a different cause.

- **(A) A jump action.** A `Jump To` input (or `Set Current Value` + signal): set `currentNumber`, stop the run, flag
  `currentValue`, all synchronously. It mirrors Transition's `setCurrentNumber`. Existing graphs do not change.
- **(B) Duration 0 settles now.** A target that arrives while duration is 0 lands synchronously. It is closer to what
  authors expect, but it changes every graph that uses 0 today (its value publishes a frame earlier), and the last duration
  in a pass would still win.
- **(C) Say it.** The node's description and `get_node_type`: a jump and a glide written in one pass become the glide, so
  separate them by a frame or use (A).
- 🔒 **Richard: A, B, or A plus C?** A adds a port; B changes a timing people may depend on.
  > 🔒 **Ruled, 2026-09-14 (session 1): A plus C.** Add a `Jump To` action, and describe the one-pass collapse in the node's
  > description. — Richard
  >
  > ⚠️ **The ruling picks the door, and AC1 still runs first.** If AC1 shows that the collapse is not the cause (RKT-006's
  > "one target" reading survives), `Jump To` may not refill the bar. Then come back to Richard with AC1's numbers
  > before building.
- **Do not** remove the equal-target return. The audit ruled it correct, and without it a re-sent target restarts a run in progress.
- **Do not** add coalescing or de-coalescing to `queueInput` for this. The drain's semantics are the reactivity contract's.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, and it isolates the cause** (recorded in §8). A runtime spec boots the real node with a real `TimerScheduler` driven frame by frame, as A4 does, fed through a real `Set Variable → Variable2` chain. Arm 1: 100 then 0 in one pass after the node's first update. Record how many times the `targetValue` setter ran and with what, then the value on the next three frames (RED: never reaches 100). Arm 2: the same writes a frame apart (known-firing: reaches 100 and glides). Arm 3: a lone jump with duration 0 against 1 ms, frames to land. **§8 states which of the three readings in §2 the arms exclude.** |
| AC2 | **RED drive:** a Rocket School copy with `cdKick` removed (the pre-build-2 chain) fails `drive-rkt006-restart.js`'s press-dated clock clause. The unchanged build passes it: the control. |
| AC3 | The fix per the ruling: arm 1 of AC1 now reaches 100 and then glides. Sabotage arm: revert and arm 1 goes RED again. |
| AC4 | **Blast radius before landing.** If B: every Animate To Value in `library/prefabs`, `templates/`, the embedded templates and the P86 corpus whose duration is or can be 0, listed with its change. If A: `animation-pair.test.ts` A4 passes unchanged, and a render drive over the corpus shows no difference. |
| AC5 | **Person, real browser:** Défi, FR 1366×768 and 390×844, three questions reached by Next. The bar is full within 150 ms of each question and then glides, dated from the press. Built with the product door, not `cdKick`. |
| AC6 | **Workaround:** remove `cdKick` and `cdOne` in a copy, using the door, and run RKT-006's 12 cells plus RKT-007's clock clauses. Record whether the template keeps or drops them. `tpl007Template.test.ts:624-631` is updated to match, or kept with the reason in the gate. |
| AC7 | The export's A4 gains the new behaviour's row, and the interpreter and export agree. |

## 7. Traps

- 🔴 **A reading that fits is not one that excludes.** Both "one target" and "collapsed into a glide" produce 0.50 at Next. Only a counted setter call separates them.
- 🔴 **The first update consolidates last-wins** (`node.ts:1239`). A spec that writes both targets while the node is booting measures a different path.
- 🔴 **Server render freezes the clock.** A render-server read never moves; use the frame-driven scheduler or a browser.
- ⚠️ A single bar reading against a threshold grades how late the probe looked (RKT-006 build 2). Date the refill from the press, as RKT-006 build 4 does.

## 8. Record

### Session 10 (2026-09-14, HEAD `1f5c10c5b`, uncommitted)

Spec: `packages/noodl-viewer-react/tests/gam-008-a-bar-that-jumps-then-glides.test.ts`. It boots the real node in a
corpus graph behind a real `Set Variable → Variable2` chain (the pre-build-2 chain: Duration 0, Target 100, Duration
1000, Target 0). The node's two setters are recorded and then called unchanged. The clock is `graph.frame(16)`, which runs
`updateDirtyNodes` and then `runTimers`, as one browser frame does. Before every arm, a "previous question" (full, then
500 ms of glide) leaves the bar mid-run and the node past its first update. The spec asserts `_isFirstUpdate === false` (§7).

#### AC1: RED at HEAD, and the cause isolated

At HEAD, 2 of 8 failed: arm 1's person sentence, and arm 2 with a one-frame gap.

| arm | reading |
|---|---|
| **1**, one pass | The setter was handed **`[100, 0]`, both in the press frame**, and duration `[0, 1000]`. On frames 1–3 the timer read `start 47.2, end 0, duration 1000, running`. The bar read 47.2 on the press frame and 32.9 twenty frames later, and **never 100** |
| 2, full then empty 1 frame later | a glide from 52, maximum 52. **A frame apart is not enough** |
| 2, gap of 2 frames / 3 frames | 100 on frame 2, then a glide down (98.4, 96.8, …). Known-firing |
| 3, a lone jump, duration 0 / 1 ms | **both read 100 first on frame 2** (52 on the press frame) |

**What the arms exclude:**
- **RKT-006's "one target" is excluded.** The setter ran twice in the pass, with 100 and then 0.
- **"A duration of 0 is not a jump" is excluded.** 0 and 1 ms land on the same frame.
- **The cause is GAM-008 §2's collapse.** `set(0)` restarts from `currentNumber`, which no frame has moved yet, so the pass is one glide from where the bar was.
- **New:** a jump needs **two** frames, not one. The run joins by reading its start value, and lands on the next frame. Build 2's 40 ms Delay worked because it is more than two frames apart. Its 1 ms duration did nothing.

#### AC3: the door (R9 A)

Two inputs on `net.noodl.animatetovalue`, in group `Jump`: **Jump Value** (number) and **Jump To** (signal).
`animate-to-value.ts` `jumpTo()`:
- stops the run, which suppresses `onFinish`;
- sets `currentNumber` and flags `currentValue`, synchronously;
- if no target has arrived, adopts the jump as the end;
- then, in `scheduleAfterInputsHaveUpdated`, restarts from the jumped value **if the end differs from it**.

⚠️ **This is not §5's (A) sketch ("stop the run") alone. The measurement is why.** A jump that only stops the run
breaks whenever the new target equals the old end, and a countdown's does, since every run ends at 0. That `0` arrives in
the value pass, ahead of the jump signal, and is dropped as equal to the end. Reverted arm S1 (below) shows it.
Transition's `setCurrentNumber` has the same "carry on" shape. With it, the jump and the target can arrive in either
order in one pass.

**A jump is not an arrival:** At Target Value does not fire for it, so a countdown with At Target Value wired to "time's
up" is not told the time is up the moment it refills. This is a choice R9 did not make. It stops a spurious signal, and
it is the reverse of Transition's open B3 row. 🔒 Richard can overturn it.

AC3's spec arms all refill on the press frame and then glide, with the end at 0. They cover the jump wired before both
targets (off the press), between them (off Full is set), and after both (off Empty is set). They also cover a jump alone,
a jump before any target (it stays at the jump value, not running), and At Target Value's count (unchanged on the refill,
+1 when the glide settles). AC1's arm 1 and one-frame gap now pin the documented collapse, and arm 1 still has no jump.
**14/14.**

**Reverted arms.** `scratchpad/gam008/sabotage.js` writes each arm from a snapshot. The file was restored byte-identical
(`222ee829…` before and after).

| arm | sabotage | red |
|---|---|---|
| S1 | the jump never carries on | **2**: the jump after both, and the jump alone. The jump before or between the targets still passes, because the later target restarts the run |
| S2 | the jump does not move Current Value | **5**: every row a jump has to move |
| S3 | the jump sends At Target Value | **1**: the arrival row |
| S4 | no guard for a jump before any target | **1**: that row |

#### AC4: blast radius (A)

- `animation-pair.test.ts` A4's 7 existing scripts pass unchanged.
- **Census, known-firing beside the zero.** `net.noodl.animatetovalue` occurs 6 times in 4 files: `library/prefabs/progress-circle`,
  Rocket School's `Game/Race track` and `Game/Countdown bar`, and `docs/node-catalog/examples/anim-hover-highlight.json`. The embedded
  templates hold 0. **0** of those files carry a `jumpTo` or `jumpValue` name. maplibre's `map.jumpTo(...)` is a JS call, not a port.
- The only change on an existing path is the Target Value coercion moved into `numericOf()`, with the same `true`/`false`/`Number` rules.
  **A render drive over the corpus was not run.**

#### AC7: the export

- `animateLib.ts` gains `jumpTo()` and `carryOn()`, which are the node's `scheduleAfterInputsHaveUpdated` split in two.
- A4 gains 7 scripts: the countdown refill, a jump then a target, a jump then the same end, a target then a jump, a jump
  before any target, a jump onto the end (not an arrival), and a NaN jump. The interpreter and the export agree on every one.
- **A4 CONTROL (GAM-008):** a copy whose `carryOn` returns early disagrees on the countdown row.
- **Not translated:** the `useAnimatedValue` hook has no jump. `plan.ts` refused a wired `jumpTo` as *"not a port this
  node has"*, which is now false. It now refuses by name (*"its Jump To input is wired, and the export does not translate a
  jump yet"*), pinned in B13. The translation is P18's.
- `animation-pair.test.ts` **66/66**.

#### C: the description

- The port descriptions say that two targets in one update make one move, and point to Jump To.
- `docs/node-catalog/enrichment/net.noodl.animatetovalue.json` gains the collapse sentence, the two ports, and a countdown pattern.
- **The catalog was spliced, not regenerated wholesale.** At baseline, before any port existed, `catalog:check` was
  already red: the committed catalog drifts from source on **`net.noodl.controls.textinput` only**, which is GAM-009's
  uncommitted Text Input change. `docs:nodes:check` was red on the Options and Text Input pages.
- Only the `net.noodl.animatetovalue` entry was spliced into `node-catalog.json`, and `catalog:merge` wrote the enriched pair.
  `node-catalog.d.ts` is unchanged. The diff is this node only (`node-catalog.json` +25, enriched +32).
- `docs:nodes` regenerated the Animate To Value page. The two unrelated stale pages were restored from a snapshot.

| gate | result |
|---|---|
| `catalog:merge:check` / `catalog:groups:check` | exit 0 / exit 0 (the `Jump` group is accepted) |
| `catalog:check` | exit 1, **the baseline red** (Text Input, GAM-009's) |
| `docs:nodes:check` | exit 1, **the baseline 2 pages** (Options, Text Input). Animate To Value's page is no longer listed |

#### AC5: in a real browser, on a minimal page (Défi not reached)

**The page** (`scratchpad/gam008/project-refill`) has one *Next question* Button and two 300 px bars, both fed from
the same press:
- **door:** an Animate To Value with Target Value 0 and a 3,000 ms linear glide. The press fires **Jump To**, with
  Jump Value 100.
- **chain:** Rocket School's pre-build-2 chain, left as it was. Expressions feed four Set Variables, then two Variables,
  then an Animate. This is the known-firing half: it moves on every press in every arm.

A freshly bundled `deploy-from-disk` built the page: exit 0, `droppedByHealthFilter: 0`. The door's and the chain's
nodes are all in the output, counted with the globs quoted: `"jumpTo"` 1, `jumpValue` 1, `doorAnim` 3, `chainSetEmpty` 3. Three copies differ **only** in `noodl.deploy.js`:

| arm | runtime | sha | `jumpValue` in it |
|---|---|---|---|
| old | `src/external/deploy/noodl.deploy.js` as it stands (GAM-009's rebuild) | `ed604813…` | 0 |
| new | this session's source, `webpack.deploy.prod.js` into scratch | `9870a900…` | 3 |
| sab | arm S2 (the jump does not move Current Value), built into scratch, restored and `cmp`-checked | `c441a2b8…` | 3 |

[`scripts/devtools/drive-gam008-refill.js`](../../../scripts/devtools/drive-gam008-refill.js) (new) sends real CDP mouse
presses, each aimed with `elementFromPoint`. The page stamps each `pointerdown` and samples both bar widths every
`requestAnimationFrame`, so every reading is dated from the press on the page's own clock. There are 3 presses, 1,200 ms apart, at each viewport.

| arm | viewport | door: ms from press to full, presses 1 / 2 / 3 | door 600 ms after | door before presses 2, 3 | chain's widest ≤ 400 ms, presses 1 / 2 / 3 | console errors |
|---|---|---|---|---|---|---|
| old | 1366×768 and 390×844 | never / never / never | 0 | 0 | 300 / 182 / 109 | 3: *"Invalid connection, input doesn't exist … onClick to net.noodl.an…"*. The old runtime has no Jump To |
| **new** | 1366×768 | **28 / 32 / 32** | **245** | 183 | 300 / 182 / 109 | 0 |
| **new** | 390×844 | **32 / 31 / 32** | **245** | 183 | 300 / 182 / 109 | 0 |
| sab | 1366×768 and 390×844 | never / never / never | 0 | 0 | 300 / 182 / 109 | 0 |

- **Every press reached** in all 6 runs: 3 `pointerdown`s recorded, each aimed on the button.
- **Known-firing:** the chain bar refilled on press 1 and moved on every press, in every arm. **It is also D67 itself, in a
  browser:** presses 2 and 3 read 182 and 109, the collapse, whatever the runtime (documented, not changed).
- **The person sentence holds only in `new`.** The bar is full within 32 ms of every press (the clause is 150), having been
  at 183 px before it. Then it glides: 245 px at 600 ms is 3,000 ms linear.
- ⚠️ My first count of the wire in the deploy output read 0, because zsh left an unquoted `--include=*.js` unexpanded.
  That was a broken probe, not a reading. The quoted recount is above.
- **Not reached:** Défi, FR, three questions reached by Next. That is Rocket School, the peer's file, and it cannot be walked
  in a `deploy-from-disk` build.

#### Gates

| gate | result |
|---|---|
| GAM-008 spec at HEAD / after | 2 failed + 6 passed / **14/14** |
| `nodegx-export` `animation-pair.test.ts` | **66/66** |
| whole `noodl-viewer-react` suite | **112 suites, 1,479 passed, 1 todo**, exit 0 (session 9: 111 / 1,465; the difference is this spec) |
| whole `nodegx-export` suite, first run | 1 failed of 3,501: **HLS-001 AC3**, 2 files, `board-desk` and `glow-desk` `src/lib/animate.ts` |
| HLS-001 with HEAD's `animateLib.ts` put back | **4/4**, so the move is that file alone. Restored, `cmp`-checked |
| HLS-001 golden regenerated (`HLS001_REGENERATE=1`) | **2 hash lines moved**, those two files. 4/4 after. Recorded in the spec's header |
| whole `nodegx-export` suite, after | **101 suites, 3,500 passed, 1 skipped**, exit 0 |
| editor `test:main` | **7,522 / 7,522, 458 suites**, exit 0 |
| catalog gates | see C above |
| noodl-mcp suites, Electron `test:ci`, MCP bundle | not run |

#### Owed

- **AC2** (a red drive on a Rocket School copy with `cdKick` removed), **AC5's Défi clause** and **AC6** (removing `cdKick`/`cdOne`,
  `tpl007Template.test.ts:624-631`): Rocket School and its generator are the live P87 peer's. Rocket School also cannot be walked in a
  `deploy-from-disk` build (GAM-006 s5, GAM-009 s9). AC6's change is the pattern in the enrichment: `jumpValue` 100, and
  `cdGate.ontrue → cdAnim.jumpTo` in place of `cdSetDur0 → cdSetFull → cdKick`.
- `src/external` viewer, deploy and ssr bundles are not rebuilt, so the editor preview and deploys on this machine do not have Jump To yet.
- An MCP bundle rebuild, so the installed app's `get_node_type` shows the ports.
- P18: translate a jump in `useAnimatedValue`, or keep the refusal.
### Session 23, later — R28 ruled (2026-09-17, asked in plain words: the nine workarounds)

**Richard: *"Dunno."*** Decided by the builder, overturnable: **`cdKick` and `cdOne` are dropped.** A template is read as the way to
build something, and a kick-start the product no longer needs teaches a person to write it — the same reason an inert parameter in a
corpus example teaches a lie. The cost is real and is why this is recorded rather than done in the same breath: removal needs a
regeneration, RKT-006's 12 cells and RKT-007's clock clauses, and `tpl007Template.test.ts:624-631` updated. AC2 and AC5's Défi clause
are unaffected and still owed.