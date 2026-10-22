// @nodegx:generated (EXP-022) — what the app's JavaScript runs on: what a JSContext lacks, and the Function runner.
var console = {
  log: function () { __log('log', Array.prototype.map.call(arguments, String).join(' ')); },
  info: function () { __log('info', Array.prototype.map.call(arguments, String).join(' ')); },
  warn: function () { __log('warn', Array.prototype.map.call(arguments, String).join(' ')); },
  error: function () { __log('error', Array.prototype.map.call(arguments, String).join(' ')); }
};
var __timers = {};
var __nextTimer = 1;
function setTimeout(fn, ms) {
  var id = __nextTimer++;
  var args = Array.prototype.slice.call(arguments, 2);
  __timers[id] = true;
  __later(function () { if (__timers[id]) { delete __timers[id]; fn.apply(null, args); } }, Number(ms) || 0);
  return id;
}
function clearTimeout(id) { delete __timers[id]; }
function setInterval(fn, ms) {
  var id = __nextTimer++;
  var args = Array.prototype.slice.call(arguments, 2);
  __timers[id] = true;
  var every = Math.max(Number(ms) || 0, 1);
  function again() { __later(function () { if (__timers[id]) { fn.apply(null, args); again(); } }, every); }
  again();
  return id;
}
function clearInterval(id) { delete __timers[id]; }
// The page's global object is `window` in a browser; a body that reads `window.localStorage` reads the one below.
var window = globalThis;
// Kept on the device (UserDefaults), as a browser keeps it for the site: "remember this on this device" survives a relaunch.
var localStorage = {
  getItem: function (k) { var v = __storage('get', String(k), ''); return v === undefined ? null : v; },
  setItem: function (k, v) { __storage('set', String(k), String(v)); },
  removeItem: function (k) { __storage('remove', String(k), ''); },
  clear: function () { __storage('clear', '', ''); }
};

// The web export's src/lib/functionRun.ts, compiled to JavaScript.
function functionNode(signals, component) {
    return { signals, outputs: {}, delivered: {}, self: {}, ...(component !== undefined ? { component } : {}) };
}
function runFunction(body, inputs, node) {
    const current = node.outputs;
    const delivered = node.delivered;
    const before = { ...delivered };
    const published = {};
    const held = new Set();
    const sent = [];
    let returned = false;
    const publish = (name, value) => {
        if (value === undefined)
            return;
        (published[name] = published[name] ?? []).push(value);
        delivered[name] = value;
    };
    const signals = {};
    for (const signal of node.signals) {
        const send = () => {
            held.forEach((name) => publish(name, current[name]));
            held.clear();
            if (returned) {
                node.late?.({ outputs: node.outputs, pulses: [{ signal, values: { ...delivered } }] });
                return;
            }
            sent.push(signal);
        };
        signals[signal] = Object.assign(send, { send });
    }
    const outputs = new Proxy(signals, {
        get: (target, name) => (typeof name === 'string' && name in target ? target[name] : current[name]),
        set: (_target, name, value) => {
            const key = String(name);
            if (value !== current[key]) {
                current[key] = value;
                held.delete(key);
                publish(key, value);
                if (returned && value !== undefined)
                    node.late?.({ outputs: node.outputs, pulses: [] });
            }
            else {
                held.add(key);
            }
            return true;
        }
    });
    const finished = body(inputs, outputs, node.self, node.component);
    returned = true;
    const count = {};
    const pulses = sent.map((signal) => {
        const k = (count[signal] = (count[signal] ?? 0) + 1);
        const values = { ...before };
        for (const name of Object.keys(published))
            values[name] = published[name][Math.min(k, published[name].length) - 1];
        return { signal, values: values };
    });
    return { outputs: node.outputs, pulses, settled: Promise.resolve(finished).then(() => undefined) };
}
function tickedArrival(held, values) {
    let arrived = false;
    values.forEach((value, i) => {
        if (value === undefined || Object.is(value, held[i]))
            return;
        held[i] = value;
        arrived = true;
    });
    return arrived;
}

var __nodegx = {
  fns: {},
  define: function (id, fn) { this.fns[id] = fn; },
  node: function (signals) { return functionNode(signals); },
  // A run against the node's recording Outputs: its values kept across runs, its pulses in the order it sent them.
  run: function (id, inputs, node) {
    var fn = this.fns[id];
    if (!fn) throw new Error('No Function ' + id);
    var run = runFunction(fn, inputs, node);
    return { outputs: Object.assign({}, run.outputs), pulses: run.pulses };
  },
  // A pure run, as the web export calls a render run: a fresh Outputs record, its signals no-ops.
  call: function (id, inputs, signals) {
    var outputs = {};
    signals.forEach(function (s) { outputs[s] = function () {}; });
    return this.fns[id](inputs, outputs, {}, undefined);
  },
  isPlainObject: function (v) {
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }
};
