#!/usr/bin/env node
/**
 * DESK-1 drive: the packaged shape keeps what was written across a restart.
 *
 *   node dev-docs/tasks/phase-78-the-templates/nightbook-desktop/drive-spike.js [--exe <path>]
 *
 * With no --exe it runs `electron .` in shell/ (build-app.js must have run). With --exe it
 * drives an installed or unpacked Nightbook (e.g. dist/win-unpacked/Nightbook.exe).
 *
 * Every launch gets NIGHTBOOK_HOME, so nothing is written to the real app-data or Documents.
 *
 *   launch 1  (home A)  sign-in page drawn → make an account → add a task → it is listed → quit
 *   disk                the database, the installed policy and the seeded backup policy exist;
 *                       no backend process outlives the app
 *   launch 2  (home A)  the task is listed again (signing in again if the session did not survive)
 *   launch 3  (home B)  CONTROL: a fresh home does NOT list it — so launch 2 read home A's disk,
 *                       not some other backend that happened to answer
 *
 * Plain Node 22 (global WebSocket), no dependencies.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const lib = require('./drive-lib');
const { config, CDP_PORT, wait, until, portListening, quit, backendsFor } = lib;

const argv = process.argv.slice(2);
const exeIdx = argv.indexOf('--exe');
const EXE = exeIdx >= 0 ? path.resolve(argv[exeIdx + 1]) : null;

const launch = (home) => lib.launch(home, EXE);
const R = { steps: [] };
const step = (s) => {
  R.steps.push(s);
  console.log(`· ${s}`);
};

const bodyText = (page) => page.evaluate('document.body ? document.body.innerText : ""');
const pathname = (page) => page.evaluate('location.pathname');

async function clickAt(page, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 });
  }
  await wait(1200);
}

async function fill(page, label, value) {
  const r = await page.evaluate(`(function () {
    var inputs = Array.prototype.slice.call(document.querySelectorAll('input, textarea'));
    var el = inputs.filter(function (i) {
      var lbl = i.closest('label');
      var t = (lbl ? lbl.textContent : '') + ' ' + (i.getAttribute('placeholder') || '') + ' ' + (i.name || '') + ' ' + i.type;
      return t.toLowerCase().indexOf(${JSON.stringify(label.toLowerCase())}) >= 0;
    })[0];
    if (!el) return 'absent';
    el.focus(); el.value = '';
    return 'ok';
  })()`);
  if (r !== 'ok') throw new Error(`no input for "${label}"`);
  await page.send('Input.insertText', { text: value });
  await wait(250);
}

async function clickButton(page, label, nearPlaceholder) {
  const at = await page.evaluate(`(function () {
    var want = ${JSON.stringify(label)}, near = ${JSON.stringify(nearPlaceholder || '')};
    var scope = document;
    if (near) {
      var f = Array.prototype.filter.call(document.querySelectorAll('input, textarea'), function (i) {
        return (i.getAttribute('placeholder') || '').indexOf(near) === 0;
      })[0];
      for (var el = f && f.parentElement; el; el = el.parentElement) {
        if (Array.prototype.some.call(el.querySelectorAll('button'), function (b) { return (b.innerText || '').trim() === want; })) { scope = el; break; }
      }
    }
    var b = Array.prototype.filter.call(scope.querySelectorAll('button'), function (x) { return (x.innerText || '').trim() === want; })[0];
    if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' });
    var r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!at) throw new Error(`no button "${label}"`);
  await clickAt(page, at.x, at.y);
}

function report() {
  const json = JSON.stringify(R, null, 2);
  console.log(json);
  if (process.env.NIGHTBOOK_DRIVE_REPORT) fs.writeFileSync(process.env.NIGHTBOOK_DRIVE_REPORT, json);
}

// ── The drive ───────────────────────────────────────────────────────────────

async function main() {
  for (const p of [CDP_PORT, config.port]) {
    if (await portListening(p)) throw new Error(`port ${p} is already taken; nothing was launched`);
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'nightbook-drive-'));
  const homeA = path.join(scratch, 'A');
  const homeB = path.join(scratch, 'B');
  const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
  const TASK = `Spike task ${stamp}`;
  const PERSON = { email: `writer.${stamp}@nightbook.local`, password: `pw-${stamp}-long-enough` };
  R.home = scratch;
  R.task = TASK;

  // launch 1
  step('launch 1 (home A)');
  let app = await launch(homeA);
  R.launch1 = {};
  await until('sign-in drawn', () => bodyText(app.page), (s) => s.includes('Create account'), 60_000);
  R.launch1.shownAtMs = Date.now() - app.t0;
  R.launch1.firstPath = await pathname(app.page);
  step('create account');
  await fill(app.page, 'email', PERSON.email);
  await fill(app.page, 'password', PERSON.password);
  await clickButton(app.page, 'Create account');
  // The list's own field, not a guessed path: the app has routed the list as `/` and as `/todo-list`.
  await until('lands on the list', () => app.page.evaluate(`!!document.querySelector('input[placeholder^="Add a task"]')`), (v) => v === true);
  R.launch1.afterSignUp = await pathname(app.page);
  step('add a task');
  await fill(app.page, 'add a task', TASK);
  await clickButton(app.page, 'Add', 'Add a task');
  await until('task listed', () => bodyText(app.page), (s) => s.includes(TASK));
  R.launch1.listed = true;
  await wait(1500);
  R.launch1.quit = await quit(app);
  await wait(1500);

  // disk
  step('read the disk');
  const book = path.join(homeA, 'userData', 'book');
  const security = path.join(book, 'security.json');
  R.disk = {
    database: fs.existsSync(path.join(book, 'data', 'local.db')),
    policyInstalled: fs.existsSync(security) && JSON.parse(fs.readFileSync(security, 'utf8')).devOpen === false,
    backupPolicy: fs.existsSync(path.join(book, 'backups.json')) ? JSON.parse(fs.readFileSync(path.join(book, 'backups.json'), 'utf8')) : null,
    backupFolder: fs.existsSync(path.join(homeA, 'Documents', config.backups.folderName)),
    backendsLeftRunning: backendsFor(homeA),
    timings: fs.readFileSync(path.join(homeA, 'userData', 'logs', 'timings.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  };

  // launch 2
  step('launch 2 (home A)');
  app = await launch(homeA);
  R.launch2 = {};
  const seen = await until('list or sign-in drawn', () => bodyText(app.page), (s) => s.includes(TASK) || s.includes('Create account'), 60_000);
  R.launch2.sessionSurvived = seen.includes(TASK);
  if (!R.launch2.sessionSurvived) {
    step('sign in again');
    await fill(app.page, 'email', PERSON.email);
    await fill(app.page, 'password', PERSON.password);
    await clickButton(app.page, 'Sign in');
    await until('task listed after sign-in', () => bodyText(app.page), (s) => s.includes(TASK));
  }
  R.launch2.listed = true;
  R.launch2.quit = await quit(app);
  await wait(1500);

  // launch 3 — control
  step('launch 3 (home B, control)');
  app = await launch(homeB);
  R.launch3 = {};
  const fresh = await until('sign-in drawn', () => bodyText(app.page), (s) => s.includes('Create account'), 60_000);
  R.launch3.firstPath = await pathname(app.page);
  R.launch3.listsTheTask = fresh.includes(TASK);
  R.launch3.quit = await quit(app);
  await wait(1500);
  R.backendsLeftRunning = backendsFor(homeA).concat(backendsFor(homeB));

  const verdict =
    R.launch1.listed &&
    R.disk.database &&
    R.disk.policyInstalled &&
    !!R.disk.backupPolicy &&
    R.disk.backendsLeftRunning.length === 0 &&
    R.launch2.listed &&
    R.launch3.listsTheTask === false &&
    R.backendsLeftRunning.length === 0;
  R.verdict = verdict ? 'PASS' : 'FAIL';
  report();
  process.exit(verdict ? 0 : 1);
}

main().catch((e) => {
  console.error(`drive-spike: ${e.stack || e.message}`);
  R.error = e.message;
  report();
  process.exit(1);
});
