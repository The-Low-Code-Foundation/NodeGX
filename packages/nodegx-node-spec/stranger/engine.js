'use strict';
// The stranger's little engine. A node definition (see nodes/*.js) is a plain object:
//
//   type       the catalog name
//   boot()     returns the initial state object
//   ports      { name: { kind: 'value', coerce, default } | { kind: 'signal', outcome } }
//   react      { valuePort: (state, value, inputs) => patch }        optional per value port
//   fire       { signalPort: (state, inputs) => patch }               one per signal port
//   outs       { name: (state) => value }                             value outputs
//   pulses     [ names ]                                              signal outputs
//   frameEnd   (state, inputs) => patch                               optional, once per settle
//   dynamic    { portsFor(params), accept(name), write(state, name, value, dyn) }  optional
//
// A patch: { state?: partial, pulse?: [names], outcome?: 'done'|'unchanged'|'failure'|'deferred',
//            error?: string, resolved?: [{ port, outcome, error }] }
//
// Every event is stored already canonical, so trace() is a plain copy.

const { canonical, fingerprint } = require('./canon');
const { applyCoercion } = require('./coerce');

let serial = 0;

class Cell {
  constructor(def, params) {
    this.id = 'stranger#' + ++serial;
    this.type = def.type;
    this.def = def;
    this.state = def.boot();
    this.inputs = {};
    for (const name of Object.keys(def.ports)) {
      const p = def.ports[name];
      if (p.kind === 'value') this.inputs[name] = p.default;
    }
    this.dyn = {}; // values of dynamic ports, by name
    this.dynPorts = def.dynamic ? def.dynamic.portsFor(params) : {};
    this.queuedPulses = [];
    this.queuedOutcomes = [];
    this.lastSent = {}; // output name -> fingerprint of the last DEFINED value sent
    this.events = [];
    for (const name of Object.keys(params)) this.write(name, params[name]);
  }

  record(ev) {
    this.events.push(ev);
  }

  absorb(patch, invokedPort) {
    if (!patch) return;
    if (patch.state) this.state = Object.assign({}, this.state, patch.state);
    if (patch.pulse) {
      for (const name of patch.pulse) {
        if (this.def.pulses.indexOf(name) < 0) throw new Error(this.type + ' pulses an undeclared signal ' + name);
        this.queuedPulses.push(name);
      }
    }
    if (patch.resolved) {
      for (const r of patch.resolved) {
        const slot = this.queuedOutcomes.find((o) => o.port === r.port && o.value === undefined);
        if (!slot) throw new Error(this.type + ' resolved an outcome nobody deferred on ' + r.port);
        slot.value = r.outcome;
        if (r.error !== undefined) slot.error = r.error;
      }
    }
    if (invokedPort !== undefined) {
      const decl = this.def.ports[invokedPort];
      if (decl.outcome) {
        if (patch.outcome === undefined) throw new Error(this.type + '.' + invokedPort + ' reported no outcome');
        const entry = { port: invokedPort, value: patch.outcome === 'deferred' ? undefined : patch.outcome };
        if (patch.error !== undefined) entry.error = patch.error;
        this.queuedOutcomes.push(entry);
      }
    }
  }

  write(port, raw) {
    const ev = { t: 'set', port };
    const c = canonical(raw);
    if (c !== undefined) ev.value = c;
    this.record(ev);

    const decl = this.def.ports[port];
    if (decl) {
      if (decl.kind !== 'value') throw new Error(this.type + ': ' + port + ' is a signal, not a value port');
      const v = applyCoercion(decl.coerce, raw, decl.default);
      this.inputs[port] = v;
      const react = this.def.react && this.def.react[port];
      if (react) this.absorb(react(this.state, v, this.inputs));
      return;
    }
    if (this.def.dynamic) {
      let dd = this.dynPorts[port];
      if (!dd) {
        dd = this.def.dynamic.accept(port);
        if (dd) this.dynPorts[port] = dd;
      }
      if (dd) {
        const v = applyCoercion(dd.coerce, raw, dd.default);
        this.dyn[port] = v;
        this.absorb(this.def.dynamic.write(this.state, port, v, this.dyn));
        return;
      }
    }
    throw new Error(this.type + ' has no input port ' + JSON.stringify(port));
  }

  pulse(port) {
    this.record({ t: 'in', port });
    const decl = this.def.ports[port];
    if (!decl || decl.kind !== 'signal') throw new Error(this.type + ' has no signal input ' + JSON.stringify(port));
    this.absorb(this.def.fire[port](this.state, this.inputs), port);
  }

  endFrame() {
    if (this.def.frameEnd) this.absorb(this.def.frameEnd(this.state, this.inputs));
    for (const o of this.queuedOutcomes) {
      if (o.value === undefined) throw new Error(this.type + '.' + o.port + ' deferred an outcome the frame end never resolved');
    }
    this.record({ t: 'settle' });
    const changed = [];
    for (const name of Object.keys(this.def.outs).sort()) {
      const v = this.def.outs[name](this.state);
      if (v === undefined) continue;
      const fp = fingerprint(v);
      if (this.lastSent[name] === fp) continue;
      this.lastSent[name] = fp;
      changed.push({ t: 'value', port: name, value: canonical(v) });
    }
    for (const ev of changed) this.record(ev);
    for (const name of this.queuedPulses) this.record({ t: 'signal', port: name });
    for (const o of this.queuedOutcomes) {
      const ev = { t: 'outcome', port: o.port, value: o.value };
      if (o.error !== undefined) ev.error = o.error;
      this.record(ev);
    }
    this.queuedPulses = [];
    this.queuedOutcomes = [];
  }
}

function makeAdapter(registry) {
  const live = new Map();
  return {
    name: 'stranger',
    mount(type, params) {
      const def = registry[type];
      if (!def) throw new Error('the stranger knows no node called ' + JSON.stringify(type));
      const cell = new Cell(def, params || {});
      live.set(cell.id, cell);
      return { id: cell.id, type: cell.type };
    },
    set(h, port, value) {
      cellOf(h).write(port, value);
    },
    signal(h, port) {
      cellOf(h).pulse(port);
    },
    async settle() {
      for (const cell of live.values()) cell.endFrame();
    },
    trace(h) {
      return cellOf(h).events.map((e) => Object.assign({}, e));
    },
    dispose(h) {
      live.delete(h.id);
    }
  };
  function cellOf(h) {
    const cell = live.get(h.id);
    if (!cell) throw new Error('no live instance ' + h.id);
    return cell;
  }
}

module.exports = { makeAdapter };
