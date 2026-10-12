import { outcomeOutputs } from '@noodl/runtime/src/outcome';
import type { NodeDefinitionOptions, NodeInstance, Timer as SchedulerTimer } from '@noodl/types';

interface TimerInstance extends NodeInstance {
  _internal: {
    /**
     * `_isRunning` is the scheduler's own private flag, read directly by the `start`
     * input below. It is not on the published `Timer` interface — `isRunning()` is —
     * so it is declared here rather than widening the shared type.
     */
    _animation: SchedulerTimer & { _isRunning: boolean; scheduler?: { newTimers?: unknown[] } };
    /** ISL-004 — a countdown paused while its kept page is hidden, and its own Duration and Start Delay. */
    paused?: { left: number; duration: number; delay: number };
    /** ISL-004 — set while a paused countdown runs out its remainder: Started already fired for it. */
    resumed?: { duration: number; delay: number };
  };
  _restoreAfterResume(): void;
}

const Timer: NodeDefinitionOptions = {
  name: 'Timer',
  docs: 'https://docs.noodl.net/nodes/utilities/delay',
  displayName: 'Delay',
  category: 'Utilities',
  ssr: {
    compat: 'partial',
    note: 'The scheduler clock is frozen during server render, so Started/Finished never fire there; do not gate Page Ready on a Delay.'
  },
  nodeDoubleClickAction: {
    focusPort: 'duration'
  },
  initialize: function (this: TimerInstance) {
    const self = this;
    this._internal._animation = this.context.timerScheduler.createTimer({
      duration: 0,
      onStart: function () {
        // ISL-004: the remainder of a countdown paused on a hidden kept page already said Started.
        if (self._internal.resumed) return;
        self.sendSignalOnOutput('timerStarted');
      },
      onFinish: function () {
        self._restoreAfterResume();
        self.sendSignalOnOutput('timerFinished');
      }
    }) as TimerInstance['_internal']['_animation'];

    this.addDeleteListener(() => {
      this._internal._animation.stop();
    });
  },
  getInspectInfo(this: TimerInstance) {
    if (this._internal._animation.isRunning()) {
      return Math.floor(this._internal._animation.durationLeft() / 10) / 100 + ' seconds';
    }
    return 'Not running';
  },
  inputs: {
    start: {
      group: 'Actions',
      displayName: 'Start',
      description: 'Starts the countdown, or fires Unchanged while one is already running — use Restart to begin again',
      valueChangedToTrue: function (this: TimerInstance) {
        const outcome = this.beginOutcome();
        // ERG-001 §4, §0.3's register. A `Start` on a running timer did nothing and said
        // nothing — and `Started` does not fire either, so there was no signal at all. Not a
        // failure: a countdown is running, which is what `Start` asked for.
        if (this._internal._animation._isRunning === false) {
          this._internal._animation.start();
          this.reportOutcome(outcome, 'done');
        } else {
          this.reportOutcome(outcome, 'unchanged');
        }
      }
    },
    restart: {
      group: 'Actions',
      displayName: 'Restart',
      description: 'Begins the countdown again from zero, whether or not one is already running',
      valueChangedToTrue: function (this: TimerInstance) {
        const outcome = this.beginOutcome();
        // Restart cannot no-op — it begins again whether or not one was running — which is the
        // whole difference between it and Start, and why only one of the two gets `Unchanged`.
        this._internal._animation.start();
        this.reportOutcome(outcome, 'done');
      }
    },
    duration: {
      group: 'Values',
      type: 'number',
      displayName: 'Duration',
      default: 0,
      description: 'How long the countdown runs before Finished fires, in milliseconds',
      set: function (this: TimerInstance, value: number) {
        this._internal._animation.duration = value;
      }
    },
    startDelay: {
      group: 'Values',
      type: 'number',
      displayName: 'Start Delay',
      default: 0,
      description: 'How long to wait after Start before the countdown begins, in milliseconds',
      set: function (this: TimerInstance, value: number) {
        this._internal._animation.delay = value;
      }
    },
    stop: {
      group: 'Actions',
      displayName: 'Stop',
      description: 'Abandons the countdown, so Finished never fires for it',
      valueChangedToTrue: function (this: TimerInstance) {
        const outcome = this.beginOutcome();
        const a = this._internal._animation;
        // P107-D10: a countdown Started this frame is QUEUED — `_isRunning` is set only when it joins at
        // the frame end — and `stop()` cancels it all the same, so that is a Stop that did something.
        const queued = !!a.scheduler && !!a.scheduler.newTimers && a.scheduler.newTimers.indexOf(a) !== -1;
        const wasRunning = a._isRunning !== false || queued;
        a.stop();
        this._internal.paused = undefined;
        this._restoreAfterResume();
        this.reportOutcome(outcome, wasRunning ? 'done' : 'unchanged');
      }
    }
  },
  outputs: {
    timerStarted: {
      group: 'Events',
      type: 'signal',
      displayName: 'Started',
      description: 'Fires when the countdown begins, once Start Delay has elapsed'
    },
    timerFinished: {
      group: 'Events',
      type: 'signal',
      displayName: 'Finished',
      description: 'Fires once Duration has elapsed, and not at all for a countdown that was stopped'
    },

    /**
     * ERG-001 §4. Distinct from `Started` and `Finished`, which are about the *countdown*:
     * `Started` fires only after Start Delay elapses and `Finished` only when the countdown
     * runs out. These are about the invocation — exactly one per Start, Restart or Stop, the
     * moment it is handled.
     */
    ...outcomeOutputs({
      done: 'Fires when the action changed what the timer was doing',
      unchanged: 'Fires on a Start while one is already running, or a Stop with nothing running'
    })
  },
  methods: {
    /**
     * P109 ISL-004 — a kept page's clock does not run while the page is hidden (ruled 2026-10-05, "Yes, if ticked"):
     * the Router calls these when it hides and shows a page with Keep When Leaving. The countdown carries on from what
     * was left, without a second Started, and Finished fires once, when it runs out.
     */
    _onPageHidden: function (this: TimerInstance) {
      const a = this._internal._animation;
      if (a._isRunning !== true || this._internal.paused) return;
      const left = a.durationLeft();
      const own = this._internal.resumed || { duration: a.duration, delay: a.delay };
      this._internal.paused = { left: typeof left === 'number' && left >= 0 ? left : a.duration, ...own };
      a.stop();
    },
    _onPageShown: function (this: TimerInstance) {
      const paused = this._internal.paused;
      if (!paused) return;
      this._internal.paused = undefined;
      const a = this._internal._animation;
      this._internal.resumed = { duration: paused.duration, delay: paused.delay };
      a.duration = paused.left;
      a.delay = 0;
      a.start();
    },
    _restoreAfterResume: function (this: TimerInstance) {
      const resumed = this._internal.resumed;
      if (!resumed) return;
      this._internal.resumed = undefined;
      this._internal._animation.duration = resumed.duration;
      this._internal._animation.delay = resumed.delay;
    }
  }
};

export default {
  node: Timer
};
