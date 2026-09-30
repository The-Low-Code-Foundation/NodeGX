'use strict';
// The declared conversions a port applies to an arriving value, one function per name in
// src/coerce.ts. `fallback` is the port's declared default and only the typed-* rules use it.

const HEX3 = /^#[0-9A-Fa-f]{3}$/;
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const RGB = /^rgba?\(/;

const RULES = {
  'none': (v) => v,
  'js-number': (v) => Number(v),
  'js-string': (v) => String(v),
  'js-boolean': (v) => (v ? true : false),
  'typed-number': (v, fb) => {
    if (v === undefined || v === null) return fb;
    const n = Number(v);
    return n !== n ? fb : n;
  },
  'typed-string': (v, fb) => (v === undefined || v === null ? fb : String(v)),
  'typed-boolean': (v, fb) => (v === undefined || v === null ? fb : !!v),
  'typed-color': (v, fb) => {
    if (v === undefined || v === null) return fb;
    const s = String(v);
    return HEX3.test(s) || HEX6.test(s) || RGB.test(s) ? s : fb;
  },
  'not-false': (v) => v !== false
};

function convert(rule, value, fallback) {
  const fn = RULES[rule || 'none'];
  if (!fn) throw new Error('unknown coercion ' + rule);
  return fn(value, fallback);
}

module.exports = { convert };
