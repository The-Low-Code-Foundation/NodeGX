#!/usr/bin/env node
/**
 * THE DEMO IS THE TEMPLATE, LESS A NAMED LIST (TASK-L180).
 *
 *   node tools/check-demo.mjs
 *
 * Fails, by name, on any of:
 *   1. the committed demo differs from what tools/build-demo.mjs generates now
 *      (a hand edit, or a template change nobody regenerated for);
 *   2. a file differs from the template's outside CHANGED_COMPONENTS, or a node
 *      differs inside one outside the removed / rewritten / added lists;
 *   3. a CloudFunction2, a net.noodl.user node or a Sign in route survives;
 *   4. a responder's embedded fixture is not backend/fixtures/<name>.json;
 *   5. a responder, RUN as the page runs it, answers differently from the
 *      backend it stands in for (Sam's programme / nobody else's; the one
 *      written lesson / not written yet; the roster);
 *   6. at any of the instants below, a timeline entry changes sides of "now"
 *      against the state the fixture gave it, the programme's end moves by
 *      anything but the shift, or "end of <Month>" names a month the end date
 *      is not in (allowing the two days documented in demo-clock.mjs);
 *   7. the prose the clock rewrites is not EXACTLY the strings pinned below —
 *      so a fixture that grows "May I…" fails here instead of being rewritten.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADDED_NODES, CHANGED_COMPONENTS, DEMO, REMOVED_NODES, REWRITTEN_NODES, TEMPLATE, generate } from './build-demo.mjs';
import { FIXTURE_NOW_ISO, demoFresh, demoShiftDays } from './lib/demo-clock.mjs';
import { fixture } from './lib/fixtures.mjs';

const failures = [];
function check(ok, message) {
  if (!ok) failures.push(message);
}

const DAY = 86_400_000;
const FIXTURE_NOW = Date.parse(FIXTURE_NOW_ISO);
const files = generate();

// 1. The committed demo is exactly the generator's output.
for (const [rel, content] of files) {
  let onDisk;
  try {
    onDisk = readFileSync(join(DEMO, rel));
  } catch {
    failures.push(`[1] ${rel} is missing from the demo — run node tools/build-demo.mjs`);
    continue;
  }
  check(Buffer.compare(onDisk, Buffer.from(content)) === 0, `[1] ${rel} differs from the generator's output — regenerate, never hand-edit`);
}

// 2. Everything outside the named list is the template's.
const nodesOf = (text) => new Map(JSON.parse(text).nodes.map((n) => [n.id, n]));
for (const [rel, content] of files) {
  if (!rel.startsWith('components/') || rel === 'components/_registry.json') continue;
  const component = rel.slice('components/'.length).split('/').slice(0, -1).join('/');
  const template = readFileSync(join(TEMPLATE, rel));
  if (!CHANGED_COMPONENTS.includes(component)) {
    check(Buffer.compare(template, Buffer.from(content)) === 0, `[2] ${rel} is not in the named list and differs from the template`);
    continue;
  }
  if (!rel.endsWith('/nodes.json')) continue;
  const before = nodesOf(template.toString('utf8'));
  const after = nodesOf(String(content));
  const removed = REMOVED_NODES[component] || [];
  const rewritten = REWRITTEN_NODES[component] || [];
  const added = ADDED_NODES[component] || [];
  for (const [id, node] of before) {
    if (removed.includes(id)) check(!after.has(id), `[2] ${component}: ${id} should be removed`);
    else if (rewritten.includes(id)) check(after.has(id), `[2] ${component}: ${id} should be rewritten, not removed`);
    else check(JSON.stringify(after.get(id)) === JSON.stringify(node), `[2] ${component}: ${id} differs from the template and is not in the named list`);
  }
  for (const id of after.keys()) check(before.has(id) || added.includes(id), `[2] ${component}: ${id} is new and not in ADDED_NODES`);
}

// 3. Nothing of the backend or the sign-in survives.
for (const [rel, content] of files) {
  if (!rel.endsWith('.json')) continue;
  const text = String(content);
  check(!text.includes('"CloudFunction2"'), `[3] ${rel} still holds a CloudFunction2`);
  check(!text.includes('"net.noodl.user.'), `[3] ${rel} still holds a User node`);
  check(!text.includes('/Pages/Sign in'), `[3] ${rel} still names /Pages/Sign in`);
}
const project = JSON.parse(String(files.get('nodegx.project.json')));
check(!project.metadata.cloudservices, '[3] the project still points at a backend (metadata.cloudservices)');
check(project.settings.navigationPathType === 'hash', '[3] the project is not on hash navigation (nodegx.io has no fallback for a deep path)');

// 4 + 5. The responders hold the fixtures and answer as the backend does.
const responders = {};
for (const component of ['Data/Programme', 'Data/Lesson', 'Data/Roster']) {
  for (const node of JSON.parse(String(files.get(`components/${component}/nodes.json`))).nodes) {
    if (node.type === 'JavaScriptFunction' && /FIXTURE-BEGIN/.test(node.parameters?.functionScript || '')) responders[node.id] = node.parameters.functionScript;
  }
}
check(Object.keys(responders).sort().join() === 'le_call,pr_about,pr_own,ro_call', `[4] expected four responders, found ${Object.keys(responders).sort().join()}`);
const embedded = (script) => JSON.parse(script.split('/*FIXTURE-BEGIN*/')[1].split('/*FIXTURE-END*/')[0]);
check(!Object.values(responders).some((s) => s.includes('</')), '[4] a responder holds "</" — it would close the page\'s inline script (D75)');

function run(id, inputs, nowMs) {
  const RealDate = Date;
  const Fake = class extends RealDate {
    constructor(...a) {
      super(...(a.length ? a : [nowMs]));
    }
    static now() {
      return nowMs;
    }
  };
  const outputs = {};
  new Function('Inputs', 'Outputs', 'Date', responders[id])(inputs, outputs, Fake);
  return outputs.rows;
}

const programme = fixture('programme');
const lesson = fixture('lesson');
const roster = fixture('roster');
if (responders.pr_own) {
  assert.deepEqual(embedded(responders.pr_own), programme);
  assert.deepEqual(embedded(responders.pr_about), programme);
  assert.deepEqual(embedded(responders.le_call), lesson);
  assert.deepEqual(embedded(responders.ro_call), roster);
  const later = FIXTURE_NOW + 90 * DAY;
  check(JSON.stringify(run('pr_own', {}, later)) === JSON.stringify(demoFresh(programme, later)), '[5] course does not answer the freshened programme');
  check(JSON.stringify(run('pr_about', { learnerId: programme[0].learnerId }, later)) === JSON.stringify(demoFresh(programme, later)), "[5] learnerProgramme does not answer Sam's programme for Sam");
  check(JSON.stringify(run('pr_about', { learnerId: 'l-marie' }, later)) === '[]', '[5] learnerProgramme answers a programme for somebody who has none');
  check(run('pr_about', {}, later) === undefined, '[5] learnerProgramme answered before a learner was named');
  for (const l of lesson) {
    check(JSON.stringify(run('le_call', { conceptId: l.conceptId }, later)) === JSON.stringify([l]), `[5] lesson does not answer ${l.conceptId} alone`);
  }
  check(JSON.stringify(run('le_call', { conceptId: 'javascript-making-it-do-things' }, later)) === '[]', '[5] lesson answers a concept nobody has written');
  check(JSON.stringify(run('ro_call', {}, later)) === JSON.stringify(demoFresh(roster, later)), '[5] roster does not answer the freshened roster');
}

// 6. Freshness holds at every instant, including just after midnight and just before.
const INSTANTS = [0, 0.5, 1, 7, 37, 90, 200, 365, 400, 730].flatMap((d) => [FIXTURE_NOW + d * DAY, FIXTURE_NOW + d * DAY + 0.49 * DAY]);
check(JSON.stringify(demoFresh(programme, FIXTURE_NOW)) === JSON.stringify(programme), '[6] at FIXTURE_NOW the programme is not the fixture');
const baseEntries = programme[0].entries;
const side = (at, now) => (Date.parse(at) <= now ? 'past' : 'future');
for (const now of INSTANTS) {
  const days = demoShiftDays(now);
  const p = demoFresh(programme, now)[0];
  const tag = `+${((now - FIXTURE_NOW) / DAY).toFixed(2)}d`;
  p.entries.forEach((e, i) => {
    const was = baseEntries[i];
    if (!was.at) return;
    check(side(e.at, now) === side(was.at, FIXTURE_NOW), `[6] ${tag}: ${e.id} (${e.state}) moved to the other side of now`);
  });
  check(Date.parse(`${p.endsOn}T00:00:00Z`) - Date.parse(`${programme[0].endsOn}T00:00:00Z`) === days * DAY, `[6] ${tag}: endsOn did not move by exactly ${days} days`);
  const text = JSON.stringify(p);
  const named = /end of (January|February|March|April|May|June|July|August|September|October|November|December)/.exec(text)?.[1];
  const end = new Date(`${p.endsOn}T00:00:00Z`);
  const endMonth = end.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  const monthBefore = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0)).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  check(named === endMonth || (end.getUTCDate() <= 2 && named === monthBefore), `[6] ${tag}: prose says "end of ${named}" but the programme ends ${p.endsOn}`);
}

// 7. The prose the clock touches is exactly this, and nothing else.
const PINNED = ['[0].entries[2].summary', '[0].history[0].nextStep'];
const touched = [];
(function walk(a, b, path) {
  if (typeof a === 'string') {
    if (a !== b && !/^\d{4}-\d{2}-\d{2}/.test(a)) touched.push(path);
    return;
  }
  if (a && typeof a === 'object') for (const k of Object.keys(a)) walk(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`);
})(programme, demoFresh(programme, FIXTURE_NOW + 90 * DAY), '');
check(JSON.stringify(touched) === JSON.stringify(PINNED), `[7] the clock rewrote ${JSON.stringify(touched)}; pinned ${JSON.stringify(PINNED)}`);
const rosterTouched = JSON.stringify(roster).replace(/"\d{4}-\d{2}-\d{2}[^"]*"/g, '') !== JSON.stringify(demoFresh(roster, FIXTURE_NOW + 90 * DAY)).replace(/"\d{4}-\d{2}-\d{2}[^"]*"/g, '');
check(!rosterTouched, '[7] the clock rewrote prose in the roster');

if (failures.length) {
  console.error(`check-demo: ${failures.length} failure(s)\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-demo: OK — ${files.size} files, the named list only, four responders answering as the backend does, fresh at ${INSTANTS.length} instants over two years.`);
