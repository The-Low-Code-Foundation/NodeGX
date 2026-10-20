// The three questions about real people, answered by the backend itself:
//   reach(person)        what they may call (the MCP door's list) and open directly (the rule checks)
//   screen(person, S)    what they EXACTLY get on screen S: its functions, run as them, and the answers
//   recordReach(T, id)   who can reach one row, directly or through which function, and who can't

import { analyseProject } from './project.mjs';
import { asPerson, personName, runnable, argsFor, learnerIds, containsAny } from './asperson.mjs';

const pool = async (items, n, fn) => {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    })
  );
  return out;
};

export function makeViews({ be, project, mine }) {
  const ap = asPerson(be, { mine });
  let cache = null;

  async function world() {
    if (cache && Date.now() - cache.at < 15_000) return cache;
    const [schema, { users }] = await Promise.all([be.get('/admin/schema'), be.get('/admin/users?limit=500')]);
    const app = analyseProject(project, schema.tables.map((t) => t.name));
    const lids = await learnerIds(be);
    cache = { at: Date.now(), schema, users, app, lids, fnByName: Object.fromEntries(app.functions.map((f) => [f.name, f])) };
    return cache;
  }

  const personOut = (u, w) => ({ id: u.objectId, name: personName(u), email: u.email ?? null, roles: u.roles ?? [], learnerId: w.lids[u.objectId] ?? null, disabled: !!u.disabled });

  async function people() {
    const w = await world();
    return w.users.map((u) => personOut(u, w));
  }

  async function userOf(id) {
    const w = await world();
    const u = w.users.find((x) => x.objectId === id);
    if (!u) throw new Error('No such person in the backend.');
    return { u, w };
  }

  async function directChecks(principal, tables, record) {
    const out = {};
    await pool(tables, 8, async (t) => {
      const ask = async (op) => {
        try {
          const r = await be.post('/admin/permissions/check', { principal, collection: t, op, ...(record ? { record } : {}) });
          return { allowed: !!r.allowed, reason: r.reason ?? '' };
        } catch (e) {
          return { allowed: null, reason: e.message };
        }
      };
      out[t] = record ? { get: await ask('get'), find: await ask('find') } : { find: await ask('find'), create: await ask('create') };
    });
    return out;
  }

  /** 1. What one person may use: the MCP door's list (no function runs) and the backend's rule checks. */
  async function reach(id) {
    const { u, w } = await userOf(id);
    const tools = await ap.withKey(u, (k) => k.tools());
    const direct = await directChecks({ kind: 'user', userId: u.objectId }, w.schema.tables.map((t) => t.name));
    return {
      person: personOut(u, w),
      tools: tools.map((t) => ({ name: t.name, required: t.inputSchema?.required ?? [], description: t.description ?? '' })),
      direct
    };
  }

  /** 2. One screen as one person: each function the screen asks for, run as them when it's safe to. */
  async function screen(id, screenKey) {
    const { u, w } = await userOf(id);
    const calls = w.app.calls.filter((c) => c.screen === screenKey);
    if (!calls.length) throw new Error('That screen asks the backend for nothing.');
    const byFn = {};
    for (const c of calls) (byFn[c.fn] ??= { fn: c.fn, triggers: [] }).triggers.push({ words: c.trigger.words, kind: c.trigger.kind, inside: c.inside });
    const lid = w.lids[u.objectId];
    return ap.withKey(u, async (k) => {
      const tools = await k.tools();
      const toolOf = Object.fromEntries(tools.map((t) => [t.name, t]));
      const context = { learnerId: lid ? { value: lid, from: 'who is signed in (their learner profile)' } : undefined };
      const results = {};
      const runOne = async (fn, extra) => {
        const tool = toolOf[fn];
        const f = w.fnByName[fn];
        if (!tool) return { status: 'not-allowed', why: `the backend doesn’t let ${personName(u)} run it (it isn’t on the list the backend offers them)` };
        const safe = runnable(f, tool);
        if (!safe.ok) return { status: 'not-run', why: safe.why };
        const { args, from, missing } = argsFor(tool, { ...context, ...extra });
        if (missing.length) return { status: 'not-run', why: `it needs ${missing.join(' and ')}, which this screen gets from somewhere the map can’t know (the address, or what was clicked)`, missing };
        const r = await k.call(fn, args);
        return r.ok ? { status: 'ran', value: r.value, ms: r.ms, args, from, requestId: r.requestId } : { status: 'refused', why: r.error, ms: r.ms, args, from, requestId: r.requestId };
      };
      // The step they're on now, from their own course, for a screen whose functions take a conceptId.
      const needsConcept = Object.keys(byFn).some((fn) => (toolOf[fn]?.inputSchema?.required ?? []).includes('conceptId'));
      if (needsConcept && toolOf.course) {
        results.course = await runOne('course');
        const now = findNow(results.course.value);
        if (now) context.conceptId = { value: now, from: 'the step they’re on now, from their own course' };
      }
      for (const fn of Object.keys(byFn)) if (!results[fn]) results[fn] = await runOne(fn);
      const keyName = k.keyName;
      return {
        person: personOut(u, w),
        keyName,
        screen: screenKey,
        calls: Object.values(byFn).map((c) => ({ ...c, ...results[c.fn], touches: w.fnByName[c.fn]?.touches ?? [] })),
        extra: results.course && !byFn.course ? [{ fn: 'course', ...results.course, why: 'run first, to know which step they’re on' }] : []
      };
    });
  }

  /** 3. One row: who can reach it, directly (the rules, for this row) or through a function (run as them). */
  async function recordReach(table, objectId) {
    const w = await world();
    const t = w.schema.tables.find((x) => x.name === table);
    if (!t) throw new Error('No such table.');
    const row = await be.get(`/api/${encodeURIComponent(table)}/${encodeURIComponent(objectId)}`);
    const keys = (t.indexes ?? []).filter((i) => i.unique && i.fields.length === 1).map((i) => i.fields[0]);
    const needles = [row.objectId, ...keys.map((k) => row[k])].filter((v) => typeof v === 'string' && v.length >= 4);
    // what the row says about itself, usable as a function's argument (learnerId, conversationId, …)
    const rowContext = {};
    for (const [k, v] of Object.entries(row)) if (typeof v === 'string' && /Id$/.test(k) && k !== 'objectId') rowContext[k] = { value: v, from: `this row’s ${k}` };

    const candidates = w.app.functions.filter((f) => f.touches.some((x) => x.table === table));
    const anon = await directChecks({ kind: 'anonymous' }, [table], row);
    const people = await pool(w.users, 4, async (u) => {
      const direct = (await directChecks({ kind: 'user', userId: u.objectId }, [table], row))[table];
      const results = await ap.withKey(u, async (k) => {
        const tools = await k.tools();
        const toolOf = Object.fromEntries(tools.map((x) => [x.name, x]));
        const out = [];
        for (const f of candidates) {
          const tool = toolOf[f.name];
          if (!tool) {
            out.push({ fn: f.name, status: 'not-allowed', why: 'the backend doesn’t let them run it' });
            continue;
          }
          const safe = runnable(f, tool);
          if (!safe.ok) {
            out.push({ fn: f.name, status: 'not-run', why: safe.why });
            continue;
          }
          const { args, from, missing } = argsFor(tool, rowContext);
          if (missing.length) {
            out.push({ fn: f.name, status: 'not-run', why: `it needs ${missing.join(' and ')}, which the map couldn’t take from this row`, missing });
            continue;
          }
          const r = await k.call(f.name, args);
          if (!r.ok) out.push({ fn: f.name, status: 'refused', why: r.error, args, from, requestId: r.requestId });
          else {
            const found = containsAny(r.value, needles);
            out.push({ fn: f.name, status: 'ran', found: found.length > 0, foundBy: found, args, from, requestId: r.requestId, ms: r.ms, value: found.length ? excerpt(r.value, needles) : null });
          }
        }
        return out;
      });
      const via = results.filter((r) => r.found).map((r) => r.fn);
      const directly = !!(direct.get.allowed || direct.find.allowed);
      return { person: personOut(u, w), direct, results, via, reaches: directly || via.length > 0 };
    });
    return { table, row, needles, anonymous: anon[table], people, candidates: candidates.map((f) => f.name) };
  }

  return { people, reach, screen, recordReach, sweep: ap.sweep, live: ap.live };
}

/** The conceptId of the step marked "now" in a course answer. */
function findNow(v) {
  let hit = null;
  const walk = (x) => {
    if (hit || !x || typeof x !== 'object') return;
    if (!Array.isArray(x) && x.state === 'now' && typeof x.conceptId === 'string') hit = x.conceptId;
    for (const y of Object.values(x)) walk(y);
  };
  walk(v);
  return hit;
}

/** The smallest parts of an answer that contain the row: the objects holding one of its ids. */
function excerpt(value, needles) {
  const hits = [];
  const walk = (x) => {
    if (hits.length >= 5 || !x || typeof x !== 'object') return;
    if (!Array.isArray(x) && Object.values(x).some((v) => typeof v === 'string' && needles.some((n) => v.includes(n)))) {
      hits.push(x);
      return;
    }
    for (const y of Object.values(x)) walk(y);
  };
  walk(value);
  return hits;
}
