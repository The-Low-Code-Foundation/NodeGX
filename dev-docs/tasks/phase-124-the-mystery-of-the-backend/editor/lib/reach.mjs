// Round 3: what one person can reach, row by row. The reverse of one row's reach.
//
// A table lights up for a person only when rows of it come back to them. The map runs, as them, every
// function they may run that only reads; it reads the answers; and it follows what they were shown the
// way the app's next click would (a person's id in a list → that person's rows). Every row of
// every table is then looked for in what came back, by its ids. Nothing is guessed from the code: a
// function that names twenty tables but hands back one person's rows lights up that person's rows.

import { runnable, personName } from './asperson.mjs';
import { rulesOff } from './rules.mjs';
import { personKeys, profilesFrom, signedInContext } from './people.mjs';

/** How many different ways one function is asked, per person, at most. Said on screen when it bites. */
export const MAX_ASKS = 16;
/** Rounds of following what came back. */
const ROUNDS = 3;

const TOKEN_SPLIT = /[^A-Za-z0-9_\-.@]+/;

/**
 * Every row of every table, indexed by what can identify it in an answer: its objectId, any one-column
 * unique key (a learner id, a conversation id), and for a table whose rows are told apart only by
 * several columns together (a learner's progress on a step), those columns as one key.
 */
export function rowIndex(tables, rowsByTable, people = personKeys(tables)) {
  const single = new Map(); // value → [{ table, id }]
  const keyFields = new Set(); // column names that tell a row apart on their own
  const multi = []; // { table, fields, byKey: Map }
  const joins = []; // { from, to, map }: a column whose every value names one row, giving that row's key
  const total = {};
  const put = (v, hit) => {
    if (typeof v !== 'string' || v.length < 4) return;
    const l = single.get(v);
    if (l) {
      if (!l.some((x) => x.table === hit.table && x.id === hit.id)) l.push(hit);
    } else single.set(v, [hit]);
  };
  for (const t of tables) {
    const rows = rowsByTable[t.name] ?? [];
    total[t.name] = rows.length;
    const uniques = (t.indexes ?? t.keys?.map((k) => ({ unique: true, fields: k })) ?? []).filter((i) => i.unique);
    const ones = uniques.filter((i) => i.fields.length === 1).map((i) => i.fields[0]);
    if (t.name === '_User') ones.push('email', 'username');
    for (const f of ones) if (f !== 'email' && f !== 'username') keyFields.add(f);
    for (const r of rows) {
      put(r.objectId, { table: t.name, id: r.objectId });
      for (const f of ones) put(r[f], { table: t.name, id: r.objectId });
    }
    for (const i of uniques.filter((x) => x.fields.length > 1)) {
      const byKey = new Map();
      for (const r of rows) {
        if (i.fields.some((f) => r[f] === undefined || r[f] === null)) continue;
        byKey.set(i.fields.map((f) => String(r[f])).join('\u0001'), r.objectId);
      }
      multi.push({ table: t.name, fields: i.fields, byKey });
    }
    // A table with one row per person (a learner's one learning path): learnerId → pathId. Only a column
    // that names a person (`people`, read from the schema: lib/people.mjs), and only when no two of at
    // least three rows share it: a concept with one row here by chance must not read as "whoever saw the
    // concept saw the row".
    const key = ones.find((f) => f !== 'email' && f !== 'username' && f !== 'objectId');
    if (key && rows.length >= 3) {
      for (const c of people) {
        if (c === key || !(c in rows[0])) continue;
        const vals = rows.map((r) => r[c]);
        if (vals.some((v) => typeof v !== 'string') || new Set(vals).size !== vals.length) continue;
        joins.push({ from: c, to: key, map: new Map(rows.map((r) => [r[c], r[key]])) });
      }
    }
  }
  return { single, keyFields, multi, joins, total };
}

const singular = (k) => (k.endsWith('ies') ? k.slice(0, -3) + 'y' : k.endsWith('s') ? k.slice(0, -1) : k);

/**
 * Walks an answer. Each object is read with what its parents said around it (a learner's entries sit
 * under that learner's id), which is how a row told apart by several columns is recognised. An object
 * under "session" whose `id` is sess-start is read as sessionId = sess-start.
 * Calls `visit(ctx, own)`: ctx = the object's plain values over its parents' over `base` (who is signed
 * in); own = the same without `base`, i.e. only what the answer itself said.
 */
function walk(value, visit, base = {}, index = null) {
  const go = (x, inherited, under) => {
    if (Array.isArray(x)) return x.forEach((y) => go(y, inherited, under));
    if (!x || typeof x !== 'object') return;
    const own = { ...inherited };
    for (const [k, v] of Object.entries(x)) if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) own[k] = v;
    if (under && typeof x.id === 'string' && own[`${singular(under)}Id`] === undefined) own[`${singular(under)}Id`] = x.id;
    for (const j of index?.joins ?? []) if (own[j.from] != null && own[j.to] == null && j.map.has(own[j.from])) own[j.to] = j.map.get(own[j.from]);
    visit({ ...base, ...own }, own);
    for (const [k, v] of Object.entries(x)) if (v && typeof v === 'object') go(v, own, k);
  };
  go(value, {}, null);
}

/** The rows an answer holds: table → Set(objectId). */
export function rowsIn(value, index, base = {}) {
  const found = {};
  const add = (table, id) => (found[table] ??= new Set()).add(id);
  const tokens = new Set();
  const collect = (x) => {
    if (typeof x === 'string') {
      tokens.add(x);
      for (const p of x.split(TOKEN_SPLIT)) if (p) tokens.add(p);
    } else if (Array.isArray(x)) x.forEach(collect);
    else if (x && typeof x === 'object') Object.values(x).forEach(collect);
  };
  collect(value);
  for (const t of tokens) for (const hit of index.single.get(t) ?? []) add(hit.table, hit.id);
  walk(
    value,
    (ctx, own) => {
      // a key the answer named under another name (session.id → sessionId) or that it implies (a person's id → their row)
      for (const [f, v] of Object.entries(own)) if (index.keyFields.has(f) && typeof v === 'string') for (const hit of index.single.get(v) ?? []) add(hit.table, hit.id);
      for (const m of index.multi) {
        if (m.fields.some((f) => ctx[f] === undefined || ctx[f] === null)) continue;
        const id = m.byKey.get(m.fields.map((f) => String(ctx[f])).join('\u0001'));
        if (id) add(m.table, id);
      }
    },
    base,
    index
  );
  return found;
}

/**
 * The ways to ask a function, from what the person has been shown: every object in their answers (read
 * with its parents) that holds all the arguments the function needs is one click the app could make.
 */
export function asksFrom(required, answers, base) {
  const seen = new Map();
  const consider = (ctx) => {
    if (required.some((r) => ctx[r] === undefined || ctx[r] === null || ctx[r] === '')) return;
    const args = Object.fromEntries(required.map((r) => [r, ctx[r]]));
    const key = JSON.stringify(args);
    if (!seen.has(key)) seen.set(key, args);
  };
  consider(base);
  for (const a of answers) walk(a, consider, base);
  return [...seen.values()];
}

/** Spreads the asks over their first argument, so a cap still reaches as many different people as it can. */
function spread(asks, max) {
  if (asks.length <= max) return asks;
  const groups = new Map();
  for (const a of asks) {
    const k = String(Object.values(a)[0]);
    (groups.get(k) ?? groups.set(k, []).get(k)).push(a);
  }
  const out = [];
  for (let i = 0; out.length < max; i++) {
    let any = false;
    for (const g of groups.values()) {
      if (g[i] && out.length < max) out.push(g[i]), (any = true);
    }
    if (!any) break;
  }
  return out;
}

/** Everything the map needs to measure anyone: the tables, all their rows, and the index. */
export async function loadWorld(be) {
  const schema = await be.get('/admin/schema');
  const rowsByTable = {};
  await Promise.all(
    schema.tables.map(async (t) => {
      if (t.name === '_User') {
        const { users } = await be.get('/admin/users?limit=1000');
        rowsByTable[t.name] = users;
        return;
      }
      const { results } = await be.get(`/api/${encodeURIComponent(t.name)}?limit=1000`);
      rowsByTable[t.name] = results ?? [];
    })
  );
  return { schema, rowsByTable, index: rowIndex(schema.tables, rowsByTable), profiles: profilesFrom(schema.tables, rowsByTable) };
}

/**
 * What one person can reach. `emit(event)` is told as it happens, so the map can light up live:
 *   { type: 'start', person, tools, plan }    { type: 'run', fn, args, status, rows, newRows, ms }
 *   { type: 'skip', fn, why, writes }          { type: 'done', summary }
 * Every run is real, read-only, as them, and marked as the map's.
 */
export async function personReach({ be, ap, app, world, config, user, emit = () => {} }) {
  const fnByName = Object.fromEntries(app.functions.map((f) => [f.name, f]));
  const { index } = world;
  const name = personName(user);
  const profile = world.profiles?.[user.objectId] ?? null;
  // What the app knows about whoever is signed in, before they have been shown anything.
  const base = Object.fromEntries(Object.entries(signedInContext(user, profile)).map(([k, c]) => [k, c.value]));

  const reached = {}; // table → Map(objectId → [{ fn, args }])
  const byFn = {}; // fn → { runs, refused, rows: { table → count }, asked, possible }
  const note = (fn, args, found) => {
    const fresh = {};
    for (const [table, ids] of Object.entries(found)) {
      for (const id of ids) {
        const m = (reached[table] ??= new Map());
        if (!m.has(id)) {
          m.set(id, []);
          (fresh[table] ??= []).push(id);
        }
        if (m.get(id).length < 3) m.get(id).push({ fn, args });
      }
    }
    return fresh;
  };

  // directly: the backend's own rule check, for every table whose rule could let anyone in at all
  const direct = await directly(be, world, config, { kind: 'user', userId: user.objectId });
  for (const [t, yes] of Object.entries(direct)) if (yes) note('(directly)', null, { [t]: new Set((world.rowsByTable[t] ?? []).map((r) => r.objectId)) });

  return ap.withKey(user, async (k) => {
    const tools = await k.tools();
    const toolOf = Object.fromEntries(tools.map((t) => [t.name, t]));
    const allowed = app.functions.filter((f) => toolOf[f.name]);
    const readers = [];
    const changers = [];
    for (const f of allowed) {
      const safe = runnable(f, toolOf[f.name]);
      if (safe.ok) readers.push(f);
      else {
        const writes = f.touches.filter((t) => t.hows.some((h) => h === 'creates' || h === 'changes' || h === 'deletes')).map((t) => t.table);
        changers.push({ fn: f.name, why: safe.why, writes });
      }
    }
    emit({
      type: 'start',
      person: { id: user.objectId, name },
      tools: allowed.map((f) => f.name),
      notAllowed: app.functions.filter((f) => !toolOf[f.name]).map((f) => f.name),
      readers: readers.map((f) => f.name),
      direct: Object.keys(direct).filter((t) => direct[t])
    });
    for (const c of changers) emit({ type: 'skip', ...c });

    const answers = [];
    const asked = new Set();
    for (let round = 0; round < ROUNDS; round++) {
      let ranAny = false;
      for (const f of readers) {
        const required = toolOf[f.name].inputSchema?.required ?? [];
        const all = required.length ? asksFrom(required, answers, base) : [{}];
        const todo = all.filter((a) => !asked.has(f.name + JSON.stringify(a)));
        const s = (byFn[f.name] ??= { fn: f.name, runs: 0, refused: 0, rows: {}, possible: 0, required });
        s.possible = Math.max(s.possible, all.length);
        const room = MAX_ASKS - s.runs - s.refused;
        if (!todo.length || room <= 0) continue;
        for (const args of spread(todo, room)) {
          // turned away three times and never answered: stop asking, and say so
          if (s.refused >= 3 && s.runs === 0) {
            s.gaveUp = true;
            break;
          }
          asked.add(f.name + JSON.stringify(args));
          const r = await k.call(f.name, args);
          ranAny = true;
          if (!r.ok) {
            s.refused++;
            emit({ type: 'run', fn: f.name, args, status: 'refused', why: r.error, ms: r.ms });
            continue;
          }
          s.runs++;
          answers.push(r.value);
          const found = rowsIn(r.value, index, base);
          const fresh = note(f.name, args, found);
          for (const [t, ids] of Object.entries(found)) s.rows[t] = (s.rows[t] ?? 0) + ids.size;
          emit({
            type: 'run',
            fn: f.name,
            args,
            status: 'ran',
            ms: r.ms,
            rows: Object.fromEntries(Object.entries(found).map(([t, ids]) => [t, ids.size])),
            newRows: fresh
          });
        }
      }
      if (!ranAny) break;
    }

    const tables = {};
    for (const t of world.schema.tables) {
      const m = reached[t.name];
      const via = {};
      for (const hits of m?.values() ?? []) for (const h of hits) via[h.fn] = (via[h.fn] ?? 0) + 1;
      tables[t.name] = { reached: m?.size ?? 0, total: index.total[t.name], directly: !!direct[t.name], via };
    }
    const summary = {
      person: { id: user.objectId, name, roles: user.roles ?? [], profile },
      keyName: k.keyName,
      tools: allowed.map((f) => f.name),
      readers: readers.map((f) => f.name),
      changers,
      functions: Object.values(byFn).map((s) => ({ ...s, capped: s.possible > MAX_ASKS })),
      tables,
      rows: Object.fromEntries(Object.entries(reached).map(([t, m]) => [t, [...m.entries()].map(([id, hits]) => ({ id, hits }))])),
      reachedRows: Object.values(reached).reduce((s, m) => s + m.size, 0),
      totalRows: Object.values(index.total).reduce((s, n) => s + n, 0)
    };
    emit({ type: 'done', summary });
    return summary;
  });
}

/** Someone not signed in: no key can act as nobody, so it is the backend's rule checks and its public functions. */
export async function anonymousReach({ be, app, world, config }) {
  const direct = await directly(be, world, config, { kind: 'anonymous' });
  const isPublic = (rule) => (Array.isArray(rule) ? rule.includes('public') : rule === 'public');
  const open = app.functions.filter((f) => isPublic(config.functions?.[f.name]?.call));
  const tables = {};
  for (const t of world.schema.tables) tables[t.name] = { reached: direct[t.name] ? world.index.total[t.name] : 0, total: world.index.total[t.name], directly: direct[t.name], via: {} };
  return {
    person: { id: null, name: 'Someone not signed in', roles: [], profile: null },
    tools: open.map((f) => f.name),
    readers: [],
    changers: open.map((f) => ({ fn: f.name, why: runnable(f, { description: '' }).ok ? 'it can’t be run as nobody from here' : runnable(f, { description: '' }).why, writes: [] })),
    functions: [],
    tables,
    rows: {},
    reachedRows: Object.values(tables).reduce((s, t) => s + t.reached, 0),
    totalRows: Object.values(world.index.total).reduce((s, n) => s + n, 0)
  };
}

/**
 * Which tables a principal may open directly. A table whose rule says nobody, for every kind of reading,
 * with no "makers see their own", is a no without asking (the backend limits admin requests); the
 * rest are the backend's own answer.
 */
async function directly(be, world, config, principal) {
  const out = {};
  // NPMAUDIT-BACKENDMAPCHECK: with rules off every table opens to everyone, whatever its rule says.
  if (await rulesOff(be)) {
    for (const t of world.schema.tables) out[t.name] = true;
    return out;
  }
  const def = config?.defaults ?? {};
  const closed = (r) => r === 'nobody' || r == null || (Array.isArray(r) && r.every(closed));
  await Promise.all(
    world.schema.tables.map(async (t) => {
      const own = config?.collections?.[t.name];
      const perms = { ...(def.permissions ?? {}), ...(own?.permissions ?? {}) };
      const owns = own ? !!own.creatorOwns : !!def.creatorOwns;
      if (config && closed(perms.find) && closed(perms.get) && !owns) return (out[t.name] = false);
      try {
        out[t.name] = !!(await be.post('/admin/permissions/check', { principal, collection: t.name, op: 'find' })).allowed;
      } catch {
        out[t.name] = false;
      }
    })
  );
  return out;
}

