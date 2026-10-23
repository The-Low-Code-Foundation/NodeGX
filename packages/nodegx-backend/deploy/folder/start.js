#!/usr/bin/env node
/**
 * Starts this NodeGX app: its backend, which also serves the app, on one port.
 *
 *   node start.js                first free port from 3000 up
 *   node start.js --port 8090    exactly 8090, or stop and say it is taken
 *   PORT=8090 node start.js      the same, for hosts that set PORT
 *   node start.js --data-dir /var/lib/my-app/data   keep the data outside this folder (a server
 *                                whose app folder is read-only; a mounted volume)
 *   node start.js --check --data-dir <dir>   say what a start would do with the rules, or refuse
 *                                as a start would; writes nothing and starts nothing (a server's
 *                                provisioning asks this before it replaces a running app)
 *
 * Every other option goes to the backend as it is (`node backend/cli.js help` lists them).
 *
 * Written by a NodeGX full-stack deploy (P26 DEP-002), and rewritten by the next one: change the
 * project and deploy again rather than editing this file.
 *
 * What it does, in order:
 *
 *   1. Checks this Node can keep the data (`node:sqlite`, built in from Node 22.13), and says so in
 *      a sentence when it cannot — never a stack trace about a missing built-in module.
 *   2. Picks the port by `app/serve.js`'s rule: the one asked for or a refusal naming it, else the
 *      first free from 3000, where free means 127.0.0.1 AND ::1 can both be bound, so
 *      `localhost:<port>` reaches this app and not another program.
 *   3. Installs the cloud functions this deploy carries (`backend/workflows/`) into `data/`,
 *      replacing the ones the previous deploy installed. The deploy is their source, as a push from
 *      the editor is; a function deleted from the project is gone after the next deploy.
 *   4. Installs the project's access rules (`backend/nodegx.security.json`) when this deploy brings
 *      rules other than the ones the last deploy installed: on the first start, and after a deploy
 *      that changed them, the backend's `data/security.json` is moved aside
 *      (`security.json.before-<time>`) and the backend installs the project's. A restart, or a deploy
 *      with the same rules, leaves `data/security.json` as it is (Richard, 2026-10-23: a reship
 *      brings the project's rules; an edit made on the server lasts until the project's change).
 *   5. Refuses rules that are switched off (`"devOpen": true`), which is how a development backend's
 *      data arrives — and the backend's own interlock only refuses that on a public bind, while this
 *      app is usually behind a proxy on 127.0.0.1. Refused before anything in the data is changed.
 *   6. Runs the backend in this process with the app beside its API (`--serve-app`) and the access
 *      rules enforced from the first record (`--enforce-rules`).
 *
 * `data/` (or the `--data-dir` given) is the app's: its database, uploads, the admin credential. A
 * deploy never writes there; this script writes only the functions and the rules described above.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');

const HERE = __dirname;
const APP = path.join(HERE, 'app');
const BACKEND = path.join(HERE, 'backend');
const DEFAULT_DATA = path.join(HERE, 'data');
const POLICY_FILE = 'nodegx.security.json';
/** The backend's own rules file, in the data folder. */
const BACKEND_RULES = 'security.json';
/** Which rules the last deploy installed (their checksum), in the data folder. */
const RULES_MARKER = 'deployed-rules.json';
const WORKFLOW_SUFFIX = '.workflow.json';

/** The Node this app needs, and the one property that decides it. */
const NODE_NEEDED = '22.13';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * 🔴 The property, not a version table: Node 22.5–22.12 has `node:sqlite` behind a flag, 20 has
 * none, and a version comparison would have to know both. Loading it answers for every one.
 */
function checkNode() {
  try {
    require('node:sqlite');
  } catch {
    fail(
      `This app needs Node.js ${NODE_NEEDED} or later. It keeps its data with node:sqlite, which is built into ` +
        `Node from ${NODE_NEEDED}, and this computer has Node ${process.version}.\n` +
        'Install a current Node from https://nodejs.org and run this again.'
    );
  }
}

/** The options this script reads itself; everything else is the backend's. */
const OWN_OPTIONS = ['--port', '-p', '--data-dir'];

/** `--port N`, `--port=N`, `-p N` and `--data-dir` (either form) are this script's. */
function withoutOwnArgs(argv) {
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (OWN_OPTIONS.includes(argv[i])) {
      i++;
      continue;
    }
    if (OWN_OPTIONS.some((option) => argv[i].startsWith(`${option}=`))) continue;
    rest.push(argv[i]);
  }
  return rest;
}

/**
 * `--data-dir <dir>` or `--data-dir=<dir>`, resolved from where the command was run; `data/` beside
 * this file when it is not given. The functions are installed THERE and the backend keeps its
 * records there, so a folder whose data lives elsewhere never grows a second `data/`.
 */
function readDataDir(argv) {
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i] === '--data-dir' ? argv[i + 1] : argv[i].startsWith('--data-dir=') ? argv[i].slice(11) : null;
    if (value === null) continue;
    if (!value) throw new Error('--data-dir wants a folder, and got nothing.');
    return path.resolve(value);
  }
  return DEFAULT_DATA;
}

// ── The port: `serve.js`'s rule, copied ─────────────────────────────────────────────────────────
// ⚠️ A copy of `listenOnFreePort` in the deploy runtime's `serve.js` (noodl-viewer-react
// `static/deploy/`), not a require of `app/serve.js`. This file ships with the BACKEND, and an app
// deployed by an older runtime has no `serve.js` with that function in it; a launcher that needs the
// app's runtime to be new enough fails for a reason that has nothing to do with the backend. Same
// rule, same sentences. Change one, change both.

const DEFAULT_PORT = 3000;
const PORTS_TO_TRY = 50;

/** `--port N`, `--port=N`, `-p N`, or `PORT`; null when nothing was asked. A flag wins. */
function readPortArg(argv, env) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') return parsePort(argv[i + 1], arg);
    if (arg.startsWith('--port=')) return parsePort(arg.slice('--port='.length), '--port');
  }
  if (env.PORT !== undefined && env.PORT !== '') return parsePort(env.PORT, 'PORT');
  return null;
}

function parsePort(value, from) {
  const port = Number(value);
  if (value === undefined || !/^\d+$/.test(String(value)) || port > 65535) {
    throw new Error(`${from} wants a port number between 1 and 65535, and got "${value ?? ''}".`);
  }
  return { port, from };
}

/** Whether `host:port` can be bound right now. A host this machine does not have counts as free. */
function canBind(port, host) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', (error) => resolve(error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT'));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen({ port, host, exclusive: true });
  });
}

async function loopbackFree(port) {
  return (await canBind(port, '127.0.0.1')) && (await canBind(port, '::1'));
}

function takenMessage(asked) {
  const how = asked.from === 'PORT' ? `PORT=${asked.port}` : `${asked.from} ${asked.port}`;
  return (
    `Port ${asked.port} is already in use by another program (you asked for it with ${how}).\n` +
    `Leave the port out to use the first free one from ${DEFAULT_PORT}, or choose another, e.g. --port ${
      asked.port + 1
    }.`
  );
}

/**
 * The port the backend is to listen on. Asked for one: that one, or an error naming it — never a
 * different one, because a host that set `PORT` sends its traffic to exactly that port. Asked for
 * nothing: the first free from 3000, else 0 (the system picks; the backend prints what it got).
 */
async function choosePort(argv, env) {
  const asked = readPortArg(argv, env);
  if (asked) {
    if (asked.port !== 0 && !(await loopbackFree(asked.port))) throw new Error(takenMessage(asked));
    return asked.port;
  }
  for (let port = DEFAULT_PORT; port < DEFAULT_PORT + PORTS_TO_TRY && port <= 65535; port++) {
    if (await loopbackFree(port)) return port;
  }
  return 0;
}

/**
 * Replace the installed cloud functions with the ones this deploy carries. Returns the files: one
 * per project (`<project>.workflow.json`), each holding all of its functions.
 */
function installFunctions(dataDir) {
  const from = path.join(BACKEND, 'workflows');
  const to = path.join(dataDir, 'workflows');
  const carried = fs.existsSync(from) ? fs.readdirSync(from).filter((f) => f.endsWith(WORKFLOW_SUFFIX)) : [];
  if (carried.length === 0 && !fs.existsSync(to)) return carried;
  fs.mkdirSync(to, { recursive: true });
  for (const old of fs.readdirSync(to).filter((f) => f.endsWith(WORKFLOW_SUFFIX))) {
    fs.unlinkSync(path.join(to, old));
  }
  for (const file of carried) fs.copyFileSync(path.join(from, file), path.join(to, file));
  return carried;
}

/**
 * What to do with the access rules, decided before anything is written:
 *
 *   none       the deploy ships no rules; the backend keeps (or mints) its own
 *   unchanged  the rules this deploy ships are the ones the last deploy installed
 *   install    the backend has no rules yet (a first start): it installs the project's
 *   replace    the backend has rules, and this deploy ships different ones (or no deploy recorded
 *              which it installed — a box from before this file existed)
 *
 * A rules file that is not JSON stops here, before the backend's rules are moved; the backend
 * validates the rest when it installs them, in its own words.
 */
function planRules(dataDir) {
  const shipped = path.join(BACKEND, POLICY_FILE);
  const current = path.join(dataDir, BACKEND_RULES);
  if (!fs.existsSync(shipped)) return { action: 'none', current };
  const bytes = fs.readFileSync(shipped);
  let config;
  try {
    config = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    fail(
      `This deploy's access rules (backend/${POLICY_FILE}) are not valid JSON: ${error.message}. Deploy the project again.`
    );
  }
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  let installed = null;
  try {
    installed = JSON.parse(fs.readFileSync(path.join(dataDir, RULES_MARKER), 'utf8')).sha256;
  } catch {
    installed = null;
  }
  let action = 'replace';
  if (!fs.existsSync(current)) action = 'install';
  else if (installed === sha256) action = 'unchanged';
  return { action, current, shipped, config, sha256 };
}

/** Carry out the plan. Returns where the previous rules were moved, when they were. */
function applyRules(plan, dataDir) {
  if (plan.action !== 'install' && plan.action !== 'replace') return null;
  let movedTo = null;
  if (plan.action === 'replace') {
    movedTo = `${plan.current}.before-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.renameSync(plan.current, movedTo);
  }
  fs.writeFileSync(
    path.join(dataDir, RULES_MARKER),
    JSON.stringify({ sha256: plan.sha256, installedAt: new Date().toISOString() }, null, 2) + '\n'
  );
  return movedTo;
}

/**
 * 🔴 A data folder with `"devOpen": true` is refused. Dev-open turns every access rule off, and the
 * backend's interlock (BAK-003) refuses it only when the bind is not loopback — but a deployed
 * folder normally binds 127.0.0.1 with a proxy in front, so the interlock never fires and the app
 * is public with no rules at all (P26-VMOPEN: OWN-016's VM layout ran exactly that way). A first
 * start mints `devOpen: false` (`--enforce-rules`), so only data brought from elsewhere trips this.
 * The rules checked are the ones that WILL be enforced: the project's when this start installs
 * them, else the backend's. An unreadable file is left to the backend, which refuses it.
 */
function refuseDevOpen(plan) {
  const installing = plan.action === 'install' || plan.action === 'replace';
  if (installing) {
    if (plan.config && plan.config.devOpen === true) {
      fail(
        `This deploy's access rules are switched off: backend/${POLICY_FILE} has "devOpen": true. With them off, ` +
          'anyone who can reach the app reads and changes every record, every account included, so a deployed app ' +
          'does not start that way.\n' +
          `Set "devOpen": false in the project's ${POLICY_FILE} and deploy again.`
      );
    }
    return;
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(plan.current, 'utf8'));
  } catch {
    return;
  }
  if (!config || config.devOpen !== true) return;
  fail(
    `This app's access rules are switched off: ${plan.current} has "devOpen": true. With them off, anyone who can ` +
      'reach the app reads and changes every record, every account included, so a deployed app does not start ' +
      'that way.\n' +
      'That data folder most likely came from a development backend. Set "devOpen": false in that file and ' +
      "start this again (or ship the project's own rules); the rules written in the file then apply."
  );
}

/** The `[start]` line for the rules. */
function describeRules(plan, movedTo) {
  switch (plan.action) {
    case 'none':
      return "[start] access rules: this deploy carries none; the backend's own apply\n";
    case 'unchanged':
      return `[start] access rules: data/${BACKEND_RULES}, unchanged (this deploy's are the ones already installed)\n`;
    case 'install':
      return `[start] access rules: installing this deploy's backend/${POLICY_FILE}\n`;
    default:
      return (
        `[start] access rules: replaced with this deploy's backend/${POLICY_FILE}; the previous ones are kept ` +
        `as ${movedTo}\n`
      );
  }
}

/** The project's name, as the deploy wrote it into `package.json`; `/health` reports it. */
function appName() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(HERE, 'package.json'), 'utf8'));
    return pkg.nodegx && typeof pkg.nodegx.name === 'string' && pkg.nodegx.name ? pkg.nodegx.name : null;
  } catch {
    return null;
  }
}

async function main() {
  checkNode();
  if (!fs.existsSync(path.join(APP, 'index.html'))) {
    fail(`This folder has no app/index.html, so there is no app to serve. Deploy the project again.`);
  }
  if (!fs.existsSync(path.join(BACKEND, 'cli.js'))) {
    fail(`This folder has no backend/cli.js, so there is no backend to start. Deploy the project again.`);
  }

  const argv = process.argv.slice(2);
  let port;
  let dataDir;
  try {
    dataDir = readDataDir(argv);
    if (argv.includes('--check')) {
      // The port is not asked about: the app this would replace is usually the one holding it.
      const plan = planRules(dataDir);
      refuseDevOpen(plan);
      process.stdout.write(describeRules(plan, `${plan.current}.before-<time>`).replace('[start]', '[check]'));
      process.exit(0);
    }
    port = await choosePort(argv, process.env);
  } catch (error) {
    fail(error && error.message ? error.message : String(error));
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const rules = planRules(dataDir);
  refuseDevOpen(rules);
  const movedTo = applyRules(rules, dataDir);
  process.stdout.write(describeRules(rules, movedTo));
  const functions = installFunctions(dataDir);
  process.stdout.write(
    functions.length
      ? `[start] cloud functions: installed ${functions.map((f) => `backend/workflows/${f}`).join(', ')}\n`
      : '[start] cloud functions: none in this deploy\n'
  );

  const args = ['serve', '--data-dir', dataDir, '--port', String(port), '--serve-app', APP, '--enforce-rules'];
  // The backend installs the project's rules only when it has none, and says so loudly when it
  // does not — so it is told about them only on a start that installs them.
  if (rules.action === 'install' || rules.action === 'replace') args.push('--project-dir', BACKEND);
  const name = appName();
  if (name) args.push('--backend-name', name);
  args.push(...withoutOwnArgs(argv));

  const backend = require(path.join(BACKEND, 'cli.js'));
  await backend.main(args);
}

main().catch((error) => {
  // The backend's own words for a refusal (a taken port, a bad policy file) — the same line
  // `node backend/cli.js serve` prints.
  process.stderr.write(`[nodegx-backend] FATAL: ${error && error.message ? error.message : error}\n`);
  process.exit(1);
});
