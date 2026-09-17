# GAM-013 — Something can happen every second without a script

**Status: ⬜ not started. ✅ R1 ruled s19 (§5): buildable.** **Source:** [P78 D40](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by TPL-005 scoping, 2026-09-11; met again by TPL-007 and P87 RKT-010 · **Side:** product (runtime node library)

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

Not started.
