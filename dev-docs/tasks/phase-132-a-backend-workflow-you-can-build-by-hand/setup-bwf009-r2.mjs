// P132 BWF-009, the setup for Richard's sitting (parts 1 and 3; s22 "Next" 1, BOARD §1a S7), in one run:
//   node setup-bwf009-r2.mjs [--again]
// 1. a Greenhouse copy at `NodeGX test projects/Greenhouse BWF-009`, named so, with an id of its own (a copy that
//    keeps the original's id and name is handed the ORIGINAL's backend by provisionFor's reuse: name + owner), WITHOUT
//    the two workflows briefs 1 and 2 ask for (The morning check, When a plant is watered) and their triggers
//    (agent-round-bwf009.mjs's REMOVE, the same lines);
// 2. its backend made by Studio's `provisionFor` with NO NODEGX_BACKENDS_DIR, so it lives in ~/.noodl/backends where
//    Studio and the NodeGX editor both find it and the second app adopts the first's (s21); the backend seeds the
//    remaining workflows from the file on its first start (BKO-001);
// 3. the SMTP catcher (smtp-catcher.mjs, installed to ~/.noodl/bwf009-r2/) on 127.0.0.1:1025, its page on :8025,
//    and the backend's Email settings pointed at it; a test email sent through the backend and read back;
// 4. three plants (Fern 5 days dry, Cactus 10, Basil 1: agent-round-bwf009.mjs's), the functions deployed;
// 5. Studio's server stopped (its backend with it), started again as Studio's window would start it, and everything
//    read back, then stopped: nothing of the backend is left running;
// 6. a double-clickable `Greenhouse BWF-009 — open in Studio.app` beside the copy: it starts the catcher if it is not
//    up, and Studio from its checkout with NODEGX_REPO (Studio from the kit, backend 0.2.9, has no formulas or tests).
// Studio's serve.mjs here is the page server Studio's window runs, headless: no window opens. `--again` deletes a
// previous copy and the backend it owns (refused while that backend runs) and starts over.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const STUDIO = '/Users/richardosborne/vscode_projects/nodegx-studio';
const SRC = '/Users/richardosborne/vscode_projects/NodeGX test projects/Greenhouse';
const NAME = 'Greenhouse BWF-009';
const GH = path.join(path.dirname(SRC), NAME);
const LAUNCHER = path.join(path.dirname(SRC), `${NAME} — open in Studio.app`);
const STATE = path.join(os.homedir(), '.noodl', 'bwf009-r2');
const BACKENDS = path.join(os.homedir(), '.noodl', 'backends');
const SMTP = 1025, WEB = 8025;
const REMOVE = ['morning-check', 'when-watered'];
const say = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const listening = (port) => { try { return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim(); } catch { return ''; } };
// the env every child gets: the checkout's kit, and NEVER a backends override (the point of this setup)
const env = { ...process.env, NODEGX_REPO: REPO };
delete env.NODEGX_BACKENDS_DIR; delete env.ELECTRON_RUN_AS_NODE;

fs.mkdirSync(STATE, { recursive: true });

// --- 0. a previous copy: kept unless --again (Richard's sitting may be in it)
if (fs.existsSync(GH)) {
  if (!process.argv.includes('--again')) throw new Error(`${GH} exists (Richard's sitting may be in it). --again deletes it and its backend.`);
  const pj = JSON.parse(fs.readFileSync(path.join(GH, 'nodegx.project.json'), 'utf8'));
  const id = pj.metadata?.cloudservices?.instanceId;
  const cfgAt = id && path.join(BACKENDS, id, 'config.json');
  if (cfgAt && fs.existsSync(cfgAt)) {
    const cfg = JSON.parse(fs.readFileSync(cfgAt, 'utf8'));
    if (cfg.name !== `${NAME} backend` || !(cfg.projectIds ?? []).includes(pj.id)) throw new Error(`${id} is not this copy's own backend (${cfg.name}, ${cfg.projectIds}): left alone, nothing deleted`);
    if (listening(cfg.port)) throw new Error(`${id} runs on ${cfg.port} (Studio or the editor has the copy open): close it first`);
    fs.rmSync(path.join(BACKENDS, id), { recursive: true, force: true });
    say('deleted backend', id);
  }
  fs.rmSync(GH, { recursive: true, force: true });
  say('deleted copy', GH);
}

// --- 1. the copy
fs.cpSync(SRC, GH, { recursive: true, filter: (p) => !/\/(\.git|node_modules|\.nodegx)(\/|$)/.test(p) });
{
  const at = path.join(GH, 'nodegx.project.json'), pj = JSON.parse(fs.readFileSync(at, 'utf8'));
  delete pj.metadata.cloudservices; delete pj.metadata.cloudservicesLive;
  delete pj.id; // provisionFor's ensureProjectId mints one
  pj.name = NAME;
  fs.writeFileSync(at, JSON.stringify(pj, null, 2));
  const aat = path.join(GH, 'nodegx.automations.json'), auto = JSON.parse(fs.readFileSync(aat, 'utf8'));
  auto.workflows = auto.workflows.filter((w) => !REMOVE.includes(w.id));
  auto.triggers = auto.triggers.filter((t) => !REMOVE.includes(t.target?.name));
  fs.writeFileSync(aat, JSON.stringify(auto, null, 2) + '\n');
  say('copy', GH, '| workflows', JSON.stringify(auto.workflows.map((w) => w.id)), '| triggers', JSON.stringify(auto.triggers.map((t) => t.name)));
}

// --- 3a. the catcher, installed where it outlives this worktree, started unless it is up
fs.copyFileSync(new URL('./smtp-catcher.mjs', import.meta.url), path.join(STATE, 'smtp-catcher.mjs'));
const startCatcher = () => {
  if (listening(SMTP)) return say('catcher already up:', listening(SMTP).split('\n')[1]);
  const log = fs.openSync(path.join(STATE, 'catcher.log'), 'a');
  const c = spawn(process.execPath, [path.join(STATE, 'smtp-catcher.mjs'), '--dir', STATE, '--smtp', String(SMTP), '--web', String(WEB)], { detached: true, stdio: ['ignore', log, log] });
  c.unref();
  say('catcher started, pid', c.pid);
};
startCatcher();

// --- 2. the backend, made by Studio's provisionFor in a process of its own (its exit hooks stop what it started)
say('provision', execFileSync(process.execPath, ['--input-type=module', '-e',
  `const b = await import(${JSON.stringify(path.join(STUDIO, 'lib/backend.mjs'))}); console.log(JSON.stringify(await b.provisionFor(${JSON.stringify(GH)}))); process.exit(0);`], { env, encoding: 'utf8' }).trim());
const binding = JSON.parse(fs.readFileSync(path.join(GH, 'nodegx.project.json'), 'utf8')).metadata.cloudservices;
const cfg = JSON.parse(fs.readFileSync(path.join(BACKENDS, binding.instanceId, 'config.json'), 'utf8'));
say('bound', JSON.stringify(binding), '| backend folder', path.join(BACKENDS, binding.instanceId), '| owner', JSON.stringify(cfg.projectIds));

// Studio's page server on the copy: starts the bound backend as Studio's window does
async function studioServer(label) {
  const logAt = path.join(STATE, `serve-${label}.log`), out = fs.openSync(logAt, 'w');
  const serve = spawn(process.execPath, [path.join(STUDIO, 'editor/serve.mjs'), GH], { env, stdio: ['ignore', out, out] });
  let url = null;
  for (let i = 0; i < 120 && !url; i++) { await wait(500); url = /nodegx-studio: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(fs.readFileSync(logAt, 'utf8'))?.[1]; }
  if (!url) throw new Error('serve.mjs never said where it is: ' + logAt);
  const api = async (p, init = {}) => { const r = await fetch(url + p.replace(/^\//, ''), { headers: { 'content-type': 'application/json' }, ...init }); return { status: r.status, json: await r.json().catch(() => null) }; };
  let status;
  for (let i = 0; i < 120 && !/running|adopted/.test((status = (await api('/api/backend-status')).json)?.phase); i++) await wait(500);
  say(`[${label}] studio server`, url, 'pid', serve.pid, '| backend', JSON.stringify(status));
  const stop = async () => {
    serve.kill('SIGTERM');
    for (let i = 0; i < 40 && listening(cfg.port); i++) await wait(250);
    say(`[${label}] studio server stopped; backend port ${cfg.port} listening after:`, listening(cfg.port) ? 'YES' : 'no');
  };
  return { api, stop };
}
const mailNow = async () => (await (await fetch(`http://127.0.0.1:${WEB}/mail.json`)).json());
async function readBack(api, label) {
  const plants = (await api('/api/backend/classes/Plant?order=name')).json?.results ?? [];
  say(`[${label}] plants`, plants.length, JSON.stringify(plants.map((p) => [p.name, p.lastWatered?.iso?.slice(0, 10)])));
  const defs = (await api('/api/backend/admin/workflow-defs')).json;
  say(`[${label}] workflows on the backend`, JSON.stringify((defs?.workflows ?? []).map((w) => w.id)), '| removed ones present:', REMOVE.filter((id) => (defs?.workflows ?? []).some((w) => w.id === id)).length);
  const trg = (await api('/api/backend/admin/triggers')).json;
  say(`[${label}] triggers on the backend`, JSON.stringify((trg?.triggers ?? trg ?? []).map?.((t) => [t.name, t.enabled])));
  const email = (await api('/api/backend/admin/email/config')).json;
  say(`[${label}] email config`, JSON.stringify(email));
  return { plants, defs, email };
}

// --- 4 + 3b. first open: deploy, plants, SMTP, a test email
{
  const { api, stop } = await studioServer('setup');
  try {
    say('deploy', JSON.stringify((await api('/api/functions/deploy', { method: 'POST' })).json).slice(0, 300));
    const daysAgo = (d) => ({ __type: 'Date', iso: new Date(Date.now() - d * 86400000).toISOString() });
    for (const [name, days, every] of [['Fern', 5, 3], ['Cactus', 10, 14], ['Basil', 1, 2]]) {
      const r = await api('/api/backend/classes/Plant', { method: 'POST', body: JSON.stringify({ name, room: 'Kitchen', waterEvery: every, lastWatered: daysAgo(days), thirsty: days >= every }) });
      say('plant', name, r.status, JSON.stringify(r.json));
    }
    const put = await api('/api/backend/admin/email/config', { method: 'PUT', body: JSON.stringify({ enabled: true, smtp: { host: '127.0.0.1', port: SMTP, secure: false, username: '' }, fromAddress: 'greenhouse@greenhouse.test', fromName: 'Greenhouse' }) });
    say('smtp set', put.status, JSON.stringify(put.json).slice(0, 300));
    const before = (await mailNow()).length;
    const sent = await api('/api/backend/admin/email/test', { method: 'POST', body: JSON.stringify({ to: 'gardener@example.com' }) });
    say('test email', sent.status, JSON.stringify(sent.json).slice(0, 300));
    await wait(500);
    const mail = await mailNow();
    say('caught', mail.length - before, 'new:', JSON.stringify(mail.slice(before).map((m) => ({ to: m.to, subject: m.subject }))));
    await readBack(api, 'setup');
  } finally { await stop(); }
}

// --- 5. the second open, as Studio's window would: everything still there
{
  const { api, stop } = await studioServer('reopen');
  try { await readBack(api, 'reopen'); } finally { await stop(); }
}

// --- 6. the launcher: a shell script in STATE, and an app that runs it (no terminal)
const NODE = process.execPath;
const sh = `#!/bin/sh
# P132 BWF-009 (written by setup-bwf009-r2.mjs): the SMTP catcher if it is not up, then Studio from its checkout on the
# Greenhouse BWF-009 copy with NODEGX_REPO (Studio from the kit runs backend 0.2.9: no formulas, no tests).
# NODEGX_BWF009_NO_STUDIO=1 starts the catcher only.
export PATH="${path.dirname(NODE)}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
D="${STATE}"
if ! lsof -nP -iTCP:${SMTP} -sTCP:LISTEN >/dev/null 2>&1; then
  nohup "${NODE}" "$D/smtp-catcher.mjs" --dir "$D" --smtp ${SMTP} --web ${WEB} >> "$D/catcher.log" 2>&1 &
fi
[ -n "$NODEGX_BWF009_NO_STUDIO" ] && exit 0
cd "${STUDIO}" || exit 1
unset ELECTRON_RUN_AS_NODE NODEGX_BACKENDS_DIR
NODEGX_REPO="${REPO}" nohup "${NODE}" app/launch.mjs "${GH}" >> "$D/studio.log" 2>&1 &
`;
fs.writeFileSync(path.join(STATE, 'open-studio.sh'), sh, { mode: 0o755 });
fs.rmSync(LAUNCHER, { recursive: true, force: true });
execFileSync('osacompile', ['-o', LAUNCHER, '-e', `do shell script quoted form of ${JSON.stringify(path.join(STATE, 'open-studio.sh'))} & " > /dev/null 2>&1 &"`]);
say('launcher', LAUNCHER, '→', path.join(STATE, 'open-studio.sh'));
say('catcher', `http://127.0.0.1:${WEB}/`, 'pid', fs.readFileSync(path.join(STATE, 'catcher.pid'), 'utf8'));
process.exit(0);
