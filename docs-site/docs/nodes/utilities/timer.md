---
title: "Delay"
---
Delay: fires a Finished signal a set number of milliseconds after being started; restartable for debouncing.

Timer (displayed as Delay) turns one signal into a later signal. Triggering `start` (Start) begins a countdown of `duration` milliseconds (after an optional `startDelay`, also milliseconds); when it completes, `timerFinished` (Finished) fires. `timerStarted` (Started) fires at the moment the countdown actually begins. `start` does nothing while the timer is already running, whereas `restart` (Restart) always begins the countdown again from zero — that difference is what makes `restart` the debounce input. `stop` (Stop) cancels a running countdown without firing `timerFinished`. With the default `duration` of 0 the finish fires on the next tick, which still defers the signal until after the current update.

## When to use it

Use it to defer an action (auto-dismiss a toast, poll once after mount) or, via `restart`, to debounce a noisy source such as typing. For a repeating tick use Repeat. For animating a value over time use Animation instead — Timer carries no value, only timing.

## At a glance

| | |
|---|---|
| Category | Utilities |
| Type name | `Timer` |
| Available in | browser |
| SSR compatibility | partial — The scheduler clock is frozen during server render, so Started/Finished never fire there; do not gate Page Ready on a Delay. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 2 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `duration` | Number | `0` | How long the countdown runs before Finished fires, in milliseconds |
| `startDelay` | Number | `0` | How long to wait after Start before the countdown begins, in milliseconds |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `restart` | Signal | — | Begins the countdown again from zero, whether or not one is already running |
| `start` | Signal | — | Starts the countdown, or fires Unchanged while one is already running — use Restart to begin again |
| `stop` | Signal | — | Abandons the countdown, so Finished never fires for it |

### What each input does

**Start** (`start`)

- a countdown running: nothing — Restart begins one again → Unchanged
- otherwise (a Start earlier this frame included): the countdown is queued, and begins at the frame's end, Start Delay later — Started fires then → Done

**Restart** (`restart`)

- always: a running countdown is dropped without Finished, and a new one is queued from zero for the frame's end → Done

**Stop** (`stop`)

- a countdown running or queued: it is dropped, and Finished never fires for it → Done
- no countdown: nothing → Unchanged

## Outputs

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `completed` | Signal | — | Fires after every invocation, whatever the outcome — wire this to carry on regardless. Failure still fires and still carries its reason, so this cannot hide an error |
| `done` | Signal | — | Fires when the action changed what the timer was doing |
| `timerFinished` | Signal | — | Fires once Duration has elapsed, and not at all for a countdown that was stopped |
| `timerStarted` | Signal | — | Fires when the countdown begins, once Start Delay has elapsed |
| `unchanged` | Signal | — | Fires on a Start while one is already running, or a Stop with nothing running |

## Patterns

- Value Changed `valueChanged` → `restart`, act on `timerFinished`: debounce — the action runs only after the input has been quiet for `duration` ms.

## Watch out for

- Using `start` for debouncing — while running it ignores triggers, so the action fires on the first quiet gap after the *first* event, not the last. Use `restart`.
- Treating `duration` as seconds — it is milliseconds.
- `timerFinished` looped into its own `restart` for a repeating tick — use Repeat, which does not drift and stops when its page is left.
- Acting on `done` or `completed` to mean the time is up: they fire as soon as a Start or Restart has been handled, before any time passes. The time running out is `timerFinished` (Finished).

## Examples

**Debounced autosave with timestamped status**

The debounce idiom: every keystroke fires Value Changed, whose signal restarts a 1.5-second Timer — the save only runs when the user pauses. The save Function stamps the moment; Date To String formats it, Unique Id issues a save id shortened by Substring, and String Format assembles the status line. Signals sequence the flow; values shape the display.

**Check an email is well-formed and not already taken**

Sign-up validation as a chain of small truths rather than one function: an `Expression` says the field is non-empty, a `JavaScriptFunction` says it looks like an address, and a `DbCollection2` query says nobody has it yet — and an `And` node combines them into the one boolean the button enables on. The `Timer` in front of the query is the detail worth copying: it debounces, so the database is asked once the typing stops instead of once per keystroke. ⚠️ The two `Inverter` nodes read as clutter until you notice what they buy — 'no user came back' is the success case here, and inverting it keeps every input to the `And` meaning 'this is fine', which is what makes the combination readable at all.

**A rich-text editor with a toolbar and local drafts**

The larger companion to the single-button component: a `Static Data` node holds the list of toolbar commands, a `For Each` draws one button per entry, and the editor itself is mounted by a `JavaScriptFunction` onto a `Group`'s element. Two details are worth more than the editor. The draft is saved to `localStorage` on a `Timer` and read back on mount, which is the whole of 'don't lose my work' and costs two function nodes. And `Model2` plus `SetModelProperties` keep the document in the project's own data model rather than only inside the third-party editor, so something other than the editor can read what was typed. ⚠️ The toolbar is driven by data, so adding a command is a row in the `Static Data` node — not a new button.

## Related nodes

[Value Changed](../logic/value-changed.md), [Animation](../animation/animation.md), [States](../animation/states.md), [Switch](../logic/switch.md), [Repeat](./repeat.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 2. The spec is the reference: the runtime, the React export and the conformance tests are all graded against it. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "queued": false,
  "running": false,
  "started": false,
  "start": 0,
  "left": 0
}
```

### How actions report back

Each time Start, Restart or Stop is triggered, the node reports exactly one of **Done** or **Unchanged**.

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/delay.ts"
/**
 * Delay (catalog type `Timer`) — read from `packages/noodl-viewer-react/src/nodes/std-library/timer.ts`
 * and the scheduler it drives, `packages/noodl-runtime/src/timerscheduler.ts`, on 2026-09-30 (NSP-007).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: a Delay is one scheduler timer read ONCE PER FRAME against the
 * frame's clock. `Start` / `Restart` QUEUE the timer (timer.ts :59-60, :75; timerscheduler.ts
 * :85-94); it JOINS the running set at the end of the next frame's timer pass (:177-197), where
 * its start time becomes `now + Start Delay` and — only when Start Delay is exactly the number 0
 * — `Started` fires at once. From then on each frame reads `now >= start` (:132): the first such
 * frame fires `Started` if it has not (:133-136); the same frame computes how far along the
 * countdown is, `t = (now − start) / Duration` when Duration > 0 and `t = 1` otherwise
 * (:138-143), and a frame that reads `t >= 1` FINISHES it: `Finished` fires, the timer leaves the
 * running set (:156-159, :168-174). Because a queued timer joins AFTER that frame's pass, a Delay
 * of Duration 0 with no Start Delay fires `Started` in one frame and `Finished` in the NEXT —
 * never both in one — while a Start Delay > 0 lets a Duration-0 countdown start and finish in
 * one frame. `Stop` removes the timer wherever it is and `Finished` never fires for it (:52-57,
 * :96-114).
 *
 * The clock is the world's (spec.ts `WorldView.now`); a frame is a settle. The arithmetic is the
 * scheduler's own JavaScript on the RAW input values — `duration` and `startDelay` are stored as
 * sent (timer.ts :85-87, :95-97 assign them straight onto the timer) — so a string Duration `'5'`
 * counts down 5 ms, a Start Delay `'5'` makes `start` the string `'05'` (which still compares as
 * 5), and a `null` Duration is `t = 1`. Kept verbatim: it is what the app does.
 *
 * Outcomes (timer.ts :54-65, :71-77, :103-108): `Start` reports `unchanged` while the timer IS
 * RUNNING — `_isRunning`, which is set only when the timer joins at the frame (:181) — so two
 * Starts in one frame both report `done`; `Restart` always reports `done`; `Stop` reports `done`
 * when the timer was running or queued — it cancels either — and `unchanged` otherwise (v2, row D10
 * ruled "Report Done": v1 read only `_isRunning`, so a Stop cancelling a countdown started in the
 * same frame said `unchanged`).
 */

import { defineNode } from '../spec';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The scheduler's own JavaScript arithmetic on a raw value — no conversion of the spec's choosing. */
const js = (v: unknown): any => v;

export const Delay = defineNode({
  type: 'Timer',
  // v2 (P109 ISL-032, row D10 ruled "Report Done"): Stop on a countdown queued this frame reports done.
  version: 2,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/timer.ts; packages/noodl-runtime/src/timerscheduler.ts',
  needs: ['clock'],
  worldPool: { advances: [0, 1, 49, 50, 99, 100, 101, 1000] },

  // timer.ts :29-37 createTimer({ duration: 0 }): not running, not started; timerscheduler.ts :30-41.
  // `queued` is membership of `newTimers` (:91), `running` is `_isRunning` (:181), `started` is
  // `_hasCalledOnStart` (:134, :189), `start` is `_start` (:180), `left` is `_durationLeft` (:145).
  state: { queued: false, running: false, started: false, start: 0 as unknown, left: 0 as unknown },
  // timer.ts :43-48
  inspect: (s) => (s.running ? Math.floor(js(s.left) / 10) / 100 + ' seconds' : 'Not running'),
  // timer.ts :131-134 outcomeOutputs({ done, unchanged })
  outcomes: ['done', 'unchanged'],

  inputs: {
    start: {
      type: 'signal',
      outcome: true,
      displayName: 'Start',
      group: 'Actions',
      description: 'Starts the countdown, or fires Unchanged while one is already running — use Restart to begin again'
    },
    restart: {
      type: 'signal',
      outcome: true,
      displayName: 'Restart',
      group: 'Actions',
      description: 'Begins the countdown again from zero, whether or not one is already running'
    },
    stop: {
      type: 'signal',
      outcome: true,
      displayName: 'Stop',
      group: 'Actions',
      description: 'Abandons the countdown, so Finished never fires for it'
    },
    // :79-88 — assigned raw onto the timer; read by the scheduler at every frame (:139-145)
    duration: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Duration',
      group: 'Values',
      description: 'How long the countdown runs before Finished fires, in milliseconds'
    },
    // :89-98 — assigned raw; read once, when the timer joins the running set (:180)
    startDelay: {
      type: 'number',
      default: 0,
      coerce: 'none',
      displayName: 'Start Delay',
      group: 'Values',
      description: 'How long to wait after Start before the countdown begins, in milliseconds'
    }
  },

  outputs: {
    // :112-117 onStart (:31-33)
    timerStarted: { type: 'signal', displayName: 'Started', group: 'Events', description: 'Fires when the countdown begins, once Start Delay has elapsed' },
    // :118-123 onFinish (:34-36)
    timerFinished: { type: 'signal', displayName: 'Finished', group: 'Events', description: 'Fires once Duration has elapsed, and not at all for a countdown that was stopped' }
  }
}).on(
  {
    // :54-65 — `_isRunning === false` → start() (:43-50: not running, so straight to scheduleTimer,
    // which queues it once, :86-93) and `done`; otherwise `unchanged`, nothing else.
    start: (s) =>
      s.running
        ? { says: 'a countdown running: nothing — Restart begins one again', outcome: 'unchanged' }
        : { says: 'otherwise (a Start earlier this frame included): the countdown is queued, and begins at the frame\'s end, Start Delay later — Started fires then', set: { queued: true }, outcome: 'done' },

    // :71-77 — start() whatever the state: a running timer is stopped first (:44-46 → :52-57:
    // leaves the running set, `_hasCalledOnStart` false), then queued; always `done`.
    restart: () => ({ says: 'always: a running countdown is dropped without Finished, and a new one is queued from zero for the frame\'s end', set: { queued: true, running: false, started: false }, outcome: 'done' }),

    // `done` if it was running or queued (v2, D10), `unchanged` otherwise; stop() removes it from
    // whichever set holds it (:96-114).
    stop: (s) => {
      if (s.running || s.queued) return { says: 'a countdown running or queued: it is dropped, and Finished never fires for it', set: { queued: false, running: false, started: false }, outcome: 'done' };
      return { says: 'no countdown: nothing', set: { queued: false, running: false, started: false }, outcome: 'unchanged' };
    }
  },
  {
    // The frame's timer pass — timerscheduler.ts `runTimers(currentTime)` (:116-198), run once per
    // frame by nodecontext.ts :500-503 after the dirty nodes; here once per settle, at the world's
    // time. Part 1 reads the running timer; part 2 lets the queued one join. In that order: a timer
    // queued this frame is not read until the next (:126-129 copy the running list before the loop).
    afterInputs: (s, i, w) => {
      const now = w.now();
      const emit: Array<'timerStarted' | 'timerFinished'> = [];
      let { queued, running, started, start, left } = s;

      // part 1 (:130-174): `currentTime >= timer._start`
      if (running && js(now) >= js(start)) {
        if (!started) {
          emit.push('timerStarted'); // :133-136
          started = true;
        }
        const duration = js(i.duration);
        let t: number;
        if (duration > 0) t = (js(now) - js(start)) / (duration * 1); // :139-141, repeatCount 1
        else t = 1.0; // :142-143
        left = duration * (1 - t); // :145
        if (!(t < 1.0)) {
          // :156-159 finished (NaN is not < 1 either); :168-174 leaves the set, onFinish
          running = false;
          started = false;
          emit.push('timerFinished');
        }
      }

      // part 2 (:177-197): the queued timer joins; `_start = currentTime + delay`; a delay that is
      // exactly 0 plays its first frame at once
      if (queued) {
        start = js(now) + js(i.startDelay);
        running = true;
        queued = false;
        if (js(i.startDelay) === 0) {
          emit.push('timerStarted'); // :185-190
          started = true;
        }
      }

      return { set: { queued, running, started, start, left }, emit };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
