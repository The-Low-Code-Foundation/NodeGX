/**
 * P112 OWN-004 slice 2 — the gate for orbit.html, in headless Chrome (software WebGL), over CDP:
 *
 *  - Orbit's v2 files run as the real app (NodeGX's own runtime, `@noodl/preview` in the page): 28 cards, 37 wires,
 *    9 visual nodes, and each visual node's element found in the app (`preview.elementsOf`).
 *  - AC2: every one of the 37 wires is seen carrying a value or a signal in the app's own trace — after a natural
 *    Focus → Break → Focus (Focus 3 s, Break 2 s, written through the store; the clock at 1×), a real press on Pause and one on Skip.
 *  - The ruling (2026-10-10, both poses with a switch): a REAL press — Input.dispatchMouseEvent at the screen point the
 *    page projects the button to — reaches the app in the scene (posed in 3D) and in the window, and changes it.
 *
 *   node check.mjs [--shot <dir>]        exits 0 PASS, 1 FAIL, 2 when the runtime, the bundle or Chrome is missing
 *
 * Needs the network for Three.js (cdnjs / jsdelivr), as the page does.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..', '..', '..');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome)) { console.log(`check: no Chrome at ${chrome}`); process.exit(2); }
if (!existsSync(join(here, 'look.js'))) { console.log('check: no look.js — run ./build.sh'); process.exit(2); }
const shotAt = process.argv.indexOf('--shot');
const shotDir = shotAt > 0 ? process.argv[shotAt + 1] : undefined;
const { connect, evaluate } = createRequire(import.meta.url)(join(repo, 'scripts/devtools/cdp.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });

const sitePort = await freePort();
const site = spawn(process.execPath, [join(here, 'serve.mjs'), String(sitePort)], { stdio: ['ignore', 'pipe', 'inherit'] });
const up = await new Promise((r) => { site.stdout.on('data', (d) => /serve: http/.test(String(d)) && r(true)); site.once('exit', () => r(false)); });
if (!up) { console.log('check: serve.mjs did not start'); process.exit(2); }

const cdpPort = await freePort();
const profile = mkdtempSync(join(tmpdir(), 'orbit-check-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const fails = [];
const ok = (cond, what) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${what}`); if (!cond) fails.push(what); };
let client;
try {
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await wait(250);
    try { target = await new Promise((res, rej) => http.get({ host: '127.0.0.1', port: cdpPort, path: '/json/list' }, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b).find((t) => t.type === 'page')); } catch (e) { rej(e); } }); }).on('error', rej)); } catch { /* not up yet */ }
  }
  client = await connect(target);
  const problems = [];
  client.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') problems.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(m.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
  });
  await client.send('Runtime.enable');
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const text = () => evaluate(client, '__orbit.preview.frame.contentDocument.body.innerText.split(String.fromCharCode(10)).join(" | ")');
  /** A real press at the screen point where the page shows this node's element, then what the app says. */
  async function press(nodeId, expect) {
    const at = await evaluate(client, `(() => { const el = __orbit.preview.elementsOf(${JSON.stringify(nodeId)})[0]; const r = el.getBoundingClientRect(); return __orbit.project(r.left + r.width / 2, r.top + r.height / 2); })()`);
    const hit = await evaluate(client, `(() => { const e = document.elementFromPoint(${at.x}, ${at.y}); return e ? e.tagName : 'none'; })()`);
    // what the app's own document receives: the element under the press, in the app's own pixels
    await evaluate(client, `(() => { const d = __orbit.preview.frame.contentDocument; window.__got = []; if (!d.__hooked) { d.__hooked = true; d.addEventListener('click', (e) => window.__got.push((e.target.innerText || e.target.tagName).trim().slice(0, 12) + '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY)), true); } })()`);
    const before = await text();
    const seq = await evaluate(client, '__orbit.recent.length ? __orbit.recent[__orbit.recent.length - 1].seq : 0');
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
    // the app's screen redraws on its own frames, which a busy software-WebGL page starves: wait for it to change
    const t = Date.now();
    for (let now = await text(); Date.now() - t < 6000 && (expect ? !expect(now, before) : now === before); now = await text()) await wait(100);
    return { at, hit, before, got: await evaluate(client, 'window.__got'), after: await text(), trace: await evaluate(client, `__orbit.recent.filter((e) => e.seq > ${seq} && !/smooth|barPct|sky|toMs|clockface|hud|glow|progress/.test(e.fromNode + e.fromPort)).slice(0, 30).map((e) => e.seq + ' ' + e.fromNode + '.' + e.fromPort + '>' + e.toNode + '.' + e.toPort + '=' + e.value)`) };
  }
  const waitFor = async (pred, ms) => { const t = Date.now(); let s = await text(); while (!pred(s) && Date.now() - t < ms) { await wait(150); s = await text(); } return s; };

  for (const pose of ['scene', 'window']) {
    console.log(`check: ${pose}`);
    await client.send('Page.navigate', { url: `http://127.0.0.1:${sitePort}/orbit.html?speed=1&set=focusLen.value=3&set=breakLen.value=2&pose=${pose}` });
    let title = 'pending';
    for (let i = 0; i < 200 && (title === 'pending' || title === ''); i++) { await wait(200); title = await evaluate(client, 'document.title').catch(() => 'pending'); }
    ok(title.startsWith('ready nodes=28 wires=37 visual=9'), `page ready (${title})`);
    if (!title.startsWith('ready')) continue;
    await wait(1500);   // the pose settles (the switch eases in)
    const found = await evaluate(client, '__orbit.visual.filter((id) => __orbit.preview.elementsOf(id).length > 0).length');
    ok(found === 9, `each visual node's element found in the app (${found} / 9)`);
    const cycle = await waitFor((s) => /BREAK/.test(s), 15000);
    const back = await waitFor((s) => /FOCUS/.test(s) && /Round 1 /.test(s), 15000);
    ok(/BREAK/.test(cycle) && /FOCUS/.test(back) && /Round 1 /.test(back), `a natural Focus → Break → Focus (${back})`);
    const before = await text();
    const pause = await press('pauseBtn', (now) => /\| Start \|/.test(now));
    ok(pause.hit === 'IFRAME' && /\| Start \|/.test(pause.after), `a real press on Pause reaches the app ${pose === 'scene' ? 'posed in 3D' : 'in its window'} (hit ${pause.hit} at ${pause.at.x},${pause.at.y}; ${pause.after})`);
    const was = /BREAK/.test(pause.after) ? 'BREAK' : 'FOCUS';
    const skip = await press('skipBtn', (now) => !now.startsWith(was) && /Round \d+ · (Break|Focus)/.test(now) && now.startsWith(now.match(/· (Break|Focus)/)[1].toUpperCase()));
    ok(!skip.after.startsWith(was), `a real press on Skip changes the phase (${was} → ${skip.after.split(' | ')[0]}; the app received ${JSON.stringify(skip.got)}; before: ${skip.before}; after: ${skip.after})${skip.after.startsWith(was) ? '\n      trace after the press: ' + skip.trace.join('\n        ') : ''}`);
    await press('pauseBtn', (now) => /\| Pause \|/.test(now));   // running again, so the stop / start wires have both carried something
    await wait(800);
    const seen = await evaluate(client, '({ seen: __orbit.conns.filter((c) => __orbit.wiresSeen.has(c.fromId + "." + c.fromProperty + ">" + c.toId + "." + c.toProperty)).length, missing: __orbit.conns.filter((c) => !__orbit.wiresSeen.has(c.fromId + "." + c.fromProperty + ">" + c.toId + "." + c.toProperty)).map((c) => c.fromId + "." + c.fromProperty + ">" + c.toId + "." + c.toProperty) })');
    ok(seen.missing.length === 0, `AC2: wires seen carrying something in the app's trace ${seen.seen} / ${seen.seen + seen.missing.length}${seen.missing.length ? ' missing ' + JSON.stringify(seen.missing) : ''}`);
    const lit = await evaluate(client, 'Object.keys(__orbit.last).length');
    ok(lit > 0, `the cards hold live values (${lit} port values)`);
    if (shotDir) {
      const { data } = await client.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(shotDir, `orbit-${pose}.png`), Buffer.from(data, 'base64'));
    }
    ok(problems.length === 0, `no exception or console error${problems.length ? ': ' + [...new Set(problems)].slice(0, 3).join(' / ') : ''}`);
    problems.length = 0;
    void before;
  }
} catch (err) {
  fails.push(String(err && err.message));
  console.log(`check: FAIL ${err && err.stack}`);
} finally {
  try { client?.close(); } catch { /* gone */ }
  const exited = new Promise((r) => proc.once('exit', r));
  proc.kill();
  await exited;
  site.kill();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* Chrome may still hold a file */ }
}
console.log(fails.length ? `check: FAIL (${fails.length})` : 'check: PASS');
process.exit(fails.length ? 1 : 0);
