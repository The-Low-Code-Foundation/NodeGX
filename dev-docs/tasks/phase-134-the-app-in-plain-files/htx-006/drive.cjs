// HTX-006, the drive: a NodeGX settings menu inside a three.js page that is not NodeGX, exported, played, widened,
// exported again. Everything happens in `work/` (gitignored): a copy of the menu project
// (`packages/nodegx-export/tests/fixtures/game-menu`) and a copy of the game (`game/`), into which the export writes.
//
//   E1   `nodegx export --target html --component Settings` into the game's folder; `shasum` over the game's own files
//   G0   the game runs: frames advance, nothing of the menu on the page
//   G1   Pause (a real click): the menu is in the overlay, the game stops, the slider at the game's 0.8
//   G2   the slider pressed a quarter of the way along: the game's volume follows, through `outputs.volume`
//   G3   Resume (a real click): `outputs.resume` reaches the game; the menu is gone, the game runs
//   G4   Escape: the menu again, at the volume the game now holds; Escape again
//   REF  the same menu in its own app (the whole HTML export, its Preview page): its computed look, element by element
//   W    the panel made wider (280 → 420 px) in the menu project's file, as Studio saves it; E2 exported again
//   G5   reloaded, paused: the menu is 420 px wide; `shasum` over the game's own files equal to E1's
//   CTRL the same, with the cut's @import taken out for one load: the game's styles reach in (put back after)
//   H    a hand edit to an exported file: the next export refuses, names it, and writes nothing
//
// Writes `readings.json` and `shots/<step>.png`. Run with `node drive.cjs` (Chrome from Claude's bash: sandbox off).
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const R = '/Users/richardosborne/vscode_projects/OpenNoodl';
const X = __dirname;
const W = path.join(X, 'work');
const PKG = path.join(R, 'packages', 'nodegx-export');
const { findChrome, freePort, connect, evaluate, httpJson } = require(path.join(R, 'scripts/devtools/render-report.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OWN = ['index.html', 'game.js', 'game.css', 'vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/THREE-LICENSE'];

/** The export, as a person types it (from source: `bin/` runs the built `dist/`). */
function exportPart(project, out) {
  const r = spawnSync('npx', ['ts-node', '--transpile-only', '-O', '{"module":"commonjs"}', 'src/cli/main.ts', 'export', '--target', 'html', '--component', 'Settings', project, '--out-dir', out], { cwd: PKG, encoding: 'utf8' });
  return { exit: r.status, stdout: r.stdout.trim(), stderr: r.stderr.split('\n').filter((l) => !/^Reading |^If the editor/.test(l)).join('\n').trim() };
}
function exportWhole(project, out) {
  fs.rmSync(out, { recursive: true, force: true });
  const r = spawnSync('npx', ['ts-node', '--transpile-only', '-O', '{"module":"commonjs"}', 'src/cli/main.ts', 'export', '--target', 'html', project, out], { cwd: PKG, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`the whole export failed: ${r.stderr}`);
}
const shasum = (dir, files) => spawnSync('shasum', ['-a', '256', ...files], { cwd: dir, encoding: 'utf8' }).stdout.trim();
function snapshot(dir) {
  const out = {};
  const walk = (at) => {
    for (const e of fs.readdirSync(at, { withFileTypes: true })) {
      const p = path.join(at, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    }
  };
  walk(dir);
  return out;
}
async function waitForHttp(port) {
  for (let i = 0; i < 80; i++) {
    try {
      await new Promise((resolve, reject) => require('http').get(`http://127.0.0.1:${port}/`, (res) => (res.resume(), resolve())).on('error', reject));
      return;
    } catch {
      await wait(150);
    }
  }
  throw new Error(`nothing answered on ${port}`);
}

/** The menu's look, element by element: what a person sees, and the page's styles that could reach in. */
const LOOK = `(() => {
  const props = ['width', 'height', 'font-family', 'font-size', 'font-weight', 'color', 'letter-spacing', 'text-transform', 'background-color', 'border-top-width', 'border-top-style', 'border-top-color', 'border-radius', 'padding-left', 'padding-top', 'margin-top', 'cursor', 'box-sizing'];
  const pick = (el) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = p === 'width' || p === 'height' ? Math.round(el.getBoundingClientRect()[p]) + 'px' : s.getPropertyValue(p);
    return o;
  };
  const panel = document.querySelector('.Settings-panel');
  if (!panel) return null;
  return {
    panel: pick(panel),
    title: pick(panel.querySelector('.Settings-title')),
    label: pick(panel.querySelector('.Settings-volumeLabel')),
    slider: pick(panel.querySelector('input[type="range"]')),
    resume: pick(panel.querySelector('button'))
  };
})()`;
const GAME = `(() => {
  const g = window.game;
  const overlay = document.getElementById('overlay');
  const slider = document.querySelector('.nodegx-Settings input[type="range"]');
  return {
    paused: g.paused, volume: g.volume, frames: g.frames, resumes: g.resumes,
    hud: document.getElementById('hud').innerText.replace(/\\s+/g, ' ').trim(),
    overlayShown: !overlay.hidden,
    menus: document.querySelectorAll('.nodegx-Settings').length,
    menuText: overlay.innerText.replace(/\\s+/g, ' ').trim(),
    slider: slider ? slider.value : null,
    panelWidth: document.querySelector('.Settings-panel') ? Math.round(document.querySelector('.Settings-panel').getBoundingClientRect().width) : null
  };
})()`;
const CENTRE = (selector, along = 0.5) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * ${along}, y: r.top + r.height / 2 };
})()`;

async function main() {
  fs.rmSync(W, { recursive: true, force: true });
  fs.mkdirSync(W, { recursive: true });
  fs.rmSync(path.join(X, 'shots'), { recursive: true, force: true });
  fs.mkdirSync(path.join(X, 'shots'), { recursive: true });
  const project = path.join(W, 'game-menu');
  const game = path.join(W, 'game');
  fs.cpSync(path.join(PKG, 'tests', 'fixtures', 'game-menu'), project, { recursive: true });
  fs.cpSync(path.join(X, 'game'), game, { recursive: true });
  const reading = { steps: [] };
  const own = () => shasum(game, OWN);

  reading.gameFilesBeforeAnyExport = snapshot(game);
  reading.E1 = exportPart(project, game);
  reading.E1.shasum = own();
  reading.E1.folder = Object.keys(snapshot(game)).sort();
  exportWhole(project, path.join(W, 'whole'));

  const { chrome } = findChrome();
  const cdpPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'htx006-'));
  const browser = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--use-mock-keychain', '--no-first-run', '--no-default-browser-check', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', 'about:blank']);
  const servers = [];
  try {
    const gamePort = await freePort();
    servers.push(spawn('python3', ['-m', 'http.server', String(gamePort), '--bind', '127.0.0.1'], { cwd: game, stdio: 'ignore' }));
    const refPort = await freePort();
    servers.push(spawn('python3', ['-m', 'http.server', String(refPort), '--bind', '127.0.0.1'], { cwd: path.join(W, 'whole'), stdio: 'ignore' }));
    await waitForHttp(gamePort);
    await waitForHttp(refPort);
    let target = null;
    for (let i = 0; i < 60 && !target; i++) {
      await wait(250);
      try {
        target = (await httpJson(cdpPort, '/json/list')).find((p) => p.type === 'page');
      } catch {}
    }
    const consoleLines = [];
    const client = await connect(target.webSocketDebuggerUrl, (msg) => {
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) consoleLines.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 240));
      else if (msg.method === 'Runtime.exceptionThrown') consoleLines.push(`exception: ${(msg.params.exceptionDetails.exception || {}).description || msg.params.exceptionDetails.text}`.slice(0, 240));
    });
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    const until = async (expr, ms = 15000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (await evaluate(client, expr)) return true;
        await wait(150);
      }
      return false;
    };
    const press = async (selector, along) => {
      const at = await evaluate(client, CENTRE(selector, along));
      if (!at) throw new Error(`nothing at ${selector}`);
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    };
    const key = async (k, code, vk) => {
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
    };
    const emit = async (step, extra = {}) => {
      const r = await evaluate(client, GAME);
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(X, 'shots', `${step}.png`), Buffer.from(shot.data, 'base64'));
      reading.steps.push({ step, ...r, ...extra });
      return r;
    };
    /** Whether the game's frame count moves over 600 ms. */
    const running = async () => {
      const a = await evaluate(client, 'window.game.frames');
      await wait(600);
      return (await evaluate(client, 'window.game.frames')) > a;
    };

    await client.send('Page.navigate', { url: `http://127.0.0.1:${gamePort}/` });
    await until('window.game && window.game.frames > 10');
    await emit('G0', { running: await running() });
    await press('#pause');
    await until("!!document.querySelector('.Settings-panel')");
    await wait(200);
    await emit('G1', { running: await running(), look: await evaluate(client, LOOK) });
    await press('.nodegx-Settings input[type="range"]', 0.25);
    await wait(200);
    await emit('G2', { running: await running() });
    await press('.nodegx-Settings button');
    await wait(300);
    await emit('G3', { running: await running() });
    await key('Escape', 'Escape', 27);
    await until("!!document.querySelector('.Settings-panel')");
    await wait(200);
    await emit('G4', { running: await running() });
    await key('Escape', 'Escape', 27);
    await wait(300);
    await emit('G4after', { running: await running() });

    // The same menu in its own app.
    await client.send('Page.navigate', { url: `http://127.0.0.1:${refPort}/` });
    await until("!!document.querySelector('.Settings-panel')");
    await wait(300);
    reading.REF = { look: await evaluate(client, LOOK) };
    fs.writeFileSync(path.join(X, 'shots', 'REF.png'), Buffer.from((await client.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));

    // W. The panel wider, as Studio saves it: the one parameter, in the component's nodes.json.
    const nodesFile = path.join(project, 'components', 'Menu', 'Settings', 'nodes.json');
    const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
    nodes.nodes.find((n) => n.id === 'panel').parameters.width = { value: 420, unit: 'px' };
    fs.writeFileSync(nodesFile, JSON.stringify(nodes, null, 2) + '\n');
    const beforeE2 = snapshot(game);
    reading.E2 = exportPart(project, game);
    reading.E2.shasum = own();
    const afterE2 = snapshot(game);
    reading.E2.changed = Object.keys(afterE2).filter((f) => afterE2[f] !== beforeE2[f]).sort();
    reading.ownFilesEqual = reading.E2.shasum === reading.E1.shasum;

    await client.send('Page.navigate', { url: `http://127.0.0.1:${gamePort}/` });
    await until('window.game && window.game.frames > 10');
    await press('#pause');
    await until("!!document.querySelector('.Settings-panel')");
    await wait(200);
    await emit('G5', { look: await evaluate(client, LOOK) });

    // CTRL. The same reading with the cut taken out (its @import removed for one load, then put back byte for byte): what
    // the game's own styles do to the menu without it. A zero above only counts beside a reading that can see a leak.
    const sheet = path.join(game, 'Settings.css');
    const kept = fs.readFileSync(sheet);
    fs.writeFileSync(sheet, kept.toString('utf8').replace(/^@import url\('styles\/Settings\.floor\.css'\);\n/m, ''));
    await client.send('Page.navigate', { url: `http://127.0.0.1:${gamePort}/` });
    await until('window.game && window.game.frames > 10');
    await press('#pause');
    await until("!!document.querySelector('.Settings-panel')");
    await wait(200);
    reading.CTRL = { look: await evaluate(client, LOOK) };
    fs.writeFileSync(path.join(X, 'shots', 'CTRL-no-cut.png'), Buffer.from((await client.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
    fs.writeFileSync(sheet, kept);
    reading.console = consoleLines;
  } finally {
    for (const s of servers) s.kill();
    browser.kill();
  }

  // H. A hand edit to a file the export wrote: the next export refuses and names it, and writes nothing.
  fs.appendFileSync(path.join(game, 'components', 'Settings.css'), '\n/* tried a red outline */\n.Settings-panel { outline: 2px solid red; }\n');
  const beforeH = snapshot(game);
  reading.H = exportPart(project, game);
  reading.H.nothingWritten = JSON.stringify(snapshot(game)) === JSON.stringify(beforeH);

  fs.writeFileSync(path.join(X, 'readings.json'), JSON.stringify(reading, null, 1) + '\n');
  console.log(JSON.stringify({ E1: reading.E1.stdout, E2: reading.E2.stdout, changed: reading.E2.changed, ownFilesEqual: reading.ownFilesEqual, H: [reading.H.exit, reading.H.stderr], nothingWritten: reading.H.nothingWritten, steps: reading.steps.map(({ look, ...s }) => s), console: reading.console }, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
