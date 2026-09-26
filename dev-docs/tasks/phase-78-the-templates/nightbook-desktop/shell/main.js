/**
 * Nightbook's desktop shell (TPL-011-DESKTOP DESK-1): one window, one backend, no network.
 *
 * - The backend is `nodegx-backend`'s single-file bundle, run by THIS binary in Node mode
 *   (`ELECTRON_RUN_AS_NODE`), exactly as the editor's ServiceSupervisor runs it. Its data
 *   is `%APPDATA%\Nightbook\book` — never inside the install folder, so an uninstall or an
 *   update cannot touch it (P91 R7: "the app is replaceable; the data is not").
 * - The page is served by `relay.js` on the fixed loopback origin the export baked in.
 *   The backend itself takes any free port (`--port 0`) and the relay forwards to it.
 * - The daily backup (ruling D4: one a day for a month) is written as `backups.json`
 *   before the backend's first start, into `Documents\Nightbook backups`. Existing
 *   settings are never overwritten.
 * - Timings go to `%APPDATA%\Nightbook\logs\timings.log`, one line per launch, because
 *   the thing DESK-1 must measure is how this behaves on a 4 GB m3.
 */
'use strict';

const { app, BrowserWindow, dialog, Menu, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { createRelay } = require('./relay');
const { adoptShippedPolicy } = require('./policy');
const config = require('./nightbook.json');

const T0 = Date.now();
const READY_PREFIX = 'NODEGX_BACKEND_READY ';
// The editor's 15 s was set on development machines; this is a first reading on an m3.
const READY_TIMEOUT_MS = 90_000;
const ORIGIN = `http://127.0.0.1:${config.port}`;

app.setName(config.name);
// Drives and smoke runs only: keep every folder the app writes (data, logs, backups) under one
// throwaway directory instead of the real %APPDATA% and Documents.
if (process.env.NIGHTBOOK_HOME) {
  app.setPath('userData', path.join(process.env.NIGHTBOOK_HOME, 'userData'));
  app.setPath('documents', path.join(process.env.NIGHTBOOK_HOME, 'Documents'));
}

const resources = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'build-output');
const APP_DIR = path.join(resources, 'app');
const BACKEND_ENTRY = path.join(resources, 'backend', 'cli.js');
const POLICY_DIR = path.join(resources, 'policy');

const USER_DIR = app.getPath('userData');
const DATA_DIR = path.join(USER_DIR, 'book');
const LOG_DIR = path.join(USER_DIR, 'logs');

let backend = null;
let backendPort = null;
let relay = null;
let win = null;
let quitting = false;
const timings = { launch: new Date(T0).toISOString(), version: app.getVersion() };

function log(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'backend.log'), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // A log that cannot be written must never stop the book opening.
  }
}

function mark(name) {
  timings[name] = Date.now() - T0;
}

function writeTimings() {
  try {
    const metrics = app.getAppMetrics().map((m) => ({ type: m.type, kb: m.memory && m.memory.workingSetSize }));
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'timings.log'), JSON.stringify({ ...timings, electronMemory: metrics }) + '\n');
  } catch {
    // as above
  }
}

/** First start only: the backup policy Richard ruled (D4). Never overwrites a policy that exists. */
function seedBackups() {
  const file = path.join(DATA_DIR, 'backups.json');
  if (fs.existsSync(file)) return;
  const dest = path.join(app.getPath('documents'), config.backups.folderName);
  fs.mkdirSync(dest, { recursive: true });
  const policy = {
    version: 1,
    schedule: { enabled: true, cron: config.backups.cron, missedFirePolicy: 'run-once-on-start' },
    retention: config.backups.retention,
    destination: { type: 'local', path: dest },
    includeSecrets: false
  };
  fs.writeFileSync(file, JSON.stringify(policy, null, 2));
  log(`seeded backups.json -> ${dest}`);
}

function startBackend() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    seedBackups();
    // A new version's rules replace the old version's (policy.js says why); the old file is kept.
    const adopted = adoptShippedPolicy({ shipped: path.join(POLICY_DIR, 'nodegx.security.json'), dataDir: DATA_DIR, version: app.getVersion() });
    timings.policy = adopted.action;
    if (adopted.action === 'replaced') log(`policy: this version ships new rules; the old ones are kept as ${adopted.keptAs}`);

    const args = [
      BACKEND_ENTRY,
      'serve',
      '--data-dir', DATA_DIR,
      '--port', '0',
      '--host', '127.0.0.1',
      '--backend-id', config.appId,
      '--backend-name', config.name,
      '--parent-pid', String(process.pid),
      // Installs the app's nodegx.security.json only when the data folder has none yet.
      '--project-dir', POLICY_DIR,
      '--no-admin'
    ];
    const child = spawn(process.execPath, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    backend = child;

    let settled = false;
    let buffered = '';
    const tail = [];
    const remember = (line) => {
      log(line);
      tail.push(line);
      if (tail.length > 30) tail.shift();
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`the backend did not say it was ready within ${READY_TIMEOUT_MS / 1000} s\n${tail.join('\n')}`));
    }, READY_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      buffered += chunk.toString();
      let nl;
      while ((nl = buffered.indexOf('\n')) >= 0) {
        const line = buffered.slice(0, nl).trimEnd();
        buffered = buffered.slice(nl + 1);
        remember(`[out] ${line}`);
        if (!settled && line.startsWith(READY_PREFIX)) {
          settled = true;
          clearTimeout(timer);
          try {
            resolve(JSON.parse(line.slice(READY_PREFIX.length)));
          } catch (e) {
            reject(new Error(`unreadable ready line: ${line}`));
          }
        }
      }
    });
    child.stderr.on('data', (chunk) => chunk.toString().split('\n').filter(Boolean).forEach((l) => remember(`[err] ${l}`)));
    child.on('exit', (code, signal) => {
      remember(`backend exited code=${code} signal=${signal}`);
      backendPort = null;
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`the backend stopped before it was ready (code ${code})\n${tail.join('\n')}`));
      } else if (!quitting) {
        dialog.showErrorBox(config.name, `The book stopped unexpectedly. Please close it and open it again.\n\nLe carnet s'est arrêté. Ferme-le et rouvre-le.`);
      }
    });
  });
}

function startRelay() {
  return new Promise((resolve, reject) => {
    relay = createRelay({ appDir: APP_DIR, backendPort: () => backendPort, log });
    relay.once('error', reject);
    relay.listen(config.port, '127.0.0.1', () => resolve());
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    show: false,
    title: config.name,
    backgroundColor: '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  // No Node in the page (P91 R3), and the page never leaves its own origin.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN + '/')) event.preventDefault();
  });
  win.once('ready-to-show', () => {
    mark('windowShownMs');
    win.show();
  });
  win.webContents.once('did-finish-load', () => {
    mark('pageLoadedMs');
    writeTimings();
  });
  win.loadURL(ORIGIN + '/');
}

async function boot() {
  Menu.setApplicationMenu(null);
  try {
    await startRelay();
  } catch (e) {
    dialog.showErrorBox(
      config.name,
      `Another program is using this book's door (port ${config.port}).\n\nUn autre programme utilise la porte du carnet (port ${config.port}).\n\n${e.message}`
    );
    app.exit(1);
    return;
  }
  mark('relayListeningMs');

  for (;;) {
    try {
      const ready = await startBackend();
      backendPort = ready.port;
      timings.engine = ready.engine;
      timings.persistence = ready.persistence;
      mark('backendReadyMs');
      break;
    } catch (e) {
      log(`start failed: ${e.message}`);
      const { response } = await dialog.showMessageBox({
        type: 'error',
        title: config.name,
        message: "The book couldn't open. / Le carnet n'a pas pu s'ouvrir.",
        detail: `A note for a grown-up is in ${path.join(LOG_DIR, 'backend.log')}`,
        buttons: ['Try again / Réessayer', 'Show the note / Voir la note', 'Close / Fermer'],
        defaultId: 0,
        cancelId: 2
      });
      if (response === 1) shell.showItemInFolder(path.join(LOG_DIR, 'backend.log'));
      if (response !== 0) {
        app.exit(1);
        return;
      }
    }
  }

  createWindow();
}

function stopBackend() {
  quitting = true;
  if (backend && backend.exitCode === null) {
    // On Windows this ends the process at once (no SIGTERM drain). Every write is its own
    // SQLite transaction; DESK-3's abandoned arm measures that this loses nothing.
    backend.kill();
  }
  if (relay) relay.close();
}

if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(boot);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', stopBackend);
}
