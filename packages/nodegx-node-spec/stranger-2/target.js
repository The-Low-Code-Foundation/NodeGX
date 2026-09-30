'use strict';
// The stranger's target: a frame ledger around the node classes in nodes.js.
//
// Every write or pulse is a STEP. After a step the engine reads the node's outputs and notes,
// per output the step was allowed to send, the value it now holds if that value is defined.
// A frame is closed by settle(): the frame-end hook runs (one more step), then the ledger is
// written out — settle, then each noted output whose value differs from the last one written
// for it (sorted by name), then the pulses in order, then the outcomes in order.

const { canon, keyOf } = require('./canon');
const { convert } = require('./coerce');
const { byType } = require('./nodes');

function freshLedger() {
  return { noted: Object.create(null), pulses: [], outcomes: [] };
}

class Cell {
  // one mounted node
  constructor(id, Node, params) {
    this.id = id;
    this.type = Node.type;
    this.node = new Node();
    this.declared = Node.inputs;
    this.outputs = Node.outputs;
    this.minted = Object.create(null); // ports registered at run time
    this.ledger = freshLedger();
    this.written = Object.create(null); // output name -> key of the last value written to the trace
    this.events = [];
    this.node.in = {};
    this.node.dyn = {};
    for (const name of Object.keys(this.declared)) {
      const d = this.declared[name];
      if (d.kind === 'value') this.node.in[name] = d.dflt;
    }
    const derived = Node.derived;
    if (derived) {
      const ports = derived.atMount(params);
      for (const name of Object.keys(ports)) this.mint(name, ports[name]);
    }
    this.opened = false; // becomes true at the first settle
    for (const key of Object.keys(params)) this.write(key, params[key]);
  }

  mint(name, decl) {
    if (this.declared[name]) return; // a declared port always wins
    this.minted[name] = decl;
    this.node.dyn[name] = decl.dflt;
  }

  effects() {
    const ledger = this.ledger;
    const fx = {
      allowed: null, // null = every output
      pulse(name) { ledger.pulses.push(name); },
      outcome(kind, error) { ledger.outcomes.push({ kind, error }); },
      only() { fx.allowed = Array.prototype.slice.call(arguments); }
    };
    return fx;
  }

  // read the outputs and note the defined ones the step may send
  note(allowed) {
    const now = this.node.read();
    for (const name of Object.keys(this.outputs)) {
      if (this.outputs[name] !== 'value') continue;
      if (allowed && allowed.indexOf(name) === -1) continue;
      const v = now[name];
      if (v !== undefined) this.ledger.noted[name] = v;
    }
  }

  write(port, value) {
    this.events.push(value === undefined ? { t: 'set', port } : { t: 'set', port, value: canon(value) });
    const fx = this.effects();
    const decl = this.declared[port];
    if (decl) {
      if (decl.kind !== 'value') throw new Error(port + ' is a signal input of ' + this.type + '; it cannot be set');
      const v = convert(decl.coerce, value, decl.dflt);
      this.node.in[port] = v;
      if (typeof this.node[port] === 'function') this.node[port](fx, v);
    } else {
      let minted = this.minted[port];
      if (!minted) {
        const derived = this.node.constructor.derived;
        const offer = derived && derived.accept ? derived.accept(port) : undefined;
        if (!offer) throw new Error(this.type + ' has no input port ' + JSON.stringify(port));
        this.mint(port, offer);
        minted = offer;
      }
      const v = convert(minted.coerce, value, minted.dflt);
      this.node.dyn[port] = v;
      this.node.derivedWrite(fx, port, v);
    }
    this.note(fx.allowed);
  }

  pulse(port) {
    this.events.push({ t: 'in', port });
    const decl = this.declared[port];
    if (!decl) throw new Error(this.type + ' has no signal input ' + JSON.stringify(port));
    if (decl.kind !== 'signal') throw new Error(port + ' is a value input of ' + this.type + '; it cannot be pulsed');
    const fx = this.effects();
    this.node[port](fx);
    if (decl.outcome && this.ledger.outcomes.length === 0) throw new Error(port + ' reported no outcome');
    this.note(fx.allowed);
    // outcomes belong to the invocation; tag them with the port now
    for (const o of this.ledger.outcomes) if (!o.port) o.port = port;
  }

  close() {
    if (!this.opened) {
      // a wire made before the first frame reads the getter as it stands when that frame runs
      this.opened = true;
      this.note(null);
    }
    if (typeof this.node.frameEnd === 'function') {
      const fx = this.effects();
      this.node.frameEnd(fx);
      this.note(fx.allowed);
    }
    const L = this.ledger;
    this.ledger = freshLedger();
    this.events.push({ t: 'settle' });
    for (const name of Object.keys(L.noted).sort()) {
      const key = keyOf(L.noted[name]);
      if (this.written[name] === key) continue;
      this.written[name] = key;
      this.events.push({ t: 'value', port: name, value: canon(L.noted[name]) });
    }
    for (const p of L.pulses) this.events.push({ t: 'signal', port: p });
    for (const o of L.outcomes) {
      const ev = { t: 'outcome', port: o.port, value: o.kind };
      if (o.error !== undefined) ev.error = o.error;
      this.events.push(ev);
    }
  }
}

function strangerTarget() {
  const cells = new Map();
  let serial = 0;
  return {
    name: 'stranger-2',
    mount(type, params) {
      const Node = byType[type];
      if (!Node) throw new Error('the stranger knows no node called ' + JSON.stringify(type));
      const cell = new Cell('s' + ++serial, Node, params || {});
      cells.set(cell.id, cell);
      return { id: cell.id, type: cell.type };
    },
    set(h, port, value) { lookup(cells, h).write(port, value); },
    signal(h, port) { lookup(cells, h).pulse(port); },
    settle() {
      for (const cell of cells.values()) cell.close();
      return Promise.resolve();
    },
    trace(h) { return lookup(cells, h).events.map((e) => Object.assign({}, e)); },
    dispose(h) { cells.delete(h.id); }
  };
}

function lookup(cells, h) {
  const cell = cells.get(h && h.id);
  if (!cell) throw new Error('no mounted node with handle ' + JSON.stringify(h && h.id));
  return cell;
}

module.exports = { strangerTarget };
