'use strict';
/**
 * The trace's one JSON-safe form for a value, written by hand from the table in src/canonical.ts:
 * tagged numbers ($num), dates ($date), bytes ($bytes), arrays element-wise (undefined → null),
 * objects with sorted keys (undefined drops the key), toJSON first, functions refused.
 */

function walk(value, seen) {
  switch (typeof value) {
    case 'undefined':
      return undefined;
    case 'boolean':
    case 'string':
      return value;
    case 'number':
      if (Object.is(value, -0)) return { $num: '-0' };
      if (value !== value) return { $num: 'NaN' };
      if (value === Infinity) return { $num: 'Infinity' };
      if (value === -Infinity) return { $num: '-Infinity' };
      return value;
    case 'object':
      break;
    default:
      throw new Error('stranger-4: a ' + typeof value + ' cannot be put on the trace');
  }
  if (value === null) return null;
  if (seen.indexOf(value) >= 0) throw new Error('stranger-4: a circular value cannot be put on the trace');
  if (Object.prototype.toString.call(value) === '[object Date]') {
    const t = value.getTime();
    return { $date: t !== t ? null : value.toISOString() };
  }
  if (ArrayBuffer.isView(value)) return { $bytes: Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
  if (Object.prototype.toString.call(value) === '[object ArrayBuffer]') return { $bytes: Array.from(new Uint8Array(value)) };
  seen.push(value);
  try {
    if (Array.isArray(value)) {
      const out = [];
      for (let i = 0; i < value.length; i++) {
        const c = walk(value[i], seen);
        out.push(c === undefined ? null : c);
      }
      return out;
    }
    if (typeof value.toJSON === 'function') return walk(value.toJSON(), seen);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const c = walk(value[key], seen);
      if (c !== undefined) out[key] = c;
    }
    return out;
  } finally {
    seen.pop();
  }
}

function canonical(value) {
  return walk(value, []);
}

function canonicalKey(value) {
  const c = canonical(value);
  return c === undefined ? 'undefined' : JSON.stringify(c);
}

module.exports = { canonical, canonicalKey };
