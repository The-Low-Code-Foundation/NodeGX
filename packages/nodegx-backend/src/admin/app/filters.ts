/**
 * The filter row's model (BMG-002 §3.1) — rows a person picks, and the `where`
 * the backend reads. Pure: no DOM, no fetch, and `now` is a parameter, so the
 * spec can pin "this week" to a date.
 *
 * `toWhere(group)` is what the page sends. `fromWhere(json)` turns a stored or
 * hand-written filter back into rows, and answers `null` when some part of it
 * is not something a row can say — the caller then keeps it in *Advanced
 * (JSON)* rather than silently dropping a condition.
 *
 * The operators are the backend's (`noodl-runtime/…/local-sql/QueryBuilder.ts`
 * `translateOperator`). Three are spelled by more than one of them, and
 * `fromWhere` recognises exactly the shape `toWhere` writes:
 *  - SQL's `!=` never matches a missing value, and "status is not open" means
 *    the records with no status too — so *is not*, *≠*, *is no* and *is
 *    empty* are `$or` [the condition, missing], missing always SECOND;
 *  - *starts with* is an anchored, escaped `$regex`;
 *  - a date is a half-open `[$gte, $lt)` range of local midnights — *is*,
 *    *is between* and every *is within* window are that one shape, told apart
 *    by where the ends fall.
 */

export type FilterKind = 'text' | 'number' | 'boolean' | 'date' | 'link' | 'list' | 'location';

export interface FilterField {
  name: string;
  kind: FilterKind;
  /** A link's target collection. */
  targetClass?: string;
}

export type Conj = 'and' | 'or';

export interface Cond {
  kind: 'cond';
  field: string;
  op: string;
  /** Text / number / date (`YYYY-MM-DD`) / link objectId / list item / window id / km. */
  value?: string;
  /** The second end of *is between*. */
  value2?: string;
  /** *is one of* (text). */
  values?: string[];
  /** *is within N km of*: the centre. */
  lat?: string;
  lng?: string;
}

export interface Group {
  kind: 'group';
  conj: Conj;
  items: Array<Cond | Group>;
}

export interface OpDef {
  id: string;
  label: string;
  /** What the value slot is: none, one, two (between), a set, a window, a centre. */
  arity: 'none' | 'one' | 'two' | 'many' | 'window' | 'near';
}

export const OPS: Record<FilterKind, OpDef[]> = {
  text: [
    { id: 'is', label: 'is', arity: 'one' },
    { id: 'isNot', label: 'is not', arity: 'one' },
    { id: 'contains', label: 'contains', arity: 'one' },
    { id: 'startsWith', label: 'starts with', arity: 'one' },
    { id: 'empty', label: 'is empty', arity: 'none' },
    { id: 'notEmpty', label: 'is not empty', arity: 'none' },
    { id: 'oneOf', label: 'is one of', arity: 'many' }
  ],
  number: [
    { id: 'eq', label: '=', arity: 'one' },
    { id: 'ne', label: '≠', arity: 'one' },
    { id: 'lt', label: '<', arity: 'one' },
    { id: 'lte', label: '≤', arity: 'one' },
    { id: 'gt', label: '>', arity: 'one' },
    { id: 'gte', label: '≥', arity: 'one' },
    { id: 'between', label: 'is between', arity: 'two' },
    { id: 'empty', label: 'is empty', arity: 'none' }
  ],
  boolean: [
    { id: 'yes', label: 'is yes', arity: 'none' },
    { id: 'no', label: 'is no', arity: 'none' }
  ],
  date: [
    { id: 'on', label: 'is', arity: 'one' },
    { id: 'before', label: 'is before', arity: 'one' },
    { id: 'after', label: 'is after', arity: 'one' },
    { id: 'between', label: 'is between', arity: 'two' },
    { id: 'within', label: 'is within', arity: 'window' },
    { id: 'empty', label: 'is empty', arity: 'none' }
  ],
  link: [
    { id: 'is', label: 'is', arity: 'one' },
    { id: 'empty', label: 'is empty', arity: 'none' }
  ],
  list: [
    { id: 'contains', label: 'contains', arity: 'one' },
    { id: 'empty', label: 'is empty', arity: 'none' }
  ],
  location: [{ id: 'near', label: 'is within', arity: 'near' }]
};

export const WINDOWS: Array<{ id: string; label: string }> = [
  { id: 'today', label: 'today' },
  { id: 'week', label: 'this week' },
  { id: 'month', label: 'this month' },
  { id: 'past7', label: 'the past 7 days' },
  { id: 'past30', label: 'the past 30 days' }
];

/** The column types a row can filter on, and what each is called in the page. */
export function filterKind(type: string): FilterKind | null {
  switch (type) {
    case 'String':
      return 'text';
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'date';
    case 'Pointer':
      return 'link';
    case 'Array':
      return 'list';
    case 'GeoPoint':
      return 'location';
    default:
      return null;
  }
}

export function opDef(kind: FilterKind, op: string): OpDef | undefined {
  return OPS[kind].find((o) => o.id === op);
}

export function blankCond(field: FilterField): Cond {
  const op = OPS[field.kind][0];
  const c: Cond = { kind: 'cond', field: field.name, op: op.id };
  return withSlots(c, op);
}

/** A condition whose operator changed keeps what still fits and gets the slots the new one needs. */
export function withOp(c: Cond, kind: FilterKind, op: string): Cond {
  const def = opDef(kind, op) || OPS[kind][0];
  return withSlots({ kind: 'cond', field: c.field, op: def.id, value: def.arity === 'one' || def.arity === 'two' ? c.value : undefined }, def);
}

function withSlots(c: Cond, def: OpDef): Cond {
  if (def.arity === 'one' && c.value === undefined) c.value = '';
  if (def.arity === 'two') {
    if (c.value === undefined) c.value = '';
    c.value2 = '';
  }
  if (def.arity === 'many') c.values = [];
  if (def.arity === 'window') c.value = 'today';
  if (def.arity === 'near') {
    c.lat = '';
    c.lng = '';
    c.value = '10';
  }
  return c;
}

// ------------------------------------------------------------------ dates --

/** Local midnight of a `YYYY-MM-DD`. */
function midnight(day: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) throw new Error('"' + day + '" is not a date.');
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function dayOf(d: Date): string {
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function isMidnight(d: Date): boolean {
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
}

/** `[from, to)` for a window, in local time. The week starts on Monday. */
export function windowRange(id: string, now: Date): [Date, Date] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (id) {
    case 'today':
      return [today, addDays(today, 1)];
    case 'week': {
      const start = addDays(today, -((today.getDay() + 6) % 7));
      return [start, addDays(start, 7)];
    }
    case 'month':
      return [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
    case 'past7':
      return [addDays(today, -6), addDays(today, 1)];
    case 'past30':
      return [addDays(today, -29), addDays(today, 1)];
    default:
      throw new Error('"' + id + '" is not a date window.');
  }
}

const iso = (d: Date) => ({ __type: 'Date', iso: d.toISOString() });

// ------------------------------------------------------------- to `where` --

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function num(field: string, raw: string | undefined): number {
  const s = String(raw === undefined ? '' : raw).trim();
  const n = Number(s);
  if (s === '' || isNaN(n)) throw new Error(field + ' needs a number.');
  return n;
}

function need(field: string, raw: string | undefined): string {
  if (raw === undefined || raw === '') throw new Error(field + ' needs a value.');
  return raw;
}

/** `cond`, or the field has no value at all. The missing leg is second, always. */
function orMissing(field: string, cond: unknown): unknown {
  return { $or: [{ [field]: cond }, { [field]: { $exists: false } }] };
}

/** One condition's `where`. Throws a sentence naming the field when a value is missing. */
export function condWhere(c: Cond, fields: FilterField[], now: Date = new Date()): unknown {
  const f = fields.find((x) => x.name === c.field);
  if (!f) throw new Error('There is no field called "' + c.field + '".');
  const k = c.field;
  switch (f.kind) {
    case 'text':
      switch (c.op) {
        case 'is':
          return { [k]: { $eq: c.value || '' } };
        case 'isNot':
          return orMissing(k, { $ne: c.value || '' });
        case 'contains':
          return { [k]: { contains: need(k, c.value) } };
        case 'startsWith':
          return { [k]: { $regex: '^' + escapeRegex(need(k, c.value)) } };
        case 'empty':
          return orMissing(k, { $eq: '' });
        case 'notEmpty':
          return { $and: [{ [k]: { $exists: true } }, { [k]: { $ne: '' } }] };
        case 'oneOf':
          if (!c.values || !c.values.length) throw new Error(k + ' needs at least one value.');
          return { [k]: { $in: c.values.slice() } };
      }
      break;
    case 'number': {
      const ops: Record<string, string> = { eq: '$eq', lt: '$lt', lte: '$lte', gt: '$gt', gte: '$gte' };
      if (c.op === 'ne') return orMissing(k, { $ne: num(k, c.value) });
      if (ops[c.op]) return { [k]: { [ops[c.op]]: num(k, c.value) } };
      if (c.op === 'between') return { [k]: { $gte: num(k, c.value), $lte: num(k, c.value2) } };
      if (c.op === 'empty') return { [k]: { $exists: false } };
      break;
    }
    case 'boolean':
      if (c.op === 'yes') return { [k]: { $eq: true } };
      if (c.op === 'no') return orMissing(k, { $eq: false });
      break;
    case 'date': {
      if (c.op === 'empty') return { [k]: { $exists: false } };
      if (c.op === 'within') {
        const [a, b] = windowRange(c.value || 'today', now);
        return { [k]: { $gte: iso(a), $lt: iso(b) } };
      }
      const day = midnight(need(k, c.value));
      if (c.op === 'on') return { [k]: { $gte: iso(day), $lt: iso(addDays(day, 1)) } };
      if (c.op === 'before') return { [k]: { $lt: iso(day) } };
      if (c.op === 'after') return { [k]: { $gte: iso(addDays(day, 1)) } };
      if (c.op === 'between') {
        const end = midnight(need(k, c.value2));
        const [lo, hi] = day <= end ? [day, end] : [end, day];
        return { [k]: { $gte: iso(lo), $lt: iso(addDays(hi, 1)) } };
      }
      break;
    }
    case 'link':
      if (c.op === 'empty') return { [k]: { $exists: false } };
      if (c.op === 'is') return { [k]: { $eq: { __type: 'Pointer', className: f.targetClass, objectId: need(k, c.value) } } };
      break;
    case 'list':
      // A list is stored as its JSON text; an item is found as its own JSON
      // spelling inside it (`"red"`, quotes included), which is what stops
      // "red" matching "redwood".
      if (c.op === 'contains') return { [k]: { contains: JSON.stringify(need(k, c.value)) } };
      if (c.op === 'empty') return orMissing(k, { $eq: '[]' });
      break;
    case 'location':
      if (c.op === 'near') {
        return {
          [k]: {
            $nearSphere: { __type: 'GeoPoint', latitude: num(k + ' latitude', c.lat), longitude: num(k + ' longitude', c.lng) },
            $maxDistanceInKilometers: num(k + ' distance', c.value)
          }
        };
      }
      break;
  }
  throw new Error('"' + c.op + '" is not something ' + k + ' can be asked.');
}

/**
 * The `where` for a group. A group of one is that condition; an empty group is
 * `null` (no filter). Date windows resolve against the clock at call time — a
 * saved view stores the ROWS, so "this week" stays this week.
 */
export function toWhere(group: Group, fields: FilterField[], now: Date = new Date()): unknown {
  const parts = group.items.map((i) => (i.kind === 'group' ? toWhere(i, fields, now) : condWhere(i, fields, now))).filter((w) => w !== null);
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];
  return { [group.conj === 'or' ? '$or' : '$and']: parts };
}

// ----------------------------------------------------------- from `where` --

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

function dateOf(v: unknown): Date | null {
  const s = isObj(v) && v.__type === 'Date' ? v.iso : typeof v === 'string' ? v : null;
  if (typeof s !== 'string') return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** `{f:{$exists:false}}` — the missing leg — naming its field, or null. */
function missingField(w: unknown): string | null {
  if (!isObj(w)) return null;
  const keys = Object.keys(w);
  if (keys.length !== 1 || keys[0].charAt(0) === '$') return null;
  const cond = w[keys[0]];
  return isObj(cond) && Object.keys(cond).length === 1 && cond.$exists === false ? keys[0] : null;
}

/** `$or` [cond, missing] as the one row `toWhere` wrote it from, or null. */
function orMissingPattern(legs: unknown[], fields: FilterField[], now: Date): Cond | null {
  if (legs.length !== 2 || !isObj(legs[0])) return null;
  const field = missingField(legs[1]);
  const keys = Object.keys(legs[0]);
  if (!field || keys.length !== 1 || keys[0] !== field) return null;
  const f = fields.find((x) => x.name === field);
  if (!f) return null;
  const first = legs[0][field];
  if (f.kind === 'list') return isObj(first) && Object.keys(first).length === 1 && first.$eq === '[]' ? { kind: 'cond', field, op: 'empty' } : null;
  const c = fieldCond(f, first, now);
  if (!c) return null;
  if (f.kind === 'text' && c.op === 'is' && c.value === '') return { kind: 'cond', field, op: 'empty' };
  if (f.kind === 'text' && isObj(first) && '$ne' in first) return c;
  if (f.kind === 'number' && isObj(first) && '$ne' in first) return c;
  if (f.kind === 'boolean' && c.op === 'no') return c;
  return null;
}

function notEmptyPattern(legs: unknown[], fields: FilterField[]): Cond | null {
  if (legs.length !== 2 || !isObj(legs[0]) || !isObj(legs[1])) return null;
  const ka = Object.keys(legs[0]);
  const kb = Object.keys(legs[1]);
  if (ka.length !== 1 || kb.length !== 1 || ka[0] !== kb[0]) return null;
  const f = fields.find((x) => x.name === ka[0]);
  if (!f || f.kind !== 'text') return null;
  const a = legs[0][ka[0]];
  const b = legs[1][kb[0]];
  if (isObj(a) && Object.keys(a).length === 1 && a.$exists === true && isObj(b) && Object.keys(b).length === 1 && b.$ne === '') {
    return { kind: 'cond', field: ka[0], op: 'notEmpty' };
  }
  return null;
}

function unescapeRegex(s: string): string | null {
  // Only a pattern `escapeRegex` could have written: every special escaped.
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch === '\\') {
      const next = s.charAt(i + 1);
      if (!/[.*+?^${}()|[\]\\]/.test(next)) return null;
      out += next;
      i++;
    } else if (/[.*+?^${}()|[\]]/.test(ch)) return null;
    else out += ch;
  }
  return out;
}

function dateCond(field: string, ops: Record<string, any>, now: Date): Cond | null {
  const keys = Object.keys(ops).sort().join(',');
  if (keys === '$exists' && ops.$exists === false) return { kind: 'cond', field, op: 'empty' };
  if (keys === '$lt') {
    const d = dateOf(ops.$lt);
    if (d && isMidnight(d)) return { kind: 'cond', field, op: 'before', value: dayOf(d) };
    return null;
  }
  if (keys === '$gte') {
    const d = dateOf(ops.$gte);
    if (d && isMidnight(d)) return { kind: 'cond', field, op: 'after', value: dayOf(addDays(d, -1)) };
    return null;
  }
  if (keys === '$gte,$lt') {
    const a = dateOf(ops.$gte);
    const b = dateOf(ops.$lt);
    if (!a || !b || !isMidnight(a) || !isMidnight(b) || b <= a) return null;
    for (const w of WINDOWS) {
      const [wa, wb] = windowRange(w.id, now);
      if (wa.getTime() === a.getTime() && wb.getTime() === b.getTime()) return { kind: 'cond', field, op: 'within', value: w.id };
    }
    if (dayOf(addDays(a, 1)) === dayOf(b)) return { kind: 'cond', field, op: 'on', value: dayOf(a) };
    return { kind: 'cond', field, op: 'between', value: dayOf(a), value2: dayOf(addDays(b, -1)) };
  }
  return null;
}

/** One field's condition object (or bare value) as a row, or null. */
function fieldCond(f: FilterField, raw: unknown, now: Date): Cond | null {
  const k = f.name;
  // A bare value is equality.
  const ops: Record<string, any> = isObj(raw) && Object.keys(raw).some((x) => x.charAt(0) === '$' || x === 'contains') ? raw : { $eq: raw };
  const keys = Object.keys(ops).sort().join(',');
  const c = (op: string, extra: Partial<Cond> = {}): Cond => ({ kind: 'cond', field: k, op, ...extra });
  switch (f.kind) {
    case 'text':
      if (keys === '$eq' && typeof ops.$eq === 'string') return c('is', { value: ops.$eq });
      if (keys === '$ne' && typeof ops.$ne === 'string') return c('isNot', { value: ops.$ne });
      if (keys === 'contains' && typeof ops.contains === 'string') return c('contains', { value: ops.contains });
      if (keys === '$regex' && typeof ops.$regex === 'string' && ops.$regex.charAt(0) === '^') {
        const lit = unescapeRegex(ops.$regex.slice(1));
        return lit === null ? null : c('startsWith', { value: lit });
      }
      if (keys === '$in' && Array.isArray(ops.$in) && ops.$in.every((v: unknown) => typeof v === 'string')) return c('oneOf', { values: ops.$in.slice() });
      if (keys === '$exists' && ops.$exists === false) return c('empty');
      return null;
    case 'number': {
      // `$ne` alone is read as ≠ too, though `toWhere` pairs it with the missing leg.
      const map: Record<string, string> = { $eq: 'eq', $ne: 'ne', $lt: 'lt', $lte: 'lte', $gt: 'gt', $gte: 'gte' };
      if (map[keys] && typeof ops[keys] === 'number') return c(map[keys], { value: String(ops[keys]) });
      if (keys === '$gte,$lte' && typeof ops.$gte === 'number' && typeof ops.$lte === 'number') return c('between', { value: String(ops.$gte), value2: String(ops.$lte) });
      if (keys === '$exists' && ops.$exists === false) return c('empty');
      return null;
    }
    case 'boolean':
      if (keys === '$eq' && typeof ops.$eq === 'boolean') return c(ops.$eq ? 'yes' : 'no');
      return null;
    case 'date':
      return dateCond(k, ops, now);
    case 'link': {
      if (keys === '$exists' && ops.$exists === false) return c('empty');
      if (keys !== '$eq') return null;
      const v = ops.$eq;
      if (isObj(v) && v.__type === 'Pointer' && typeof v.objectId === 'string') return c('is', { value: v.objectId });
      if (typeof v === 'string') return c('is', { value: v });
      return null;
    }
    case 'list':
      if (keys === 'contains' && typeof ops.contains === 'string') {
        try {
          const item = JSON.parse(ops.contains);
          return typeof item === 'string' ? c('contains', { value: item }) : null;
        } catch {
          return null;
        }
      }
      return null;
    case 'location': {
      if (keys !== '$maxDistanceInKilometers,$nearSphere') return null;
      const p = ops.$nearSphere;
      if (!isObj(p) || typeof p.latitude !== 'number' || typeof p.longitude !== 'number' || typeof ops.$maxDistanceInKilometers !== 'number') return null;
      return c('near', { lat: String(p.latitude), lng: String(p.longitude), value: String(ops.$maxDistanceInKilometers) });
    }
  }
  return null;
}

/** An array of `where`s, each a row or a group, or null when one of them is not expressible. */
function itemsOf(parts: unknown[], fields: FilterField[], now: Date): Array<Cond | Group> | null {
  const out: Array<Cond | Group> = [];
  for (const p of parts) {
    const g = fromWhere(p, fields, now);
    if (!g) return null;
    // A single condition stands on its own; a real group stays a group.
    if (g.items.length === 1 && g.items[0].kind === 'cond') out.push(g.items[0]);
    else out.push(g);
  }
  return out;
}

/**
 * The rows a `where` says, or `null` when any part of it is not something a
 * row can say (an unknown field, `$relatedTo`, a pattern that is not a plain
 * prefix…). Always a group at the top.
 */
export function fromWhere(where: unknown, fields: FilterField[], now: Date = new Date()): Group | null {
  if (where === null || where === undefined) return { kind: 'group', conj: 'and', items: [] };
  if (!isObj(where)) return null;
  const keys = Object.keys(where);
  if (!keys.length) return { kind: 'group', conj: 'and', items: [] };
  if (keys.length === 1 && (keys[0] === '$and' || keys[0] === '$or')) {
    const legs = where[keys[0]];
    if (!Array.isArray(legs)) return null;
    const special = keys[0] === '$or' ? orMissingPattern(legs, fields, now) : notEmptyPattern(legs, fields);
    if (special) return { kind: 'group', conj: 'and', items: [special] };
    const items = itemsOf(legs, fields, now);
    return items ? { kind: 'group', conj: keys[0] === '$or' ? 'or' : 'and', items } : null;
  }
  // Several keys side by side are an implicit "and".
  const items: Array<Cond | Group> = [];
  for (const k of keys) {
    if (k === '$and' || k === '$or') {
      const sub = fromWhere({ [k]: where[k] }, fields, now);
      if (!sub) return null;
      if (sub.items.length === 1 && sub.items[0].kind === 'cond') items.push(sub.items[0]);
      else items.push(sub);
      continue;
    }
    const f = fields.find((x) => x.name === k);
    if (!f) return null;
    const c = fieldCond(f, where[k], now);
    if (!c) return null;
    items.push(c);
  }
  return { kind: 'group', conj: 'and', items };
}

// --------------------------------------------------------------- sentence --

function prettyDay(day: string | undefined): string {
  if (!day) return '…';
  try {
    return midnight(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return day;
  }
}

/** One row said back: *status is open*. `label` names a link's record. */
export function describeCond(c: Cond, fields: FilterField[], label?: (field: string, id: string) => string): string {
  const f = fields.find((x) => x.name === c.field);
  if (!f) return c.field;
  const def = opDef(f.kind, c.op);
  const op = def ? def.label : c.op;
  const v = c.value === undefined || c.value === '' ? '…' : c.value;
  switch (def ? def.arity : 'none') {
    case 'none':
      return c.field + ' ' + op;
    case 'many':
      return c.field + ' ' + op + ' ' + ((c.values || []).join(', ') || '…');
    case 'window':
      return c.field + ' ' + op + ' ' + ((WINDOWS.find((w) => w.id === c.value) || { label: v }).label);
    case 'near':
      return c.field + ' is within ' + v + ' km of ' + (c.lat || '…') + ', ' + (c.lng || '…');
    case 'two':
      return c.field + ' ' + op + ' ' + (f.kind === 'date' ? prettyDay(c.value) : v) + ' and ' + (f.kind === 'date' ? prettyDay(c.value2) : c.value2 || '…');
    default:
      if (f.kind === 'date') return c.field + ' ' + op + ' ' + prettyDay(c.value);
      if (f.kind === 'link' && label && c.value) return c.field + ' ' + op + ' ' + label(c.field, c.value);
      return c.field + ' ' + op + ' ' + v;
  }
}

export function describe(group: Group, fields: FilterField[], label?: (field: string, id: string) => string): string {
  const parts = group.items.map((i) => (i.kind === 'group' ? '(' + describe(i, fields, label) + ')' : describeCond(i, fields, label)));
  return parts.join(group.conj === 'or' ? ' or ' : ' and ');
}

/** How many conditions a group holds, however deep. */
export function countConds(group: Group): number {
  return group.items.reduce((n, i) => n + (i.kind === 'group' ? countConds(i) : 1), 0);
}
