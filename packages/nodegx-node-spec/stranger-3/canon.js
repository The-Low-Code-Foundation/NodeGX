'use strict';
// Wire form of a value, written from the table in the format's canonical.ts header.
// Returns undefined for undefined (the caller decides); throws on what cannot travel.

function toWire(v, trail) {
  trail = trail || [];
  const kind = typeof v;
  if (kind === 'undefined') return undefined;
  if (kind === 'string' || kind === 'boolean') return v;
  if (kind === 'number') {
    if (v !== v) return { $num: 'NaN' };
    if (v === Infinity) return { $num: 'Infinity' };
    if (v === -Infinity) return { $num: '-Infinity' };
    if (v === 0 && 1 / v < 0) return { $num: '-0' };
    return v;
  }
  if (kind !== 'object') throw new Error('stranger-3: cannot put a ' + kind + ' on the wire');
  if (v === null) return null;
  if (trail.indexOf(v) >= 0) throw new Error('stranger-3: circular value');
  if (v instanceof Date) {
    const ms = v.getTime();
    return { $date: ms !== ms ? null : v.toISOString() };
  }
  trail.push(v);
  try {
    if (Array.isArray(v)) {
      const list = [];
      for (let k = 0; k < v.length; k++) {
        const w = toWire(v[k], trail);
        list.push(w === undefined ? null : w);
      }
      if (typeof v.getId === 'function') {
        const name = v.getId();
        if (typeof name === 'string') return { $array: name, items: list };
      }
      return list;
    }
    if (typeof v.toJSON === 'function') return toWire(v.toJSON(), trail);
    const keys = Object.keys(v).sort();
    const bag = {};
    for (const k of keys) {
      const w = toWire(v[k], trail);
      if (w !== undefined) bag[k] = w;
    }
    return bag;
  } finally {
    trail.pop();
  }
}

/** Equality key: two values are the same on the wire when their keys match. */
function wireKey(v) {
  const w = toWire(v);
  return w === undefined ? '\u0000undef' : JSON.stringify(w);
}

module.exports = { toWire, wireKey };
