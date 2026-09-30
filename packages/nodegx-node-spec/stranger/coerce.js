'use strict';
// The declared coercions — re-written from the table in src/coerce.ts. `fallback` is the port's
// declared default.

const HEX_SHORT = /^#[0-9A-Fa-f]{3}$/;
const HEX_LONG = /^#[0-9A-Fa-f]{6}$/;
const RGB_FN = /^rgba?\(/;

const gone = (v) => v === undefined || v === null;

const RULES = {
  none: (v) => v,
  'js-number': (v) => Number(v),
  'js-string': (v) => String(v),
  'js-boolean': (v) => (v ? true : false),
  'typed-number': (v, fallback) => {
    if (gone(v)) return fallback;
    const n = Number(v);
    return n !== n ? fallback : n;
  },
  'typed-string': (v, fallback) => (gone(v) ? fallback : String(v)),
  'typed-boolean': (v, fallback) => (gone(v) ? fallback : !!v),
  'typed-color': (v, fallback) => {
    if (gone(v)) return fallback;
    const s = String(v);
    return HEX_SHORT.test(s) || HEX_LONG.test(s) || RGB_FN.test(s) ? s : fallback;
  },
  'not-false': (v) => v !== false
};

function applyCoercion(kind, value, fallback) {
  const rule = RULES[kind || 'none'];
  if (!rule) throw new Error('unknown coercion ' + kind);
  return rule(value, fallback);
}

module.exports = { applyCoercion };
