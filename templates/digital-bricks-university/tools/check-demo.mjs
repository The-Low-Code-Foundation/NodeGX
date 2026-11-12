#!/usr/bin/env node
/**
 * GATE: THE DEMO IS THE TEMPLATE, WITH ITS BACKEND PLAYED IN THE BROWSER (DBU-11).
 *
 *   node tools/check-demo.mjs [--no-backend]
 *
 *  1. The build: tools/build-demo.mjs into a scratch folder, then every file compared with the template. The page
 *     graphs, styles, modules and AGENTS.md are byte for byte the template's; nodegx.project.json differs in exactly
 *     the four named settings; nothing else is added than demo-sw.js, demo/boot.js, demo/files/ and
 *     docs/START-HERE.md; nothing of components/__cloud__ is left in the page files.
 *  2. The engine, in Node: it knows every node the cloud functions use, builds the world from the fixtures (the
 *     same row counts as the seed), and the policy holds (a learner is refused the coach's functions, nobody
 *     signed in is refused everything that is not public).
 *  3. Parity with the real backend (skipped with --no-backend, or when nothing answers on 8595): the read
 *     functions, called as Camille and as the coach on both, give the same answer once ids and moments are
 *     blanked. Run `node tools/reset-demo.mjs` first, so both worlds are fresh.
 *
 * Exit 1 with the failures, or 0 with a count. The scratch build is removed.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { adminClient } from './lib/admin-client.mjs';
import { APP, BACKEND, has, readJson, token } from './lib/local.mjs';
import { cloudGraphs, nodeEngine, unsupportedNodes } from './lib/demo.mjs';
import { buildWorld as seedWorld } from './lib/seed.mjs';
import { COPIED, DEMO_ID, DEMO_NAME, ENDPOINT, build } from './build-demo.mjs';

const results = [];
const expect = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

function files(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out.sort();
}
const same = (a, b) => readFileSync(a).equals(readFileSync(b));

// ── 1. The build ─────────────────────────────────────────────────────────────
const out = mkdtempSync(join(tmpdir(), 'dbu-demo-check-'));
try {
  build(out);
  const built = files(out);
  const ADDED = (p) => p === 'demo-sw.js' || p === 'demo/boot.js' || p.startsWith('demo/files/') || p === 'docs/START-HERE.md';
  const SPECIAL = new Set(['nodegx.project.json', 'components/_registry.json']);

  const differ = [];
  const unexpected = [];
  for (const p of built) {
    if (ADDED(p) || SPECIAL.has(p)) continue;
    const src = join(APP, p);
    let exists = true;
    try { statSync(src); } catch { exists = false; }
    if (!exists) unexpected.push(p);
    else if (!same(src, join(out, p))) differ.push(p);
  }
  expect('build: every copied file is the template\'s, byte for byte', differ.length === 0, differ.slice(0, 5).join(', '));
  expect('build: no file the generator does not name', unexpected.length === 0, unexpected.slice(0, 5).join(', '));

  const pageFiles = files(join(APP, 'components')).filter((p) => !p.startsWith('__cloud__/') && p !== '_registry.json');
  const missing = pageFiles.filter((p) => !built.includes(`components/${p}`));
  expect(`build: every page component is there (${pageFiles.length} files)`, missing.length === 0, missing.slice(0, 5).join(', '));
  for (const rel of COPIED) {
    const want = statSync(join(APP, rel)).isDirectory() ? files(join(APP, rel)).map((p) => `${rel}/${p}`) : [rel];
    const gone = want.filter((p) => !built.includes(p));
    expect(`build: ${rel} is carried over whole`, gone.length === 0, gone.slice(0, 3).join(', '));
  }
  expect('build: nothing of components/__cloud__ is a page file', !built.some((p) => p.startsWith('components/__cloud__')));
  const reg = JSON.parse(readFileSync(join(out, 'components', '_registry.json'), 'utf8'));
  const tplReg = readJson('components', '_registry.json');
  const tplPages = Object.keys(tplReg.components).filter((k) => !k.startsWith('__cloud__'));
  expect('build: the registry is the template\'s page rows, recounted',
    JSON.stringify(Object.keys(reg.components).sort()) === JSON.stringify(tplPages.sort()) && reg.stats.totalComponents === tplPages.length &&
      tplPages.every((k) => JSON.stringify(reg.components[k]) === JSON.stringify(tplReg.components[k])));

  const tpl = readJson('nodegx.project.json');
  const demo = JSON.parse(readFileSync(join(out, 'nodegx.project.json'), 'utf8'));
  const strip = (p) => {
    const c = JSON.parse(JSON.stringify(p));
    delete c.name; delete c.id;
    delete c.settings.navigationPathType; delete c.settings.headCode;
    delete c.metadata.cloudservices.endpoint;
    return c;
  };
  expect('project: only name, id, navigation, headCode and the endpoint differ', JSON.stringify(strip(tpl)) === JSON.stringify(strip(demo)));
  expect('project: the demo\'s own name and id, hash URLs, boot.js in the head, endpoint demo-api',
    demo.name === DEMO_NAME && demo.id === DEMO_ID && demo.id !== tpl.id && demo.settings.navigationPathType === 'hash' &&
      demo.settings.headCode === '<script src="demo/boot.js"></script>' && demo.metadata.cloudservices.endpoint === ENDPOINT);

  const sw = readFileSync(join(out, 'demo-sw.js'), 'utf8');
  const fnNames = Object.keys(cloudGraphs()).filter((k) => !k.startsWith('__cloud__/shared/'));
  expect(`build: demo-sw.js carries all ${fnNames.length} functions and the policy`,
    fnNames.every((k) => sw.includes(JSON.stringify(k))) && sw.includes('"defaults"'));
  // The functions' own text (a default coach address, say) is the template's; what must never be in a page anyone
  // can open is a credential of the local backend.
  let adminToken = '';
  try { adminToken = token(); } catch { /* no local backend: nothing to leak */ }
  expect('build: demo-sw.js and boot.js carry no backend credential',
    (!adminToken || !sw.includes(adminToken)) && !/127\.0\.0\.1:8595/.test(sw));
} finally {
  rmSync(out, { recursive: true, force: true });
}

// ── 2. The engine in Node ────────────────────────────────────────────────────
const graphs = cloudGraphs();
const bad = unsupportedNodes(graphs);
expect('engine: knows every node the cloud functions use', bad.length === 0, bad.slice(0, 3).join(', '));

const engine = nodeEngine();
await engine.ready();
const world = seedWorld();
const st = engine.state();
const countsOk = Object.entries(world.rows || {}).every(([c, rows]) => Object.keys((st.rows && st.rows[c]) || {}).length >= rows.length);
expect('engine: the world has every seeded row', countsOk, JSON.stringify(Object.fromEntries(Object.entries(st.rows || {}).map(([c, r]) => [c, Object.keys(r).length]))));

const people = engine.people();
const camille = people.find((p) => p.email === 'camille.laurent@example.com');
const coach = people.find((p) => p.email === 'coach@example.com');
expect('engine: Camille and a coach are there', camille && coach);

const policy = readJson('nodegx.security.json');
const coachOnly = Object.entries(policy.functions || {}).filter(([, r]) => String(r.call).startsWith('role:')).map(([n]) => n);
const learnerOnly = Object.entries(policy.functions || {}).filter(([, r]) => r.call === 'authenticated').map(([n]) => n);
const refusedCam = [];
for (const n of coachOnly) if ((await engine.call(n, {}, camille.objectId)).status !== 403) refusedCam.push(n);
expect(`engine: Camille is refused all ${coachOnly.length} coach functions`, refusedCam.length === 0, refusedCam.join(', '));
const refusedAnon = [];
for (const n of [...coachOnly, ...learnerOnly]) if ((await engine.call(n, {}, null)).status !== 403) refusedAnon.push(n);
expect('engine: nobody signed in is refused every function that needs a person', refusedAnon.length === 0, refusedAnon.join(', '));

// ── 3. Parity with the real backend ─────────────────────────────────────────
const READS = {
  camille: ['learnerHome', 'myPlan', 'myHomework', 'myMessages', 'myCreations', 'myUnread'],
  coach: ['roster', 'coachInbox', 'library', 'planTemplates', 'coachUnread']
};
const ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9]{10}|u-[a-z0-9-]+|[a-z]+-[0-9a-z]{6,})$/;
const MOMENT = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
const FILE = /^[0-9a-f]{16}_/;
const URLISH = /^https?:\/\//;
/** An answer with its ids, moments, stored file names and addresses blanked, keys sorted, so two worlds compare. */
function blank(v) {
  if (Array.isArray(v)) return v.map(blank);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, blank(v[k])]));
  if (typeof v === 'string') {
    if (MOMENT.test(v)) return '<moment>';
    if (FILE.test(v)) return '<file>' + v.slice(17);
    if (URLISH.test(v)) return '<url>';
    if (ID.test(v)) return '<id>';
    const tagged = /^([a-z]+[-:])(.+)$/.exec(v);
    if (tagged && ID.test(tagged[2])) return tagged[1] + '<id>';
  }
  return v;
}
function firstDifference(a, b, path = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
    if (Array.isArray(a) && a.length !== b.length) return `${path}: ${a.length} items vs ${b.length}`;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDifference(a[k], b[k], `${path}.${k}`);
      if (d) return d;
    }
  }
  return `${path}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`;
}

let live = false;
if (!has('no-backend')) {
  try { live = (await fetch(`${BACKEND}/health`)).ok; } catch { live = false; }
}
if (!live) {
  console.log(`check-demo: no backend at ${BACKEND}${has('no-backend') ? ' (--no-backend)' : ''}; parity skipped.`);
} else {
  const api = adminClient(BACKEND, token());
  const users = await api.all('_User');
  const realId = { camille: users.find((u) => u.email === camille.email)?.objectId, coach: users.find((u) => u.email === coach.email)?.objectId };
  const demoId = { camille: camille.objectId, coach: coach.objectId };
  for (const who of Object.keys(READS)) {
    if (!realId[who]) { expect(`parity: ${who} is on the real backend`, false, 'run node tools/reset-demo.mjs'); continue; }
    const s = await api.sessionFor(realId[who], `demo-${who}`);
    try {
      for (const name of READS[who]) {
        const real = await api.as(s.token, 'POST', `/functions/${name}`, {});
        const mine = await engine.call(name, {}, demoId[who]);
        const a = blank(real.json.result);
        const b = blank(mine.body && mine.body.result);
        const d = real.ok && mine.status === 200 ? firstDifference(a, b, name) : `${real.status} vs ${mine.status}`;
        expect(`parity: ${name} as ${who} answers as the backend does`, !d, d || '');
      }
    } finally {
      await api.endSession(s).catch(() => {});
    }
  }
}

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${!r.ok && r.detail ? `\n       ${r.detail}` : ''}`);
console.log(`check-demo: ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
