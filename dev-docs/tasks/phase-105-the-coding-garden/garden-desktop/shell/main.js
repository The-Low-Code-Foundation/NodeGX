/**
 * Olive's Island's desktop shell (P105 CG-004; internally `garden-desktop`): one window, one backend, one owl, no network.
 * Forked from Nightbook's shell (TPL-011-DESKTOP DESK-1) and parameterised: everything that names the app — its id,
 * name, port, data folder, door prefix, backup policy, model file — comes from `garden.json`, so a third template does
 * not fork this file again (P105 README §8).
 *
 * - The backend is `nodegx-backend`'s single-file bundle, run by THIS binary in Node mode (`ELECTRON_RUN_AS_NODE`),
 *   exactly as the editor's ServiceSupervisor runs it. Its data is `<userData>/<dataDirName>` — never inside the
 *   install folder, so an uninstall or an update cannot touch it (P91 R7: "the app is replaceable; the data is not").
 * - The page is served by `relay.js` on the fixed loopback origin the export baked in. The backend takes any free
 *   port (`--port 0`) and the relay forwards to it.
 * - The owl (`owl.js`) runs in this process: the model from `extraResources/model/` when packaged, from
 *   `GARDEN_MODEL_PATH` or `build-output/model/` in dev; its sha256 checked on first launch (`model-check.js`); loaded
 *   AFTER the window shows so the island never waits on it; the exam (`exam.js`) run once when no results exist.
 *   No model, a refused model, a slow model: the game runs on its written lines (AC4).
 * - The island backups (R14, `copies.js`): the family — the page's localStorage entry, the same thing the save code holds
 *   — is read by ONE fixed expression and written to `Documents/<backups.folderName>` as one small file a day (kept a
 *   month): after the page loads if the day has none yet, every evening at `backups.dailyAt` while open, and at quit
 *   (the quit waits for it, 3 s at most). The menu's "Restore a backup…" brings a day back. The backend's SQLite backup
 *   (it holds nothing of the game) is no longer seeded, and one seeded by an older build is switched off.
 * - Timings go to `<userData>/logs/timings.log`: one launch line, then `model-load`, `exam-probe`, `olive` (AC7).
 * - The name a person sees is `config.name` / `config.nameFr` ("Olive's Island" / "L'île d'Olive", P105 ruling 7); the
 *   folder her saves live in is `config.userDataDirName` ("Bot Garden"), PINNED — see pinUserData.
 */
'use strict';

const { app, BrowserWindow, dialog, Menu, screen, session, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { createRelay } = require('./relay');
const { createShellDoors, createIslandBackups, createLeaving, parseBackupFile, restoreMenu, retireBackendBackups } = require('./copies');
const { adoptShippedPolicy, installFunctions } = require('./policy');
const { zoomFor, shouldMaximise, windowTitle } = require('./fit');
const { createOwl } = require('./owl');
const { createOliveDoors } = require('./olive-route');
const { checkModel } = require('./model-check');
const { createTimings } = require('./timings');
const config = require('./garden.json');
const templates = require('./olive-templates.json');

const T0 = Date.now();
const READY_PREFIX = 'NODEGX_BACKEND_READY ';
// The editor's 15 s was set on development machines; this is a first reading on a 4 GB-class tablet.
const READY_TIMEOUT_MS = 90_000;
const ORIGIN = `http://127.0.0.1:${config.port}`;
const HOME_ENV = 'GARDEN_HOME';

app.setName(config.name);

/**
 * Where her saves live, PINNED to the folder every build before the rename used (P105 s3, ruling 7). Electron names
 * `userData` after the app (`<appData>/<productName>`), and the island itself is NOT in the backend's data folder: the
 * game keeps the family in the page's localStorage (key `bot-garden`), which Chromium writes under `sessionData`
 * (`Local Storage/`), which defaults to `userData`. Renaming the app to "Olive's Island" would have opened an EMPTY
 * island on the next install — every profile, every robot's name, every request done, gone from sight (still on disk
 * under "Bot Garden", unread). Both paths are set here, explicitly, before anything reads them (the single-instance
 * lock below reads userData). `GARDEN_HOME` (drives and smoke runs only) keeps every folder the app writes under one
 * throwaway directory instead.
 */
function pinUserData() {
  const home = process.env[HOME_ENV];
  const dir = home ? path.join(home, 'userData') : path.join(app.getPath('appData'), config.userDataDirName);
  fs.mkdirSync(dir, { recursive: true });
  app.setPath('userData', dir);
  app.setPath('sessionData', dir);
  if (home) app.setPath('documents', path.join(home, 'Documents'));
}
pinUserData();
// A drive of the upgrade (AC8) launches the same build twice as two versions.
const VERSION = process.env.GARDEN_VERSION || app.getVersion();

const resources = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'build-output');
const APP_DIR = path.join(resources, 'app');
const BACKEND_ENTRY = path.join(resources, 'backend', 'cli.js');
const POLICY_DIR = process.env.GARDEN_POLICY_DIR || path.join(resources, 'policy');
const WORKFLOWS_DIR = path.join(resources, 'workflows');
const MODEL_PATH = app.isPackaged ? path.join(resources, 'model', config.model.file) : process.env.GARDEN_MODEL_PATH || path.join(resources, 'model', config.model.file);

const USER_DIR = app.getPath('userData');
const DATA_DIR = path.join(USER_DIR, config.dataDirName);
const LOG_DIR = path.join(USER_DIR, 'logs');

let backend = null;
let backendPort = null;
let relay = null;
let win = null;
let owl = null;
let olive = null;
let quitting = false;
const timings = { launch: new Date(T0).toISOString(), version: VERSION };
const timingsLog = createTimings(path.join(LOG_DIR, 'timings.log'));

function log(line) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'backend.log'), `${new Date().toISOString()} ${line}\n`);
  } catch {
    // A log that cannot be written must never stop the game opening.
  }
}

function mark(name) {
  timings[name] = Date.now() - T0;
}

function writeTimings() {
  try {
    const metrics = app.getAppMetrics().map((m) => ({ type: m.type, kb: m.memory && m.memory.workingSetSize }));
    timingsLog.line({ event: 'launch', ...timings, electronMemory: metrics });
  } catch {
    // as above
  }
}

/** Where the island backups go: the (pinned) Documents folder, whatever an older build's backups.json named. */
function backupsFolder() {
  return path.join(app.getPath('documents'), config.backups.folderName);
}

const islandBackups = createIslandBackups({
  webContents: () => (win && !win.isDestroyed() ? win.webContents : null),
  folder: backupsFolder,
  storageKey: config.backups.storageKey,
  keepDays: config.backups.keepDays,
  dailyAt: config.backups.dailyAt,
  log
});
// The quit waits for the day's last backup (bounded): a window's close and the app's quit both pass through it once.
const leaving = createLeaving({ backup: () => islandBackups.run('quit'), timeoutMs: 3000, log });

function startBackend() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // R14: the backend's evening SQLite copy held nothing of the game (every table empty); an older build's is switched off.
    const retired = retireBackendBackups(DATA_DIR);
    if (retired === 'retired') log('backups: the backend\'s SQLite backup is switched off (the island backups replace it)');
    // A new version's rules replace the old version's (policy.js says why); the old file is kept.
    const adopted = adoptShippedPolicy({ shipped: path.join(POLICY_DIR, config.policy), dataDir: DATA_DIR, version: VERSION });
    timings.policy = adopted.action;
    if (adopted.action === 'replaced') log(`policy: this version ships new rules; the old ones are kept as ${adopted.keptAs}`);
    // The app's cloud functions (the only doors that write a record) — the backend's --project-dir installs the policy
    // only. This version's bundle always replaces the last one: the app owns its functions as it owns its rules.
    timings.functions = installFunctions({ from: WORKFLOWS_DIR, dataDir: DATA_DIR });

    const args = [
      BACKEND_ENTRY,
      'serve',
      '--data-dir', DATA_DIR,
      '--port', '0',
      '--host', '127.0.0.1',
      '--backend-id', config.appId,
      '--backend-name', config.name,
      '--parent-pid', String(process.pid),
      // Installs the app's policy only when the data folder has none yet.
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
        dialog.showErrorBox(config.name, `${config.name} stopped unexpectedly. Please close it and open it again.\n\n${config.nameFr} s'est arrêté. Ferme-le et rouvre-le.`);
      }
    });
  });
}

/**
 * "Restore a backup…" (the shell's menu, R14): a parent picks a day's file and confirms; copies.js keeps the family now
 * first, writes the day back, reloads the page and reads the players back. Every step says what happened, EN / FR.
 */
async function restoreFromBackup() {
  if (!win || win.isDestroyed()) return;
  const title = `${config.name} / ${config.nameFr}`;
  const pick = await dialog.showOpenDialog(win, {
    title: 'Restore a backup… / Restaurer une sauvegarde…',
    defaultPath: backupsFolder(),
    properties: ['openFile'],
    filters: [{ name: 'Island backups / Sauvegardes des îles', extensions: ['json'] }]
  });
  if (pick.canceled || !pick.filePaths.length) return;
  let parsed;
  try {
    parsed = parseBackupFile(fs.readFileSync(pick.filePaths[0], 'utf8'));
  } catch {
    parsed = { ok: false, reason: 'unreadable' };
  }
  if (!parsed.ok) {
    await dialog.showMessageBox(win, { type: 'warning', title, message: "That file is not a backup of the islands. / Ce fichier n'est pas une sauvegarde des îles.", buttons: ['OK'] });
    return;
  }
  const when = parsed.at ? new Date(parsed.at).toLocaleString() : '?';
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    title,
    message: `Bring back the islands of ${when}? / Ramener les îles du ${when} ?`,
    detail: `${parsed.players.join(', ')}\n\nThe islands on this computer now are kept first, in a "before-restore" backup.\nLes îles de cet ordinateur sont d'abord gardées, dans une sauvegarde « before-restore ».`,
    buttons: ['Bring them back / Les ramener', 'Cancel / Annuler'],
    defaultId: 1,
    cancelId: 1
  });
  if (response !== 0) return;
  const r = await islandBackups.restore(parsed).catch((e) => ({ ok: false, reason: e && e.message }));
  await dialog.showMessageBox(
    win,
    r.ok
      ? { type: 'info', title, message: `The islands are back. / Les îles sont revenues.`, detail: r.players.join(', '), buttons: ['OK'] }
      : { type: 'error', title, message: "The islands could not be brought back. / Les îles n'ont pas pu être ramenées.", detail: `A note for a grown-up is in ${path.join(LOG_DIR, 'backend.log')} (${r.reason})`, buttons: ['OK'] }
  );
}

/** The owl and its doors exist before the model is checked or loaded: an early ask is a fallback, not an error. */
function createOwlAndDoors() {
  // GARDEN_OLIVE_STUB=1|mutant (a drive only, CG-005): the stub Olive answers instead of the model, behind the real route.
  const stub = process.env.GARDEN_OLIVE_STUB ? require('./olive-stub').createStubEngine({ mutant: process.env.GARDEN_OLIVE_STUB === 'mutant' }) : null;
  owl = createOwl({ modelPath: stub ? __filename : MODEL_PATH, engine: stub, gpu: process.env.GARDEN_CPU ? false : true, threads: config.olive.cpuThreads, timeoutMs: config.olive.timeoutMs, contextSize: config.olive.contextSize, log, timings: timingsLog });
  olive = createOliveDoors({ owl, templates, dataDir: DATA_DIR, header: config.header, prefix: config.doorPrefix, timings: timingsLog, log });
}

/** After the window is up: the sha256 (AC6), the load, the first exam. Never throws, never blocks the page. */
async function wakeOwl() {
  try {
    const check = process.env.GARDEN_OLIVE_STUB ? { ok: true, reason: 'stub' } : await checkModel({ file: MODEL_PATH, expected: config.model.sha256, dataDir: DATA_DIR, log });
    timings.modelCheck = check;
    if (check.reason === 'sha256-mismatch') {
      // Refuse it: a new owl in the refused state replaces the one the doors hold.
      owl = createOwl({ modelPath: MODEL_PATH, refused: `sha256 mismatch: the model file is not the one this version ships (${check.sha256.slice(0, 12)}…)`, log, timings: timingsLog });
      olive = createOliveDoors({ owl, templates, dataDir: DATA_DIR, header: config.header, prefix: config.doorPrefix, timings: timingsLog, log });
      log('owl: model refused (sha256 mismatch)');
      return;
    }
    const s = await owl.load();
    mark('modelReadyMs');
    if (s.model === 'ready' && !olive.hasResults()) {
      log('exam: first launch, running');
      const r = await olive.runExam();
      log(`exam: ${r.passed} passed, ${r.failed} failed in ${r.ms} ms`);
    }
  } catch (e) {
    log(`owl: wake failed: ${e && e.message}`);
  }
}

function startRelay() {
  return new Promise((resolve, reject) => {
    const copies = createShellDoors({ folder: backupsFolder }, { prefix: config.doorPrefix });
    // Olive's doors first (they own `<prefix>olive*`), then the copies; `olive` is read per request because a refused
    // model replaces it.
    const doors = (req, res, urlPath) => olive.handle(req, res, urlPath) || copies(req, res, urlPath);
    relay = createRelay({ appDir: APP_DIR, backendPort: () => backendPort, log, shell: doors, opening: `${config.name} is still opening.` });
    relay.once('error', reject);
    relay.listen(config.port, '127.0.0.1', () => resolve());
  });
}

const WANTED = { width: 1280, height: 860 };

/** The page is laid out 1368 wide whatever the display scale (fit.js says why). */
function fitPage() {
  if (!win || win.isDestroyed()) return;
  const zoom = zoomFor(win.getContentSize()[0]);
  win.webContents.setZoomFactor(zoom);
  timings.zoom = zoom;
}

function createWindow() {
  // GARDEN_WINDOW=WxH (a drive only): a window of exactly that content size, as a small or high-scale screen gives.
  const forced = /^(\d+)x(\d+)$/.exec(process.env.GARDEN_WINDOW || '');
  win = new BrowserWindow({
    width: forced ? Number(forced[1]) : WANTED.width,
    height: forced ? Number(forced[2]) : WANTED.height,
    useContentSize: !!forced,
    show: false,
    title: config.name,
    backgroundColor: '#ffffff',
    // The one menu (Restore a backup…) stays out of the children's way on Windows: the Alt key shows it.
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  // The game's name on the window, whatever the exported page's <title> says (fit.js windowTitle says why).
  win.on('page-title-updated', (event, title) => {
    const want = windowTitle(title, config);
    if (want !== title) {
      event.preventDefault();
      win.setTitle(want);
    }
  });
  // No Node in the page (P91 R3), and the page never leaves its own origin.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN + '/')) event.preventDefault();
  });
  win.once('ready-to-show', () => {
    mark('windowShownMs');
    if (!forced && shouldMaximise(screen.getPrimaryDisplay().workAreaSize, WANTED)) win.maximize();
    win.show();
    fitPage();
    // The owl wakes after the island is on screen.
    setTimeout(wakeOwl, 500);
  });
  win.on('resize', fitPage);
  win.webContents.on('did-finish-load', fitPage);
  win.webContents.once('did-finish-load', () => {
    mark('pageLoadedMs');
    writeTimings();
    // The day's backup if it has none yet (a missed evening), after the page's own on-load save has settled.
    setTimeout(() => islandBackups.runIfNoneToday('launch'), 2000);
  });
  // A person closing the window: the backup first (held, bounded), then the close.
  win.on('close', (event) => {
    leaving.hold(event, () => {
      if (win && !win.isDestroyed()) win.close();
    });
  });
  win.loadURL(ORIGIN + '/');
}

async function boot() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(restoreMenu(process.platform, config, () => restoreFromBackup().catch((e) => log(`restore failed: ${e && e.message}`)))));
  createOwlAndDoors();
  try {
    await startRelay();
  } catch (e) {
    dialog.showErrorBox(
      config.name,
      `Another program is using this app's door (port ${config.port}).\n\nUn autre programme utilise la porte du jeu (port ${config.port}).\n\n${e.message}`
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
        message: `${config.name} couldn't open. / ${config.nameFr} n'a pas pu s'ouvrir.`,
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
  islandBackups.schedule();
}

function stopBackend() {
  quitting = true;
  islandBackups.stop();
  // Her last move is in localStorage; Chromium commits it to disk on a delay. Write it now, before the app goes, so a
  // request finished a second before the window closed is still done tomorrow (and after an upgrade, CG-004 AC8).
  try {
    session.defaultSession.flushStorageData();
  } catch {
    // no session yet (a start that failed before ready): nothing to flush
  }
  if (backend && backend.exitCode === null) {
    // On Windows this ends the process at once (no SIGTERM drain). Every write is its own SQLite transaction.
    backend.kill();
  }
  if (relay) relay.close();
  if (owl) owl.close().catch(() => {});
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
  // The quit waits once for the day's last backup (leaving.hold), then goes on to stop the backend.
  app.on('before-quit', (event) => {
    if (win && !win.isDestroyed() && leaving.hold(event, () => app.quit())) return;
    stopBackend();
  });
}

// For the tests (tests/config.test.js loads this file with a fake Electron): where the backups go.
module.exports = { islandBackups, backupsFolder };
