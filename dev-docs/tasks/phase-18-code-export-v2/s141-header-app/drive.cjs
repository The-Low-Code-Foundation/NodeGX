// The Header drive (P18 s141): rocket-school's Header renames and deletes the player, in the runtime and in the exported
// builds; s140's drive.cjs with the Header's steps. One headless Chrome, the store seeded before the app's first script.
// See EXPECTED.md (written first) and README.md. `./build.sh head fixed` first, then `node drive.cjs [arm ...]`.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const X = __dirname;
const W = path.join(X, 'work');
const { findChrome, freePort, connect, evaluate, httpJson } = require(path.join(R, 'scripts/devtools/render-report.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const KEY = 'noodl_store_rocket-school';
const SEED = {
  app: {
    profiles: [
      {
        id: 'p1',
        name: 'Ada',
        look: 'pixel-art',
        seed: 'Ada',
        level: 'CE2',
        lang: 'en',
        layout: 'qwerty',
        sound: true,
        answerMode: 'auto',
        created: 1792000000000,
        days: [],
        model: { rating: 0, skills: {}, lastSkill: '', answered: 0 }
      },
      {
        id: 'p2',
        name: 'Bob',
        look: 'pixel-art',
        seed: 'Bob',
        level: 'CE1',
        lang: 'en',
        layout: 'qwerty',
        sound: true,
        answerMode: 'auto',
        created: 1792000000001,
        days: [],
        model: { rating: 0, skills: {}, lastSkill: '', answered: 0 }
      }
    ],
    sets: [{ id: 's1', name: 'Capitals', items: [{ q: 'France', a: 'Paris' }, { q: 'Spain', a: 'Madrid' }], both: false }],
    activeId: 'p1'
  }
};

/** The built app, every unknown path answered with index.html (BrowserRouter's paths). */
function serveDist(dir, port) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = path.join(dir, url);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const LINES = `document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean)`;
const STORE = `(() => { const raw = localStorage.getItem(${JSON.stringify(KEY)}); return raw === null ? null : JSON.parse(raw); })()`;
/** Every visible text field, in document order: its tag, type, placeholder and value. */
const FIELDS = `[...document.querySelectorAll('input, textarea')].filter((el) => el.offsetParent !== null && el.type !== 'checkbox' && el.type !== 'hidden')
  .map((el) => { const cs = getComputedStyle(el); return { tag: el.tagName.toLowerCase(), type: el.getAttribute('type'), placeholder: el.placeholder, value: el.value,
    caret: [el.selectionStart, el.selectionEnd], resize: cs.resize, font: cs.fontFamily.split(',')[0] + ' ' + cs.fontSize, height: el.offsetHeight }; })`;
const HAS_TEXT = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
/** The visible field whose value is `value`, focused with everything in it selected, so insertText replaces it. */
const FOCUS_VALUE = (value) => `(() => {
  const el = [...document.querySelectorAll('input, textarea')].find((f) => f.value === ${JSON.stringify(value)} && f.offsetParent !== null);
  if (!el) return false;
  el.focus();
  el.select();
  return document.activeElement === el;
})()`;
/** The visible field whose placeholder starts with `hint`, focused with everything in it selected, so insertText replaces it. */
const FOCUS = (hint) => `(() => {
  const el = [...document.querySelectorAll('input, textarea')].find((f) => f.placeholder.startsWith(${JSON.stringify(hint)}) && f.offsetParent !== null);
  if (!el) return false;
  el.focus();
  el.select();
  return document.activeElement === el;
})()`;
/**
 * The deepest element whose own text is exactly the label, clicked; with `within`, only one inside the tightest element
 * that also holds the text `within` (a row's card), so a row's Delete is never the Header's.
 */
const CLICK = (label, within) => `(() => {
  const want = ${JSON.stringify(label)}, within = ${JSON.stringify(within || null)};
  const hits = [...document.querySelectorAll('button, [role="button"], div, span, p')].filter((el) => el.textContent.trim() === want);
  let deepest = hits.filter((el) => !hits.some((other) => other !== el && el.contains(other)));
  if (within) {
    const scope = (el) => { let a = el; while (a && !a.textContent.includes(within)) a = a.parentElement; return a ? a.textContent.length : Infinity; };
    deepest = deepest.filter((el) => scope(el) < Infinity).sort((a, b) => scope(a) - scope(b));
  }
  if (!deepest.length) return false;
  (deepest[0].closest('button') || deepest[0]).click();
  return true;
})()`;

async function main() {
  const built = fs.readdirSync(W).filter((d) => d.startsWith('export-') && fs.existsSync(path.join(W, d, 'dist', 'index.html')));
  const wanted = process.argv.slice(2);
  const arms = (wanted.length ? wanted : ['runtime', ...built]).filter((a) => a === 'runtime' || built.includes(a));

  const { chrome } = findChrome();
  const ports = {};
  const servers = [];
  let runtime = null;
  for (const arm of arms) {
    ports[arm] = await freePort();
    if (arm === 'runtime') {
      runtime = spawn('node', [path.join(R, 'scripts/devtools/render-from-disk.js'), path.join(W, 'proj'), '--port', String(ports[arm])], { stdio: 'ignore' });
    } else {
      servers.push(await serveDist(path.join(W, arm, 'dist'), ports[arm]));
    }
  }
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'header141-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,1400', 'about:blank']);
  const out = { startedAt: new Date().toISOString(), seed: SEED };
  try {
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      await wait(250);
      try {
        target = (await httpJson(cdpPort, '/json/list')).find((p) => p.type === 'page');
      } catch {}
    }
    let arm = null;
    const events = {};
    const client = await connect(target.webSocketDebuggerUrl, (msg) => {
      const log = arm && (events[arm] = events[arm] || { console: [] });
      if (!log) return;
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        log.console.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 240));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        log.console.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 240));
      }
    });
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `if (!sessionStorage.getItem('s141-seeded')) { localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify(SEED))}); sessionStorage.setItem('s141-seeded', '1'); }`
    });
    const until = async (expr, ms = 20000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await evaluate(client, expr).catch(() => false)) return true;
        await wait(250);
      }
      return false;
    };
    const read = async () => ({ path: await evaluate(client, 'location.pathname'), lines: await evaluate(client, LINES), fields: await evaluate(client, FIELDS), store: await evaluate(client, STORE) });
    const shot = async (name) => {
      const s = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(X, `shot-${name}-${arm}.png`), Buffer.from(s.data, 'base64'));
    };
    const step = async (reading, name, fn, settle = 1500) => {
      const pressed = await fn();
      await wait(settle);
      reading[name] = { pressed, ...(await read()) };
    };
    for (const name of arms) {
      arm = name;
      const reading = {};
      const origin = `http://127.0.0.1:${ports[name]}`;
      try {
        await client.send('Page.navigate', { url: `${origin}/lists` });
        reading.H0ready = await until(HAS_TEXT('Capitals'), 30000);
        await wait(1500);
        reading.H0 = await read();
        await step(reading, 'H1', () => evaluate(client, CLICK('Ada')));
        await step(reading, 'H2', () => evaluate(client, CLICK('Edit player')));
        await shot('H2');
        await step(reading, 'H3', async () => {
          if (!(await evaluate(client, FOCUS_VALUE('Ada')))) return false;
          await client.send('Input.insertText', { text: 'Ada Lovelace' });
          return true;
        });
        await step(reading, 'H4', () => evaluate(client, CLICK('Save')));
        await shot('H4');
        await step(reading, 'H5', () => evaluate(client, CLICK('Edit player')));
        await step(reading, 'H6', () => evaluate(client, CLICK('Delete this player')));
        await step(reading, 'H7', () => evaluate(client, CLICK('Yes, delete')));
        await shot('H7');
        await client.send('Page.reload');
        await wait(4000);
        reading.H8 = await read();
      } catch (e) {
        reading.stoppedAt = String(e && e.stack ? e.stack : e).slice(0, 400);
      }
      out[name] = { ...reading, ...events[name] };
    }
  } finally {
    browser.kill();
    if (runtime) runtime.kill();
    servers.forEach((s) => s.close());
  }
  fs.writeFileSync(path.join(X, 'readings.json'), JSON.stringify(out, null, 1) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
