'use strict';
// The one JSON-safe shape a value takes in a trace, written from the table in src/canonical.ts.
// -0 / NaN / ±Infinity become { $num: tag }, a Date becomes { $date: iso | null }, arrays keep
// their positions (undefined -> null), objects sort their keys and drop undefined members,
// toJSON is honoured first, anything with a prototype that is not a plain object still just
// contributes its own enumerable keys. Functions, symbols, bigints and cycles are refused.

function canon(value) {
  return descend(value, '$', []);
}

function descend(v, at, stack) {
  const kind = typeof v;
  if (kind === 'undefined') return undefined;
  if (kind === 'boolean' || kind === 'string') return v;
  if (kind === 'number') {
    if (Object.is(v, -0)) return { $num: '-0' };
    if (v !== v) return { $num: 'NaN' };
    if (v === Infinity) return { $num: 'Infinity' };
    if (v === -Infinity) return { $num: '-Infinity' };
    return v;
  }
  if (kind !== 'object') throw new Error('cannot put a ' + kind + ' in a trace at ' + at);
  if (v === null) return null;
  if (stack.indexOf(v) !== -1) throw new Error('circular value at ' + at);
  if (v instanceof Date) {
    const ms = v.getTime();
    return { $date: ms !== ms ? null : v.toISOString() };
  }
  stack.push(v);
  let out;
  if (Array.isArray(v)) {
    out = [];
    for (let i = 0; i < v.length; i++) {
      const c = descend(v[i], at + '[' + i + ']', stack);
      out.push(c === undefined ? null : c);
    }
  } else if (typeof v.toJSON === 'function') {
    out = descend(v.toJSON(), at, stack);
  } else {
    out = {};
    const keys = Object.keys(v).sort();
    for (const k of keys) {
      const c = descend(v[k], at + '.' + k, stack);
      if (c !== undefined) out[k] = c;
    }
  }
  stack.pop();
  return out;
}

// The comparison key: equal keys mean "the same value" for the wire.
function keyOf(value) {
  const c = canon(value);
  return c === undefined ? 'undefined' : JSON.stringify(c);
}

module.exports = { canon, keyOf };
