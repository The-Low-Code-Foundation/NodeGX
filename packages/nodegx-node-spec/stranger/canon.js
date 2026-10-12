'use strict';
// The stranger's canonicaliser — written from the table in src/canonical.ts (the docblock),
// not from its code. One JSON-safe shape per JavaScript value.

function tagNumber(n) {
  if (Object.is(n, -0)) return { $num: '-0' };
  if (n !== n) return { $num: 'NaN' };
  if (n === Infinity) return { $num: 'Infinity' };
  if (n === -Infinity) return { $num: '-Infinity' };
  return n;
}

function toCanonical(value, trail, at) {
  const kind = typeof value;
  if (kind === 'undefined') return undefined;
  if (kind === 'boolean' || kind === 'string') return value;
  if (kind === 'number') return tagNumber(value);
  if (kind === 'function' || kind === 'symbol' || kind === 'bigint') {
    throw new Error('cannot canonicalise a ' + kind + ' at ' + at);
  }
  if (value === null) return null;
  if (trail.indexOf(value) >= 0) throw new Error('circular reference at ' + at);
  if (value instanceof Date) {
    const ms = value.getTime();
    return { $date: ms !== ms ? null : value.toISOString() };
  }
  trail.push(value);
  try {
    if (Array.isArray(value)) {
      const out = [];
      for (let i = 0; i < value.length; i++) {
        const c = toCanonical(value[i], trail, at + '[' + i + ']');
        out.push(c === undefined ? null : c);
      }
      return out;
    }
    if (typeof value.toJSON === 'function') {
      return toCanonical(value.toJSON(), trail, at);
    }
    const out = {};
    const keys = Object.keys(value).sort();
    for (const k of keys) {
      const c = toCanonical(value[k], trail, at + '.' + k);
      if (c !== undefined) out[k] = c;
    }
    return out;
  } finally {
    trail.pop();
  }
}

function canonical(value) {
  return toCanonical(value, [], '$');
}

/** A string two values share exactly when their canonical forms are equal. */
function fingerprint(value) {
  const c = canonical(value);
  return c === undefined ? '\u0000undefined' : JSON.stringify(c);
}

module.exports = { canonical, fingerprint };
