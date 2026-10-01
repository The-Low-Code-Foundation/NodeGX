'use strict';
// stranger-3's target: a tiny frame engine around the node classes in nodes.js.
// Each mounted instance is a "slot" holding the node, its event log, and the frame's buffers.
// The world handed to install() is the only source of time, chance and the window.
const { toWire, wireKey } = require('./canon');
const { catalog } = require('./nodes');

function strangerTarget() {
  let world = null; // set by install()
  const slots = new Map();
  let counter = 0;

  function makeLink(slot) {
    return {
      clock: () => (world ? world.clock.now() : 0),
      freshId: () => {
        if (!world) throw new Error('stranger-3: a node drew a UUID with no world installed');
        return world.random.uuid();
      },
      screen: () => {
        const vp = world && world.viewport;
        return vp ? { width: vp.width, height: vp.height } : null;
      },
      onResize: (fn) => {
        const vp = world && world.viewport;
        if (!vp) return;
        const off = vp.listen(() => {
          fn();
          sample(slot); // the listener ran inside the advance: read what it sent
        });
        slot.cleanups.push(off);
      },
      pulse: (name) => slot.frame.pulses.push(name),
      verdict: (input, outcome, code) => slot.frame.verdicts.push({ input, outcome, code }),
      sent: (name) => {
        if (slot.frame.flagged.indexOf(name) < 0) slot.frame.flagged.push(name);
      }
    };
  }

  function freshFrame() {
    return { pulses: [], verdicts: [], flagged: [], held: Object.create(null) };
  }

  /** After a step: read the outputs the step flagged; a defined reading replaces the frame's last. */
  function sample(slot) {
    if (!slot.sampling) {
      slot.frame.flagged = [];
      return;
    }
    for (const name of slot.frame.flagged) {
      const v = slot.node.read(name);
      if (v !== undefined) slot.frame.held[name] = v;
    }
    slot.frame.flagged = [];
  }

  function slotOf(h) {
    const s = slots.get(h.id);
    if (!s) throw new Error('stranger-3: unknown or disposed handle ' + h.id);
    return s;
  }

  function log(slot, ev) {
    slot.events.push(ev);
  }

  function writeValue(slot, port, value) {
    const ports = slot.ports;
    if (ports.signals.indexOf(port) >= 0) throw new Error('stranger-3: ' + port + ' is a signal input, not a value input');
    if (ports.values.indexOf(port) < 0) throw new Error('stranger-3: ' + slot.type + ' has no input ' + port);
    const ev = { t: 'set', port };
    const w = toWire(value);
    if (w !== undefined) ev.value = w;
    log(slot, ev);
    slot.node.receive(port, value); // every port of these five arrives as sent
    sample(slot);
  }

  return {
    name: 'stranger-3',

    install(w) {
      world = w;
      return () => {
        if (world === w) world = null;
      };
    },

    mount(type, params) {
      const Klass = catalog[type];
      if (!Klass) throw new Error('stranger-3: no node called ' + type);
      const id = 'n' + ++counter;
      const slot = { id, type, ports: Klass.ports, events: [], frame: freshFrame(), recorded: Object.create(null), cleanups: [], sampling: false };
      slot.node = new Klass(makeLink(slot));
      slots.set(id, slot);
      for (const key of Object.keys(params || {})) writeValue(slot, key, params[key]);
      // mount is not a sample: what the mount flagged is dropped; from here on, steps sample
      slot.frame.flagged = [];
      slot.frame.held = Object.create(null);
      slot.sampling = true;
      return { id, type };
    },

    set(h, port, value) {
      writeValue(slotOf(h), port, value);
    },

    signal(h, port) {
      const slot = slotOf(h);
      if (slot.ports.values.indexOf(port) >= 0) throw new Error('stranger-3: ' + port + ' is a value input, not a signal');
      if (slot.ports.signals.indexOf(port) < 0) throw new Error('stranger-3: ' + slot.type + ' has no signal ' + port);
      log(slot, { t: 'in', port });
      slot.node.trigger(port);
      sample(slot);
    },

    async advance(h, ms) {
      const slot = slotOf(h);
      log(slot, { t: 'advance', ms });
      if (world) world.clock.advance(ms);
    },

    async settle() {
      // 1. every instance's frame-end work
      for (const slot of slots.values()) {
        slot.node.frameEnd();
        sample(slot);
      }
      // 2. record, per instance
      for (const slot of slots.values()) {
        const f = slot.frame;
        log(slot, { t: 'settle' });
        for (const name of slot.ports.outputs) {
          const v = slot.node.read(name);
          if (v !== undefined) f.held[name] = v;
        }
        const names = Object.keys(f.held).sort();
        for (const name of names) {
          const key = wireKey(f.held[name]);
          if (slot.recorded[name] === key) continue;
          slot.recorded[name] = key;
          log(slot, { t: 'value', port: name, value: toWire(f.held[name]) });
        }
        for (const p of f.pulses) log(slot, { t: 'signal', port: p });
        for (const r of f.verdicts) {
          const ev = { t: 'outcome', port: r.input, value: r.outcome };
          if (r.code !== undefined) ev.error = r.code;
          log(slot, ev);
        }
        slot.frame = freshFrame();
      }
    },

    trace(h) {
      return slotOf(h).events.map((e) => JSON.parse(JSON.stringify(e)));
    },

    dispose(h) {
      const slot = slots.get(h.id);
      if (!slot) return;
      for (const off of slot.cleanups) off();
      slots.delete(h.id);
    }
  };
}

module.exports = { strangerTarget };
