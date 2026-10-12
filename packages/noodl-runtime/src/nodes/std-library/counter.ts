'use strict';

import type { InspectInfo, NodeDefinitionOptions, NodeInstance, NodeModule } from '@noodl/types';

import { outcomeOutputs } from '../../outcome';

/**
 * `this` inside the Counter node.
 *
 * `startValueSet` exists so the *first* Start Value that arrives also seeds the current
 * count, while later ones only change where Reset goes back to. That is why the setter
 * looks asymmetric.
 */
interface CounterNodeInstance extends NodeInstance {
  _internal: {
    currentValue: number;
    startValue: number;
    startValueSet: boolean;
    limitsEnabled: boolean;
    limitsMin: number;
    limitsMax: number;
  };
}

/**
 * P107 NSP-019 s95 — the Counter's one diagnostic (DIAGNOSTICS-CONTRACT.md: "two of this node's settings contradict each
 * other"). Min above Max is a mistake whether or not Limits Enabled is on: with it on, every count stops where neither
 * Increase nor Decrease can move it. Evaluated in both setters it reads, so the statement that raises it also clears it.
 * The spec says the same sentence (`nodegx-node-spec/src/nodes/counter.ts`), and the conformance suite compares the two.
 */
const MIN_ABOVE_MAX = 'counter/min-above-max';

function checkLimits(node: CounterNodeInstance): void {
  const { limitsMin: min, limitsMax: max } = node._internal;
  node.setDiagnostic(MIN_ABOVE_MAX, min > max ? `Min Value ${min} is above Max Value ${max}. With Limits Enabled on, the count gets stuck.` : null);
}

const CounterNode: NodeDefinitionOptions = {
  name: 'Counter',
  docs: 'https://docs.noodl.net/nodes/math/counter',
  category: 'Math',
  initialize: function (this: CounterNodeInstance) {
    this._internal.currentValue = 0;
    this._internal.startValue = 0;
    this._internal.startValueSet = false;

    this._internal.limitsEnabled = false;
    this._internal.limitsMin = 0;
    this._internal.limitsMax = 0;
  },
  getInspectInfo(this: CounterNodeInstance): InspectInfo {
    return 'Count: ' + this._internal.currentValue;
  },
  inputs: {
    increase: {
      group: 'Actions',
      displayName: 'Increase Count',
      description: 'Adds one to the count, or does nothing at all when Limits Enabled and the count is already at Max Value',
      valueChangedToTrue: function (this: CounterNodeInstance) {
        const outcome = this.beginOutcome();
        // ERG-001 §4, §0.3's register. This was a bare `return` — a counter pinned at Max
        // told the graph nothing at all, so "increase, then show the new total" simply
        // stopped. Not a failure: Limits Enabled is what the author asked for.
        if (this._internal.limitsEnabled && this._internal.currentValue >= this._internal.limitsMax) {
          this.reportOutcome(outcome, 'unchanged');
          return;
        }

        this._internal.currentValue++;
        this.flagOutputDirty('currentCount');
        this.sendSignalOnOutput('countChanged');
        this.reportOutcome(outcome, 'done');
      }
    },
    decrease: {
      group: 'Actions',
      displayName: 'Decrease Count',
      description: 'Subtracts one from the count, or does nothing at all when Limits Enabled and the count is already at Min Value',
      valueChangedToTrue: function (this: CounterNodeInstance) {
        const outcome = this.beginOutcome();
        if (this._internal.limitsEnabled && this._internal.currentValue <= this._internal.limitsMin) {
          this.reportOutcome(outcome, 'unchanged');
          return;
        }

        this._internal.currentValue--;
        this.flagOutputDirty('currentCount');
        this.sendSignalOnOutput('countChanged');
        this.reportOutcome(outcome, 'done');
      }
    },
    reset: {
      group: 'Actions',
      displayName: 'Reset To Start',
      description:
        'Puts the count back to Start Value, or reports Unchanged and leaves Count Changed silent when it is already there',
      valueChangedToTrue: function (this: CounterNodeInstance) {
        /**
         * FH-022 slice 3 — the guard that had never once fired, now firing.
         *
         * The count lives at `_internal.currentValue`, so the old `this.currentValue` read
         * `undefined` on every pass and this early return was dead code from the day it was
         * written (PLAT-003 NOTES §25). ERG-001 §4 kept it verbatim on purpose and said so in
         * the code: repairing it changes when `Count Changed` fires, which is a behaviour
         * change and had no business riding along inside a contract adoption.
         *
         * ⚠️ **The obvious repair is also wrong.** Simply pointing the read at `_internal`
         * leaves the comparison against `0`, which would report `Unchanged` for "the count is
         * zero" — a different condition, and wrong on any counter that starts anywhere else.
         * `Reset` sets the count to `_internal.startValue`, so the post-condition that already
         * holds is `currentValue === startValue`, and that is what is tested.
         *
         * ⚠️ **This is a behaviour change, shipped alone so it can be reverted alone.** With
         * the guard live, `Count Changed` stops firing on a Reset that changes nothing, and
         * `Reset` starts reporting `Unchanged` on a node that has never emitted it. Both are
         * what the contract says should happen, and `Treat Unchanged as` is already there for
         * a project that wants the old pulse back as `Done`.
         */
        const outcome = this.beginOutcome();
        if (this._internal.currentValue === this._internal.startValue) {
          this.reportOutcome(outcome, 'unchanged');
          return;
        }
        this._internal.currentValue = this._internal.startValue;
        this.flagOutputDirty('currentCount');
        this.sendSignalOnOutput('countChanged');
        this.reportOutcome(outcome, 'done');
      }
    },
    startValue: {
      group: 'Values',
      type: 'number',
      displayName: 'Start Value',
      description: 'Count to begin at and to return to on Reset; setting it announces a change on Count Changed at page load',
      default: 0,
      set: function (this: CounterNodeInstance, value: unknown) {
        this._internal.startValue = Number(value);

        if (this._internal.startValueSet === false) {
          this._internal.startValueSet = true;
          this._internal.currentValue = this._internal.startValue;
          this.flagOutputDirty('currentCount');
          this.sendSignalOnOutput('countChanged');
        }
      }
    },
    limitsMin: {
      type: {
        name: 'number'
      },
      displayName: 'Min Value',
      description: 'Lowest count Decrease will reach, ignored unless Limits Enabled',
      group: 'Limits',
      default: 0,
      set: function (this: CounterNodeInstance, value: unknown) {
        this._internal.limitsMin = Number(value);
        checkLimits(this);
      }
    },
    limitsMax: {
      type: {
        name: 'number'
      },
      displayName: 'Max Value',
      description: 'Highest count Increase will reach, ignored unless Limits Enabled',
      group: 'Limits',
      default: 0,
      set: function (this: CounterNodeInstance, value: unknown) {
        this._internal.limitsMax = Number(value);
        checkLimits(this);
      }
    },
    limitsEnabled: {
      type: {
        name: 'boolean'
      },
      displayName: 'Limits Enabled',
      description: 'Whether Min Value and Max Value bound the count; without it the count runs unbounded in both directions',
      group: 'Limits',
      default: false,
      set: function (this: CounterNodeInstance, value: unknown) {
        this._internal.limitsEnabled = value ? true : false;
      }
    }
  },
  outputs: {
    currentCount: {
      group: 'Values',
      displayName: 'Current Count',
      type: 'number',
      description: 'The count as it stands',
      getter: function (this: CounterNodeInstance) {
        // P112-OWN018-COUNTERZERO. A node's parameters are queued and land at its first update, but its wires are
        // made before that, and a wire hands its target this getter's value at once. So a Counter whose Start Value
        // is 10 used to tell every consumer 0 first: Mistral's quiz countdown (`count === 0` → time's up) fired at
        // page load and skipped question 1. Until the first Start Value lands, the count is the one the model says.
        if (this._internal.startValueSet === false) {
          const start = (this as { model?: { parameters?: Record<string, unknown> } }).model?.parameters?.startValue;
          if (start !== undefined && start !== null && start !== '' && !isNaN(Number(start))) return Number(start);
        }
        return this._internal.currentValue;
      }
    },
    countChanged: {
      group: 'Events',
      displayName: 'Count Changed',
      type: 'signal',
      description: 'Fires after the count has moved, and also once at page load when Start Value is set'
    },

    /**
     * ERG-001 §4. Distinct from `Count Changed`, which is about the *value* and also fires at
     * page load when Start Value arrives. These are about the *invocation*: exactly one per
     * Increase / Decrease / Reset, which is what a chain can sequence on.
     */
    ...outcomeOutputs({
      done: 'Fires when the count actually moved',
      unchanged:
        'Fires when nothing moved: Limits Enabled held the count at Min or Max, or Reset was pressed on a count already at Start Value'
    })
  }
};

const CounterNodeModule: NodeModule = {
  node: CounterNode
};

export = CounterNodeModule;
