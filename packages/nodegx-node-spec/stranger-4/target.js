'use strict';
/**
 * The fourth stranger's target: the Dropdown drawn with the plain DOM into the page it is handed (tests/stranger-page.js),
 * played under the adapter contract of src/adapter.ts.
 *
 *   mount   records a `set` per param (key order), applies each, then PLACES the node (the first paint: Did Mount);
 *   set     records `set`, writes; signal records `in`, pulses; act records `act`, paints, hands the act to the page;
 *   settle  paints (the frame end), reads every output, and records `settle`, the values that changed (sorted by name),
 *           the signals in the order they fired, the outcomes in the order reported.
 *
 * Output sampling: after each step the outputs that step SENT are read and a defined reading becomes the frame's;
 * at the settle every output is read once more under the same rule.
 */

const { canonical, canonicalKey } = require('./canonical');
const { Dropdown, OUTPUTS } = require('./dropdown');

const TYPE = 'net.noodl.controls.options';
const OUTPUT_NAMES = Object.keys(OUTPUTS);

function strangerTarget(page) {
  if (!page || !page.document) throw new Error('stranger-4: the Dropdown is drawn on a page — strangerTarget(page)');
  const live = new Set();
  let counter = 0;
  let world;

  class Instance {
    constructor(params) {
      this.id = `stranger-4/${++counter}`;
      this.type = TYPE;
      this.events = [];
      this.recorded = new Map(); // port → canonical key of the last value recorded
      this.frameLast = new Map(); // port → last defined value this frame
      this.pulses = [];
      this.outcomes = [];
      this.step = new Set();
      this.stepAll = false;
      const self = this;
      this.node = new Dropdown(page, {
        pulse: (name) => self.pulses.push(name),
        sent: (port) => self.step.add(port),
        outcome: (port, value) => self.outcomes.push({ port, value })
      }, params);
    }

    sample(ports) {
      for (const port of ports) {
        const v = this.node.read(port);
        if (v !== undefined) this.frameLast.set(port, v);
      }
    }

    endStep() {
      this.sample(this.stepAll ? OUTPUT_NAMES : Array.from(this.step));
      this.step.clear();
      this.stepAll = false;
    }

    write(port, value) {
      const sends = this.node.write(port, value);
      if (sends === 'all') this.stepAll = true;
      else for (const p of sends) this.step.add(p);
      this.endStep();
    }

    settle() {
      this.node.paint(); // the frame end
      this.endStep();
      this.sample(OUTPUT_NAMES);
      this.events.push({ t: 'settle' });
      const changed = [];
      for (const [port, v] of this.frameLast) {
        const key = canonicalKey(v);
        if (this.recorded.get(port) !== key) changed.push([port, v, key]);
      }
      changed.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      for (const [port, v, key] of changed) {
        this.recorded.set(port, key);
        this.events.push({ t: 'value', port, value: canonical(v) });
      }
      for (const port of this.pulses) this.events.push({ t: 'signal', port });
      for (const o of this.outcomes) this.events.push({ t: 'outcome', port: o.port, value: o.value });
      this.frameLast.clear();
      this.pulses = [];
      this.outcomes = [];
    }
  }

  const setEvent = (port, value) => {
    const e = { t: 'set', port };
    const c = canonical(value);
    if (c !== undefined) e.value = c;
    return e;
  };

  return {
    name: 'stranger-4 (plain DOM)',

    mount(type, params) {
      if (type !== TYPE) throw new Error(`stranger-4 builds only ${TYPE}, not ${type}`);
      const h = new Instance(params || {});
      live.add(h);
      for (const port of Object.keys(params || {})) {
        h.events.push(setEvent(port, params[port]));
        h.write(port, params[port]);
      }
      // placed on the page, its parameters set: the first paint
      // placing sends nothing; the params' writes above ARE samples (each sends what its reducer sends) — "MOUNT IS NOT A
      // SAMPLE" is the initial state only (the deep run: params { value: 0 } then Value undefined sends '0')
      h.node.paint();
      h.endStep();
      return h;
    },

    set(h, port, value) {
      h.events.push(setEvent(port, value));
      h.write(port, value);
    },

    signal(h, port) {
      h.events.push({ t: 'in', port });
      h.node.pulse(port);
      h.endStep();
    },

    act(h, act, value) {
      const e = { t: 'act', act };
      const c = canonical(value);
      if (c !== undefined) e.value = c;
      h.events.push(e);
      h.node.paint(); // an act happens on a painted page
      page.act(h.node.root, act, value);
      h.endStep();
    },

    async settle() {
      for (const h of live) h.settle();
    },

    async advance(h, ms) {
      h.events.push({ t: 'advance', ms });
      if (world && world.clock && typeof world.clock.advance === 'function') world.clock.advance(ms);
    },

    install(w) {
      world = w;
      return () => {
        if (world === w) world = undefined;
      };
    },

    trace(h) {
      return h.events.map((e) => Object.assign({}, e));
    },

    dispose(h) {
      h.node.dispose();
      live.delete(h);
    }
  };
}

module.exports = { strangerTarget };
