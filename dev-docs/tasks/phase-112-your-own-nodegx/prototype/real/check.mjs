/**
 * P112 OWN-004 — the gate for orbit.html, in headless Chrome (software WebGL), over CDP.
 *
 * Slice 3 (AC3), in Graph, with real input (Input.dispatchMouseEvent / insertText at the points the page draws things):
 *  - editing: + Add node → the picker → a Counter; its Start Value typed in the Node panel; a wire dragged from Seconds
 *    elapsed's connector to the new card and picked in the connect popup; a card moved; the new node deleted. Each is
 *    read back from the STORE (the files), the app is rebuilt from them, and the new wire is seen carrying signals in
 *    the real app's trace. Moving a card writes its position and does not rebuild the app.
 *  - the structure from the Node panel: a screen node put first in its parent (the real app draws it first), renamed,
 *    and put back — each read back from the files.
 *  - the missions: each Check fails on the graph as it starts, for its own reason (the checks have teeth); each
 *    "Show me" (pressed with the mouse) builds the answer through the store and its Check then passes; all three pass
 *    together at the end. A Check plays the graph on a COPY of the files in a second real app, never on a stand-in.
 *
 * Slice 2, in Orbit, both poses:
 *
 *  - Orbit's v2 files run as the real app (NodeGX's own runtime, `@noodl/preview` in the page): 28 cards, 37 wires,
 *    9 visual nodes, and each visual node's element found in the app (`preview.elementsOf`).
 *  - AC2: every one of the 37 wires is seen carrying a value or a signal in the app's own trace — after a natural
 *    Focus → Break → Focus (Focus 3 s, Break 2 s, written through the store; the clock at 1×), a real press on Pause and one on Skip.
 *  - The ruling (2026-10-10, both poses with a switch): a REAL press — Input.dispatchMouseEvent at the screen point the
 *    page projects the button to — reaches the app in the scene (posed in 3D) and in the window, and changes it.
 *
 * OWN-012 step 4, in Orbit, the drawn pose: the phone is drawn (one box per visual node), a press on it is not a press
 * on the app (it is a picture), and one press on "App in the scene" brings the real app back, which a press reaches.
 *
 *   node check.mjs [--shot <dir>]        exits 0 PASS, 1 FAIL, 2 when the runtime, the bundle or Chrome is missing
 *   node check.mjs --site <url>          grades the page at <url> instead (a folder from `serve.mjs --out`, e.g. https://nodegx.io/orbit/)
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
const siteAt = process.argv.indexOf('--site');
const { connect, evaluate } = createRequire(import.meta.url)(join(repo, 'scripts/devtools/cdp.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });

const sitePort = await freePort();
const site = siteAt > 0 ? undefined : spawn(process.execPath, [join(here, 'serve.mjs'), String(sitePort)], { stdio: ['ignore', 'pipe', 'inherit'] });
const up = !site || await new Promise((r) => { site.stdout.on('data', (d) => /serve: http/.test(String(d)) && r(true)); site.once('exit', () => r(false)); });
if (!up) { console.log('check: serve.mjs did not start'); process.exit(2); }
const page = siteAt > 0 ? process.argv[siteAt + 1] : `http://127.0.0.1:${sitePort}/orbit.html`;

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
  const mouse = async (type, x, y) => client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
  const rectOf = (sel) => evaluate(client, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); el?.scrollIntoView({ block: 'nearest' }); const r = el?.getBoundingClientRect(); return r && r.width ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null; })()`);
  const clickSel = async (sel) => { const at = await rectOf(sel); if (!at) throw new Error(`nothing on screen at ${sel}`); await click(at.x, at.y); return at; };
  async function drag(from, to, steps = 12) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, button: 'none' });
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= steps; i++) { await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(from.x + (to.x - from.x) * i / steps), y: Math.round(from.y + (to.y - from.y) * i / steps), button: 'left', buttons: 1 }); await wait(30); }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
  }
  const until = async (expr, ms) => { const t = Date.now(); let v = await evaluate(client, expr); while (!v && Date.now() - t < ms) { await wait(150); v = await evaluate(client, expr); } return v; };
  const stored = `__orbit.store.readComponent('App').files`;
  const waitFor = async (pred, ms) => { const t = Date.now(); let s = await text(); while (!pred(s) && Date.now() - t < ms) { await wait(150); s = await text(); } return s; };

  {
    console.log('check: graph — editing and missions (slice 3)');
    await client.send('Page.navigate', { url: `${page}?stage=graph` });
    let title = 'pending';
    for (let i = 0; i < 200 && (title === 'pending' || title === ''); i++) { await wait(200); title = await evaluate(client, 'document.title').catch(() => 'pending'); }
    ok(title.startsWith('ready nodes=28 wires=37 visual=9'), `page ready in Graph (${title})`);
    if (!title.startsWith('ready')) throw new Error('the page did not start');
    await wait(1000);
    // + Add node → search → a Counter
    await clickSel('#add');
    ok(await until('!document.getElementById("picker").hidden', 2000), 'the picker opens on + Add node');
    await client.send('Input.insertText', { text: 'Counter' });
    await wait(200);
    await clickSel('#picklist [data-type="Counter"]');
    const added = await until(`${stored}.nodes.nodes.length === 29 && __orbit.lastShow.status === 'ok' && __orbit.selected`, 8000);
    const id = added ? await evaluate(client, '__orbit.selected') : null;
    ok(!!added && /^counter\d+$/.test(id), `the picker adds a Counter to the files and selects it (${id}); the app rebuilt`);
    // its Start Value, typed into the Node panel
    await clickSel('#prop-startValue');
    await evaluate(client, 'document.getElementById("prop-startValue").select()');
    await client.send('Input.insertText', { text: '7' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    ok(await until(`${stored}.nodes.nodes.find((n) => n.id === '${id}').parameters.startValue === 7`, 5000), 'a property typed in the Node panel is written into the files (startValue 7)');
    // a wire, dragged from Seconds elapsed's connector onto the new card, then picked in the connect popup
    await drag(await evaluate(client, `__orbit.screenOf('elapsed', 'handle')`), await evaluate(client, `__orbit.screenOf('${id}')`));
    ok(await until('!document.getElementById("conpop").hidden', 3000), 'dropping a dragged wire on a card opens the connect popup');
    await clickSel('#conpop [data-out="countChanged"]');
    await clickSel('#conpop [data-in="increase"]');
    const wkey = `elapsed.countChanged>${id}.increase`;
    ok(await until(`${stored}.connections.connections.some((c) => c.fromId + '.' + c.fromProperty + '>' + c.toId + '.' + c.toProperty === '${wkey}')`, 5000), `the wire is written into the files (${wkey})`);
    ok(await until(`__orbit.wiresSeen.has('${wkey}')`, 15000), 'the new wire carries signals in the real app (its trace)');
    // a card moved: its position is written, the app is not rebuilt
    const shows = await evaluate(client, '__orbit.shows');
    const xy0 = await evaluate(client, `(({ x, y }) => [x, y])(${stored}.nodes.nodes.find((n) => n.id === 'breakLen'))`);
    const from = await evaluate(client, `__orbit.screenOf('breakLen')`);
    await drag(from, { x: from.x, y: from.y + 60 });
    const xy1 = await until(`(({ x, y }) => (y !== ${xy0[1]} ? [x, y] : null))(${stored}.nodes.nodes.find((n) => n.id === 'breakLen'))`, 3000);
    ok(!!xy1 && (await evaluate(client, '__orbit.shows')) === shows, `moving a card writes its position into the files (${xy0} → ${xy1}) and does not rebuild the app`);
    // delete the new node from its panel
    const at = await evaluate(client, `__orbit.screenOf('${id}')`);
    await click(at.x, at.y);
    await until(`__orbit.selected === '${id}' && !!document.getElementById('delnode')`, 3000);
    await clickSel('#delnode');
    ok(await until(`${stored}.nodes.nodes.length === 28 && ${stored}.connections.connections.length === 37 && __orbit.lastShow.status === 'ok'`, 8000), 'Delete node removes it and its wire from the files; the app rebuilt');
    // the structure, from the Node panel: a screen node moved to first place in its parent, renamed, and put back
    const typeInto = async (sel, text) => {
      await clickSel(sel);
      await evaluate(client, `document.querySelector(${JSON.stringify(sel)}).select()`);
      await client.send('Input.insertText', { text });
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    };
    const foot = await evaluate(client, `__orbit.screenOf('footTxt')`);
    await click(foot.x, foot.y);
    ok(await until(`__orbit.selected === 'footTxt' && !!document.getElementById('prop--index')`, 3000), 'a screen node selected on the canvas shows where it sits (Inside, Place in it)');
    await typeInto('#prop--index', '1');
    const first = await until(`${stored}.nodes.nodes.find((n) => n.id === 'screen').children[0] === 'footTxt' && __orbit.lastShow.status === 'ok' && (() => { const f = __orbit.preview.elementsOf('footTxt')[0], p = __orbit.preview.elementsOf('phaseTxt')[0]; return f && p && f.getBoundingClientRect().top < p.getBoundingClientRect().top; })()`, 8000);
    ok(!!first, 'Place in it = 1 writes the footer first among the screen\'s children, and the real app draws it above the phase label');
    await typeInto('#prop--label', 'Round line text');
    ok(await until(`${stored}.nodes.nodes.find((n) => n.id === 'footTxt').label === 'Round line text'`, 5000), 'a label typed in the Node panel renames the node in the files');
    await typeInto('#prop--index', '4');
    ok(await until(`${stored}.nodes.nodes.find((n) => n.id === 'screen').children[3] === 'footTxt' && __orbit.lastShow.status === 'ok'`, 8000), 'and Place in it = 4 puts it back');
    // the missions: every Check fails first, for its own reason
    const why = ['still running', 'switched back to Focus', 'Still running after'];
    for (let i = 0; i < 3; i++) {
      const v = await evaluate(client, `__orbit.check(${i})`);
      ok(v[0] === false && v[1].includes(why[i]), `mission ${i + 1} fails on the graph as it starts: "${v[1]}" (${v[2]})`);
    }
    for (let i = 0; i < 3; i++) {
      await evaluate(client, 'document.getElementById("tab-missions").click()');
      await clickSel(`[data-show="${i}"]`);
      ok(await until(`__orbit.mstate[${i}].busy`, 3000), `mission ${i + 1}: the press on Show me starts the build`);
      const v = await until(`__orbit.mstate[${i}].verdict && __orbit.mstate[${i}].verdict[0] !== null && !__orbit.mstate[${i}].busy && __orbit.mstate[${i}].verdict`, 90000);
      ok(v && v[0] === true, `mission ${i + 1}: Show me builds it and its Check passes in the real app${v ? ` — "${v[1]}" (${v[2]})` : ''}`);
    }
    const all = [];
    for (let i = 0; i < 3; i++) all.push((await evaluate(client, `__orbit.check(${i})`))[0]);
    const size = await evaluate(client, `[${stored}.nodes.nodes.length, ${stored}.connections.connections.length]`);
    ok(all.every(Boolean), `all three hold together (${all.join(', ')}) on ${size[0]} nodes, ${size[1]} wires`);
    if (shotDir) { const { data } = await client.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shotDir, 'orbit-graph.png'), Buffer.from(data, 'base64')); }
    ok(problems.length === 0, `no exception or console error${problems.length ? ': ' + [...new Set(problems)].slice(0, 3).join(' / ') : ''}`);
    problems.length = 0;
  }

  for (const pose of ['scene', 'window']) {
    console.log(`check: ${pose}`);
    await client.send('Page.navigate', { url: `${page}?stage=orbit&speed=1&set=focusLen.value=3&set=breakLen.value=2&pose=${pose}` });
    let title = 'pending';
    for (let i = 0; i < 200 && (title === 'pending' || title === ''); i++) { await wait(200); title = await evaluate(client, 'document.title').catch(() => 'pending'); }
    ok(title.startsWith('ready nodes=28 wires=37 visual=9'), `page ready (${title})`);
    if (!title.startsWith('ready')) continue;
    await wait(1500);
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

  {
    // OWN-012 step 4: the third pose. The phone is a picture the page drew from the descriptions (its grade, box by box
    // against the real app, is own-012/measure.mjs --page orbit); here: it is drawn, it is not the app, and the real app
    // is one press away.
    console.log('check: drawn');
    await client.send('Page.navigate', { url: `${page}?stage=orbit&speed=1&pose=drawn` });
    let title = 'pending';
    for (let i = 0; i < 200 && (title === 'pending' || title === ''); i++) { await wait(200); title = await evaluate(client, 'document.title').catch(() => 'pending'); }
    ok(title.startsWith('ready nodes=28 wires=37 visual=9'), `page ready (${title})`);
    if (!title.startsWith('ready')) throw new Error('the page did not start');
    const drawn = await until(`__orbit.drawn.on && __orbit.drawn.drawing && __orbit.drawn.drawing.boxes.filter((b) => b.present).length`, 8000);
    ok(drawn === 9, `the phone is drawn from the descriptions: ${drawn} boxes, one per visual node, the real app unseen behind it (${await evaluate(client, `document.getElementById('app').className`)})`);
    const pic = await press('pauseBtn', (now, was) => now !== was);
    ok(pic.hit !== 'IFRAME' && pic.got.length === 0, `a real press on the drawn Pause lands on the picture, not the app (hit ${pic.hit}; the app received ${JSON.stringify(pic.got)})`);
    await clickSel('[data-mode="scene"]');
    ok(await until(`__orbit.mode === 'scene' && !__orbit.drawn.on && !document.getElementById('app').classList.contains('drawn')`, 3000), 'one press on App in the scene puts the real app back on the phone');
    await wait(1200);   // the pose settles
    const real = await press('pauseBtn', (now, was) => now !== was);
    ok(real.hit === 'IFRAME' && real.after !== real.before, `and a real press on Pause reaches it again (hit ${real.hit}; ${real.before} → ${real.after})`);
    if (shotDir) { const { data } = await client.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shotDir, 'orbit-drawn-then-real.png'), Buffer.from(data, 'base64')); }
    ok(problems.length === 0, `no exception or console error${problems.length ? ': ' + [...new Set(problems)].slice(0, 3).join(' / ') : ''}`);
    problems.length = 0;
  }
} catch (err) {
  fails.push(String(err && err.message));
  console.log(`check: FAIL ${err && err.stack}`);
} finally {
  try { client?.close(); } catch { /* gone */ }
  const exited = new Promise((r) => proc.once('exit', r));
  proc.kill();
  await exited;
  site?.kill();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch { /* Chrome may still hold a file */ }
}
console.log(fails.length ? `check: FAIL (${fails.length})` : 'check: PASS');
process.exit(fails.length ? 1 : 0);
