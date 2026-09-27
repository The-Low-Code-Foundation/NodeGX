import { outcomeOutputs } from '@noodl/runtime/src/outcome';
import type { NodeDefinitionOptions, NodeInstance, Timer as SchedulerTimer } from '@noodl/types';

/**
 * GAM-013 (P78 D40), R1 — something happens every second without a script.
 *
 * Nothing in the library repeated: `Delay` is a one-shot, so an author wired its Finished back into its own
 * Restart (taught nowhere) or hid a `setInterval` in a Function (invisible on the canvas, and nobody had checked
 * it stops when the page goes away). Richard ruled a node of its own, not a Repeat option on Delay, and that it
 * stops when its page is navigated away from.
 *
 * The four guarantees the task asked for, and where each one lives:
 *
 * - **One clock.** Ticks run on `context.timerScheduler`, as Delay does, never a raw `setInterval`, so a server
 *   render (whose clock is frozen) never ticks and a test drives the same clock the page does.
 * - **Leaving stops it.** The removal is registered beside the timer, in `initialize`, with `addDeleteListener`.
 *   `_onNodeDeleted` runs on delete, on unmount and on navigating away (the keyboard-shortcuts module's rule).
 * - **No stacking.** `Start` while running reports `Unchanged`. The guard is this node's own `running` flag, set
 *   the moment Start is handled: the scheduler's `_isRunning` only turns true at the end of the next frame, so a
 *   guard on it (Delay's) lets two Starts in one frame through.
 * - **No catch-up burst.** A tick due while the tab was throttled is skipped, not replayed: one Tick fires, and the
 *   next is scheduled on the original beat.
 */
interface RepeatInstance extends NodeInstance {
  _internal: {
    timer: SchedulerTimer;
    running: boolean;
    count: number;
    /** The Interval input as last set, in milliseconds. Read at Start and at every tick. */
    interval: number;
    /** The interval the running beat uses: the last valid one. */
    beat: number;
    /** Frame time the next tick is due. */
    nextAt: number;
  };
  _tick(): void;
}

/** The time of the frame being run, in milliseconds: the scheduler's clock, which `runTimers` is handed. */
function frameTimeOf(node: NodeInstance): number {
  return (node.context as unknown as { currentFrameTime: number }).currentFrameTime;
}

/** A usable interval: a finite number of milliseconds above zero. */
function isUsableInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

const Repeat: NodeDefinitionOptions = {
  name: 'Repeat',
  displayName: 'Repeat',
  category: 'Utilities',
  searchTags: ['interval', 'every', 'tick', 'ticker', 'clock', 'loop', 'timer', 'poll', 'countdown'],
  // Client-only, not Delay's `partial`. The server clock is frozen at 0, so a Repeat started there (Did Mount fires in a
  // server render) never ticks, but its pending timer asks for an update on every turn, and `render-gate.js`'s
  // `settle` never goes quiet: the render runs to its 3000-turn cap and warns. Measured in GAM-013 AC5.
  ssr: {
    compat: 'client-only',
    note: 'Does nothing during a server render: it never ticks there and Count reads empty. It starts in the browser after hydration.'
  },
  nodeDoubleClickAction: {
    focusPort: 'interval'
  },
  initialize: function (this: RepeatInstance) {
    const self = this;
    this._internal.running = false;
    this._internal.count = 0;
    this._internal.interval = 1000;
    this._internal.beat = 1000;
    this._internal.nextAt = 0;
    this._internal.timer = this.context.timerScheduler.createTimer({
      duration: 1000,
      onFinish: function () {
        self._tick();
      }
    });

    // Registered here, beside the timer it removes, so there is no path that creates one without the other.
    this.addDeleteListener(() => {
      this._internal.running = false;
      this._internal.timer.stop();
    });
  },
  getInspectInfo(this: RepeatInstance) {
    return (this._internal.running ? 'Running' : 'Stopped') + ', count ' + this._internal.count;
  },
  inputs: {
    interval: {
      group: 'Values',
      type: 'number',
      displayName: 'Interval',
      default: 1000,
      description:
        'Time between ticks, in milliseconds. A change takes effect from the next tick. Must be above zero',
      set: function (this: RepeatInstance, value: number) {
        this._internal.interval = value;
      }
    },
    start: {
      group: 'Actions',
      displayName: 'Start',
      description:
        'Starts ticking from a Count of 0: the first Tick fires one Interval later. Fires Unchanged while already running',
      valueChangedToTrue: function (this: RepeatInstance) {
        const outcome = this.beginOutcome();
        const internal = this._internal;
        if (internal.running) {
          this.reportOutcome(outcome, 'unchanged');
          return;
        }
        if (!isUsableInterval(internal.interval)) {
          this.reportOutcome(outcome, 'failure', {
            code: 'repeat/interval-not-positive',
            message: `Interval is ${String(internal.interval)}, and Repeat needs a number of milliseconds above zero`
          });
          return;
        }

        internal.running = true;
        internal.beat = internal.interval;
        internal.nextAt = frameTimeOf(this) + internal.beat;
        if (internal.count !== 0) {
          internal.count = 0;
          this.flagOutputDirty('count');
        }
        internal.timer.duration = internal.beat;
        internal.timer.start();
        this.reportOutcome(outcome, 'done');
      }
    },
    stop: {
      group: 'Actions',
      displayName: 'Stop',
      description: 'Stops ticking. Count keeps its value until the next Start',
      valueChangedToTrue: function (this: RepeatInstance) {
        const outcome = this.beginOutcome();
        if (!this._internal.running) {
          this.reportOutcome(outcome, 'unchanged');
          return;
        }
        this._internal.running = false;
        this._internal.timer.stop();
        this.reportOutcome(outcome, 'done');
      }
    }
  },
  outputs: {
    tick: {
      group: 'Events',
      type: 'signal',
      displayName: 'Tick',
      description: 'Fires once every Interval while running'
    },
    count: {
      group: 'Values',
      type: 'number',
      displayName: 'Count',
      description: 'How many times Tick has fired since the last Start',
      getter: function (this: RepeatInstance) {
        return this._internal.count;
      }
    },
    ...outcomeOutputs({
      done: 'Fires when Start began ticking or Stop stopped it',
      unchanged: 'Fires on a Start while already running, or a Stop with nothing running',
      failure: 'Fires on a Start whose Interval is not a number of milliseconds above zero'
    })
  },
  methods: {
    _tick: function (this: RepeatInstance) {
      const internal = this._internal;
      if (!internal.running) return;

      internal.count += 1;
      this.flagOutputDirty('count');
      this.sendSignalOnOutput('tick');

      // A Stop wired from Tick has already run by here.
      if (!internal.running) return;

      if (isUsableInterval(internal.interval)) internal.beat = internal.interval;
      const now = frameTimeOf(this);
      internal.nextAt += internal.beat;
      if (internal.nextAt <= now) {
        // Ticks missed while the tab was throttled are skipped, not replayed, and the beat keeps its phase.
        internal.nextAt += Math.ceil((now - internal.nextAt) / internal.beat + Number.EPSILON) * internal.beat;
      }
      internal.timer.duration = internal.nextAt - now;
      internal.timer.start();
    }
  }
};

export default {
  node: Repeat
};
