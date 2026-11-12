// P127 BKO-009 — grading the stranger's editor from outside its lab: `node grade.mjs <labRoot> <adapter path>`.
//
// 1. Left as it was? The lab's riverside/ against the hashes taken when the round began (riverside-before.sha), and
//    the club's backend (rules, triggers, people and their groups, every row id) against club-before.json.
// 2. The backend suite, on a FRESH club (lab.mjs, outside the lab) with the stranger's adapter: its read half when it
//    offers handed(), and the members-area edit script (every kind) when it offers apply().
// Writes <labRoot>/out/day/grade.json and prints a line per finding.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { makeMembersLab, stop } from './lab.mjs';
import { runSuite } from '../kit/lib/index.mjs';

const [labRoot, adapterPath] = process.argv.slice(2);
if (!labRoot || !adapterPath) throw new Error('usage: grade.mjs <labRoot> <adapter path>');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const LAB = path.join(labRoot, 'lab', 'day');
const grade = { at: new Date().toISOString(), adapter: adapterPath, findings: [] };
const say = (words) => (console.log(words), grade.findings.push(words));

// 1. the app's folder
const before = Object.fromEntries(fs.readFileSync(path.join(labRoot, 'riverside-before.sha'), 'utf8').trim().split('\n').map((l) => l.split(/\s+/).reverse()));
const now = {};
const walk = (d) => {
  for (const e of fs.readdirSync(path.join(LAB, d), { withFileTypes: true })) {
    const rel = path.join(d, e.name);
    if (e.isDirectory()) walk(rel);
    else now[rel] = crypto.createHash('sha1').update(fs.readFileSync(path.join(LAB, rel))).digest('hex');
  }
};
walk('riverside');
const moved = Object.keys({ ...before, ...now }).filter((k) => before[k] !== now[k]);
grade.appMoved = moved;
say(moved.length ? `riverside/: ${moved.length} file(s) differ from the start: ${moved.slice(0, 8).join(', ')}` : 'riverside/: every file as it was (105 hashed)');

// 1b. the club's backend, if it is still up (the round's teardown stops it)
const club = JSON.parse(fs.readFileSync(path.join(labRoot, 'out', 'day', 'club.json'), 'utf8'));
const was = JSON.parse(fs.readFileSync(path.join(labRoot, 'club-before.json'), 'utf8'));
const g = (p) => fetch(club.backend + p, { headers: { Authorization: `Bearer ${club.token}` } }).then((r) => r.json());
// the round's teardown stops it (its arguments name the lab): start it again on the same data, read-only use
let restarted = null;
if (!(await fetch(club.backend + '/health').catch(() => null))?.ok) {
  const { spawn } = await import('node:child_process');
  const { BACKEND_CLI } = await import('./lab.mjs');
  restarted = spawn(process.execPath, [BACKEND_CLI, 'serve', '--data-dir', path.join(labRoot, 'club', 'backend-data'), '--port', new URL(club.backend).port, '--token', club.token, '--project-dir', path.join(LAB, 'riverside'), '--backend-name', 'Riverside Allotment Society'], { stdio: 'ignore' });
  for (let i = 0; i < 100 && !(await fetch(club.backend + '/health').catch(() => null))?.ok; i++) await new Promise((r) => setTimeout(r, 200));
}
try {
  const is = { permissions: (await g('/admin/permissions')).config, triggers: (await g('/admin/triggers')).triggers, users: (await g('/admin/users?limit=100')).users.map((u) => ({ id: u.objectId, email: u.email, roles: u.roles })), rows: {} };
  for (const t of Object.keys(was.rows)) is.rows[t] = ((await g(`/api/${t}?limit=500`)).results ?? []).map((r) => r.objectId).sort();
  const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
  const diffs = ['permissions', 'triggers', 'users', 'rows'].filter((k) => JSON.stringify(sorted(is[k])) !== JSON.stringify(sorted(was[k])));
  grade.backendMoved = diffs;
  say(diffs.length ? `the club's backend: ${diffs.join(', ')} differ from the start` : "the club's backend: rules, triggers, people, groups and every row id as they were");
} catch (e) {
  say(`the club's backend wasn't read: ${e.message}`);
}
if (restarted) await stop(restarted);

// 2. the suite on a fresh club
const dir = path.join(labRoot, 'grade', String(Date.now()));
const fresh = await makeMembersLab({ dir });
try {
  const mod = await import(pathToFileURL(path.resolve(adapterPath)).href);
  const make = mod.default ?? mod.adapter;
  const probe = typeof make === 'function' ? await make() : make;
  const edits = typeof probe?.apply === 'function' ? JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', 'phase-124-the-mystery-of-the-backend', 'editor', 'test', 'backend-edits-members.json'), 'utf8')) : [];
  await probe?.close?.();
  grade.offers = { handed: typeof probe?.handed === 'function', apply: typeof probe?.apply === 'function' };
  const r = await runSuite({ adapter: path.resolve(adapterPath), project: fresh.app, backend: fresh.base, token: fresh.token, edits });
  grade.suite = r;
  say(r.line);
  for (const d of r.differences) say(`  ${d}`);
} finally {
  await stop(fresh.child);
}
fs.writeFileSync(path.join(labRoot, 'out', 'day', 'grade.json'), JSON.stringify(grade, null, 2));
