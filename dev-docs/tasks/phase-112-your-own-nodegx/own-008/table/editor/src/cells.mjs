// What a person types in a cell, and what the cell shows, for one port's value.
//
// The port's type decides how plain text is read: a number port reads `28` as 28 and `100%` as
// { value: 100, unit: '%' }, a boolean port reads `true`, every other port keeps the text as it is.
// A cell that starts with `=` holds JSON instead (`=28` is a number anywhere, `="28"` a string,
// `={"a":1}` an object), the way a spreadsheet marks a formula.
//
// `formatValue` shows a value the plain way only when `parseValue` would read that text back to the
// same value; otherwise it shows the `=` form. So showing a cell and typing back what it shows never
// changes the app. This file runs in the page and in Node.

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const WITH_UNIT = /^(-?(?:\d+\.?\d*|\.\d+))\s*(%|[a-z]+)$/i;

/** The port's type reduced to what reading a cell needs: a kind and, for a length, its units. */
export function portKind(port) {
  if (!port) return { kind: 'unknown' };
  const t = port.type;
  const name = typeof t === 'string' ? t : t && typeof t === 'object' ? t.name : undefined;
  const units = (t && typeof t === 'object' && Array.isArray(t.units) && t.units) || undefined;
  if (name === 'number') return { kind: units ? 'dimension' : 'number', units };
  if (name === 'dimension') return { kind: 'dimension', units: units ?? ['px', '%'] };
  if (name === 'boolean') return { kind: 'boolean' };
  if (name === 'signal') return { kind: 'signal' };
  return { kind: 'text', name: name ?? 'unknown' };
}

// A test switch for the suite's control arm (README "Prove the suite can fail"): with it set, a
// number is kept as the text that was typed, the mistake the suite must catch.
const BROKEN = typeof process !== 'undefined' && process.env && process.env.NODEGX_TABLE_BREAK === 'number-as-string';

/** The value a cell's text means for this port. Throws an Error with a sentence when it means nothing. */
export function parseValue(text, port) {
  const value = read(text, port);
  return BROKEN && typeof value === 'number' ? String(value) : value;
}

function read(text, port) {
  if (typeof text !== 'string') throw new Error('A cell holds text.');
  if (text.startsWith('=')) {
    const json = text.slice(1).trim();
    try {
      return JSON.parse(json);
    } catch (err) {
      throw new Error(`After "=" a cell holds JSON, and ${JSON.stringify(json.slice(0, 40))} is not JSON (${err.message}).`);
    }
  }
  const { kind, units } = portKind(port);
  const trimmed = text.trim();
  if (kind === 'number' || kind === 'dimension') {
    if (NUMBER.test(trimmed)) return Number(trimmed);
    const m = kind === 'dimension' ? WITH_UNIT.exec(trimmed) : null;
    if (m && (!units || units.includes(m[2]))) return { value: Number(m[1]), unit: m[2] };
    return text;
  }
  if (kind === 'boolean') {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    return text;
  }
  return text;
}

function same(a, b) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])]));
  return v;
}

/** The text a cell shows for a value, such that parseValue(formatValue(v)) equals v. `undefined` shows as ''. */
export function formatValue(value, port, { pretty = false } = {}) {
  if (value === undefined) return '';
  let plain;
  if (typeof value === 'string') plain = value;
  else if (typeof value === 'number' || typeof value === 'boolean') plain = String(value);
  else if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 2 &&
    typeof value.value === 'number' && typeof value.unit === 'string') plain = `${value.value}${value.unit}`;
  if (plain !== undefined) {
    try {
      if (same(read(plain, port), value)) return plain;
    } catch {
      /* falls through to the JSON form */
    }
  }
  return '=' + JSON.stringify(value, null, pretty && value && typeof value === 'object' ? 2 : undefined);
}
