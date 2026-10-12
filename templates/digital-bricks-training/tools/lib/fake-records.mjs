/**
 * AN OFFLINE `Noodl.Records`, AS STRICT AS THE BACKEND (TASK-L189).
 *
 * The same rules tools/check-write-functions.mjs's fake enforces — L170's
 * lesson that every double looser than the backend passed what live refused:
 * a read without `{ plain: true }` (HLT-022), a filter with two keys, a save
 * without `className`, a create that breaks a unique index, and `ifMatch`
 * applied exactly as the backend's UPDATE applies it. It adds `delete` and
 * `removeRelation`, which the erasure needs.
 *
 * check-write-functions keeps its own copy: it predates this file and is
 * green, and moving it is its own change (L68). Two copies of one fake is a
 * drift risk, recorded here rather than discovered.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRow, userFields } from './seed-resolve.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const seed = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'seed.json'), 'utf8'));

/** The unique indexes in backend/schema.json, read rather than restated. */
const UNIQUE = Object.fromEntries(
  JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'))
    .tables.map((t) => [t.name, (t.indexes || []).filter((i) => i.unique).map((i) => i.fields)])
);

export const oid = (username) => `u:${username}`;
let serial = 0;
let clock = Date.parse('2026-10-01T09:00:00.000Z');
const stamp = () => new Date((clock += 1000)).toISOString();

export function makeWorld() {
  const t = { _User: seed.users.map((u) => ({ ...userFields(u).fields, objectId: oid(u.username) })) };
  for (const [c, rows] of Object.entries(seed.rows)) t[c] = rows.map((r) => ({ objectId: `${c}:${serial++}`, createdAt: stamp(), ...resolveRow(c, r, oid) }));
  return t;
}

const matches = (row, where) => {
  const keys = Object.keys(where);
  if (keys.length === 0) return true;
  if (keys.length > 1) throw new Error(`A filter must have exactly one key, found ${keys.join(', ')} (the backend refuses it)`);
  const [k] = keys;
  const c = where[k];
  if (k === 'and') return c.every((w) => matches(row, w));
  if (k === 'or') return c.some((w) => matches(row, w));
  if ('equalTo' in c) return row[k] === c.equalTo;
  if ('containedIn' in c) return Array.isArray(c.containedIn) && c.containedIn.includes(row[k]);
  throw new Error(`the fake does not implement ${JSON.stringify(c)}`);
};
const copy = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

export function makeRecords(table, { beforeRead } = {}) {
  const stats = { writes: 0, conflicts: 0, created: [], saved: [], deleted: [] };
  const unique = (c, props, exceptId) => {
    for (const fields of UNIQUE[c] || []) {
      if ((table[c] || []).some((r) => r.objectId !== exceptId && fields.every((k) => r[k] === props[k]))) {
        throw new Error(`duplicate value for a unique index on ${c} (${fields.join(', ')})`);
      }
    }
  };
  const Records = {
    async query(c, where = {}, options = {}) {
      if (options.plain !== true) throw new Error(`Records.query('${c}') without { plain: true } (HLT-022)`);
      if (beforeRead) await beforeRead(c);
      return (table[c] || []).filter((r) => matches(r, where)).slice(0, options.limit ?? 100).map(copy);
    },
    async save(id, props, options = {}) {
      await Promise.resolve();
      if (!options.className) throw new Error('Records.save without className');
      const row = (table[options.className] || []).find((r) => r.objectId === id);
      if (!row) throw new Error('Object not found.');
      if (options.ifMatch) {
        for (const [k, v] of Object.entries(options.ifMatch)) {
          if (row[k] !== v) {
            stats.conflicts++;
            const e = new Error('Someone else changed this record since it was read.');
            e.code = 'precondition-failed';
            throw e;
          }
        }
      }
      unique(options.className, { ...row, ...props }, id);
      Object.assign(row, copy(props), { updatedAt: stamp() });
      stats.writes++;
      stats.saved.push(options.className);
    },
    async create(c, props) {
      await Promise.resolve();
      unique(c, props);
      (table[c] = table[c] || []).push({ objectId: `${c}:${serial++}`, ...copy(props), createdAt: stamp(), updatedAt: stamp() });
      stats.writes++;
      stats.created.push(c);
    },
    async delete(id, options = {}) {
      await Promise.resolve();
      if (!options.className) throw new Error('Records.delete without className');
      const list = table[options.className] || [];
      const i = list.findIndex((r) => r.objectId === id);
      if (i === -1) throw new Error('Object not found.');
      list.splice(i, 1);
      stats.deleted.push(options.className);
    },
    async removeRelation() {}
  };
  return { Records, stats };
}

/**
 * One Function node's script. Resolves with the Outputs on `done`, with
 * `{ ok: false, refused }` on `refuse`/`failed`.
 */
export const run = (code, Inputs, Records, extra = {}) =>
  new Promise((resolve) => {
    const Outputs = {
      done: () => resolve({ ok: true, ...Outputs }),
      refuse: () => resolve({ ok: false, refused: Outputs.why }),
      failed: () => resolve({ ok: false, refused: Outputs.error })
    };
    new Function('Inputs', 'Outputs', 'Noodl', code)(Inputs, Outputs, { Records, ...extra });
  });

export async function quiet(fn) {
  const { log, warn, error } = console;
  const lines = [];
  console.log = console.warn = console.error = (...a) => lines.push(a.join(' '));
  try { return { result: await fn(), lines }; } finally { Object.assign(console, { log, warn, error }); }
}
