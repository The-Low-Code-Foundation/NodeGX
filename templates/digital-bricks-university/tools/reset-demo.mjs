#!/usr/bin/env node
/**
 * ONE COMMAND: A FRESH LOCAL BACKEND HOLDING THE DEMO WORLD (DBU-01).
 *
 *   node tools/reset-demo.mjs            stop it, wipe it, start it, fill it, check it
 *   node tools/reset-demo.mjs --stop     just stop it
 *
 *   --keep-mail                leave the Mailpit inbox as it is (tools/check-mail.mjs, on a scratch --root/--port)
 *   --mail-hold-seconds <n>    passed to setup-signin (check-mail only; the app's hold is 5 minutes)
 *
 * Steps: stop the backend this tool started (its pid file) → wipe its data dir →
 * make sure the mail sandbox runs (Mailpit in Docker, `dbu-mailpit`: SMTP
 * 127.0.0.1:1028, inbox http://127.0.0.1:8028; emptied on every reset) →
 * start nodegx-backend detached on 127.0.0.1:8595 → setup-backend (schema,
 * policy, users, private files, rows) → deploy-functions → setup-signin (magic
 * links, the app's origin http://127.0.0.1:8596, mail) → check-seed → the morning round, fired once (DBU-08:
 * the quiet learner reaches the inbox, and the digest reaches Mailpit) → the check-in send, fired once (DBU-10).
 *
 * The app itself is served by NodeGX's preview harness, which reloads as the
 * project changes (tools/serve-app.mjs; the redirect allow-list names its port).
 *
 * WHY A REBUILD, NOT A RESTORE: the reference template seals a backup and
 * restores it. Rebuilding is as quick here, and it re-dates the world: every
 * fixture time is an offset from today, so a reset is always "now".
 *
 * WHAT IT REFUSES:
 *  - a port already answering that this tool did not start (somebody else's backend)
 *  - wiping a folder it did not create (no `.dbu-demo` marker in --root)
 *
 * Everything lives in ~/.nodegx/dbu-demo (tools/lib/local.mjs): never in the repo,
 * never anything but this demo.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP, BACKEND, DATA_DIR, LOG_FILE, MAILPIT, PID_FILE, PORT, ROOT, TOKEN_FILE, answers, arg, backendBin, has } from './lib/local.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const MARKER = join(ROOT, '.dbu-demo');
const fail = (msg, code = 1) => {
  console.error(`reset-demo: ${msg}`);
  process.exit(code);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

async function stop() {
  const pid = existsSync(PID_FILE) ? Number(readFileSync(PID_FILE, 'utf8')) : 0;
  if (pid && alive(pid)) {
    const cmd = spawnSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).stdout || '';
    if (!cmd.includes(DATA_DIR)) fail(`pid ${pid} in ${PID_FILE} is not our backend (${cmd.trim().slice(0, 120)}). Remove the pid file if it is stale.`);
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 50 && alive(pid); i++) await sleep(100);
    if (alive(pid)) process.kill(pid, 'SIGKILL');
    console.log(`reset-demo: stopped the backend (pid ${pid}).`);
  }
  rmSync(PID_FILE, { force: true });
  if (await answers()) fail(`${BACKEND} still answers, and it is not a backend this tool started. Stop it, or pass --port <another>.`);
}

if (existsSync(ROOT) && !existsSync(MARKER) && readdirSync(ROOT).length) {
  fail(`${ROOT} exists, is not empty, and was not made by this tool (no .dbu-demo marker). Refusing to touch it; pass --root <another folder>.`);
}
mkdirSync(ROOT, { recursive: true });
writeFileSync(MARKER, 'Made by digital-bricks-university app/tools/reset-demo.mjs. Safe to delete.\n');

await stop();
if (has('stop')) process.exit(0);

// The mail sandbox: a container of our own, so another project's catcher on 1025 is never ours to read.
const docker = (...a) => spawnSync('docker', a, { encoding: 'utf8' });
if (docker('version', '--format', '{{.Server.Version}}').status !== 0) fail('Docker is not running, and the mail sandbox (Mailpit) needs it.');
const running = docker('ps', '--filter', `name=^${MAILPIT.name}$`, '--format', '{{.Names}}').stdout.trim();
if (!running) {
  docker('rm', '-f', MAILPIT.name);
  const r = docker('run', '-d', '--name', MAILPIT.name, '-p', `127.0.0.1:${MAILPIT.smtpPort}:1025`, '-p', `127.0.0.1:${MAILPIT.webPort}:8025`, 'axllent/mailpit');
  if (r.status !== 0) fail(`could not start Mailpit: ${r.stderr.trim()}`);
  for (let i = 0; i < 50; i++) {
    if (await fetch(`${MAILPIT.web}/api/v1/info`).then((r) => r.ok, () => false)) break;
    await sleep(200);
  }
  console.log(`reset-demo: started Mailpit (${MAILPIT.name}), inbox at ${MAILPIT.web}.`);
}
if (!has('keep-mail')) await fetch(`${MAILPIT.web}/api/v1/messages`, { method: 'DELETE' }).catch(() => {});

// Wipe and start
rmSync(DATA_DIR, { recursive: true, force: true });
mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(TOKEN_FILE)) writeFileSync(TOKEN_FILE, randomBytes(24).toString('hex') + '\n', { mode: 0o600 });
const TOKEN = readFileSync(TOKEN_FILE, 'utf8').trim();

const log = openSync(LOG_FILE, 'w');
const child = spawn(
  process.execPath,
  [backendBin(), 'serve', '--data-dir', DATA_DIR, '--port', String(PORT), '--host', '127.0.0.1', '--token', TOKEN,
    '--project-dir', APP, '--backend-name', 'Digital Bricks University'],
  // Cron runs in the backend process's zone (PLATFORM.md feature 2): the coach's zone, as production will.
  { detached: true, stdio: ['ignore', log, log], env: { ...process.env, TZ: 'Europe/Paris' } }
);
child.unref();
writeFileSync(PID_FILE, String(child.pid));
let up = false;
for (let i = 0; i < 100 && !up; i++) {
  await sleep(200);
  if (!alive(child.pid)) fail(`the backend exited at start. Its log: ${LOG_FILE}\n${readFileSync(LOG_FILE, 'utf8').slice(-1500)}`);
  up = await answers();
}
if (!up) fail(`the backend did not answer within 20 s. Its log: ${LOG_FILE}`);
console.log(`reset-demo: backend up at ${BACKEND} (pid ${child.pid}, data ${DATA_DIR}).`);

// Fill and check
const env = { ...process.env, DBU_ROOT: ROOT, DBU_BACKEND: BACKEND, NODEGX_ADMIN_TOKEN: TOKEN };
if (arg('mail-hold-seconds') !== undefined) env.DBU_MAIL_HOLD_SECONDS = arg('mail-hold-seconds');
for (const tool of ['setup-backend.mjs', 'deploy-functions.mjs', 'setup-signin.mjs', 'check-seed.mjs']) {
  const r = spawnSync(process.execPath, [join(here, tool)], { stdio: 'inherit', env });
  if (r.status !== 0) fail(`${tool} failed (exit ${r.status}). The backend is still running; its log is ${LOG_FILE}.`);
}

// DBU-08: the daily round once now, so the seed's quiet learner (Mei) is in the inbox at once and the morning
// digest goes to Mailpit. A fresh backend never fired the schedule, so run-once-on-start would not.
const round = await fetch(`${BACKEND}/admin/triggers/morning-round/fire`, {
  method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: '{}'
});
const roundBody = await round.text();
if (!round.ok || !roundBody.includes('"fired":true')) fail(`the morning round did not run: ${round.status} ${roundBody.slice(0, 300)}`);
let said = {};
try { said = JSON.parse(JSON.parse(roundBody).response?.body || '{}').result || {}; } catch { /* the line below says less */ }
console.log(`reset-demo: morning round fired (quiet raised ${said.raised ?? '?'}, closed ${said.closed ?? '?'}; digest: ${said.digest ?? '?'}).`);

// DBU-10: the check-in send once now, for the same reason. The seed's check-ins are already sent, answered
// or not yet due, so this sends nothing; it proves the schedule's function answers.
const send = await fetch(`${BACKEND}/admin/triggers/send-checkins/fire`, {
  method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: '{}'
});
const sendBody = await send.text();
if (!send.ok || !sendBody.includes('"fired":true') || !sendBody.includes('"ok":true')) fail(`the check-in send did not run: ${send.status} ${sendBody.slice(0, 300)}`);
let sentSaid = {};
try { sentSaid = JSON.parse(JSON.parse(sendBody).response?.body || '{}').result || {}; } catch { /* the line below says less */ }
console.log(`reset-demo: check-in send fired (sent ${sentSaid.sent ?? '?'}, mailed ${sentSaid.mailed ?? '?'}, left ${sentSaid.unsent ?? '?'}).`);

console.log(
  `\nreset-demo: done. The demo world is at ${BACKEND}.\n` +
    `  admin credential: ${TOKEN_FILE}   log: ${LOG_FILE}\n` +
    `  the app:          node tools/serve-app.mjs   (then http://127.0.0.1:8596)\n` +
    `  mail:             ${MAILPIT.web}\n` +
    `  security gate:    node tools/check-security.mjs\n` +
    `  stop it:          node tools/reset-demo.mjs --stop`
);
