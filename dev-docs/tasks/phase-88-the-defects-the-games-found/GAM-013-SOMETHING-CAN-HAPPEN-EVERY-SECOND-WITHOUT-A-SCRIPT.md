# GAM-013 — Something can happen every second without a script

**Status: 🟢 built (session 20, 2026-09-17), uncommitted.** The `Repeat` node is built and graded in the runtime (AC1, AC3, AC4, AC6), with catalog, enrichment, example, picker, cloud library, docs page, docLint and CHR-007 snapshot. **Left:** the exported app driven in a browser; AC8's builds (Rocket School's). **Source:** [P78 D40](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-005 scoping, 2026-09-11; met again by TPL-007 and P87 RKT-010 · **Side:** product (runtime node library)

A clock, a countdown, a carousel, an autosave, a stars total that counts up: nothing in NodeGX repeats. The author either wires
a Delay's Finished into its own Restart (taught nowhere) or hides a `setInterval` in a Function.

## 1. The person sentence

**An author makes a number go up once a second, and stop when they leave the page, with nodes they can see
on the canvas and no JavaScript.**

## 2. What was measured

HEAD `eb12ebe99`, 2026-09-14.

| reading | where |
|---|---|
| `Timer` is `displayName: 'Delay'`, a one-shot: `Start`, `Restart`, `Stop`, `Duration`, `Start Delay` → `Started`, `Finished`, ERG-001 outcomes. There is no repeat port and no tick output. Re-read at HEAD | `packages/noodl-viewer-react/src/nodes/std-library/timer.ts:15-139` |
| A Delay stops itself on node delete: `addDeleteListener(() => _animation.stop())`. Re-read at HEAD | `timer.ts:40-42` |
| Delay runs on `context.timerScheduler`, whose clock is frozen during SSR, so `Started`/`Finished` never fire there. Re-read at HEAD | `timer.ts:21-24`, `:30` |
| `grep -a -rn "setInterval\|requestAnimationFrame"` over `noodl-viewer-react/src/nodes` and `noodl-runtime/src/nodes` finds only the page transition. Re-read at HEAD; the register's agent-websocket match did not recur under this narrower pattern | `nodes/navigation/transitions/transition.ts:68`, `:79` |
| Three shipped modules call `setInterval` internally (`lottie`, `intl-format`, `mqtt-module`), and none exposes a tick to the graph. Files re-read at HEAD; "none exposes" as recorded 2026-09-11 | `library/modules/{lottie,intl-format,mqtt-module}/project/noodl_modules/*/index.js` |
| The `keyboard-shortcuts` module's teardown rule: register the removal with `addDeleteListener` *in the same function* as the registration, make `detach` idempotent, and flag a listener that outlived its removal as silent. `_onNodeDeleted` runs on delete, unmount **and** navigating away. Re-read at HEAD | `library/modules/keyboard-shortcuts/README.md:100-127` |
| Server side: *"`setInterval` outlives the request"* in a cloud function. Re-read at HEAD | [P44 README](../phase-44-compute-ceiling/README.md) line 55 (the register's "§3.2"); origin [TALK-007](../phase-42-first-hour/TALK-007-WHAT-CLOUD-FUNCTIONS-SHOULD-HAVE.md) line 115 |
| Rocket School designed the loop out: rocket progress and the countdown bar are `Animate To Value`, and elapsed time is `Date.now()`. Re-read at HEAD | [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md) line 38 |
| 🟡 RKT-010's stars *"pop in rather than counting up. A count-up needs a per-frame number the Text node cannot take from CSS."* Re-read at HEAD | [RKT-010](../phase-87-the-first-play-test/RKT-010-STARS-THAT-ADD-UP.md) line 146 |
| The community built one anyway: P86's corpus component *Strobe - Blinking button* is a `Javascript2` running `setInterval(() => { Script.Outputs.toggle() …`, with a Switch and States. Re-read at HEAD | `dev-docs/tasks/phase-86-the-community-already-built-it/corpus/components/Strobe - Blinking bu_c2SYhA8z7qu6cR8ChUH4Cm/` |

## 3. Where it bites a person

- Anything that happens on its own: a countdown, polling for new data, an autoplaying carousel, an autosave, a clock, a
  real-time game, a number that counts up.
- The Delay-loop idiom is unvalidated, and nobody has measured it under load. A script interval is invisible on the canvas, and nobody
  has checked whether it survives navigating away in the browser.
- The curriculum's lesson 7 is *"time as a source of events"*. It names `Timer` and expects a repeat that does not exist (P79 H3).

## 4. Related work and collisions

- **P79 [H3](../phase-79-the-syllabus/DEFECTS-LESSON-6-FOUND.md)** (lines 82-101, narrowed 128-139): the curriculum names a
  `Timer` that is a one-shot Delay. It is open, owner `NONE`, and its fix is curriculum text in the other repo. This task
  would give that lesson a real node to name. Coordinate the node's display name with H3.
- **P18 [EXP-011](../phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md) §52.2** (line 6888): the export fixture
  `script-desk` has a gen-3 Script *ticker* (Start/Stop, an interval, `Seconds` out) that the exporter translates. A new node type
  needs a `coverage-ledger.json` row and a translation or a named deferral.
- **P67 UNI-011** line 158: "ticker" there means the person ticking a consent box. Noise, not a collision.
- **P57 BLD-004** line 70 and **P56 BEN-003** line 166: an occluded Electron window clamps timers about 1000×. That bears on
  the editor preview (§7).
- **ERG-001**: any new action reports `Done`/`Unchanged` like Delay's (`timer.ts:52-62`, `:126-137`).
- Owner grep: `grep -a -rn -i "ticker\|repeating timer\|repeat port\|interval node\|setInterval" dev-docs/tasks --include='*.md'`.
  No task owns a repeating node. D40's owner was left `NONE` on purpose (register line 1915-1920).

## 5. Design — 🔒 rulings first

🔴 **Do not build a Ticker node on the way past** (register line 1922-1925). These two decisions come before any code, and
neither is a coding question:

1. 🔒 **Node or port?** (a) A new node (e.g. `Repeat` / `Interval`: `Start`, `Stop`, `Interval`, → `Tick`, `Count`). (b) A
   `Repeat` boolean on Delay, making `Finished` fire every Duration. (b) adds no picker entry and matches the idiom people already
   reach for; it also changes the meaning of a node whose name says "once", and of `Finished`'s description (`timer.ts:128-131`).
   (a) is discoverable and nameable for P79's lesson, and it is one more node.
2. 🔒 **What happens when its graph is navigated away from?** (a) It stops, the keyboard-shortcuts rule: removal registered beside the
   start, idempotent, silent after detach. (b) It keeps running, for a background poll. If (b) is ever wanted, it must be a
   visible, named choice, not the default. And the SSR rule: does it tick during server render (Delay does not)?

After the rulings, the design constraints: the tick runs on `timerScheduler`, as Delay does, not a raw `setInterval`, so SSR and
tests share one clock. Deleting, unmounting or navigating stops it with the shortcuts module's three guarantees. A `Stop` then
`Start` does not stack two intervals. And there is no catch-up burst after a throttled tab: a missed tick is skipped, not replayed.

> 🔒 **R1** **Ruled (2026-09-17, s19, asked in plain words): a new Repeat node** (Start, Stop, Interval → Tick, Count), not a Repeat option on Delay; **and it stops when its page is navigated away from** (the keyboard-shortcuts rule; a background poll would be a separate, named option later). No ticks during server render.

## 6. Acceptance criteria (apply after both rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A spec searches the node catalog for any node or port that fires more than once from one Start, over the runtime library **and** the 33 shipped modules; it finds none. Known-firing beside it: the same search finds Delay's one-shot `Finished`. |
| AC2 | **The person sentence, in a browser.** A minimal project: the repeating signal drives a Counter into a Text. After 5.0 s the Text reads 5 (±1). Navigate to another page and back three times; one second later the count advances by exactly one per second (no stacked intervals). |
| AC3 | **Teardown, sabotage arm.** A spec creates the node, starts it, deletes it, and advances the scheduler: zero ticks. Remove the delete listener and it goes RED. |
| AC4 | **Stop/Start.** `Start`, `Start`, `Stop`, `Start` gives one running interval; the second `Start` reports `Unchanged`. |
| AC5 | **SSR.** Under the ruled SSR behaviour, a server render of AC2's project emits the ruled number of ticks. The node's `ssr` note says the same thing. |
| AC6 | **Blast radius.** If ruling 1 is (b): every Delay in shipped `library/` and `templates/` is listed with `Repeat` unset, and each one's `Finished` count over a fixed run is unchanged. If (a): no existing node's port list changes. |
| AC7 | **Export.** `coverage-ledger.json` has a row for the new type or port, and the export of AC2's project either ticks or names the refusal. |
| AC8 | **Templates.** Record whether Rocket School's stars count-up (RKT-010 line 146) can now be built without a script, and whether TPL-007's Animate To Value countdown should move to it. Build neither here; say which, measured against the node. |

## 7. Traps

- A test with fake timers and a node that uses a raw `setInterval` grades the wrong clock. Use the runtime's scheduler.
- An occluded or background window throttles timers (BLD-004, BEN-003). AC2 must run in a visible window, and must say it did.
- "Navigating away" is three events: delete, unmount, and route change. A test of one does not grade the others (keyboard-shortcuts README line 111-114).
- A drive that reads the count once can pass on a stacked double interval if the page was only visited once. AC2's three round trips are the point.

## 8. Record

### Session 20 (2026-09-17, over `7bb79dc53`) — the node, as ruled

**Built:** `noodl-viewer-react/src/nodes/std-library/repeat.ts`, typeName and display name `Repeat`, category Utilities, placed after
Delay in the picker's General Utils. Start, Stop, Interval (ms, default 1000) → Tick, Count, plus Done / Unchanged / Failure / Completed.
- Ticks run on `context.timerScheduler`. The next tick is scheduled against the beat (`nextAt += interval`, duration `nextAt − now`),
  so it does not drift. Ticks missed in a long frame are skipped, not replayed, and the beat keeps its phase.
- The removal is registered with `addDeleteListener` beside the timer. The tick re-checks `running` after sending Tick.
- The Start guard is the node's own `running` flag. 🔴 Delay's guard reads the scheduler's `_isRunning`, which only turns true at the
  end of the next frame.
- Start with an Interval that is not a positive finite number reports Failure, `repeat/interval-not-positive`, with the value.
- Start resets Count to 0; Stop keeps it. An Interval change takes effect from the next tick.

**AC1, RED at HEAD.** `noodl-viewer-react/tests/gam-013-something-can-happen-every-second.test.ts`. The census reads every node file under
both `std-library` folders that holds a clock (`timerScheduler|setTimeout|setInterval|requestAnimationFrame`). It probes every action input
of every definition in them with a signal output (outcome ports excluded), one press, 313 frames of 16 ms, through `createCorpusGraph`.
- HEAD (`repeat.ts` moved aside, census half only, `HEAD_CENSUS_EXIT=0`): 12 clock files, 10 action probes, **none fires a signal twice**.
  Delay's Finished fires **1** (known-firing). Fix: 13 files, 12 probes, exactly `Repeat.start → tick ×5`.
- 🔴 The first census probed every logic node, network ones included, and jest died after 90 s on `RangeError: Invalid string length`
  (console flood). Narrowed to clock-holding files, the only ones that can fire again without new input, and the console silenced.
- The 33 shipped modules are **not** probed by the spec: §2's source reading (three modules call `setInterval`, none exposes a tick) stands.

**AC3, AC4 and the node's properties:** 15/15 (5 s → 5 ticks, first tick at one Interval; 60 s → 60; a 10 s frame → one tick, then on the
beat; Stop keeps Count, Start resets it; Interval change; Start/Start/Stop/Start → `done, unchanged, done, done` and 5 ticks in 5 s; two
Starts in one update → one beat; Interval 0 → Failure with its code, 0 ticks; delete → 0 ticks, 0 timers; deleted inside its own Tick →
0 timers straight after, 1 tick in 4 s).

**Reverted arms** (count-asserted, sha-restored, `scratchpad/gam013/mutants.py`):

| mutant | red |
|---|---|
| M1 no delete listener | 2: both AC3 rows |
| M2 Delay's `_isRunning` guard | 1: AC4 "the second Start reports Unchanged" |
| M3 missed ticks replayed | 1: "no catch-up burst" |
| M4 duration = beat (drift) | 4: census 5-in-5, 5 s, 60 s, catch-up |
| M5 no re-check after Tick | **0 at first**: a re-armed timer ticks into nothing. The AC3 row now reads the scheduler straight after the tick → 1 red |

**AC6 (ruling (a)):** Delay's port list is pinned unchanged in the spec.
**Parameters in the harness** land on the graph's first update; a Start pressed before it reads the default Interval. `place()` runs that
update first, as a page does.

**Registries:** `nodelibraryexport.ts` General Utils; `catalog:generate` (+1 type, additions only); `docs/node-catalog/enrichment/repeat.json`;
`timer.json` no longer teaches Finished → Restart (points to Repeat, anti-pattern added); example `logic-stopwatch-every-second`;
`catalog:merge`; `cloud-library:generate`; `docs:nodes` (`utilities/repeat.md`, `timer.md`, index); `docLint.ts` `AMBIGUOUS_TYPE_NAMES`;
CHR-007 snapshot (+`Repeat` only).
- 🔴 **`cloud-node-library.json`'s staleness at HEAD (s19's "whose?") is P88's own:** the regeneration's other hunks are GAM-001's
  `Evaluate At Load` and GAM-002's Expression description, never regenerated in s11.

**AC2, in a browser** (`scripts/devtools/drive-gam013-repeat.js`, headless Chrome via `drive-deployed.js`, `visibilityState` `visible` at
every read, so not an occluded window). A project written through the door: Home's layout Did Mount → Repeat Start, Tick → Counter
Increase → String Format → Text; buttons to an Away page and back through the app's own router. Deployed with a freshly built
`noodl-preview` bundle (the old one called Repeat a kit node and left its 2 wires unchecked; after the rebuild, 0 unchecked, 0 broken)
over the engine the running dev stack rebuilt at 12:24 (it carries Repeat). `DRIVE_EXIT=0`, 0 console errors.

| reading | result |
|---|---|
| count 5.0 s after it first shows (0) | **5** |
| 3 round trips Away → Back, each page confirmed on screen | 3/3; count on every return **0** (the page's Repeat and Counter were rebuilt) |
| count at t0 and t0 + 3004 ms, after the last return | 1 → 4, **+3** (a stacked beat reads +6) |

- ⚠️ The drive cannot see M1 (no delete listener): the old Repeat would tick into a deleted Counter, and the count does not move. That
  clause is graded by the AC3 spec's scheduler reading only.
- The first drive opened on Away (the door registered the page written first as the start page); the driver now begins on Home.

**AC5, a server render.** 🔴 **Delay's `partial` was the wrong model for Repeat.** The server render fires Did Mount
(`server-core.js` `triggerDidMount()`), the server clock is frozen at 0 (`noodl-viewer-react.js` `getCurrentTime: () => 0`), and
`render-gate.js` `settle` waits for ten turns with no update scheduled, capped at 3000. The spec's AC5 row, over a real `NodeContext`
with the server's platform, Start, then 100 updates:

| `ssr.compat` | ticks | timers pending | `scheduleUpdate` over 100 turns |
|---|---|---|---|
| `partial` (as first built, Delay's) | 0 | **true** | **100**: `settle` never goes quiet, every render runs to 3000 turns and warns |
| `client-only` (built) | 0 | false | 0 |

So Repeat is `client-only`: inert on the server, Count reads empty there, and it starts in the browser after hydration. The note says
so. The same hazard exists for any Delay with a Duration started from Did Mount, and for Animate To Value: **found, not registered.**

**AC8** (read against the catalog's ports, not built or driven). RKT-010's stars count-up has the nodes it needs without a script: Repeat (Interval ≈ 50 ms) Tick → Counter Increase with its limit
set to the stars earned, Count Changed at the limit → Repeat Stop. TPL-007's countdown **should stay** `Animate To Value`: it is a
continuous bar, and a Repeat would move it in steps. Neither built here (Rocket School is the peer's).

**AC7, export: translated** (not deferred: a `deferred` row must say "deliberately out of scope", which it is not). Built by a
subagent to this file's brief, read back here.
- Repeat is the seventh member of `plan.ts`'s `STREAM_NODES` table (the SSE / WebSocket family), not Delay's per-verb shape: it
  needs a readable Count and a Tick that belongs to the node. `src/emit/repeatLib.ts` emits `src/lib/repeat.ts`, a transcription of
  `repeat.ts` (running guard, invalid-Interval failure with the same code and sentence, `nextAt` beat, skip-missed, re-check after
  Tick, `dispose` = the delete listener, called from `useRepeat`'s effect cleanup). Shipped only when used, with `errors.ts`.
- Refused by name: two wires into Interval, `tick` consumed as a value, a port the node lacks, an Interval only a handler knows.
- Recorded divergence: the exported beat runs on `setTimeout`, so a Start from a click is timed from the click, not the next frame
  (under one frame).
- `packages/nodegx-export/tests/gam-013-repeat.test.ts` 32/32. §A drives the real `repeat.ts` over the real `timerscheduler.ts`
  and the emitted beat through the same frames (15 scripts, event list + tick count + pending timer every frame), with two broken
  copies. §B graph → code, refusals by name. §C fixture `beat-desk` exports with no refusals and typechecks.
- 19 reverted arms, each red where named (M1 skip-missed 2, M2 guard 3, M3 drift 11, M4 re-check 2, M5 dispose 1, M6 cleanup 1, M7
  Interval check 5, M8 raise 4, M9 Count reset 3, M10 Interval re-read 2, M11 Completed 16, M12 undefined option 1, M13 Stop cancel 2,
  M14 OWN_CHAIN_OUTPUTS 1, M15 outcome signals 8, M16 table suite fails to run, M17 not shipped 2, M18 no `errors.ts` 2, M19 import
  loop TS2367). 🔴 M4, M13 and M14 read **0 red at first**; the per-frame pending comparison, B5's notes and B7 were added, then red.
- Ledger: `Repeat` `translated`; floor 117 → 118, total 127 → 128 (`export-ledger:check` exit 0, `export-ledger:picker` 118/128).
  **15** tests pinned the floor, not the 7 the survey named; each now reads 118 with its old comment kept.
- HLS-001 corpus golden: counted, then regenerated. `beat-desk` added (18 files); **46 existing hashes changed, all `README.md`**
  (the alpha sentence reads the ledger, "118 of the 128"; putting 117/127 back in 3 READMEs gave the old hashes); 0 other files.
  Literal 46 → 47 with that count in its comment. 4/4.
- Whole `nodegx-export` suite before the golden: 102/103 suites, 3557/3561, the 3 reds exactly HLS-001's; `tsc --noEmit` exit 0.
- **Not done:** the exported AC2 app is typechecked and graded against the interpreter, not built and driven in a browser.

**Gates so far:** `catalog:check`, `catalog:merge:check` (177/177), `catalog:groups:check` all green; `catalog:examples` 103/105, the 2 reds
the known AIX-005 Text Input `text` (`/Agent Chat`, `/Sign In`), the stopwatch clean; CHR-007 8/8.
