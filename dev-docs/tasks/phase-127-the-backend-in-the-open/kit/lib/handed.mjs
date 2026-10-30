// BKO-009 — the backend suite's read half: what one person was handed. An editor that shows what someone gets (a day
// in their life, a page as them, a list of what they can see) says so through its adapter's `handed(person)`: the
// steps it shows, each a function it ran as them or a table they read themselves, with the rows that step handed
// them. The suite does each step again, as that person, through the backend's own doors, and compares rows by id.
//
//   { fn: 'myStanding', args: {}, rows: { Member: ['k3…'] } }   a function, run as them on the MCP door
//   { table: 'Announcement', rows: { Announcement: ['a1…', …] } } a table read directly, row by row by the rules
//
// A function that changes data is never run (lib/asperson.mjs `runnable`): its step is counted as not graded and
// said in the PASS line. Someone not signed in isn't graded (no key can act as nobody).

import { asPerson, personName, runnable } from './asperson.mjs';
import { loadWorld, rowsIn } from './reach.mjs';
import { analyseProject } from './project.mjs';
import { signedInContext } from './people.mjs';

/** Who the suite asks about when it isn't told: one person per different set of groups, at most `max`. */
export function samplePeopleByGroups(users, max = 4) {
  const seen = new Set();
  const out = [];
  for (const u of users) {
    const key = [...(u.roles ?? [])].sort().join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
    if (out.length >= max) break;
  }
  return out;
}

const list = (ids) => (ids.length > 3 ? `${ids.slice(0, 3).join(', ')} and ${ids.length - 3} more` : ids.join(', '));
const rowsWord = (n) => `${n} row${n === 1 ? '' : 's'}`;

/**
 * The rows of `table` this person may read themselves, asked of the backend's own rule check, row by row: the table's
 * rule, then the row's own access list (`recordAllowed`). `null` when a path rule decides which rows (`narrow`): the
 * check can't say row by row, so the step isn't graded.
 */
async function readableRows(be, world, userId, table) {
  const rows = (world.rowsByTable[table] ?? []).slice(0, 200);
  const out = new Set();
  for (const row of rows) {
    const r = await be.post('/admin/permissions/check', { principal: { kind: 'user', userId }, collection: table, op: 'find', record: row }).catch(() => null);
    if (r?.narrow) return null;
    if (r?.allowed && r.recordAllowed !== false) out.add(row.objectId);
  }
  return out;
}

/**
 * Grades an adapter's `handed`. `be` is lib/backend.mjs's client. `people`: `_User` objectIds, emails or names; left
 * out, `samplePeopleByGroups`. Returns { differences, people, steps, notGraded }.
 */
export async function gradeHanded({ ed, be, project, people, name = ed?.name ?? 'the editor', max = 10 }) {
  const world = await loadWorld(be);
  const tableNames = world.schema.tables.map((t) => t.name);
  const app = analyseProject(project, tableNames);
  const fnByName = Object.fromEntries(app.functions.map((f) => [f.name, f]));
  const users = world.rowsByTable._User ?? [];
  const chosen = people?.length
    ? people.map((p) => users.find((u) => u.objectId === p || u.email === p || u.username === p || personName(u) === p) ?? p)
    : samplePeopleByGroups(users);
  const differences = [];
  const say = (words) => differences.length < max && differences.push(words);
  const ap = asPerson(be);
  let steps = 0;
  let notGraded = 0;

  for (const u of chosen) {
    if (typeof u === 'string') {
      say(`No one called “${u}” is in the backend.`);
      continue;
    }
    const who = personName(u);
    const person = { id: u.objectId, name: who, email: u.email ?? null, roles: u.roles ?? [] };
    let shown;
    try {
      shown = (await ed.handed(person)) ?? [];
    } catch (e) {
      say(`${name} couldn’t say what ${who} was handed: ${e.message}`);
      continue;
    }
    if (!Array.isArray(shown)) {
      say(`${name}’s handed() for ${who} returned no list of steps.`);
      continue;
    }
    const base = Object.fromEntries(Object.entries(signedInContext(u, world.profiles?.[u.objectId] ?? null)).map(([k, c]) => [k, c.value]));

    await ap.withKey(u, async (k) => {
      const toolOf = Object.fromEntries((await k.tools()).map((t) => [t.name, t]));
      for (let i = 0; i < shown.length; i++) {
        const step = shown[i] ?? {};
        steps++;
        const at = `${who}, step ${i + 1} (${step.fn ?? step.table ?? '?'})`;
        const claimed = Object.fromEntries(Object.entries(step.rows ?? {}).map(([t, ids]) => [t, new Set(ids)]));
        const claimedCount = Object.values(claimed).reduce((s, x) => s + x.size, 0);
        for (const t of Object.keys(claimed)) if (!tableNames.includes(t)) say(`${at}: the editor shows rows of ${t}, a table the backend doesn’t have.`);

        let real;
        if (step.fn) {
          const f = fnByName[step.fn];
          if (!f) {
            say(`${at}: ${step.fn} isn’t one of the app’s functions.`);
            continue;
          }
          if (!toolOf[step.fn]) {
            if (claimedCount) say(`${at}: the backend doesn’t let ${who} run ${step.fn}, but the editor shows it handing them ${rowsWord(claimedCount)}.`);
            continue;
          }
          if (!runnable(f, toolOf[step.fn]).ok) {
            notGraded++;
            continue;
          }
          const r = await k.call(step.fn, step.args ?? {});
          if (!r.ok) {
            if (claimedCount) say(`${at}: ${step.fn} refused ${who} (“${String(r.error).slice(0, 120)}”), but the editor shows it handing them ${rowsWord(claimedCount)}.`);
            continue;
          }
          real = rowsIn(r.value, world.index, base);
        } else if (step.table) {
          if (!tableNames.includes(step.table)) {
            say(`${at}: ${step.table} isn’t a table on the backend.`);
            continue;
          }
          const readable = await readableRows(be, world, u.objectId, step.table);
          if (!readable) {
            notGraded++;
            continue;
          }
          real = { [step.table]: readable };
          for (const t of Object.keys(claimed)) if (t !== step.table) say(`${at}: reading ${step.table} hands nobody rows of ${t}.`);
        } else {
          say(`${at}: a step is a function ({ fn, args }) or a table ({ table }); this one is neither.`);
          continue;
        }

        for (const t of new Set([...Object.keys(claimed), ...Object.keys(real)])) {
          const want = real[t] ?? new Set();
          const got = claimed[t] ?? new Set();
          const extra = [...got].filter((id) => !want.has(id));
          const missing = [...want].filter((id) => !got.has(id));
          if (extra.length) say(`${at}: the editor shows ${rowsWord(extra.length)} of ${t} the backend didn’t hand them (${list(extra)}).`);
          if (missing.length) say(`${at}: the backend handed them ${rowsWord(missing.length)} of ${t} the editor doesn’t show (${list(missing)}).`);
        }
      }
    });
  }
  if (!steps && !differences.length) say(`${name} showed no step for anyone, so there was nothing to grade.`);
  return { differences, people: chosen.filter((u) => typeof u !== 'string').length, steps, notGraded };
}
