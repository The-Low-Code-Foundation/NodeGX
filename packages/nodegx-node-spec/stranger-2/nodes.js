'use strict';
// The seven nodes, each a small class with mutable fields. The engine (target.js) owns the
// input cells (`this.in` for declared ports, `this.dyn` for ports minted at run time) and calls
// a method named after the port when it is written or pulsed, handing it an `fx` with three
// verbs: fx.pulse(signal), fx.outcome(kind), fx.only(...outputs) to narrow which outputs this
// step is allowed to send. `read()` returns every value output as it stands; `undefined` means
// "nothing to send". `frameEnd(fx)` runs once per settle when a node defines it.

const sig = (outcome) => ({ kind: 'signal', outcome: !!outcome });
const val = (coerce, dflt) => ({ kind: 'value', coerce, dflt });

// ---------------------------------------------------------------- Counter
class Counter {
  static get type() { return 'Counter'; }
  static get inputs() {
    return {
      increase: sig(true), decrease: sig(true), reset: sig(true),
      startValue: val('js-number', 0), limitsMin: val('js-number', 0), limitsMax: val('js-number', 0),
      limitsEnabled: val('js-boolean', false)
    };
  }
  static get outputs() { return { currentCount: 'value', countChanged: 'signal' }; }
  constructor() { this.count = 0; this.start = 0; this.seeded = false; }
  read() { return { currentCount: this.count }; }
  increase(fx) {
    if (this.in.limitsEnabled && this.count >= this.in.limitsMax) return fx.outcome('unchanged');
    this.count = this.count + 1;
    fx.pulse('countChanged');
    fx.outcome('done');
  }
  decrease(fx) {
    if (this.in.limitsEnabled && this.count <= this.in.limitsMin) return fx.outcome('unchanged');
    this.count = this.count - 1;
    fx.pulse('countChanged');
    fx.outcome('done');
  }
  reset(fx) {
    if (this.count === this.start) return fx.outcome('unchanged');
    this.count = this.start;
    fx.pulse('countChanged');
    fx.outcome('done');
  }
  startValue(fx, v) {
    this.start = v;
    if (this.seeded) return;
    this.seeded = true;
    this.count = v;
    fx.pulse('countChanged');
  }
}

// ---------------------------------------------------------------- Switch
class Switch {
  static get type() { return 'Switch'; }
  static get inputs() { return { on: sig(true), off: sig(true), flip: sig(true), onFromStart: val('js-boolean', false) }; }
  static get outputs() { return { state: 'value', switched: 'signal', switchedToOn: 'signal', switchedToOff: 'signal' }; }
  constructor() { this.lit = false; }
  read() { return { state: this.lit }; }
  move(fx, next) {
    this.lit = next;
    fx.pulse(next ? 'switchedToOn' : 'switchedToOff');
    fx.pulse('switched');
  }
  on(fx) { if (this.lit) return fx.outcome('unchanged'); this.move(fx, true); fx.outcome('done'); }
  off(fx) { if (!this.lit) return fx.outcome('unchanged'); this.move(fx, false); fx.outcome('done'); }
  flip(fx) { this.move(fx, !this.lit); fx.outcome('done'); }
  onFromStart(fx, v) { this.move(fx, v); }
}

// ---------------------------------------------------------------- And
const NUMBERED = /^input \d+$/;
class And {
  static get type() { return 'And'; }
  static get inputs() { return {}; }
  static get outputs() { return { result: 'value' }; }
  static get derived() {
    return {
      atMount(params) {
        const idx = Object.keys(params).filter((k) => NUMBERED.test(k)).map((k) => Number(k.slice(6)));
        const n = idx.length ? Math.max.apply(null, idx) + 2 : 1;
        const ports = {};
        for (let i = 0; i < n; i++) ports['input ' + i] = val('js-boolean', undefined);
        return ports;
      },
      accept(name) { return NUMBERED.test(name) ? val('js-boolean', undefined) : undefined; }
    };
  }
  constructor() { this.seen = {}; this.answer = undefined; }
  read() { return { result: this.answer }; }
  derivedWrite(fx, name, v) {
    this.seen[name] = v;
    const vs = Object.keys(this.seen).map((k) => this.seen[k]);
    this.answer = vs.length > 0 && vs.every((x) => x);
  }
}

// ---------------------------------------------------------------- Condition
function comparable(x) {
  if (x === null) return true;
  const t = typeof x;
  return t !== 'object' && t !== 'function' && t !== 'undefined';
}
function changed(a, b) {
  if (!comparable(a) || !comparable(b)) return true;
  return !Object.is(a, b);
}
class Condition {
  static get type() { return 'Condition'; }
  static get inputs() {
    return { condition: val('none', undefined), eval: sig(true), 'runOnChange-condition': val('not-false', true) };
  }
  static get outputs() { return { ontrue: 'signal', onfalse: 'signal', result: 'value', isfalse: 'value' }; }
  constructor() { this.arrived = undefined; this.tested = undefined; this.pending = false; this.everTested = false; }
  read() {
    return {
      result: this.everTested ? !!this.tested : null,
      isfalse: this.everTested ? !this.tested : null
    };
  }
  condition(fx, v) {
    if (changed(this.arrived, v) && this.in['runOnChange-condition']) this.pending = true;
    this.arrived = v;
  }
  eval(fx) { this.pending = true; fx.outcome('done'); }
  frameEnd(fx) {
    if (!this.pending) return;
    this.pending = false;
    this.everTested = true;
    this.tested = this.arrived;
    fx.pulse(this.tested ? 'ontrue' : 'onfalse');
  }
}

// ---------------------------------------------------------------- String Format
const HOLE = /\{[A-Za-z0-9_]*\}/g;
function holes(text) {
  const m = text.match(HOLE);
  return m ? m.map((s) => s.slice(1, -1)) : [];
}
function fill(text, values) {
  let out = text;
  for (const name of holes(text)) {
    const v = values[name];
    out = out.replace('{' + name + '}', v !== undefined ? String(v) : '');
  }
  return out;
}
class StringFormat {
  static get type() { return 'String Format'; }
  static get inputs() { return { format: val('js-string', undefined) }; }
  static get outputs() { return { formatted: 'value' }; }
  static get derived() {
    return {
      atMount(params) {
        const ports = {};
        if (typeof params.format === 'string') for (const n of holes(params.format)) ports[n] = val('none', undefined);
        return ports;
      },
      accept() { return val('none', undefined); }
    };
  }
  constructor() { this.text = ''; this.values = {}; }
  read() { return { formatted: fill(this.text, this.values) }; }
  format(fx, v) { this.text = v; }
  derivedWrite(fx, name, v) { this.values[name] = v; }
}

// ---------------------------------------------------------------- Inverter
class Inverter {
  static get type() { return 'Inverter'; }
  static get inputs() { return { value: val('none', undefined) }; }
  static get outputs() { return { result: 'value' }; }
  constructor() { this.v = undefined; }
  read() { return { result: this.v === undefined ? undefined : !this.v }; }
  value(fx, v) { this.v = v; }
}

// ---------------------------------------------------------------- Boolean To String
class BooleanToString {
  static get type() { return 'Boolean To String'; }
  static get inputs() { return { trueString: val('none', undefined), falseString: val('none', undefined), input: val('none', undefined) }; }
  static get outputs() { return { currentValue: 'value', inputChanged: 'signal' }; }
  constructor() { this.sel = undefined; this.yes = ''; this.no = ''; }
  read() { return { currentValue: this.sel ? this.yes : this.no }; }
  // v2: a string identical (===) to the one held does nothing at all, not even a send
  trueString(fx, v) { if (this.yes === v) return fx.only(); this.yes = v; fx.only.apply(fx, this.sel ? ['currentValue'] : []); }
  falseString(fx, v) { if (this.no === v) return fx.only(); this.no = v; fx.only.apply(fx, this.sel ? [] : ['currentValue']); }
  input(fx, v) {
    if (this.sel === v) return fx.only();
    this.sel = v;
    fx.pulse('inputChanged');
  }
}

const NODES = [Counter, Switch, And, Condition, StringFormat, Inverter, BooleanToString];
const byType = {};
for (const N of NODES) byType[N.type] = N;

module.exports = { byType };
