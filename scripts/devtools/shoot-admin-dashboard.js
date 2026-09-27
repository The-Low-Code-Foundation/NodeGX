/**
 * Screenshot the served admin dashboard (`/_admin`) of a running backend.
 *
 * ## Why this exists
 *
 * FED-006 AC5 and FED-007 AC7 both end in *"Richard looks at it"*, and both times the shots were
 * taken by a script that was written, used once and thrown away — so the next session paid for it
 * again, and the handoff carried half a page explaining how. This is that script, kept.
 *
 * ## The whole recipe, both halves
 *
 *   1. Produce a backend with real records in it:
 *
 *        cd packages/nodegx-backend
 *        FED007_KEEP_DATA=1 npx jest tests/feed-drive.test.ts   # prints the data dir
 *        npm run build                                          # the served page is BUNDLED
 *        node bin/nodegx-backend.js serve --data-dir <dir> --port 8791 --host 127.0.0.1
 *
 *   2. Shoot it:
 *
 *        node scripts/devtools/shoot-admin-dashboard.js \
 *          --url http://127.0.0.1:8791 --token <secrets.json adminToken> --out <dir>
 *
 * ⚠️ **`npm run build` is not optional.** `bin/nodegx-backend.js` runs `dist/`, and the page is
 * inlined into that bundle by esbuild's text loader — so an unbuilt change shows the OLD page
 * while every test passes on the new one.
 *
 * ⚠️ **The debug port defaults to 9333, NOT 9222.** 9222 is the editor's, a peer is usually on
 * it, and a stray Chrome that steals it makes both drives attach to the wrong browser.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const WebSocket = require('ws');

const CHROME_CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'],
  win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
};

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const candidate of CHROME_CANDIDATES[process.platform] || []) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('No Chrome found. Set CHROME_PATH.');
}

function args() {
  const out = { debugPort: 9333, width: 1280, height: 1000 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    const value = argv[i + 1];
    if (key === 'url') out.url = value;
    else if (key === 'token') out.token = value;
    else if (key === 'out') out.out = value;
    else if (key === 'debug-port') out.debugPort = Number(value);
    else if (key === 'width') out.width = Number(value);
    else if (key === 'height') out.height = Number(value);
    else continue;
    i++;
  }
  if (!out.url || !out.token || !out.out) {
    throw new Error('usage: shoot-admin-dashboard.js --url <base> --token <adminToken> --out <dir> [--debug-port 9333]');
  }
  return out;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

/** A minimal CDP client: send a command, await its reply. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      const resolver = this.pending.get(message.id);
      if (!resolver) return;
      this.pending.delete(message.id);
      if (message.error) resolver.reject(new Error(JSON.stringify(message.error)));
      else resolver.resolve(message.result);
    });
  }

  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  /** Evaluate in the page and return the JSON value. Throws what the page throws. */
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (result.exceptionDetails) {
      throw new Error('page threw: ' + JSON.stringify(result.exceptionDetails.exception || result.exceptionDetails));
    }
    return result.result.value;
  }

  async shot(file) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  }
}

async function main() {
  const opts = args();
  fs.mkdirSync(opts.out, { recursive: true });

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-shots-'));
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${opts.debugPort}`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${opts.width},${opts.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  const shots = [];
  try {
    let targets = null;
    for (let i = 0; i < 40 && !targets; i++) {
      await wait(250);
      try {
        targets = await getJSON(`http://127.0.0.1:${opts.debugPort}/json/list`);
      } catch (e) {
        targets = null;
      }
    }
    if (!targets) throw new Error('Chrome never answered on the debug port');
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // The token goes in BEFORE the app boots, or the page shows its login screen: the dashboard
    // reads `sessionStorage['nodegx.admin.token']` at start-up and never again.
    await cdp.send('Page.navigate', { url: `${opts.url}/_admin` });
    await wait(1500);
    await cdp.evaluate(`sessionStorage.setItem('nodegx.admin.token', ${JSON.stringify(opts.token)})`);

    // 🔴 **A hash is not a navigation.** `Page.navigate` to `…/_admin#/executions` from
    // `…/_admin` changes `location.hash` and nothing else — the document is not reloaded, so the
    // boot that reads the stored token never runs again and the page sits on its login screen
    // looking exactly like a wrong credential. The reload is the whole fix.
    await cdp.evaluate("location.hash = '#/executions'");
    await cdp.send('Page.reload', { ignoreCache: true });
    await wait(3000);

    const who = await cdp.evaluate("(document.querySelector('#login') && !document.querySelector('#login').classList.contains('hidden')) ? 'LOGIN SCREEN' : 'signed in'");
    console.log('  auth:', who);
    if (who === 'LOGIN SCREEN') throw new Error('the token did not sign in — check secrets.json adminToken');

    shots.push(await cdp.shot(path.join(opts.out, 'fed007-executions-list.png')));

    // Open the record of a run that went wrong — the one the whole task is about. Clicked
    // through the page's own button, so what is shot is what a person gets.
    const opened = await cdp.evaluate(`(function () {
      var rows = Array.prototype.slice.call(document.querySelectorAll('tbody tr'));
      var target = rows.filter(function (r) { return (r.textContent || '').indexOf('error') >= 0; })[0] || rows[0];
      if (!target) return 'no rows';
      var button = target.querySelector('button');
      if (!button) return 'no detail button';
      button.click();
      return 'clicked: ' + (target.textContent || '').slice(0, 80);
    })()`);
    console.log('  open:', opened);
    await wait(1500);
    shots.push(await cdp.shot(path.join(opts.out, 'fed007-record-open.png')));

    // …and one step expanded, which is the half the list cannot show: a step's own input and
    // output, in the explorer, instead of somewhere in a 614-line dump.
    const expanded = await cdp.evaluate(`(function () {
      var rows = Array.prototype.slice.call(document.querySelectorAll('.modal tr.step-row'));
      // The failed step that NAMES something — the fetch that was refused carries its URL and
      // its status, which is the pair the whole failures band exists for. A failed step with a
      // bare outcome would shoot a picture of an empty tree.
      var named = rows.filter(function (r) {
        var t = r.textContent || '';
        return t.indexOf('error') >= 0 && t.indexOf('HTTP') >= 0;
      })[0];
      var target = named || rows.filter(function (r) { return (r.textContent || '').indexOf('error') >= 0; })[0] || rows[0];
      if (!target) return 'no step rows';
      target.click();
      return 'expanded: ' + (target.textContent || '').slice(0, 80);
    })()`);
    console.log('  step:', expanded);
    await wait(800);
    // Bring the opened step into view — the modal scrolls, and a shot of the top of it would not
    // show the thing that was just expanded.
    await cdp.evaluate(`(function () {
      var pane = document.querySelector('.modal tr.step-pane:not(.hidden)');
      if (pane && pane.scrollIntoView) pane.scrollIntoView({ block: 'center' });
      return !!pane;
    })()`);
    await wait(600);
    shots.push(await cdp.shot(path.join(opts.out, 'fed007-step-expanded.png')));

    // One more, and it is the explorer's own audition: a step whose data is actually nested.
    // A model call carries a request and an answer, which is what "breaking down the JSON
    // visually" has to look good on.
    const rich = await cdp.evaluate(`(function () {
      var open = document.querySelector('.modal tr.step-row.open');
      if (open) open.click();
      var rows = Array.prototype.slice.call(document.querySelectorAll('.modal tr.step-row'));
      var target = rows.filter(function (r) { return (r.textContent || '').indexOf('modelrequest') >= 0; })[0];
      if (!target) return 'no model step';
      target.click();
      var pane = document.querySelector('.modal tr.step-pane:not(.hidden)');
      if (pane && pane.scrollIntoView) pane.scrollIntoView({ block: 'center' });
      return 'expanded: ' + (target.textContent || '').slice(0, 80);
    })()`);
    console.log('  data:', rich);
    await wait(900);
    shots.push(await cdp.shot(path.join(opts.out, 'fed007-explorer.png')));
  } finally {
    chrome.kill();
    // Chrome writes into its profile as it dies, so a tidy-up that throws would swallow the
    // whole run's output. The directory is in the OS temp dir either way.
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (e) {
      /* the OS will have it */
    }
  }
  return shots;
}

main()
  .then((shots) => {
    shots.forEach((s) => console.log('shot:', s));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
