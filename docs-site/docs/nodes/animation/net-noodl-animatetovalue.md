---
title: "Animate To Value"
---
Animate To Value: tweens its output toward whatever targetValue currently is, with duration, delay and easing.

Animate To Value is the current general-purpose tween. Whenever `targetValue` changes, `currentValue` animates from wherever it is to the new target over `duration` ms with the chosen `easingCurve`; `atTargetValue` fires on arrival. It is retarget-safe: changing the target mid-flight redirects the animation smoothly instead of jumping. ⚠️ Two targets written in one update make ONE move, from wherever the value is: a graph that sets `targetValue` to 100 and then to 0 in the same pass glides to 0 from where it was, and never shows 100. A `duration` of 0 does not change that. To refill and then glide, fire `jumpTo` (with `jumpValue`): `currentValue` moves at once and then carries on towards `targetValue`, in whichever order the jump and the new target arrive. A jump is not an arrival, so `atTargetValue` does not fire for it.

## When to use it

Smoothing any numeric change: positions, opacity, blend values for Color Blend. It supersedes the deprecated Transition/Animation nodes. For multi-property, state-shaped animation use States with transitions.

## At a glance

| | |
|---|---|
| Category | Animation |
| Type name | `net.noodl.animatetovalue` |
| Available in | browser |
| SSR compatibility | partial — The scheduler clock is frozen during server render; the value stays at its start and Finished never fires there. |
| Provided by | `noodl-viewer-react` |
| Behaviour spec | version 3 ([under the hood](#under-the-hood)) |

## Inputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `delay` | Number | `0` | How long to wait before the move begins, in milliseconds |
| `duration` | Number | `300` | How long the move takes, in milliseconds |
| `easingCurve` | Enum (`easeOut`, `easeIn`, `linear`, `easeInOut`) | `easeOut` | Shape of the movement between where the value is and Target Value |
| `jumpValue` | Number | — | Where Jump To puts Current Value |
| `targetValue` | Number | — | Value to move towards; the first one to arrive is adopted outright rather than animated to. Two targets in one update make one move, from wherever the value is: to jump first, use Jump To |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `jumpTo` | Signal | — | Puts Current Value at Jump Value at once, then carries on towards Target Value; a jump is not an arrival, so At Target Value does not fire for it |

### What each input does

**Target Value** (`targetValue`)

- not a number: ignored
- the first number it is handed: Current Value goes there at once, with no move
- the target it already has: nothing
- a new target: a move under way is dropped without At Target Value, and a new one starts from where the value is, at the frame's end and Delay later

**Jump Value** (`jumpValue`)

- always: kept for the next Jump To; nothing moves

**Jump To** (`jumpTo`)

- Jump Value is not a number: nothing
- no number yet: Current Value goes to Jump Value, which becomes the target too
- otherwise: any move stops, Current Value goes to Jump Value, and at the frame's end it moves back to Target Value if they differ

**Duration** (`duration`)

- always: kept; read at every frame of a move, the move under way included

**Delay** (`delay`)

- always: kept as a number (what is not one is 0); read when the next move starts

**Easing Curve** (`easingCurve`)

- always: kept; read at every frame of a move, the move under way included

## Outputs

### Values

| Name | Type | Default | Description |
|---|---|---|---|
| `currentValue` | Number | — | Where the move has got to, updated every frame while it runs |

### Signals

| Name | Type | Default | Description |
|---|---|---|---|
| `atTargetValue` | Signal | — | Fires when the value settles on Target Value, and not at all if a new target interrupted it |

## Patterns

- Boolean state → (boolean→number cast) → `targetValue`: a two-state tween in one wire.
- A countdown bar that refills for each question: `jumpValue` 100, the start signal → `jumpTo`, with `targetValue` 0 and `duration` the time limit. The bar jumps full and glides down. Do NOT write the target 100 then 0 in one pass: that is one glide from wherever the bar was.
- `currentValue` → Color Blend `blendValue`: animated color transitions.

## Examples

**Hover highlight: Animate To Value driving a Color Blend**

The smooth-hover idiom: the card's `hoverStart`/`hoverEnd` signals flip a Switch, whose boolean (cast to 0/1) becomes the `targetValue` of Animate To Value — the node tweens `currentValue` toward the target whenever it changes. That animated 0→1 feeds Color Blend's `blendValue`, interpolating between its configured colors, and the result drives the card background. State, easing and color are three separate concerns in three small nodes.

## Related nodes

[States](./states.md), [Color Blend](../interpolation/color-blend.md), [Switch](../logic/switch.md), [Number Remapper](../math/number-remapper.md)

## Code export

Exports to React. A project that uses it exports this node as React code.

[How export works](../../how-export-works.md) shows what an export writes, with a worked example.

## Under the hood

This node's behaviour is written down as an executable spec in `@nodegx/node-spec`, version 3. The spec is the reference the conformance tests grade the runtime against. Every rule in it cites the line of the runtime it was read from. The full spec is at the bottom of this page.

### What it depends on outside the node

- time: timers, delays and the frame clock (`clock`)

### Starting state

```json
{
  "currentNumber": 0,
  "numberInitialized": false,
  "startValue": 0,
  "endValue": 0,
  "duration": 300,
  "delay": 0,
  "ease": "easeOut",
  "jumpPending": false,
  "tQueued": false,
  "tRunning": false,
  "tStart": 0
}
```

## The full spec {#spec-source}

The spec's source, as the docs were generated. Helpers it imports live beside it in `packages/nodegx-node-spec/src`.

```ts title="packages/nodegx-node-spec/src/nodes/animate-to-value.ts"
/**
 * Animate To Value (`net.noodl.animatetovalue`) — read from
 * `packages/noodl-viewer-react/src/nodes/std-library/animate-to-value.ts`, the scheduler it drives
 * (`packages/noodl-runtime/src/timerscheduler.ts`) and `packages/noodl-viewer-react/src/easecurves.ts`
 * (ease-curves.ts here, verbatim) on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: the node is ONE scheduler timer whose run moves `Current Value`
 * from `startValue` to `endValue` along the curve. `Target Value` is read as a number (`true` 1,
 * `false` 0, else `Number`; NaN ignored, :32-36, :146-151). The FIRST number adopted outright —
 * `Current Value` IS it, no run (:155-160); a number equal to the run's end does nothing (:161-163);
 * any other starts a run from wherever `Current Value` is (:166-168). Starting a timer that is
 * running stops it and QUEUES it; starting one already queued changes nothing but the endpoints
 * (timerscheduler.ts :43-50, :85-94). `Jump To` (a rising edge) stops the timer wherever it is,
 * puts `Current Value` at `Jump Value` (as a number; NaN ignored) at once, adopts it as the end if
 * nothing had arrived, and at the frame end starts a run from there unless the run's end already
 * equals it (:54-76) — a jump is not an arrival. `Duration` and `Easing Curve` are stored RAW on the
 * timer (:197-227: no conversion; the curve is looked up by name); `Delay` is read as a number (below).
 *
 * THE FRAME (timerscheduler.ts `runTimers(now)`, :116-198, run once per frame after the inputs'
 * frame-end work, nodecontext.ts :495-503): (1) a RUNNING timer whose start is reached runs its
 * curve at `t = (now − start) / duration` (1 when `duration > 0` is false), clamped to 1 at the end
 * (:132-154); at `t ≥ 1` it finishes and `At Target Value` fires (:156-174, :111-113). (2) a QUEUED
 * timer joins with `start = now + delay` (:177-183), and with a delay `=== 0` runs its curve at 0 at
 * once (:185-194) — which is `startValue`, so the value only moves on a LATER frame. The world's
 * clock is the frame time; a frame is a settle.
 *
 * An Easing Curve that is not one of `EaseCurves`' own names (a wire carries any text; an old
 * project a curve no longer listed; `''`, `null`, `undefined`) moves along Ease Out, the port's
 * default (v2 — NSP-013 §6 row C19, ruled "fix it" 2026-10-01).
 *
 * A Delay is read as a number: text `'100'` waits 100 ms, and anything that is not a number (a wire
 * let go, `null`, `'x'`) is no delay, 0 (v3 — NSP-013 §6.2 row C20, ruled "Read it as a number"
 * 2026-10-05, P109 ISL-026).
 */

import { defineNode } from '../spec';
import { EaseCurves } from './ease-curves';

/** :31-36 `numericOf` */
function numericOf(value: unknown): number {
  if (value === true) return 1;
  if (value === false) return 0;
  return Number(value);
}

/** :78 */
const DEFAULT_DURATION = 300;

type Num = number;

type State = {
  currentNumber: Num;
  numberInitialized: boolean;
  /** The timer's slots (the timer IS the options bag, timerscheduler.ts :30-41). Raw, as stored. */
  startValue: Num;
  endValue: Num;
  duration: unknown;
  delay: unknown;
  /** The NAME the curve was looked up by — `curveOf(name)` at use. */
  ease: unknown;
  jumpValue: unknown;
  /** A frame-end callback from `jumpTo` is pending (:70-75; two in one frame act as one). */
  jumpPending: boolean;
  /** The scheduler's bookkeeping: membership of `newTimers`, of `runningTimers`, and `_start` (raw: `now + delay`). */
  tQueued: boolean;
  tRunning: boolean;
  tStart: unknown;
}

/** `EaseCurves[name]` for one of its own names (the set is a plain object literal, so `toString` is not a curve); Ease Out for anything else (v2). */
function curveOf(name: unknown): (a: number, b: number, t: number) => number {
  const key = String(name);
  return Object.prototype.hasOwnProperty.call(EaseCurves, key) ? EaseCurves[key] : EaseCurves.easeOut;
}

export const AnimateToValue = defineNode({
  type: 'net.noodl.animatetovalue',
  // v2 (NSP-013 s16, row C19 ruled "fix it"): an Easing Curve that is not one of the set's own names moves
  // along Ease Out. In v1 such a run did not move the value at all — no Current Value — though it still
  // finished and fired At Target Value on time.
  // v3 (P109 ISL-026, row C20 ruled "Read it as a number"): Delay is read as a number, and anything that is
  // not a number is no delay. In v2 a text Delay was joined onto the frame time as text ('100' at time 1000
  // waited until 1000100), and a Delay that was not set (undefined) never started the run at all.
  version: 3,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/animate-to-value.ts; packages/noodl-runtime/src/timerscheduler.ts; packages/noodl-viewer-react/src/easecurves.ts',
  needs: ['clock'],
  worldPool: { advances: [0, 1, 16, 100, 150, 299, 300, 301, 1000] },

  // :89-114 initialize — value 0, nothing adopted; a timer of duration 300, endpoints 0, Ease Out, delay 0, neither queued nor running
  state: { currentNumber: 0, numberInitialized: false, startValue: 0, endValue: 0, duration: DEFAULT_DURATION, delay: 0, ease: 'easeOut', jumpValue: undefined, jumpPending: false, tQueued: false, tRunning: false, tStart: 0 } as State,
  // :130-134
  inspect: (s) => String(s.currentNumber),

  inputs: {
    // :136-170 — numericOf in the reducer; the declared default is undefined
    targetValue: {
      type: 'number',
      coerce: 'none',
      examples: [0, 1, 100, 50, -10, 0.5, true, false, '7', 'x'],
      displayName: 'Target Value',
      group: 'Target Value',
      description:
        'Value to move towards; the first one to arrive is adopted outright rather than animated to. Two targets in one update make one move, from wherever the value is: to jump first, use Jump To'
    },
    // :171-181 — raw
    jumpValue: { type: 'number', coerce: 'none', examples: [0, 100, 50, 'x'], displayName: 'Jump Value', group: 'Jump', description: 'Where Jump To puts Current Value' },
    // :182-190 — valueChangedToTrue
    jumpTo: {
      type: 'signal',
      displayName: 'Jump To',
      group: 'Jump',
      description:
        'Puts Current Value at Jump Value at once, then carries on towards Target Value; a jump is not an arrival, so At Target Value does not fire for it'
    },
    // :191-200 — raw onto the timer
    duration: { type: 'number', default: DEFAULT_DURATION, coerce: 'none', examples: [0, 1, 100, 300, 1000, -5, '100'], displayName: 'Duration', group: 'Parameters', description: 'How long the move takes, in milliseconds' },
    // :201-210 — raw onto the timer
    delay: { type: 'number', default: 0, coerce: 'none', examples: [0, 100, 300, -50, '100'], displayName: 'Delay', group: 'Parameters', description: 'How long to wait before the move begins, in milliseconds' },
    // :211-228 — `EaseCurves[value]`
    easingCurve: {
      type: 'enum',
      enums: ['easeOut', 'easeIn', 'linear', 'easeInOut'],
      default: 'easeOut',
      coerce: 'none',
      examples: ['easeInQuartic', 'bounce'],
      displayName: 'Easing Curve',
      group: 'Parameters',
      description: 'Shape of the movement between where the value is and Target Value'
    }
  },

  outputs: {
    // :231-239
    currentValue: { type: 'number', from: (s) => s.currentNumber, displayName: 'Current Value', group: 'Current State', description: 'Where the move has got to, updated every frame while it runs' },
    // :240-245
    atTargetValue: { type: 'signal', displayName: 'At Target Value', group: 'Events', description: 'Fires when the value settles on Target Value, and not at all if a new target interrupted it' }
  }
}).on(
  {
    // :145-169
    targetValue: (s, v) => {
      const numeric = numericOf(v);
      if (isNaN(numeric)) return { says: 'not a number: ignored', set: {}, send: [] }; // :148-151
      if (s.numberInitialized === false) {
        return { says: 'the first number it is handed: Current Value goes there at once, with no move', set: { currentNumber: numeric, numberInitialized: true, endValue: numeric }, send: ['currentValue'] }; // :155-160
      }
      if (numeric === s.endValue) return { says: 'the target it already has: nothing', set: {}, send: [] }; // :161-164
      // :166-168 — `start()`: a running timer is stopped and queued; a queued one stays queued
      return { says: 'a new target: a move under way is dropped without At Target Value, and a new one starts from where the value is, at the frame\'s end and Delay later', set: { startValue: s.currentNumber, endValue: numeric, tRunning: false, tQueued: true }, send: [] };
    },
    jumpValue: (_s, v) => ({ says: 'always: kept for the next Jump To; nothing moves', set: { jumpValue: v }, send: [] }), // :178-180
    // :187-189 → :54-76
    jumpTo: (s) => {
      const numeric = numericOf(s.jumpValue);
      if (isNaN(numeric)) return { says: 'Jump Value is not a number: nothing', set: {}, send: [] }; // :56
      // :61 `stop()` — out of the running set or the queue (timerscheduler.ts :52-57, :96-114); :67, :70; :68 sends
      if (s.numberInitialized === false) {
        // :62-66 — the first value it holds is its target too
        return { says: 'no number yet: Current Value goes to Jump Value, which becomes the target too', set: { tRunning: false, tQueued: false, currentNumber: numeric, jumpPending: true, numberInitialized: true, endValue: numeric }, send: ['currentValue'] };
      }
      return { says: 'otherwise: any move stops, Current Value goes to Jump Value, and at the frame\'s end it moves back to Target Value if they differ', set: { tRunning: false, tQueued: false, currentNumber: numeric, jumpPending: true }, send: ['currentValue'] };
    },
    duration: (_s, v) => ({ says: 'always: kept; read at every frame of a move, the move under way included', set: { duration: v }, send: [] }), // :198
    delay: (_s, v) => ({ says: 'always: kept as a number (what is not one is 0); read when the next move starts', set: { delay: Number(v) || 0 }, send: [] }), // :208 — v3, C20
    easingCurve: (_s, v) => ({ says: 'always: kept; read at every frame of a move, the move under way included', set: { ease: v }, send: [] }) // :226
  },
  {
    // the frame: the inputs' frame-end work (jumpTo's callback, :70-75), then the scheduler's timer pass (timerscheduler.ts :116-198)
    afterInputs: (s, _i, w) => {
      const now = w.now();
      let { currentNumber, startValue, tQueued, tRunning, tStart } = s;
      const send: Array<'currentValue'> = [];
      const emit: Array<'atTargetValue'> = [];
      const d = s.duration as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const curve = curveOf(s.ease);

      // :70-75 — the jump's frame-end callback
      if (s.jumpPending && s.endValue !== currentNumber) {
        startValue = currentNumber; // :72
        if (!tQueued) tQueued = true; // :73 `start()` — stopped by the jump, so queued
      }

      // :130-174 — the running timer
      if (tRunning && now >= (tStart as number)) {
        const t = d > 0 ? (now - (tStart as number)) / (d * 1) : 1.0; // :139-143
        const localT = t >= 1.0 ? 1.0 : t * 1 - Math.floor(t * 1); // :147-150
        currentNumber = curve(startValue, s.endValue, localT); // :108
        send.push('currentValue'); // :109
        if (!(t < 1.0)) {
          tRunning = false; // :168-169
          emit.push('atTargetValue'); // :111-113
        }
      }

      // :177-197 — the queued timer joins
      if (tQueued) {
        tStart = (now as any) + (s.delay as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        tRunning = true;
        tQueued = false;
        if (s.delay === 0) {
          currentNumber = curve(startValue, s.endValue, 0); // :191-193 — onRunning(0)
          send.push('currentValue');
        }
      }

      return { set: { currentNumber, startValue, jumpPending: false, tQueued, tRunning, tStart }, send, emit };
    }
  }
);
```


:::info Generated
This page is generated from `node-catalog-enriched.json`, the node's spec in `packages/nodegx-node-spec` and the export ledger. Do not edit it by hand — run `npm run docs:nodes` to regenerate, and fix the source instead.
:::
