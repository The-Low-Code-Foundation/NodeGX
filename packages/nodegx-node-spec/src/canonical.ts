/**
 * The canonicaliser — one JSON-safe form for every value a trace can carry (NSP-002 §2.1).
 *
 * Two targets are compared line by line on their traces (R2 (a): traces are JSON so a target in
 * any language can read and write them). JSON has no `-0`, no `NaN`, no `Infinity`, no `Date`,
 * no `undefined` and no key order, so a value is put into ONE agreed shape before it is recorded
 * or compared. The rules are a table, graded row by row by tests/canonical.test.ts (AC2):
 *
 * | JavaScript value                     | canonical form                                   |
 * |--------------------------------------|--------------------------------------------------|
 * | finite number, not `-0`              | itself                                           |
 * | `-0`                                 | `{ "$num": "-0" }`   (`Object.is`, not `===`)    |
 * | `NaN`                                | `{ "$num": "NaN" }`  (so NaN equals NaN here)    |
 * | `Infinity` / `-Infinity`             | `{ "$num": "Infinity" }` / `{ "$num": "-Infinity" }` |
 * | string, boolean, `null`              | itself                                           |
 * | `Date`                               | `{ "$date": "<ISO 8601>" }`, invalid → `{ "$date": null }` |
 * | a registry ARRAY (NSP-012): an array whose `getId()` is a string | `{ "$array": "<name>", "items": [element-wise] }` — the name is on the wire because identity is what a Repeater or a second Array node shares; a mutation in place keeps it, a replacement changes it (NSP-012 AC6) |
 * | a registry RECORD: has `toJSON`        | the row below — the runtime's `toJSON` is the data plus `id` (model.ts :406-408), so a record travels as its data with its id |
 * | array                                | element-wise; an `undefined` element → `null` (JSON's rule) |
 * | plain object                         | keys sorted; an `undefined` value drops its key (JSON's rule) |
 * | unit object `{ value, unit }` (C10)  | kept WHOLE — it is a plain object, never reduced to its number |
 * | object with `toJSON`                 | `toJSON()` first, then the rules above           |
 * | a FILE the browser hands (NSP-014 s30): a `Blob` — `arrayBuffer()` a function, `size` a number, `type` a string | `{ "$file": { "name"?, "size", "type" } }` — the bytes are not on the wire, `name` only when it is a string (a `File`; a bare `Blob` has none), `lastModified` never (a clock reading) |
 * | a STORED file (NSP-014 s30): `getUrl`, `getName` and `getTarget` all functions — the runtime's `CloudFile` | `{ "$cloudFile": { "name", "url", "contentType"?, "size"?, "target"?, "filename"? } }` from those getters (and `getContentType` / `getSize` / `getFilename`, P109 ISL-030), each canonical, an absent one dropped. Tagged, unlike other class instances (below): Cloud File, Sign File URL and a record's file property take ONLY a stored file (`instanceof CloudFile`) and drop a plain object with the same keys, so the difference is behaviour a trace must show |
 * | BYTES (NSP-014 s34): an `ArrayBuffer`, a typed array or a `DataView` | `{ "$bytes": [b, …] }` — the bytes it views, each 0–255, in order. Tagged: a WebSocket's binary frame is behaviour on the wire, and a typed array's own keys sort `"10"` before `"2"` while an `ArrayBuffer` has none at all — `{}` for every buffer graded nothing |
 * | other object (class instance, Map…)  | its own enumerable keys, sorted — no class tag (see below) |
 * | `undefined` (top level)              | `undefined` — the CALLER decides: a `value` event never carries it (C3), a `set` event omits the field |
 * | function, symbol, bigint, circular   | refused: `CanonicalError` naming the path         |
 *
 * Why numbers are tagged rather than dropped to `null` (which is what `JSON.stringify` does):
 * `NaN` is the quietest wrong value in the runtime (node.ts, `node/nan-input`), and a target that
 * turns `Number("abc")` into `0` instead of `NaN` is exactly the divergence a trace must show.
 * A `-0` that JSON flattened to `0` would hide a `Math.round(-0.4)` difference the same way.
 *
 * Why a Date is tagged rather than written as a bare ISO string (which NSP-002 §2.1 sketched):
 * a bare string would make a target that outputs the ISO *string* equal to one that outputs the
 * *Date* — and `Date To String` is a node whose whole behaviour is that difference. The ISO text
 * is still the representation; the tag keeps the type.
 *
 * Why a class instance carries no `$class` tag: an exported app has no `Model` class, and a trace
 * that named the class would make every record-carrying node diverge on the name of a JavaScript
 * constructor rather than on what the value holds. NSP-014 revisits this when the first T3 spec is
 * written; nothing before it produces a class instance.
 */

export class CanonicalError extends Error {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(`${message} at ${path || '$'}`);
    this.name = 'CanonicalError';
  }
}

/** The tag values a `$num` object may carry. */
export const NUM_TAGS = ['-0', 'NaN', 'Infinity', '-Infinity'] as const;
export type NumTag = (typeof NUM_TAGS)[number];

/** A canonical value: JSON, with the two tagged shapes for what JSON cannot say. */
export type Canonical = null | boolean | number | string | Canonical[] | { [key: string]: Canonical };

export function canonicalise(value: unknown): Canonical | undefined {
  return walk(value, '$', []);
}

function walk(value: unknown, path: string, seen: object[]): Canonical | undefined {
  switch (typeof value) {
    case 'undefined':
      return undefined;
    case 'boolean':
    case 'string':
      return value;
    case 'number':
      if (Object.is(value, -0)) return { $num: '-0' };
      if (Number.isNaN(value)) return { $num: 'NaN' };
      if (value === Infinity) return { $num: 'Infinity' };
      if (value === -Infinity) return { $num: '-Infinity' };
      return value;
    case 'function':
    case 'symbol':
    case 'bigint':
      throw new CanonicalError(`a ${typeof value} cannot be canonicalised`, path);
    case 'object':
      break;
    default:
      throw new CanonicalError(`unexpected typeof ${typeof value}`, path);
  }
  if (value === null) return null;
  const obj = value as object;
  if (seen.includes(obj)) throw new CanonicalError('circular reference', path);
  if (obj instanceof Date) {
    return { $date: Number.isNaN(obj.getTime()) ? null : obj.toISOString() };
  }
  // NSP-014 s34 — bytes, by brand rather than by `instanceof` (a host's `TextEncoder` hands a typed array of ITS realm)
  if (ArrayBuffer.isView(obj)) return { $bytes: Array.from(new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength)) };
  if (Object.prototype.toString.call(obj) === '[object ArrayBuffer]') return { $bytes: Array.from(new Uint8Array(obj as ArrayBuffer)) };
  seen.push(obj);
  try {
    // NSP-014 s30 — the two file shapes, duck-typed (a target's own classes; never by constructor)
    if (isStoredFile(obj)) {
      const f = obj as unknown as StoredFileLike;
      const fields: Record<string, unknown> = { name: f.getName(), url: f.getUrl(), contentType: f.getContentType?.(), size: f.getSize?.(), target: f.getTarget(), filename: f.getFilename?.() };
      return { $cloudFile: walk(fields, `${path}.$cloudFile`, seen) as Canonical };
    }
    if (isBrowserFile(obj)) {
      const b = obj as { name?: unknown; size: number; type: string };
      return { $file: walk(typeof b.name === 'string' ? { name: b.name, size: b.size, type: b.type } : { size: b.size, type: b.type }, `${path}.$file`, seen) as Canonical };
    }
    if (Array.isArray(obj)) {
      // `Array.from`, not `obj.map`: `map` builds its result through `Symbol.species`, so an array of a subclass (the
      // runtime's `CollectionImpl`, collection.ts :739) canonicalised as that subclass — and a recorded trace, read back
      // from JSON, holds plain arrays (NSP-014 s25: graph s09 red in a full run, green alone). The form is plain, always.
      const items = Array.from(obj, (item, i) => {
        const c = walk(item, `${path}[${i}]`, seen);
        return c === undefined ? null : c;
      });
      // NSP-012: a registry array carries its name. Duck-typed, never by class: the runtime's
      // arrays answer `getId()` through a prototype patch (collection.ts :467-473) and a plain
      // array in that process answers `undefined`; the interpreter's answer the same way.
      const named = obj as unknown as { getId?: unknown };
      if (typeof named.getId === 'function') {
        const id = (named.getId as () => unknown)();
        if (typeof id === 'string') return { $array: id, items };
      }
      return items;
    }
    const withToJson = obj as { toJSON?: unknown };
    if (typeof withToJson.toJSON === 'function') {
      return walk((withToJson.toJSON as () => unknown)(), path, seen) as Canonical;
    }
    const out: { [key: string]: Canonical } = {};
    for (const key of Object.keys(obj).sort()) {
      const c = walk((obj as Record<string, unknown>)[key], `${path}.${key}`, seen);
      if (c !== undefined) out[key] = c;
    }
    return out;
  } finally {
    seen.pop();
  }
}

/** NSP-014 s30 — what a stored file answers (the runtime's `CloudFile`, cloudfile.ts :79-98). */
export interface StoredFileLike {
  getName(): unknown;
  getUrl(): unknown;
  getTarget(): unknown;
  getContentType?(): unknown;
  getSize?(): unknown;
  /** P109 ISL-030 (row C52): the name it was uploaded as, when known */
  getFilename?(): unknown;
}

/** NSP-014 s30 — a stored file (the `$cloudFile` row above): `getUrl`, `getName` and `getTarget` all functions. */
export function isStoredFile(value: unknown): value is StoredFileLike {
  if (!value || typeof value !== 'object') return false;
  const f = value as Record<string, unknown>;
  return typeof f.getUrl === 'function' && typeof f.getName === 'function' && typeof f.getTarget === 'function';
}

/** NSP-014 s30 — a file the browser hands (the `$file` row above): a `Blob` by its surface. */
export function isBrowserFile(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const b = value as Record<string, unknown>;
  return typeof b.arrayBuffer === 'function' && typeof b.size === 'number' && typeof b.type === 'string';
}

/**
 * The comparison key: two values are "the same" for a trace when their keys are equal.
 * `undefined` keys as the string `undefined`, which no JSON text can produce.
 */
export function canonicalKey(value: unknown): string {
  const c = canonicalise(value);
  return c === undefined ? 'undefined' : JSON.stringify(c);
}

/**
 * Whether a value is ALREADY in canonical form — what the schema validator asks of every
 * `value` in a trace that arrives from a target. Returns the path of the first offence, or null.
 */
export function findNonCanonical(value: unknown, path = '$'): string | null {
  switch (typeof value) {
    case 'boolean':
    case 'string':
      return null;
    case 'number':
      return Number.isFinite(value) && !Object.is(value, -0) ? null : path;
    case 'object':
      break;
    default:
      return path;
  }
  if (value === null) return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const bad = findNonCanonical(value[i], `${path}[${i}]`);
      if (bad) return bad;
    }
    return null;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return path;
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === '$num') {
    return (NUM_TAGS as readonly unknown[]).includes((value as { $num: unknown }).$num) ? null : `${path}.$num`;
  }
  if (keys.length === 1 && keys[0] === '$date') {
    const d = (value as { $date: unknown }).$date;
    return d === null || typeof d === 'string' ? null : `${path}.$date`;
  }
  for (let i = 1; i < keys.length; i++) {
    if (keys[i - 1] > keys[i]) return `${path}.${keys[i]}`;
  }
  for (const key of keys) {
    const bad = findNonCanonical((value as Record<string, unknown>)[key], `${path}.${key}`);
    if (bad) return bad;
  }
  return null;
}

/**
 * The inverse, for scenario files (NSP-011): a scenario on disk is JSON in canonical form, so a
 * step can say `{ "$num": "NaN" }` or `{ "$num": "-0" }` and the target receives the number,
 * and a replay the shrinker writes round-trips. Every other shape is returned as it is.
 */
export function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === '$num' && (NUM_TAGS as readonly unknown[]).includes(obj.$num)) {
      switch (obj.$num as NumTag) {
        case '-0':
          return -0;
        case 'NaN':
          return NaN;
        case 'Infinity':
          return Infinity;
        case '-Infinity':
          return -Infinity;
      }
    }
    // a local, not `obj.$date` twice: the runtime's jest compiles this file under `strict: false`,
    // where a narrowed property access does not stay narrowed (NSP-002 §5 trap)
    const date = obj.$date;
    if (keys.length === 1 && keys[0] === '$date' && (date === null || typeof date === 'string')) {
      return date === null ? new Date(NaN) : new Date(date as string);
    }
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = revive(obj[key]);
    return out;
  }
  return value;
}
