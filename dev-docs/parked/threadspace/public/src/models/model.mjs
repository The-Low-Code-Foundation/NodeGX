// A model says what you can change (PLY-009). A NodeGX node declares its ports and the editor builds its property panel
// from them; a model here does the same: it declares its named parts and its settings (a type, a default, a range, a unit,
// which parts each one shapes), and the shipyard builds its controls from that declaration. The code stays the truth: a
// person's change is a setting value in a file (`public/ships/<id>.json`), never an edited mesh.
//
// A setting is { type, label, default, group, parts, help? } and, by type:
//   number  { min, max, step?, unit? }      int  { min, max }      color      bool      text  { max? }
//   choice  { options: [[value, label], …] }
// `scope: 'interior'` puts it on the rooms instead of the hull. `handle` makes it physical on the stage (shipyard.mjs).

/** Every setting at its default. */
export function defaultsOf(model) {
  const out = {};
  for (const [k, s] of Object.entries(model.settings)) out[k] = s.default;
  return out;
}

/** One value made legal for its setting: clamped into range, snapped to its step, the right type; or the default. */
export function legal(s, v) {
  if (v === undefined || v === null) return s.default;
  switch (s.type) {
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) return s.default;
      const c = Math.min(s.max, Math.max(s.min, n));
      if (!s.step) return c;
      const places = (String(s.step).split('.')[1] ?? '').length; // 34 × 0.1 is 3.4000000000000004: round to the step's places
      return +(Math.round(c / s.step) * s.step).toFixed(places);
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
      return String(v).slice(0, s.max ?? 24);
    case 'choice':
      return s.options.some(([o]) => o === v) ? v : s.default;
  }
  return s.default;
}

/** A full, legal set of values from a partial one (a saved file, a game's state): unknown keys are dropped. */
export function resolve(model, values = {}) {
  const out = {};
  for (const [k, s] of Object.entries(model.settings)) out[k] = legal(s, values[k]);
  return out;
}

/** Only the values that differ from the defaults: what a saved file holds, and what "what changed" lists. */
export function changesOf(model, values) {
  const out = {};
  for (const [k, s] of Object.entries(model.settings)) if (values[k] !== undefined && !same(s, values[k], s.default)) out[k] = values[k];
  return out;
}

export function same(s, a, b) {
  return s.type === 'number' ? Math.abs(a - b) < (s.step ?? 1e-6) / 2 : a === b;
}

/** A value as a person reads it: "18 m", "on", "#9aa3ad". */
export function show(s, v) {
  if (s.type === 'bool') return v ? 'on' : 'off';
  if (s.type === 'choice') return s.options.find(([o]) => o === v)?.[1] ?? String(v);
  if (s.type === 'number') return `${+v.toFixed(s.step && s.step < 1 ? String(s.step).split('.')[1].length : 0)}${s.unit ? ' ' + s.unit : ''}`;
  if (s.type === 'text') return v === '' ? '(none)' : `“${v}”`;
  return String(v);
}

/** The two values furthest apart, for the gate that every setting must visibly change the render. */
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

/** The declaration's own lies, before anything is built: a part a setting names that the model never declares, a
 *  default out of its own range. A model that fails this is refused by the shipyard. */
export function lint(model) {
  const bad = [];
  const parts = new Set(model.parts.map((p) => p.id));
  for (const [k, s] of Object.entries(model.settings)) {
    for (const p of s.parts ?? []) if (!parts.has(p)) bad.push(`${k}: names part "${p}", which the model does not declare`);
    if (!s.parts?.length) bad.push(`${k}: shapes no part`);
    if (legal(s, s.default) !== s.default) bad.push(`${k}: its default ${s.default} is not legal for it`);
    if (!s.group) bad.push(`${k}: has no group`);
  }
  return bad;
}
