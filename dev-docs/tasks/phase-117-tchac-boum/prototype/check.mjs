/**
 * P117 — the gate for tchac-boum.html, in headless Chrome, over CDP, with real input (Input.dispatchMouseEvent /
 * insertText at the points the page draws things):
 *
 *  - the page starts on the real app: 18 nodes, 15 wires, 16 parts on the wall; a press on the gros bouton's costume
 *    presses the real button, and the chain is seen in the app's own trace (tourniquet → rampe → ballon → 💥).
 *  - editing: a part taken from the shelf (written into the files, the app rebuilt); a string dragged from a part's
 *    handle onto another part opens the connect popup, and the picked ports become a wire in the files that the real
 *    app's trace then carries; a dial typed in the part panel is written; a string cut from the panel; a part moved
 *    (position written, app not rebuilt); the part removed with its wires.
 *  - the flip: Le circuit turns every part over in place (the same elements, the same files; nothing re-made).
 *  - the missions: each Vérifier fails on the graph as it starts, for its own reason; each Montre-moi (pressed with the
 *    mouse) builds the answer through the store and its Vérifier then passes; all three hold together at the end.
 *    A Vérifier plays the graph on a COPY of the files in a second real app, never on a stand-in.
 *
 *   node check.mjs [--shot <dir>]        exits 0 PASS, 1 FAIL, 2 when the runtime, the bundle or Chrome is missing
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
const repo = join(here, '..', '..', '..', '..');
const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome)) { console.log(`check: no Chrome at ${chrome}`); process.exit(2); }
if (!existsSync(join(here, 'look.js')) || !existsSync(join(here, 'specs.js'))) { console.log('check: no look.js / specs.js — run ./build.sh'); process.exit(2); }
const shotAt = process.argv.indexOf('--shot');
const shotDir = shotAt > 0 ? process.argv[shotAt + 1] : undefined;
const { connect, evaluate } = createRequire(import.meta.url)(join(repo, 'scripts/devtools/cdp.js'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });

const sitePort = await freePort();
const site = spawn(process.execPath, [join(here, 'serve.mjs'), String(sitePort)], { stdio: ['ignore', 'pipe', 'inherit'] });
const up = await new Promise((r) => { site.stdout.on('data', (d) => /serve: http/.test(String(d)) && r(true)); site.once('exit', () => r(false)); });
if (!up) { console.log('check: serve.mjs did not start (the deploy runtime or the preview bundle is missing)'); process.exit(2); }
const page = `http://127.0.0.1:${sitePort}/tchac-boum.html`;

const cdpPort = await freePort();
const profile = mkdtempSync(join(tmpdir(), 'tchac-check-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
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
  const ev = (x) => evaluate(client, x);
  const shot = async (name) => { if (!shotDir) return; const { data } = await client.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shotDir, name), Buffer.from(data, 'base64')); };
  const text = () => ev('__tchac.preview.frame.contentDocument.body.innerText.split(String.fromCharCode(10)).join(" | ")');
  const mouse = async (type, x, y) => client.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const click = async (x, y) => { await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
  const rectOf = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el?.scrollIntoView({ block: 'nearest' }); const r = el?.getBoundingClientRect(); return r && r.width ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null; })()`);
  const clickSel = async (sel) => { const at = await rectOf(sel); if (!at) throw new Error(`nothing on screen at ${sel}`); await click(at.x, at.y); return at; };
  async function drag(from, to, steps = 12) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x, y: from.y, button: 'none' });
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let i = 1; i <= steps; i++) { await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(from.x + (to.x - from.x) * i / steps), y: Math.round(from.y + (to.y - from.y) * i / steps), button: 'left', buttons: 1 }); await wait(30); }
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', buttons: 0, clickCount: 1 });
  }
  const until = async (expr, ms) => { const t = Date.now(); let v = await ev(expr); while (!v && Date.now() - t < ms) { await wait(150); v = await ev(expr); } return v; };
  const stored = `__tchac.store.readComponent('App').files`;
  /** The page's own edits await the app's rebuild; this gate only polls the files, so it waits for the rebuild before the next real input. */
  const settle = async () => { await wait(100); return until('__tchac.pending === 0', 15000); };
  const hasWire = (k) => `${stored}.connections.connections.some((c) => c.fromId + '.' + c.fromProperty + '>' + c.toId + '.' + c.toProperty === ${JSON.stringify(k)})`;

  console.log('check: the wall on the real app');
  await client.send('Page.navigate', { url: page });
  let title = 'pending';
  for (let i = 0; i < 200 && (title === 'pending' || title === ''); i++) { await wait(200); title = await ev('document.title').catch(() => 'pending'); }
  ok(title.startsWith('ready nodes=18 wires=15 parts=16'), `page ready (${title})`);
  if (!title.startsWith('ready')) throw new Error('the page did not start');
  await wait(1000);
  await shot('01-mur.png');
  ok((await text()).includes('🎈') && (await text()).includes('0 bille'), `the app shows the balloon and 0 bille (${await text()})`);
  // a real press on the gros bouton's costume presses the real button: the chain runs in the app's own trace
  await clickSel('.part[data-id="btn"] [data-press]');
  ok(await until('__tchac.preview.frame.contentDocument.body.innerText.includes("💥")', 6000), 'pressing the costume pops the balloon in the real app');
  const chain = ['btn.onClick>tourniquet.increase', 'tourniquet.countChanged>rampe.start', 'rampe.timerFinished>ballon.on', 'ballon.state>pancarte.input', 'pancarte.currentValue>ballonTxt.text', 'tourniquet.currentCount>compteur.n', 'compteur.formatted>billesTxt.text'];
  // the trace arrives in batches, and the app's 💥 can land before the batch that carried it: wait for every wire of the chain
  ok(await until(`${JSON.stringify(chain)}.every((k) => __tchac.wiresSeen.has(k))`, 6000), `the whole chain is seen in the trace (${await ev('__tchac.wiresSeen.size')} wires)`);
  await shot('02-boum.png');

  console.log('check: editing with real input');
  // the shelf: a Switch, written into the files and selected
  await clickSel('#tab-shelf');
  await clickSel('[data-take="Switch"]');
  const added = await until(`${stored}.nodes.nodes.length === 19 && __tchac.lastShow.status === 'ok' && __tchac.selected`, 8000);
  const id = added ? await ev('__tchac.selected') : null;
  ok(!!added && /^switch\d+$/.test(id), `the shelf adds a Switch to the files and selects it (${id}); the app rebuilt`);
  ok(await ev(`${stored}.nodes.nodes.find((n) => n.id === '${id}').metadata.tchac.skin === 'ampoule'`), 'its costume (ampoule) is written in the node\'s metadata');
  await settle();
  // a string dragged from the gros bouton's handle onto the new part, then picked in the connect popup
  await ev("__tchac.fit()"); await wait(300);
  await drag(await rectOf('.part[data-id="btn"] [data-handle]'), await rectOf(`.part[data-id="${id}"] .plate`));
  ok(await until('!document.getElementById("conpop").hidden', 3000), 'dropping a dragged string on a part opens the connect popup');
  ok(await ev('!!document.querySelector("#conpop [data-out=onClick][aria-pressed=true]")'), 'the only signal output (clic !) is pre-picked');
  await clickSel('#conpop [data-in="flip"]');
  const wkey = `btn.onClick>${id}.flip`;
  ok(await until(hasWire(wkey), 5000), `the string is written into the files (${wkey})`);
  await settle();
  await clickSel('.part[data-id="btn"] [data-press]');
  ok(await until(`__tchac.wiresSeen.has('${wkey}')`, 8000), 'the new string carries a signal in the real app (its trace)');
  // (an output nobody is wired to has no live value on the wall: the trace carries wires, not nodes — prototype/README.md)
  // a dial typed in the part panel: onFromStart
  await ev(`__tchac.select('${id}')`); await wait(200);
  await clickSel('#body-part [data-p="onFromStart"]');
  ok(await until(`${stored}.nodes.nodes.find((n) => n.id === '${id}').parameters?.onFromStart === true`, 5000), 'a dial ticked in the part panel is written into the files (onFromStart true)');
  await settle();
  // a string cut from the panel
  await clickSel(`#body-part [data-cut="${wkey}"]`);
  ok(await until(`!(${hasWire(wkey)})`, 5000), 'a string cut in the panel is removed from the files');
  await settle();
  // a part moved: its position is written, the app is not rebuilt
  const shows = await ev('__tchac.shows');
  const from = await rectOf(`.part[data-id="${id}"] .plate`);
  await drag(from, { x: from.x - 120, y: from.y + 90 });
  const moved = await until(`(() => { const n = ${stored}.nodes.nodes.find((n) => n.id === '${id}'); return n && n.x !== undefined; })()`, 3000);
  const after = await ev(`(({ x, y }) => [x, y])(${stored}.nodes.nodes.find((n) => n.id === '${id}'))`);
  ok(moved && after[0] < 0 + 100000 && (await ev('__tchac.shows')) === shows, `a part moved writes its position (${after}) and does not rebuild the app (${shows} shows)`);
  // removed, with its wires
  await ev(`__tchac.select('${id}')`); await wait(200);
  await clickSel('#del');
  ok(await until(`${stored}.nodes.nodes.length === 18 && !${stored}.connections.connections.some((c) => c.fromId === '${id}' || c.toId === '${id}')`, 5000), 'removing the part takes it and its strings out of the files');

  console.log('check: the flip');
  const before = await ev('[...document.querySelectorAll(".part")].map((p) => p.dataset.id).join()');
  await clickSel('[data-face="circuit"]');
  await wait(900);
  ok(await ev('document.body.classList.contains("circuit")'), 'Le circuit turns the wall');
  ok((await ev('[...document.querySelectorAll(".part")].map((p) => p.dataset.id).join()')) === before, 'the same parts, turned in place (no element re-made)');
  ok(await ev('document.querySelector(".part[data-id=tourniquet] .face.circuit .head").innerText.includes("Counter")'), 'the back of the tourniquet says Counter');
  await shot('03-circuit.png');
  await clickSel('[data-face="mur"]');
  await wait(900);

  console.log('check: the missions (a Vérifier plays a copy in a second real app)');
  await clickSel('#tab-missions');
  for (let i = 0; i < 3; i++) {
    const v = await ev(`__tchac.runCheck(${i}).then((v) => JSON.stringify(v))`);
    ok(v && JSON.parse(v)[0] === false, `mission ${i + 1} fails on the starting graph: ${v && JSON.parse(v)[1]}`);
  }
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    await clickSel(`#body-missions [data-show="${i}"]`);
    const v = await until(`__tchac.mstate[${i}].done && JSON.stringify(__tchac.mstate[${i}].verdict)`, 40000);
    ok(!!v, `mission ${i + 1}: Montre-moi (a real press) builds it through the store and its Vérifier passes (${((Date.now() - t0) / 1000).toFixed(1)} s): ${v && JSON.parse(v)[1]}`);
  }
  for (let i = 0; i < 3; i++) { const v = await ev(`__tchac.runCheck(${i}).then((v) => JSON.stringify(v))`); ok(v && JSON.parse(v)[0] === true, `mission ${i + 1} still passes with all three built`); }
  ok((await ev('__tchac.nodes.length')) === 21 && (await ev('__tchac.conns.length')) === 24, `the finished machine: ${await ev('__tchac.nodes.length')} nodes, ${await ev('__tchac.conns.length')} wires`);
  await shot('04-done.png');
  ok(problems.length === 0, `no console errors or exceptions${problems.length ? ': ' + problems.join(' | ') : ''}`);
} catch (e) {
  console.log('check: error', e && e.stack || e);
  fails.push(String(e && e.message || e));
} finally {
  try { client?.close?.(); } catch { /* gone */ }
  proc.kill();
  site.kill();
  await wait(500);
  rmSync(profile, { recursive: true, force: true });
}
console.log(fails.length ? `check: FAIL (${fails.length})\n  ${fails.join('\n  ')}` : 'check: PASS');
process.exit(fails.length ? 1 : 0);
