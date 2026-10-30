// Knobs: every number chosen by eye, in one place, with its name on. A group is declared once and read live:
//
//   const S = knobs('generator', {
//     hum:   num(0.6, [0, 1], '', 'Hum volume', 'How loud the generator is. 0 is silent.'),
//     smoke: on(true, 'Exhaust smoke'),
//     paint: colour('#7a8c6e', 'Paint'),
//   });
//   … later, wherever it is used: S.hum, S.smoke
//
// The owner's changes are kept in design/knobs/<group>.json (kit/design.mjs), never in the code and never in the
// browser. S.$ is the group's handle: S.$.set('hum', 0.4), S.$.changes(), S.$.onChange(fn).
import { register } from './registry.mjs';

// The kinds of knob. `help` is the sentence that says why the knob exists or what its ends mean.
export const num = (value, [min, max], unit = '', label, help) => ({ type: 'number', default: value, min, max, unit, label, help });
export const int = (value, [min, max], label, help) => ({ type: 'int', default: value, min, max, label, help });
export const on = (value, label, help) => ({ type: 'bool', default: !!value, label, help });
export const colour = (value, label, help) => ({ type: 'color', default: value.toLowerCase(), label, help });
export const text = (value, label, help, max = 80) => ({ type: 'text', default: value, label, help, max });
// options: [value, …] or [[value, label], …]
export const pick = (value, options, label, help) => ({ type: 'choice', default: value, options: options.map((o) => (Array.isArray(o) ? o : [o, String(o)])), label, help });

/** One value made legal for its knob: clamped into range, the right type; or the default. */
export function legal(s, v) {
  if (v === undefined || v === null) return s.default;
  switch (s.type) {
    case 'number': {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(s.max, Math.max(s.min, n)) : s.default;
    }
    case 'int': {
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? Math.min(s.max, Math.max(s.min, n)) : s.default;
    }
    case 'color':
      return /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : s.default;
    case 'bool':
      return Boolean(v);
    case 'text':
      return String(v).slice(0, s.max ?? 80);
    case 'choice':
      return s.options.some(([o]) => o === v) ? v : s.default;
  }
  return s.default;
}

/** A full, legal set of values from a partial one: unknown keys are dropped. */
export function resolve(decl, values = {}) {
  const out = {};
  for (const [k, s] of Object.entries(decl)) out[k] = legal(s, values[k]);
  return out;
}

export function same(s, a, b) {
  return s.type === 'number' ? Math.abs(a - b) < 1e-9 : a === b;
}

/** Only the values that differ from the defaults: what a design file holds. */
export function changesOf(decl, values) {
  const out = {};
  for (const [k, s] of Object.entries(decl)) if (values[k] !== undefined && !same(s, values[k], s.default)) out[k] = values[k];
  return out;
}

/** A value as a person reads it: "0.6", "18 m", "on", "#9aa3ad". */
export function show(s, v) {
  if (s.type === 'bool') return v ? 'on' : 'off';
  if (s.type === 'choice') return s.options.find(([o]) => o === v)?.[1] ?? String(v);
  if (s.type === 'number') return `${+Number(v).toPrecision(4)}${s.unit ? ' ' + s.unit : ''}`;
  if (s.type === 'text') return v === '' ? '(none)' : `“${v}”`;
  return String(v);
}

/** The two values furthest apart: what the inert-knob gate renders. */
export function extremes(s) {
  switch (s.type) {
    case 'number':
    case 'int':
      return [s.min, s.max];
    case 'color':
      return ['#ff2a2a', '#20e0ff'];
    case 'bool':
      return [false, true];
    case 'text':
      return ['', 'WWWWWWWW'];
    case 'choice':
      return [s.options[0][0], s.options[s.options.length - 1][0]];
  }
}

/** The declaration's own lies: a default out of its range, a knob with no label. */
export function lint(group, decl) {
  const bad = [];
  for (const [k, s] of Object.entries(decl)) {
    if (!s || !s.type) bad.push(`${group}.${k}: not a knob (use num, int, on, colour, text or pick)`);
    else {
      if (legal(s, s.default) !== s.default) bad.push(`${group}.${k}: its default ${s.default} is not legal for it`);
      if (!s.label) bad.push(`${group}.${k}: has no label`);
      if ((s.type === 'number' || s.type === 'int') && !(s.min < s.max)) bad.push(`${group}.${k}: its range [${s.min}, ${s.max}] is empty`);
    }
  }
  return bad;
}

/** Declares a group of knobs and returns its live values. */
export function knobs(group, decl) {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(group)) throw new Error(`knobs: "${group}" is not a group name (lower case, digits, dashes)`);
  const bad = lint(group, decl);
  if (bad.length) throw new Error(`knobs: ${bad.join('; ')}`);
  const values = resolve(decl);
  const listeners = new Set();
  const S = {};
  for (const k of Object.keys(decl)) Object.defineProperty(S, k, { enumerable: true, get: () => values[k] });
  const handle = {
    group,
    decl,
    values,
    /** Sets one knob (made legal); tells whoever listens. Saving is kit/design.mjs's job. */
    set(k, v) {
      if (!(k in decl)) throw new Error(`knobs: ${group} has no knob "${k}"`);
      const next = legal(decl[k], v);
      if (same(decl[k], next, values[k])) return;
      values[k] = next;
      for (const fn of listeners) fn(k, next);
    },
    /** Replaces every value at once from a partial set (a design file): the rest go back to their defaults. */
    load(partial) {
      const next = resolve(decl, partial);
      for (const k of Object.keys(decl)) if (!same(decl[k], next[k], values[k])) handle.set(k, next[k]);
    },
    changes: () => changesOf(decl, values),
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
  Object.defineProperty(S, '$', { value: handle });
  register('knobs', group, handle);
  return S;
}
