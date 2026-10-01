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
 * equals it (:54-76) — a jump is not an arrival. `Duration`, `Delay` and `Easing Curve` are stored
 * RAW on the timer (:197-227: no conversion; the curve is looked up by name).
 *
 * THE FRAME (timerscheduler.ts `runTimers(now)`, :116-198, run once per frame after the inputs'
 * frame-end work, nodecontext.ts :495-503): (1) a RUNNING timer whose start is reached runs its
 * curve at `t = (now − start) / duration` (1 when `duration > 0` is false), clamped to 1 at the end
 * (:132-154); at `t ≥ 1` it finishes and `At Target Value` fires (:156-174, :111-113). (2) a QUEUED
 * timer joins with `start = now + delay` (:177-183 — a JS `+`, so a text Delay CONCATENATES and an
 * undefined one is NaN, a start never reached), and with a delay `=== 0` runs its curve at 0 at
 * once (:185-194) — which is `startValue`, so the value only moves on a LATER frame. The world's
 * clock is the frame time; a frame is a settle.
 *
 * ⚠️ A name `EaseCurves` does not have (a wire carries any text; an old project a curve no longer
 * listed) is stored as `undefined` (:226), and the run's first curve call THROWS inside the
 * scheduler's timer pass, which nothing catches (nodecontext.ts :500-503) — NSP-013 §6 row C19. The
 * spec writes a run with no curve as a run that does not move the value (the runtime has no
 * behaviour a wire can carry there); the runtime conformance test attributes the throw to the row.
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
  /** The NAME the curve was looked up by — `EaseCurves[name]` at use, which is what was stored at :226. */
  ease: unknown;
  jumpValue: unknown;
  /** A frame-end callback from `jumpTo` is pending (:70-75; two in one frame act as one). */
  jumpPending: boolean;
  /** The scheduler's bookkeeping: membership of `newTimers`, of `runningTimers`, and `_start` (raw: `now + delay`). */
  tQueued: boolean;
  tRunning: boolean;
  tStart: unknown;
}

/** `EaseCurves[name]` — `undefined` for a name the set does not have (an own key only: the set is a plain object literal). */
function curveOf(name: unknown): ((a: number, b: number, t: number) => number) | undefined {
  const key = String(name);
  return Object.prototype.hasOwnProperty.call(EaseCurves, key) ? EaseCurves[key] : undefined;
}

export const AnimateToValue = defineNode({
  type: 'net.noodl.animatetovalue',
  version: 1,
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
      if (isNaN(numeric)) return { set: {}, send: [] }; // :148-151
      if (s.numberInitialized === false) {
        return { set: { currentNumber: numeric, numberInitialized: true, endValue: numeric }, send: ['currentValue'] }; // :155-160
      }
      if (numeric === s.endValue) return { set: {}, send: [] }; // :161-164
      // :166-168 — `start()`: a running timer is stopped and queued; a queued one stays queued
      return { set: { startValue: s.currentNumber, endValue: numeric, tRunning: false, tQueued: true }, send: [] };
    },
    jumpValue: (_s, v) => ({ set: { jumpValue: v }, send: [] }), // :178-180
    // :187-189 → :54-76
    jumpTo: (s) => {
      const numeric = numericOf(s.jumpValue);
      if (isNaN(numeric)) return { set: {}, send: [] }; // :56
      // :61 `stop()` — out of the running set or the queue (timerscheduler.ts :52-57, :96-114)
      const set: Partial<State> = { tRunning: false, tQueued: false, currentNumber: numeric, jumpPending: true }; // :67, :70
      if (s.numberInitialized === false) {
        set.numberInitialized = true; // :62-66
        set.endValue = numeric;
      }
      return { set, send: ['currentValue'] }; // :68
    },
    duration: (_s, v) => ({ set: { duration: v }, send: [] }), // :198
    delay: (_s, v) => ({ set: { delay: v }, send: [] }), // :208
    easingCurve: (_s, v) => ({ set: { ease: v }, send: [] }) // :226
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
        if (curve) {
          currentNumber = curve(startValue, s.endValue, localT); // :108 (row C19: no curve → the runtime throws here)
          send.push('currentValue'); // :109
        }
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
        if (s.delay === 0 && curve) {
          currentNumber = curve(startValue, s.endValue, 0); // :191-193 — onRunning(0)
          send.push('currentValue');
        }
      }

      return { set: { currentNumber, startValue, jumpPending: false, tQueued, tRunning, tStart }, send, emit };
    }
  }
);
