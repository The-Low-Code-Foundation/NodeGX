#!/usr/bin/env node
/**
 * PUT THE DEMO BACK (TASK-L179, sprint 51 decision §3.4).
 *
 * From sprint 51 on, what a person does once signed in is SAVED. That is the
 * point, and it means the demo world drifts. This tool owns both halves of
 * getting it back, on NodeGX's own backup (BAK-007) rather than a hand-written
 * wipe:
 *
 *   --seal     the LAST setup step. Takes a backup of a backend that check-seed
 *              says holds exactly the seed, and copies it to
 *              <data dir>/dbt-seed.ngxbackup.tar.gz.
 *   (default)  restores that archive into a STOPPED backend's data dir.
 *
 *   node tools/reset-demo.mjs --seal --backend http://127.0.0.1:8577 --token <admin>
 *   node tools/reset-demo.mjs --data-dir <dir> --backend http://127.0.0.1:8577
 *
 * WHY THE SEAL IS THE LAST STEP, NOT PART OF setup-backend (measured, L179 §1):
 * an archive holds db/local.db, workflows/ (the deployed functions) and the
 * security, email and schema config — and NOT auth.json, where the magic link
 * lives. setup-backend runs before deploy-functions and setup-signin, so an
 * archive taken there predates the functions.
 *
 * WHY IT IS COPIED OUT OF backups/: retention keeps the last 7 and prunes the
 * rest. A seed archive left in the folder disappears after seven more backups,
 * silently, and the reset fails on the day somebody needs it.
 *
 * WHAT IT REFUSES, each by name:
 *   - sealing a backend check-seed fails on (what is sealed must BE the seed)
 *   - sealing over an existing seed archive (delete it by hand, on purpose)
 *   - restoring while the backend answers /health (NodeGX's blessed restore is
 *     the CLI with the service stopped; an HTTP restore swaps files under it)
 *   - restoring anything but <data dir>/dbt-seed.ngxbackup.tar.gz — there is no
 *     archive argument, so it cannot be pointed at somebody's real data
 *   - PostgreSQL: a migrated backend is not file-backed and refuses a backup
 *     (BRG-008, 409). Its reset is START-HERE's, measured in L179 §3.
 *
 * The restore's pre-restore SAFETY SNAPSHOT is NodeGX's and is kept: a reset
 * that threw away the work it replaced could not be undone. It lands in
 * backups/, where retention will eventually prune it like any other backup.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const SEED_ARCHIVE = 'dbt-seed.ngxbackup.tar.gz';
const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : undefined;
};
const BACKEND = arg('backend') && arg('backend').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const fail = (msg, code = 1) => {
  console.error(`reset-demo: ${msg}`);
  process.exit(code);
};

async function answers(url) {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

// ── --seal ───────────────────────────────────────────────────────────────────
if (has('seal')) {
  if (!BACKEND || !TOKEN) fail('--seal needs --backend <url> and --token <admin credential>.', 2);
  if (!(await answers(BACKEND))) fail(`nothing answers at ${BACKEND} — the seal backs up a RUNNING backend.`);

  // The ENGINE first, before check-seed. On PostgreSQL check-seed fails on key
  // ORDER in jsonb (L171, reported to NodeGX), so without this the refusal a
  // developer reads is a wall of reordered facts instead of the real reason:
  // a backend whose rows are not in a file cannot be backed up at all (BRG-008).
  const health = await fetch(`${BACKEND}/health`).then((r) => r.json()).catch(() => ({}));
  const engine = health.persistence && health.persistence.engine;
  if (engine && engine !== 'node:sqlite') {
    fail(
      `this backend runs on ${engine}, and NodeGX backs up only a file-backed (SQLite) backend (BRG-008 — ` +
        'the backup route answers 409). Seal the SQLite backend before migrating; START-HERE has the PostgreSQL reset.'
    );
  }

  const check = spawnSync(process.execPath, [join(here, 'check-seed.mjs'), '--backend', BACKEND, '--token', TOKEN], { encoding: 'utf8' });
  if (check.status !== 0) {
    fail(
      'REFUSED — check-seed does not pass, so this backend is not the seed and sealing it would make ' +
        `the changed world the thing every reset returns to.\n${(check.stdout + check.stderr).trim().split('\n').slice(-4).map((l) => (l.length > 200 ? l.slice(0, 200) + '…' : l)).join('\n')}`
    );
  }

  // Refuse BEFORE taking a backup when the backend already has one to read the
  // data dir off: a refusal that still wrote an archive is not a refusal (the
  // first version did exactly that, measured). A first seal has none, and there
  // is nothing to refuse on then either.
  const listed = await fetch(`${BACKEND}/admin/backups`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    .then((r) => (r.ok ? r.json() : { backups: [] }))
    .catch(() => ({ backups: [] }));
  const known = (listed.backups || []).find((b) => b.path && existsSync(b.path));
  if (known && existsSync(join(dirname(dirname(known.path)), SEED_ARCHIVE))) {
    fail(`REFUSED — ${join(dirname(dirname(known.path)), SEED_ARCHIVE)} already exists. Replacing the seed is deliberate: delete that file by hand first.`);
  }

  const res = await fetch(`${BACKEND}/admin/backups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: '{}'
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 409) {
    fail(
      'this backend is not file-backed (NodeGX BRG-008 — a PostgreSQL backend refuses a backup by design). ' +
        'Seal the SQLite backend before migrating, and reset PostgreSQL the way START-HERE describes.'
    );
  }
  if (!res.ok || !body.archive) fail(`POST /admin/backups → ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  if (!existsSync(body.archive)) {
    fail(`the backend reports its archive at ${body.archive} and this machine cannot read that path — a remote backend is not this tool's.`);
  }
  // <data dir>/backups/<archive> → <data dir>
  const dataDir = dirname(dirname(body.archive));
  const target = join(dataDir, SEED_ARCHIVE);
  if (existsSync(target)) {
    fail(`REFUSED — ${target} already exists. Replacing the seed is deliberate: delete that file by hand first.`);
  }
  copyFileSync(body.archive, target);
  console.log(`reset-demo: sealed. The seed is ${target} (${body.bytes} bytes, ${body.mechanism}); outside backups/, so retention cannot prune it.`);
  process.exit(0);
}

// ── restore ──────────────────────────────────────────────────────────────────
const DATA_DIR = arg('data-dir') && resolve(arg('data-dir'));
if (!DATA_DIR) fail('pass --data-dir <the backend\'s data directory> (and --backend <url>, so the tool can check it is stopped).', 2);
const archive = join(DATA_DIR, SEED_ARCHIVE);
if (!existsSync(archive)) fail(`no seed archive at ${archive}. Seal one first: reset-demo --seal --backend <url> --token <admin>.`);

if (BACKEND) {
  if (await answers(BACKEND)) fail(`REFUSED — ${BACKEND} is answering. Stop the backend first; a restore swaps its files.`);
} else {
  console.log('reset-demo: no --backend given, so this trusts you that the backend is stopped.');
}

const BIN = arg('nodegx-backend') || process.env.NODEGX_BACKEND_BIN || resolve(TEMPLATE, '..', '..', 'packages', 'nodegx-backend', 'bin', 'nodegx-backend.js');
if (!existsSync(BIN)) fail(`no nodegx-backend at ${BIN} — pass --nodegx-backend <path to bin/nodegx-backend.js>.`, 2);

const run = spawnSync(process.execPath, [BIN, 'restore', archive, '--data-dir', DATA_DIR], { encoding: 'utf8' });
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);
if (run.status !== 0) fail(`nodegx-backend restore exited ${run.status}; the data dir is as NodeGX left it.`);
const safety = (run.stdout.match(/pre-restore safety snapshot: (.+)/) || [])[1];
console.log(
  `reset-demo: the demo is back to the seed. Start the backend and run check-seed to see it.` +
    (safety ? ` What it replaced is kept at ${safety.trim()}.` : '')
);
