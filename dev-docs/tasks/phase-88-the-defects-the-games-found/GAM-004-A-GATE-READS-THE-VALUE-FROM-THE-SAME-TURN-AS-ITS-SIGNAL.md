# GAM-004 — A gate reads the value from the same turn as its signal

**Status: ✅ closed as measured and not reproduced (ruled 2026-09-16, session 17: "Close it"). Nothing built. Reopen only with a real game as evidence.** Earlier: 🟡 measured and not reproduced (2026-09-14). Session 3 ran 13 runtime arms. Session 6 drove TPL-005 in a real browser with real keys and attempt 1 restored on the hit gate. Each environment had a late arm beside it that reads late (§8). **🔒 Whether D47 closes as disproved is Richard's call.** **Source:** [P78 D47](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-005 the pixel game, while fixing D46, 2026-09-11 · **Side:** product (runtime ordering, `Condition`)

The enemy reaches you, the board says `calm`, and the heart comes off one move later. The graph looks right, it renders perfectly, and the author cannot tell this shape from one that works.

## 1. The person sentence

**Someone wires a Condition's value from one branch of the graph and its Evaluate signal from another. Either it tests the value from the moment the signal fired, or the editor tells them before they play the game.**

## 2. What was measured

HEAD `eb12ebe99`.

| reading | where |
|---|---|
| **As recorded 2026-09-11, not re-driven.** Twice, damage landed one move late. Attempt 1: `condition` from a reactive Expression `hits + attacks > 0` fed by two nodes, `eval` from one of those nodes' `success`. Attempt 2: `condition` from a Function that reads the enemy list back out of the Variable just written, `eval` from that Set Variable's `done` | [P78 D47](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) |
| **As recorded:** the fix collapsed both into one Function whose `out-hurt` feeds `condition` and whose `success` feeds `eval`. Damage has landed on the correct turn in every drive since. The two readings of the mechanism the register tried were both wrong | same |
| 🔴 **The failing attempts are not recoverable from git.** `tpl005Components.ts` has one commit, `84ca286e7` (2026-09-12), after both attempts. They must be rebuilt from the register's description | `git log -- packages/noodl-mcp/tests/tpl005Components.ts` |
| Every TPL-005 gate is a Condition with `runOnChange-condition: false`, so only `eval` triggers a test. Re-read at HEAD | [`tpl005Components.ts:223-232`](../../../packages/noodl-mcp/tests/tpl005Components.ts) |
| **The known-good controls at HEAD, re-read.** Hit gate: `plStepEnemies.out-hurt → condition`, `.success → eval` (`:1484-1485`). Death gate: Expression `hearts <= 0` fed by `Counter.currentCount`, evaluated by `Counter.countChanged` (`:1489-1491`). ⚠️ **The exit gate is attempt 1's shape and ships today:** Expression `plAtExit` (Variables `x`/`y` and `plPickLevel`) → `condition`, `plTakeCoin.success → eval` (`:1450-1457`). No row records it failing, and no drive here measured it | [`tpl005Components.ts:1440-1491`](../../../packages/noodl-mcp/tests/tpl005Components.ts) |
| Condition: `eval` schedules an after-inputs callback that reads `getInputValue('condition')` when it runs. Re-read at HEAD | [`condition.ts:159-189`](../../../packages/noodl-runtime/src/nodes/std-library/condition.ts#L159-L189) |
| `Node.update` pulls every connected source once at the top of each dirty pass (`_updateDependencies`). It drains pending values before pending signals (FB-025), then runs the after-inputs callbacks at the end of the pass. Re-read at HEAD | [`node.ts:635-748`](../../../packages/noodl-runtime/src/node.ts#L635-L748), [`:782-789`](../../../packages/noodl-runtime/src/node.ts#L782-L789) |
| A Function flags its outputs while the script runs, but sends `success` only **after `await func.apply(…)`**, which is at least one microtask later and outside the update that flagged them. Re-read at HEAD | [`simplejavascript.ts:166`](../../../packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts#L166), [`:330-336`](../../../packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts#L330-L336), [`:430-447`](../../../packages/noodl-runtime/src/nodes/std-library/simplejavascript.ts#L430-L447) |
| Set Variable's `done` fires after `variablesModel.set(…, {forceChange: true})`, and its doc says every reading Variable node *"has been notified"*. A Function **downstream** of that Variable still runs later, in its own scheduled async run. Re-read at HEAD | [`setvariablenode.ts:77`, `:207-211`](../../../packages/noodl-runtime/src/nodes/std-library/data/setvariablenode.ts) |
| **P80 DEF-046 and P75 FB-025 predate the measurement.** DEF-046 (`fc0ada95f`, 2026-09-03) and FB-025 (`27f16f8be`, 2026-08-27) were both in place when D47 was measured. Since 2026-09-11, `packages/noodl-runtime/src` has had FLD-004's three units commits and a one-line `eventsender.ts` change (`b690c444a`). **So no ordering change has landed since D47**, going by that `git log`. DEF-046 skips a re-run only for an unchanged primitive, which cannot make a value late. That is reasoned, not measured | `git log --since=2026-09-10 -- packages/noodl-runtime/src` |

**Candidate mechanisms from source. None is measured, and §7's first trap applies to all three.**

- **H1, async `success`.** The signal leaves after an `await`. Whatever reaches the gate's `condition` through another node's scheduled run (attempt 1's second producer, attempt 2's re-reading Function) can land after the Condition's callback has read. Fits the death gate, where Counter is synchronous.
- **H2, one pull per pass.** A value produced during another node's after-inputs callback queues on the gate after this pass's `_updateDependencies`, too late for the callback in the same pass.
- **H3, intermediate evaluation timing.** The Expression's own evaluation is an after-inputs callback on the Expression. Whether it lands before the gate's depends on which node the context updates first.

## 3. Where it bites a person

Any game or form whose decision reads a value computed beside the signal that asks for it: a score check after a Function, a validation gate after a save, a turn resolution. It is late by exactly one event, so it looks like a logic bug in the author's own script. The author's natural fix, adding an intermediate node, is the thing that causes it.

## 4. Related work and collisions

- **P75 [FB-025](../phase-75-0.2.1-the-feedback/FB-025-THE-RUN-THAT-READ-LAST-TIMES-VALUE.md), built.** Value-before-signal **within one node's queue**, and the `CONTRACT.md` C4 guarantee *"a value lands before the signal that follows it"*. D47 is across nodes and was measured after FB-025. Its specs (`test/fb-025-run-reads-the-value-beside-it.test.ts`, `test/node-signal-value-pairing.test.ts`) must stay green.
- **P80 [DEF-046](../phase-80-the-defects-the-templates-found/DEF-046-AN-UNCHANGED-VALUE-RE-RUNS-THE-NODE.md), built.** Compare-before-schedule in 17 value setters, including `condition.ts` and `expression.ts`. Checked in §2: it predates D47 and cannot delay a value.
- **P30 [NDA-017](../phase-30-node-library-audit/NDA-017-SIGNAL-INPUT-FRESHNESS.md), built.** Its editor rule `signal-driven-stale-input` ([`signalDrivenStaleInput.ts`](../../../packages/noodl-editor/src/editor/src/validation/rules/signalDrivenStaleInput.ts)) flags a control signal not reachable backwards from an async producer's completion signal. Attempt 2 (Function with `Success` → `condition`, `eval` from Set Variable `done`) may already be flagged. Attempt 1 (an Expression in between) is probably not. **Unmeasured. This is the likeliest home for a "documented rule" outcome.**
- Grep run: `grep -anl "different branch\|stale value\|values lose to signals\|signal before value\|value lands before the signal" -r dev-docs/tasks`. Hits beyond the above: P77 SBR-007, P14 PLAT-003-NOTES, P27 OPEN-WORK:62, P35 ERG-001/ERG-004. The matching lines are about other subjects. **No owner.**

## 5. Design

Isolation comes first. Nothing here is built until one hypothesis survives a measurement that excludes the others.

- **Runtime fix, if H1 or H2 holds.** For example, a Condition's `eval` callback defers its read until the sources it is connected to have no pending scheduled run. 🔴 That changes signal timing for every Condition in every project.
- **A documented rule, if the ordering is correct by design.** A Condition's `eval` description, CMP-001's doctrine, and `signal-driven-stale-input` widened to see through an Expression, or a sibling rule. It must fire on both failing shapes and on neither control.

🔒 **Richard, only once isolation has named the mechanism: is a Condition that tests a value from another branch owed that branch's latest value (a runtime change), or is it the author's job to wire `eval` from the value's producer (a rule and a diagnostic)?**

**Do not** state the mechanism in any doc before AC2 has excluded the alternatives. The register already carries two wrong readings. **Do not** reorder FB-025's drain.

## 6. Acceptance criteria

| AC | clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** Rebuild both attempts from §2 as runtime specs with the real Condition, Expression, Function, Set Variable and Variable. Assert the gate's test on turn N reads turn N−1's value. Known-firing controls in the same file: the shipped one-Function shape and the Counter death-gate shape both read turn N. If an attempt does **not** reproduce, record that. Never tune the rebuild until it goes red |
| AC2 | **Isolation matrix.** Each of H1, H2 and H3 gets an arm where it predicts differently: sync against async Function script, Expression against direct wire, a Variable round-trip against none, and the TPL-005 exit-gate shape. §8 records per arm which hypotheses it excludes, then names the survivor, or says none survives |
| AC3 | **Fix branch.** Both rebuilt attempts read turn N. Every control is unchanged. **Sabotage arm:** revert the change, and AC1 goes RED. FB-025, `node-signal-value-pairing`, `def046-unchanged-value-reruns` and `nda-017-signal-input-freshness` specs pass |
| AC3′ | **Rule branch.** The diagnostic fires on both rebuilt attempts. It is silent on the one-Function shape, the death gate and any correct exit-gate shape, beside one fixture where it fires. The Condition's `eval` description states the rule |
| AC4 | **Blast radius before landing (fix branch).** Count Conditions whose `condition` and `eval` come from different producers across `library/`, `templates/`, `project-examples/` and both corpora, and render/drive the corpus before and after. For the rule branch, the same census reports how many sites the diagnostic flags |
| AC5 | **Person, in a browser.** A copy of TPL-005 with attempt 1 restored for the hit gate: with the fix, driven with real key events, the heart comes off on the move the enemy reaches you. With the rule, the editor shows the diagnostic on `plHitGate` before play. The shipped template still passes its drive |
| AC6 | **Workaround.** Say whether TPL-005's collapsed `WORLD_TURN_SCRIPT` (`tpl005Components.ts:464-499`, `:1482-1486`) may be split again, and whether its header comment's mechanism sentence (*"can be evaluated before that value has arrived"*) matches what AC2 found. Correct the comment if it does not |

## 7. Traps

- 🔴 **A reading that fits is not one that excludes.** H1 fits all four recorded shapes, and so may H2. Only a differing arm counts.
- A spec using `settle()` or a timer can let the async `success` land and read green. Drive the update loop the way the runtime does, and state which.
- The exit gate is a shipped instance of attempt 1's shape with no recorded failure. Treat it as evidence to measure, not as proof that the shape is safe.
- Two identical turns cannot show lateness. A stale read of an unchanged value is correct by accident. Every arm must change the value between turns.
- DEF-046 suppresses a re-run on an unchanged primitive. An arm whose input repeats measures DEF-046, not ordering.

## 8. Record

### Session 3 (2026-09-14, HEAD `bb27086de`) — AC1 measured: **D47 does not reproduce at the runtime's source**

**The spec:** [`noodl-runtime/test/gam-004-gate-reads-the-same-turn.test.ts`](../../../packages/noodl-runtime/test/gam-004-gate-reads-the-same-turn.test.ts),
13 rows. Real `Condition`, `Expression`, `JavaScriptFunction`, `Set Variable`, `Variable2`, `Counter` and Component
Inputs/Outputs in `createCorpusGraph`. Every gate is `runOnChange-condition: false`, as every TPL-005 gate is. **The loop,
stated (§7):** a turn is one move and then `settle(8)`. That runs `updateDirtyNodes()`, then yields the microtask queue and
one macrotask before the next frame, which is where a Function's post-`await` `Success` lands in a browser. The answer
alternates every turn (odd turns hurt), so a stale read cannot be right by accident and DEF-046 never applies. Log:
session `04c88900…` scratchpad, `gam004/ac1-run6.log` (`AC1_RUN6_EXIT=0`).

| row | shape | reading per turn, 1–6 |
|---|---|---|
| control | shipped one-Function (`out-hurt → condition`, `success → eval`) | N N N N N N |
| control | death gate (Expression off `Counter.currentCount`, `countChanged → eval`) | N N N N N N |
| 🔴 **instrument** | `eval` from the move, `condition` written by a Function **after an `await`** | *(no prior)* **N-1 N-1 N-1 N-1 N-1** |
| instrument | `eval` from the move, `condition` from a **synchronous** Function the move starts | N N N N N N |
| attempt 1 | Expression `hits + attacks > 0` fed by two step Functions, `eval` from `hits.success` | N N N N N N |
| attempt 1′ | the same, `eval` from `attacks.success` | N N N N N N |
| attempt 2 | reactive read-back Function off the Variable just written, `eval` from `Set Variable.done` | N N N N N N |
| attempt 2′ | the same read-back waiting for `Run`, `Set Variable.done` firing it **and** the gate | N N N N N N |
| control | TPL-005's own `Game/Move` component (x → `done` → y → `done` → `moved` through Component Outputs): x after turn N | 1 2 3 4 5 6 |
| control | shipped one-Function, behind the real move, reading `px` from the Variable | N N N N N N |
| attempt 1 | behind the real move | N N N N N N |
| attempt 2 | behind the real move | N N N N N N |
| exit gate | the shape that ships today (Expression off the Variable, `eval` from a step Function's `Success`) | N N N N N N |

**The reverted-FB-025 arm.** FB-025 (`27f16f8be`) is a *signal before value, for the life of the node* fix, which is
exactly a one-turn-late shape, and whether the viewer bundle driven on 2026-09-11 carried it is unrecoverable. So its
`node.ts` hunk was reverse-applied (it applies clean at HEAD) and the spec re-run: **13/13 identical** (`ac1-olddrain.log`,
`OLDDRAIN_EXIT=0`). `node.ts` was restored from a snapshot, `git diff --quiet` clean, sha `858be30c…` before and after.
**A runtime missing FB-025 does not make these shapes late either.**

**What this reading does and does not say.**
- It says the two gate shapes the register describes are on time in the runtime, at HEAD and on the pre-FB-025 drain,
  with or without the real move upstream, beside an instrument that does read a late gate.
- It does **not** exclude D47. Three things the rebuild could not carry: the **browser** (the `keyboard-shortcuts`
  module's `pressed` arrives from a DOM event, and a viewer bundle, React and the States nodes are all in the page); the
  **scripts** (the three-node predecessor of `WORLD_TURN_SCRIPT` is not in git, so an attempt that compared enemies'
  *previous* positions would be a script reading, not an ordering one); and the **served bundle's** 2026-09-11 state
  (gitignored, rebuilt 2026-09-14 15:12).
- 🔴 **Trap found:** the "instrument" row with a synchronous Function was written first as the known-late arm, and it read
  `N`. A Function's script body runs synchronously inside its own update, and the gate's `_updateDependencies` pulls that
  Function before the gate drains, so `Outputs.hurt` is queued before `eval` is applied. Only `Success` is async. **H1 as
  worded ("the signal leaves after an `await`") cannot make a value late; only a value written after an `await` is.**
- ⚠️ Harness trap: a nested component in `createCorpusGraph` needs **component-level `ports`**. The Component Inputs
  node's own `ports` are not what the instance reads, and the connections fail with `input doesn't exist`, logged, not
  thrown.

**Consequences for the ACs.**
- **AC1:** recorded as above. No RED, so nothing is tuned.
- **AC2 cannot start:** H1, H2 and H3 have no failing arm to separate. 🔒 R5 is not askable.
- **Next: AC5's browser arm, moved first.** A copy of TPL-005 with attempt 1 restored for the hit gate, driven with real
  key events: the only environment D47 was ever seen in. If it reads late, bisect browser against runtime from there. If
  it reads on time, D47 is **measured and not reproduced**, and §8's end condition lets it close as disproved, which is
  Richard's call.
- **AC6, owed either way:** `tpl005Components.ts:473-477` states a mechanism (*"can be evaluated before that value has
  arrived"*) that this spec does not exhibit. §5 forbids stating one, so the sentence is left until the browser arm
  decides, then corrected.

### Session 6 (2026-09-14, HEAD `e7a88a49f`) — AC5's browser arm: **D47 does not reproduce with real keys either**

**The arms.** Four copies of `templates/pixel-game`, each starting in room 2, "Company" (`plLevel.startValue: 2`, one enemy at
(4,7)). Each was deployed through `deploy-from-disk`, bundled fresh at `e7a88a49f`, and every arm exited 0. The deploy drops exactly the 4
`KeyboardShortcut.pressed → Game/Move.go` wires (GAM-024 §2's module-type drop), and they were put back in each bundle
with every restored wire printed. Each arm was driven in headless Chrome with **real key events**: `Input.dispatchKeyEvent`
on the same CDP connection as `Emulation.setFocusEmulationEnabled`, with 350 ms between a key and its reading. The keys
were `DDDDDDUDUDUDUDUD`, the same for every arm. Runners, projects, deploys and logs are in session `53867993…`'s
scratchpad, under `gam004/`.

| arm | hit gate | deploy / drive |
|---|---|---|
| ship | shipped: `plStepEnemies.out-hurt → condition`, `.success → eval` | `DEPLOY_SHIP_EXIT=0` / `DRIVE_SHIP_EXIT=0` |
| **att1** | **attempt 1:** `plStepEnemies` answers only *it reached you* (`out-hits`), a second Function `plAttacks` answers *you charged it* (`out-attacks`), both on the same `moved` signals, into Expression `hits + attacks > 0` → `condition`; `eval` from `plStepEnemies.success` | `DEPLOY_ATT1_EXIT=0` / `DRIVE_ATT1_EXIT=0` |
| late (0 ms) | att1, with `plAttacks` writing its output after `await setTimeout(0)` (checked in the bundle) | `DEPLOY_LATE_EXIT=0` / `DRIVE_LATE_EXIT=0` |
| **late (80 ms)** | att1, with `plAttacks` writing its output after `await setTimeout(80)`: the **known-late instrument** | `DEPLOY_LATE80_EXIT=0` / `DRIVE_LATE80_EXIT=0` |

**Hearts after each move** (moves 0–7 read 3 in every arm, and moves 12–16 match move 11):

| move | you, enemy after the move | what the script says happened | ship | att1 | late 0 ms | late 80 ms |
|---|---|---|---|---|---|---|
| 7 | (1,6), (2,7) | nothing | 3 | 3 | 3 | 3 |
| 8 | (1,7), (2,7) | **it reached you** (the `hits` path) | **2** | **2** | **2** | **2** |
| 9 | (1,6), (1,7) | nothing | 2 | 2 | 2 | 2 |
| 10 | (1,7), gone | **you charged it** (the `attacks` path, the Function that does **not** fire `eval`) | **1** | **1** | **1** | 2 |
| 11 | (1,6), none | nothing | 1 | 1 | 1 | **1** |

No console or network errors in any arm. Positions and enemy tiles are identical across all four arms on every move.

**What this says.**
- **Attempt 1 is on time in a real browser**, on both of its paths, including the one whose value comes from a Function
  other than the one that fires `eval`. The instrument is alive: the 80 ms arm takes its heart **one move late**, exactly
  D47's symptom, so a late gate would have shown.
- ⚠️ **The 0 ms arm is on time too, and that separates the browser from session 3's loop.** The runtime spec's `settle` read
  a value written after an `await` as N−1. In the page, the runtime updates once per animation frame, so a value that lands
  one macrotask after the signal is still in before the gate's callback reads. A value is late in the browser only if it
  arrives after the next frame's update.
- **D47 is measured and not reproduced, in both environments.** What the 2026-09-11 drive saw is still unexplained. The
  candidates left are the scripts (the three-node predecessor of `WORLD_TURN_SCRIPT`, which is not in git, may have read a
  stale list), or a viewer bundle from that day, which is gitignored. Neither is recoverable. Attempt 2 (the Variable
  round-trip) was not rebuilt in the browser; session 3's runtime arm is its only reading.
- **AC2 cannot start**, and 🔒 **R5 is not askable**: there is no failing arm to isolate. The end condition (README §8)
  allows *measured and disproved*. Closing it that way is Richard's call.
- **AC6:** the collapsed `WORLD_TURN_SCRIPT` **may** be split again, as far as ordering goes: the split shape is on time in
  both environments. Keeping one node is simpler, so it stays. The header's mechanism sentence (*"can be evaluated before
  that value has arrived"*) is not what was measured, so both comments in `tpl005Components.ts` now say what was measured
  instead. The template's generated bytes do not change: these are TypeScript comments.
