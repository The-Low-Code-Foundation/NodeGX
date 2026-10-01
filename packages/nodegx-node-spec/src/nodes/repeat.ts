/**
 * Repeat — read from `packages/noodl-viewer-react/src/nodes/std-library/repeat.ts` and the
 * scheduler it drives, `packages/noodl-runtime/src/timerscheduler.ts`, on 2026-10-01 (NSP-013).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: a Repeat is ONE scheduler timer that re-queues itself from its
 * own `onFinish` (:49-54, :175-194). `Start` while running reports `unchanged` (:107-110 — the
 * node's own `running` flag, set at once, so two Starts in one frame cannot both start, unlike
 * Delay's); `Start` with an `Interval` that is not a finite number above zero reports `failure`
 * `repeat/interval-not-positive` and starts nothing (:111-117, :40-42 — a string `'100'` is not a
 * number); otherwise `Count` goes back to 0 if it was not (:123-126), the beat is the interval,
 * the first tick is due at THE LAST FRAME'S TIME + beat (:120-122 — `currentFrameTime`, the time
 * of the frame most recently run, not the clock: a Start after an `advance` and before a settle
 * reads the older time) and the timer is QUEUED (:127-128), reporting `done`. A queued timer
 * joins the running set at the end of the next frame's timer pass with its start at that frame's
 * time (timerscheduler.ts :177-197; delay 0), and finishes on the first LATER frame whose time
 * is at or past start + duration (:132-159): `Count` +1 and `Tick` (:179-181), then the next
 * beat — the interval if it is usable now, else the last beat (:186) — is added to the due time,
 * a due time already passed is skipped forward by whole beats (:188-191: missed ticks are
 * skipped, not replayed, keeping phase), the timer's duration becomes due − now and it is queued
 * again (:192-193), joining in the same pass (:177 — queued timers join AFTER the finished ones'
 * `onFinish`). `Stop` while running reports `done` and removes the timer wherever it is
 * (:135-141, timerscheduler.ts :96-114); otherwise `unchanged`. `Count` keeps its value until the
 * next Start (:132). `Interval` is stored raw (:98).
 *
 * The clock is the world's (spec.ts `WorldView.now`); a frame is a settle. A Stop wired from Tick
 * runs INSIDE the tick on the runtime (:184 — the re-queue is skipped); the interpreter delivers
 * a pulse between nodes at the settle, so that shape is a graph scenario's (NSP-008), not this
 * spec's.
 */

import { defineNode } from '../spec';

/** :40-42 */
function isUsableInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

type State = {
  running: boolean;
  count: number;
  interval: unknown;
  beat: number;
  nextAt: number;
  /** `context.currentFrameTime` — the time of the frame most recently run (0 before any). */
  frameTime: number;
  /** The scheduler's bookkeeping for the one timer: membership of `newTimers`, of `runningTimers`, `_start`, `duration`. */
  tQueued: boolean;
  tRunning: boolean;
  tStart: number;
  tDuration: number;
}

export const Repeat = defineNode({
  type: 'Repeat',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/repeat.ts; packages/noodl-runtime/src/timerscheduler.ts',
  needs: ['clock'],
  worldPool: { advances: [0, 1, 10, 99, 100, 101, 500, 1000, 1001, 2500] },

  // :73-85 initialize — stopped, count 0, interval 1000, beat 1000, a timer of duration 1000 neither queued nor running
  state: { running: false, count: 0, interval: 1000, beat: 1000, nextAt: 0, frameTime: 0, tQueued: false, tRunning: false, tStart: 0, tDuration: 1000 } as State,
  // :90-92
  inspect: (s) => (s.running ? 'Running' : 'Stopped') + ', count ' + s.count,
  // :160-164 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :94-101 — raw
    interval: {
      type: 'number',
      default: 1000,
      coerce: 'none',
      displayName: 'Interval',
      group: 'Values',
      description: 'Time between ticks, in milliseconds. A change takes effect from the next tick. Must be above zero',
      examples: [10, 100, 1000, 0, -5, '100', 0.5]
    },
    // :102-130
    start: { type: 'signal', outcome: true, displayName: 'Start', group: 'Actions', description: 'Starts ticking from a Count of 0: the first Tick fires one Interval later. Fires Unchanged while already running' },
    // :131-142
    stop: { type: 'signal', outcome: true, displayName: 'Stop', group: 'Actions', description: 'Stops ticking. Count keeps its value until the next Start' }
  },

  outputs: {
    // :145-150
    tick: { type: 'signal', displayName: 'Tick', group: 'Events', description: 'Fires once every Interval while running' },
    // :151-159
    count: { type: 'number', from: (s) => s.count, displayName: 'Count', group: 'Values', description: 'How many times Tick has fired since the last Start' }
  }
}).on(
  {
    interval: (_s, v) => ({ set: { interval: v }, send: [] }), // :98-100

    // :106-129
    start: (s) => {
      if (s.running) return { outcome: 'unchanged' }; // :107-110
      if (!isUsableInterval(s.interval)) {
        return { outcome: 'failure', error: 'repeat/interval-not-positive' }; // :111-117
      }
      const beat = s.interval;
      const nextAt = s.frameTime + beat; // :120-122
      const count = s.count !== 0 ? 0 : s.count; // :123-126
      // :127-128 — `timer.duration = beat; timer.start()`: not running, so queued (timerscheduler.ts :44-50, :86-93)
      return { set: { running: true, beat, nextAt, count, tDuration: beat, tQueued: true }, send: count !== s.count ? ['count'] : [], outcome: 'done' };
    },

    // :133-141 — `timer.stop()` removes it from the running set or the queue (timerscheduler.ts :96-114)
    stop: (s) => (s.running ? { set: { running: false, tQueued: false, tRunning: false }, outcome: 'done' } : { outcome: 'unchanged' })
  },
  {
    // The frame's timer pass — timerscheduler.ts `runTimers(currentTime)` (:116-198), run once per
    // frame at the frame's time (nodecontext.ts :500-503); here once per settle at the world's time.
    afterInputs: (s, _i, w) => {
      const now = w.now();
      let { running, count, beat, nextAt, tQueued, tRunning, tStart, tDuration } = s;
      const emit: Array<'tick'> = [];
      const send: Array<'count'> = [];

      // part 1 (:130-174): the running timer is read; `t >= 1` finishes it and runs onFinish = _tick
      if (tRunning && now >= tStart) {
        const t = tDuration > 0 ? (now - tStart) / (tDuration * 1) : 1.0; // :139-143
        if (!(t < 1.0)) {
          tRunning = false; // :168-169
          // :175-194 `_tick`
          if (running) {
            count += 1; // :179
            send.push('count');
            emit.push('tick'); // :181
            if (isUsableInterval(s.interval)) beat = s.interval; // :186
            nextAt += beat; // :188
            if (nextAt <= now) nextAt += Math.ceil((now - nextAt) / beat + Number.EPSILON) * beat; // :189-191
            tDuration = nextAt - now; // :192
            tQueued = true; // :193 `timer.start()` — not running, so queued
          }
        }
      }

      // part 2 (:177-197): the queued timer joins at the frame's time (delay 0; no onStart, no onRunning)
      if (tQueued) {
        tStart = now;
        tRunning = true;
        tQueued = false;
      }

      return { set: { running, count, beat, nextAt, frameTime: now, tQueued, tRunning, tStart, tDuration }, send, emit };
    }
  }
);
