// P127 BKO-009 — a members' club with people in it: a copy of templates/members-area and a backend of its own, filled
// through the app's own doors the way a real club fills it. The association is claimed with the setup token (Ada
// becomes its moderator), three people ask to join, Ada lets two in from her own key, and she posts what members read.
// Used by the stranger round (the lab's app and backend) and by the read half's test.
//
//   node lab.mjs <empty folder> [--port <n>]   leaves the backend running and prints where everything is
//
// The functions are deployed with the training template's own tool (it reads the `__cloud__` folder beside it, so it
// is copied in for the deploy and taken out again): a backend reads no functions from a project's folder.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { backend, asPerson } from '../kit/lib/index.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..', '..', '..');
const TEMPLATE = path.join(REPO, 'templates', 'members-area');
const DEPLOY = path.join(REPO, 'templates', 'digital-bricks-training', 'tools', 'deploy-functions.mjs');
const MAP = path.join(REPO, 'dev-docs', 'tasks', 'phase-124-the-mystery-of-the-backend', 'editor');
export const BACKEND_CLI = path.join(MAP, 'node_modules', '@nodegx', 'preview', 'dist', 'backend', 'cli.js');
export const SETUP_TOKEN = 'bko009-setup-token-riverside';
export const PASSWORD = 'riverside-allotments-2026';

export const PEOPLE = {
  ada: { name: 'Ada Okafor', email: 'ada@riverside.test' },
  ben: { name: 'Ben Hart', email: 'ben@riverside.test', message: 'I have plot 14 and I’d like to read the notices.' },
  chloe: { name: 'Chloé Martin', email: 'chloe@riverside.test', message: 'New to the area, keen to help at work days.' },
  dev: { name: 'Dev Patel', email: 'dev@riverside.test', message: 'On the waiting list for a plot.' }
};

export const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

export const stop = (child) => new Promise((resolve) => (child.exitCode !== null ? resolve() : (child.once('exit', resolve), child.kill())));

async function door(base, fn, body, headers = {}) {
  const r = await fetch(`${base}/functions/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const json = await r.json().catch(() => null);
  if (!r.ok || json?.error) throw new Error(`${fn} said ${r.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

/**
 * The copy, its backend started and filled. `dir` holds the backend's data (and the app, unless `app` names another
 * folder); neither may exist yet with anything in it. With `logFile` the backend writes there and outlives this process
 * (the command line's way); without, it is this process's child.
 */
export async function makeMembersLab({ dir, port, logFile, app = path.join(dir, 'riverside') }) {
  const dataDir = path.join(dir, 'backend-data');
  const token = crypto.randomBytes(16).toString('hex');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.cpSync(TEMPLATE, app, { recursive: true });
  // the association's name is the app's: the folder a person would have
  const pj = JSON.parse(fs.readFileSync(path.join(app, 'nodegx.project.json'), 'utf8'));
  fs.writeFileSync(path.join(dataDir, 'secrets.json'), JSON.stringify({ functions: { ASSOCIATION_SETUP_TOKEN: SETUP_TOKEN } }));

  port ??= await freePort();
  const base = `http://127.0.0.1:${port}`;
  const out = logFile ? fs.openSync(logFile, 'a') : 'pipe';
  const child = spawn(process.execPath, [BACKEND_CLI, 'serve', '--data-dir', dataDir, '--port', String(port), '--token', token, '--project-dir', app, '--backend-name', 'Riverside Allotment Society'], {
    stdio: ['ignore', out, out],
    detached: !!logFile
  });
  let log = '';
  child.stdout?.on('data', (d) => (log += d));
  child.stderr?.on('data', (d) => (log += d));
  let up = false;
  for (let i = 0; i < 100 && !up; i++) {
    up = !!(await fetch(`${base}/health`).catch(() => null))?.ok;
    if (!up) await new Promise((r) => setTimeout(r, 200));
  }
  if (!up) {
    child.kill();
    throw new Error('The backend did not start:\n' + (logFile ? fs.readFileSync(logFile, 'utf8') : log).slice(-2000));
  }

  // the functions: the deploy tool reads the __cloud__ folder beside it
  fs.mkdirSync(path.join(app, 'tools'));
  fs.copyFileSync(DEPLOY, path.join(app, 'tools', 'deploy-functions.mjs'));
  const d = spawnSync(process.execPath, [path.join(app, 'tools', 'deploy-functions.mjs'), '--backend', base, '--token', token, '--bundle', 'members'], { encoding: 'utf8' });
  fs.rmSync(path.join(app, 'tools'), { recursive: true });
  if (d.status !== 0) {
    child.kill();
    throw new Error('Deploying the functions failed:\n' + (d.stdout + d.stderr).slice(-2000));
  }

  // the people, through the app's own doors
  const { ada, ben, chloe, dev } = PEOPLE;
  await door(base, 'claimAssociation', {
    setupToken: SETUP_TOKEN,
    associationName: 'Riverside Allotment Society',
    tagline: 'Forty plots by the river, and the people who grow on them.',
    blurb: 'We look after the allotments on Mill Lane: the plots, the shed, the water and the work days.',
    moderatorName: ada.name,
    email: ada.email,
    password: PASSWORD
  });
  for (const p of [ben, chloe, dev]) await door(base, 'requestAccess', { name: p.name, email: p.email, password: PASSWORD, message: p.message });

  const be = backend(base, token);
  const { users } = await be.get('/admin/users?limit=50');
  const idOf = (email) => users.find((u) => u.email === email)?.objectId;
  const requests = (await be.get('/api/MemberRequest?limit=50')).results ?? [];
  const adaUser = users.find((u) => u.email === ada.email);
  await asPerson(be).withKey(adaUser, async (k) => {
    for (const p of [ben, chloe]) {
      const req = requests.find((r) => r.email === p.email);
      const r = await k.call('decideMembership', { requestId: req.objectId, approve: true });
      if (!r.ok) throw new Error(`Ada letting ${p.name} in: ${r.error}`);
    }
  });

  // what Ada posts on the Post page: the same columns and the same access the page's create nodes write
  const acl = { 'role:admin': { read: true, write: true }, 'role:member': { read: true } };
  const day = (n) => new Date(Date.UTC(2026, 10, n, 9)).toISOString();
  for (const a of [
    { title: 'Water is back on', body: 'The trough by the shed is filled again. Please close the tap after you.', postedAt: day(2) },
    { title: 'Work day on Saturday', body: 'We are clearing the brambles behind plot 30. Bring gloves; tea is on the society.', postedAt: day(4) },
    { title: 'Seed swap', body: 'Leave spare seed in the tin in the shed, labelled with the year.', postedAt: day(6) }
  ])
    await be.post('/api/Announcement', { ...a, ACL: acl });
  for (const m of [
    { title: 'Committee meeting', when: '2026-11-12 19:00', place: 'The community hall', details: 'The water bill and next year’s plot fees.' },
    { title: 'Annual general meeting', when: '2026-12-03 19:30', place: 'The community hall', details: 'Elections and the accounts.' }
  ])
    await be.post('/api/Meeting', { ...m, ACL: acl });

  const people = Object.fromEntries(Object.entries(PEOPLE).map(([k, p]) => [k, { ...p, id: idOf(p.email), roles: users.find((u) => u.email === p.email)?.roles ?? [] }]));
  const after = (await be.get('/admin/users?limit=50')).users;
  for (const p of Object.values(people)) p.roles = after.find((u) => u.objectId === p.id)?.roles ?? [];
  return { app, dataDir, token, base, port, child, people, name: pj.name };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) throw new Error('usage: lab.mjs <empty folder> [--port <n>]');
  const pi = process.argv.indexOf('--port');
  const lab = await makeMembersLab({ dir: path.resolve(dir), port: pi > 0 ? Number(process.argv[pi + 1]) : undefined, logFile: path.join(path.resolve(dir), 'backend.log') });
  fs.writeFileSync(path.join(dir, 'admin-token'), lab.token + '\n');
  console.log(JSON.stringify({ app: lab.app, backend: lab.base, tokenFile: path.join(dir, 'admin-token'), pid: lab.child.pid, people: lab.people }, null, 2));
  lab.child.unref();
}
