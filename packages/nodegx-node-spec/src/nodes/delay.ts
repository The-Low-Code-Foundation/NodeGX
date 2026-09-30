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
 * when the timer was running and `unchanged` otherwise, INCLUDING when it was queued and the Stop
 * did cancel it (:105-107 read `_isRunning`; :108-113 remove it from the queue anyway) — a row in
 * NSP-007 §6 (D10).
 */

import { defineNode } from '../spec';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** The scheduler's own JavaScript arithmetic on a raw value — no conversion of the spec's choosing. */
const js = (v: unknown): any => v;

export const Delay = defineNode({
  type: 'Timer',
  version: 1,
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
    start: (s) => (s.running ? { outcome: 'unchanged' } : { set: { queued: true }, outcome: 'done' }),

    // :71-77 — start() whatever the state: a running timer is stopped first (:44-46 → :52-57:
    // leaves the running set, `_hasCalledOnStart` false), then queued; always `done`.
    restart: () => ({ set: { queued: true, running: false, started: false }, outcome: 'done' }),

    // :103-108 — `done` if it was running, `unchanged` otherwise; stop() removes it from whichever
    // set holds it (:96-114) — a QUEUED timer is cancelled and still reports `unchanged` (D10).
    stop: (s) => ({ set: { queued: false, running: false, started: false }, outcome: s.running ? 'done' : 'unchanged' })
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
