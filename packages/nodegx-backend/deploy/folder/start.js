#!/usr/bin/env node
/**
 * Starts this NodeGX app: its backend, which also serves the app, on one port.
 *
 *   node start.js                first free port from 3000 up
 *   node start.js --port 8090    exactly 8090, or stop and say it is taken
 *   PORT=8090 node start.js      the same, for hosts that set PORT
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
 *   4. Runs the backend in this process with the app beside its API (`--serve-app`) and the access
 *      rules enforced from the first record (`--enforce-rules`). When the project ships its own
 *      rules (`backend/nodegx.security.json`), they are installed on the FIRST start, and only then
 *      — a backend that already has `data/security.json` keeps it.
 *
 * `data/` is the app's: its database, uploads, the admin credential. A deploy never writes there.
 */
'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');

const HERE = __dirname;
const APP = path.join(HERE, 'app');
const BACKEND = path.join(HERE, 'backend');
const DATA = path.join(HERE, 'data');
const POLICY_FILE = 'nodegx.security.json';
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

/** `--port N`, `--port=N` and `-p N` are this script's; everything else is the backend's. */
function withoutPortArgs(argv) {
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port' || argv[i] === '-p') {
      i++;
      continue;
    }
    if (argv[i].startsWith('--port=')) continue;
    rest.push(argv[i]);
  }
  return rest;
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
function installFunctions() {
  const from = path.join(BACKEND, 'workflows');
  const to = path.join(DATA, 'workflows');
  const carried = fs.existsSync(from) ? fs.readdirSync(from).filter((f) => f.endsWith(WORKFLOW_SUFFIX)) : [];
  if (carried.length === 0 && !fs.existsSync(to)) return carried;
  fs.mkdirSync(to, { recursive: true });
  for (const old of fs.readdirSync(to).filter((f) => f.endsWith(WORKFLOW_SUFFIX))) {
    fs.unlinkSync(path.join(to, old));
  }
  for (const file of carried) fs.copyFileSync(path.join(from, file), path.join(to, file));
  return carried;
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
  try {
    port = await choosePort(argv, process.env);
  } catch (error) {
    fail(error && error.message ? error.message : String(error));
  }

  fs.mkdirSync(DATA, { recursive: true });
  const functions = installFunctions();
  process.stdout.write(
    functions.length
      ? `[start] cloud functions: installed ${functions.map((f) => `backend/workflows/${f}`).join(', ')}\n`
      : '[start] cloud functions: none in this deploy\n'
  );

  const args = ['serve', '--data-dir', DATA, '--port', String(port), '--serve-app', APP, '--enforce-rules'];
  if (fs.existsSync(path.join(BACKEND, POLICY_FILE))) args.push('--project-dir', BACKEND);
  const name = appName();
  if (name) args.push('--backend-name', name);
  args.push(...withoutPortArgs(argv));

  const backend = require(path.join(BACKEND, 'cli.js'));
  await backend.main(args);
}

main().catch((error) => {
  // The backend's own words for a refusal (a taken port, a bad policy file) — the same line
  // `node backend/cli.js serve` prints.
  process.stderr.write(`[nodegx-backend] FATAL: ${error && error.message ? error.message : error}\n`);
  process.exit(1);
});
