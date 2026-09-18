/* Local staging of todo.digitalbricks.io — the same shape as nexus-1 (one origin, backend routes proxied,
 * SPA fallback) on localhost, so reminders can be driven end to end without touching Richard's list:
 * sign up → the bell → turned on → a real push through the browser's push service at "9am" → turned off.
 *
 *   node staging-e2e.js <site-built-with-endpoint-http://localhost:18680>
 */
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const REPO = '/Users/richardosborne/vscode_projects/OpenNoodl';
const { connect, evaluate, dispatchClick } = require(path.join(REPO, 'scripts/devtools/cdp.js'));
const HERE = __dirname;
const SITE = path.resolve(process.argv[2] || '');
const SITE_PORT = 18680;
const BACKEND_PORT = 18690;
const ORIGIN = `http://localhost:${SITE_PORT}`;
const SHOTS = path.join(HERE, 'shots-staging');
const EMAIL = `staging-${Date.now()}@example.invalid`;
const R = { checks: {} };
const check = (name, ok, detail) => {
  R.checks[name] = ok ? 'PASS' : `FAIL ${detail === undefined ? '' : JSON.stringify(detail).slice(0, 300)}`;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(label, read, ok, ms = 25000) {
  const end = Date.now() + ms;
  let last = await read();
  while (!ok(last)) {
    if (Date.now() > end) throw new Error(`${label}: gave up; last ${JSON.stringify(last).slice(0, 300)}`);
    await wait(300);
    last = await read();
  }
  return last;
}

if (!fs.existsSync(path.join(SITE, 'index.html'))) {
  console.error('usage: staging-e2e.js <site>');
  process.exit(2);
}
fs.mkdirSync(SHOTS, { recursive: true });
let chromeProc = null;
setTimeout(() => {
  console.log(JSON.stringify({ ...R, error: 'HARD TIMEOUT' }, null, 2));
  try { if (chromeProc) chromeProc.kill(); backend.kill(); } catch { /* gone */ }
  setTimeout(() => process.exit(3), 300);
}, 240000);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-staging-'));
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
fs.copyFileSync(path.join(REPO, 'templates/todo-list.security.json'), path.join(dataDir, 'security.json'));
const senderEnv = {
  ...process.env,
  TODO_DB: path.join(dataDir, 'data', 'local.db'),
  TODO_VAPID: path.join(tmp, 'vapid.json'),
  TODO_PUSH_STATE: path.join(tmp, 'push-state.json'),
  TODO_REMIND_HOUR: '0',
  TODO_REMIND_WINDOW_HOURS: '24'
};
const sender = (...args) => execFileSync('node', ['--no-warnings', path.join(HERE, 'push', 'sender.js'), ...args], { env: senderEnv, encoding: 'utf8' });
const publicKey = sender('--generate-keys').trim().split('\n').pop();
fs.writeFileSync(path.join(SITE, 'pwa', 'vapid-public-key.txt'), publicKey + '\n');

const BACKEND_ROUTE = /^\/(aggregate|api|apps|auth|classes|config|files|functions|health|hooks|login|logout|oauth|realtime|requestPasswordReset|users|verificationEmailRequest)(\/|$|\?)/;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const backend = spawn('node', [path.join(REPO, 'packages/nodegx-backend/bin/nodegx-backend.js'), 'serve', '--data-dir', dataDir, '--port', String(BACKEND_PORT), '--backend-id', 'todo-list', '--backend-name', 'Todo staging', '--no-admin'], { stdio: ['ignore', 'ignore', 'pipe'] });
let backendErr = '';
backend.stderr.on('data', (c) => (backendErr += c));

const server = http.createServer((req, res) => {
  if (BACKEND_ROUTE.test(req.url)) {
    const up = http.request({ host: '127.0.0.1', port: BACKEND_PORT, path: req.url, method: req.method, headers: { ...req.headers, 'x-forwarded-for': '127.0.0.1' } }, (u) => {
      res.writeHead(u.statusCode, u.headers);
      u.pipe(res);
    });
    up.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(up);
    return;
  }
  const clean = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(SITE, clean);
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(SITE, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});

const json = (port, p) =>
  new Promise((res, rej) =>
    http.get({ host: '127.0.0.1', port, path: p }, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej)
  );

(async () => {
  let proc;
  let client;
  let code = 1;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-staging-chrome-'));
  try {
    await new Promise((r) => server.listen(SITE_PORT, '127.0.0.1', r));
    await until('backend up', () => json(BACKEND_PORT, '/health').then((h) => h.ok).catch(() => false), (ok) => ok === true, 30000);

    const cdpPort = 9500 + Math.floor(Math.random() * 300);
    proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
    chromeProc = proc;
    let target;
    for (let i = 0; i < 40 && !target; i++) {
      await wait(250);
      try { target = (await json(cdpPort, '/json/list')).find((t) => t.type === 'page'); } catch { /* not up */ }
    }
    if (!target) throw new Error('no page target');
    client = await connect(target);
    const browser = await connect({ webSocketDebuggerUrl: (await json(cdpPort, '/json/version')).webSocketDebuggerUrl });
    await browser.send('Browser.grantPermissions', { origin: ORIGIN, permissions: ['notifications'] });

    const consoleErrors = [];
    R.dialogs = [];
    client.on((m) => {
      // A native alert freezes the page and every evaluate after it: record it, dismiss it, fail on it.
      if (m.method === 'Page.javascriptDialogOpening') {
        R.dialogs.push(m.params.message);
        client.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
      if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(String(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text).slice(0, 200));
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
    });
    await client.send('Page.enable', {});
    await client.send('Runtime.enable', {});
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    const ev = (e) => evaluate(client, e);
    const text = async () => String(await ev('document.body ? document.body.innerText : ""'));
    const attr = async () => String(await ev("document.documentElement.getAttribute('data-reminders')"));
    const shot = async (name) => {
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
    };
    const centreOf = async (finder) => {
      const s = String(await ev(`(function () { var el = (${finder})(); if (!el) return 'absent';
        el.scrollIntoView({ block: 'center', behavior: 'instant' }); var r = el.getBoundingClientRect();
        return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`));
      if (s === 'absent') throw new Error(`absent: ${finder.slice(0, 100)}`);
      return JSON.parse(s);
    };
    const fill = async (finder, value) => {
      await dispatchClick(client, await centreOf(finder));
      await ev(`(function () { var el = (${finder})(); el.focus(); el.select && el.select(); return true; })()`);
      await client.send('Input.insertText', { text: value });
      await wait(300);
    };
    const inputBy = (test) => `function () { return Array.prototype.filter.call(document.querySelectorAll('input, textarea'), function (i) { ${test} })[0]; }`;
    const buttonNamed = (name) => `function () { return Array.prototype.filter.call(document.querySelectorAll('button'), function (b) { return (b.textContent || '').trim() === ${JSON.stringify(name)}; })[0]; }`;
    const shown = (name) => ev(`(function () { var b = (${buttonNamed(name)})(); if (!b) return 'absent'; var r = b.getBoundingClientRect(); return getComputedStyle(b).display !== 'none' && r.width > 0 ? 'shown' : 'hidden'; })()`);
    const notifications = () => ev(`(async function () { var r = await navigator.serviceWorker.ready; return JSON.stringify((await r.getNotifications()).map(function (n) { return n.title + ' | ' + n.body; })); })()`).then(String);
    const session = () => ev(`(function () { try { return JSON.parse(localStorage['Parse/todo-list/currentUser']).sessionToken; } catch (e) { return ''; } })()`).then(String);
    const rest = (method, p, body) => ev(`fetch(${JSON.stringify(p)}, { method: ${JSON.stringify(method)}, headers: { 'X-Parse-Application-Id': 'todo-list', 'X-Parse-Session-Token': JSON.parse(localStorage['Parse/todo-list/currentUser']).sessionToken, 'Content-Type': 'application/json' }, body: ${body ? JSON.stringify(JSON.stringify(body)) : 'undefined'} }).then(function (r) { return r.text(); })`).then((t) => JSON.parse(String(t)));

    // ── the PWA, before anyone signs in ────────────────────────────────────
    await client.send('Page.navigate', { url: `${ORIGIN}/` });
    await until('sign in', text, (s) => s.includes('Create account'));
    const manifest = await client.send('Page.getAppManifest', {});
    check('manifest parses with no errors', manifest.errors.length === 0 && /manifest\.webmanifest$/.test(manifest.url), { url: manifest.url, errors: manifest.errors });
    const sw = await until('service worker', () => ev(`navigator.serviceWorker.getRegistration().then(function (r) { return r && r.active ? r.scope : ''; })`).then(String), (s) => !!s);
    check('service worker active at /', sw === `${ORIGIN}/`, sw);
    const inst = await client.send('Page.getInstallabilityErrors', {});
    check('installable (Chrome reports no installability errors)', inst.installabilityErrors.length === 0, inst.installabilityErrors);
    check('host says reminders can be offered (data-reminders=off)', (await until('attr', attr, (a) => a !== 'null')) === 'off', await attr());
    check('no bell on Sign in', (await shown('Turn reminders on')) === 'absent');

    // ── sign up; the bell appears, off ─────────────────────────────────────
    await fill(inputBy("return i.type === 'email' || /mail/i.test(i.getAttribute('placeholder') || '');"), EMAIL);
    await fill(inputBy("return i.type === 'password';"), 'a long enough staging password 42');
    await dispatchClick(client, await centreOf(buttonNamed('Create account')));
    await until('the list', () => ev(`(${inputBy("return (i.getAttribute('placeholder') || '').indexOf('Add a task') === 0;")})() ? 'yes' : 'no'`).then(String), (v) => v === 'yes', 30000);
    check('session token where reminders.js reads it', !!(await session()));
    await until('bell drawn', () => shown('Turn reminders on'), (s) => s !== 'absent');
    check('off: "Turn reminders on" shows, "Turn reminders off" does not', (await shown('Turn reminders on')) === 'shown' && (await shown('Turn reminders off')) === 'hidden', [await shown('Turn reminders on'), await shown('Turn reminders off')]);
    await shot('1-bell-off');

    // ── turn on ────────────────────────────────────────────────────────────
    await dispatchClick(client, await centreOf(buttonNamed('Turn reminders on')));
    await until('turned on', attr, (a) => a === 'on', 30000);
    check('on: the ringing bell shows instead', (await shown('Turn reminders off')) === 'shown' && (await shown('Turn reminders on')) === 'hidden');
    check('"Reminders are on" confirmation shown', (await until('confirmation', notifications, (n) => n.includes('Reminders are on'))).includes('Reminders are on'));
    const subs = await rest('GET', '/classes/PushSubscription');
    const row = subs.results && subs.results[0];
    check('one PushSubscription row, enabled, with the device time zone and a push endpoint', subs.results.length === 1 && row.enabled === true && !!row.timeZone && /^https:\/\//.test(row.endpoint) && !!row.p256dh && !!row.auth, subs);
    await shot('2-bell-on');

    // ── deadlines: one due today, one done today, one tomorrow ─────────────
    const { localNow } = require(path.join(HERE, 'push', 'sender.js'));
    const today = localNow(row.timeZone).date;
    for (const t of [
      { title: 'Staging task due today', position: 1, status: 'open', deadline: today },
      { title: 'Staging task closed today', position: 2, status: 'done', deadline: today },
      { title: 'Staging task due later', position: 3, status: 'open', deadline: '2099-01-01' }
    ]) await rest('POST', '/classes/Task', t);
    const closeNotes = await ev(`navigator.serviceWorker.ready.then(function (r) { return r.getNotifications(); }).then(function (ns) { ns.forEach(function (n) { n.close(); }); return ns.length; })`);
    R.closedBefore = closeNotes;

    const first = sender('--once', '--only', EMAIL);
    R.firstTick = first.trim().split('\n');
    check('the 9am tick sent one push, accepted by the push service', /"event":"sent".*"due":1.*"status":201/.test(first), first);
    const got = await until('the reminder arrives', notifications, (n) => n.includes('Due today'), 40000);
    check('the reminder names only the open task due today', got.includes('Due today | Staging task due today') && !got.includes('closed today') && !got.includes('due later'), got);
    const second = sender('--once', '--only', EMAIL);
    check('a second tick the same day sends nothing', /"sent":0/.test(second) && !/"event":"sent"/.test(second), second);
    await shot('3-reminder-received');

    // ── turn off ───────────────────────────────────────────────────────────
    await dispatchClick(client, await centreOf(buttonNamed('Turn reminders off')));
    await until('turned off', attr, (a) => a === 'off', 30000);
    const after = await rest('GET', '/classes/PushSubscription');
    check('off keeps the row with enabled false (nothing deleted)', after.results.length === 1 && after.results[0].enabled === false, after);
    check('off: the crossed-out bell is back', (await shown('Turn reminders on')) === 'shown' && (await shown('Turn reminders off')) === 'hidden');
    fs.rmSync(senderEnv.TODO_PUSH_STATE, { force: true });
    const dry = sender('--dry-run', '--only', EMAIL);
    check('a disabled device is not reminded', !/dry-run/.test(dry), dry);

    // ── no host, no bell ───────────────────────────────────────────────────
    await ev("document.documentElement.removeAttribute('data-reminders')");
    await wait(300);
    check('without the host attribute neither bell shows', (await shown('Turn reminders on')) === 'hidden' && (await shown('Turn reminders off')) === 'hidden');

    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await ev("document.documentElement.setAttribute('data-reminders', 'off')");
    await wait(800);
    R.phoneOverflowX = await ev('document.documentElement.scrollWidth > window.innerWidth');
    await shot('4-phone');
    R.consoleErrors = consoleErrors;
    check('no console errors', consoleErrors.length === 0, consoleErrors);
    code = Object.values(R.checks).every((v) => v === 'PASS') ? 0 : 1;
  } catch (e) {
    R.error = String((e && e.stack) || e).slice(0, 600);
    R.backendErr = backendErr.slice(-400);
  } finally {
    console.log(JSON.stringify(R, null, 2));
    try { client && client.close(); } catch { /* gone */ }
    if (proc) proc.kill();
    backend.kill();
    server.close();
    fs.rm(profile, { recursive: true, force: true }, () => {});
    fs.rm(tmp, { recursive: true, force: true }, () => {});
    console.log('EXIT', code);
    setTimeout(() => process.exit(code), 500);
  }
})();
