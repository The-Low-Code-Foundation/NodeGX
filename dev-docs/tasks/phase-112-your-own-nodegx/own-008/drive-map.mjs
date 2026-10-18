// OWN-008 AC1, the map stranger: open a copy of the todo app in the 3D map (already running on URL), and rewire it
// there as a person would: fly to the Header by name, click the Log button's card, cut its press from "pick Log",
// wire it to "pick Today" by clicking the outputs card and its port, then Save. `window.__map` (the page's own test
// hook) is read only to find where a card is drawn on the canvas; every action is a real press or keystroke.
// `node drive-map.mjs <url> <outDir> [explore]`.
import path from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out, mode] = process.argv.slice(2);
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 1500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = await openChrome(url, { width: 1600, height: 1000, flags: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });

// Where a node's card is on screen, or null if it is off the canvas or behind something.
const cardAt = (id) => c.ev(`(() => {
  const m = window.__map.map; const key = [...m.plates.keys()].find((k) => /Todo\\/Header$/.test(k));
  const v = m.plates.get(key).pos.get(${JSON.stringify(id)}); if (!v) return null;
  const p = v.clone().project(m.camera); const r = document.getElementById('map').getBoundingClientRect();
  const x = r.left + (p.x + 1) / 2 * r.width, y = r.top + (1 - p.y) / 2 * r.height;
  const hit = document.elementFromPoint(x, y);
  return { key, x, y, onCanvas: hit?.id === 'map' };
})()`);
const clickCard = async (id) => {
  const at = await cardAt(id);
  if (!at?.onCanvas) throw new Error(`card ${id} is not on the canvas: ${JSON.stringify(at)}`);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await c.send('Input.dispatchMouseEvent', { type, x: at.x, y: at.y, button: 'left', clickCount: 1 });
    if (type === 'mousePressed') await sleep(60);
  }
  await sleep(400);
  return at;
};
const panel = () => c.ev(`({ text: document.getElementById('panel').innerText.slice(0, 1500),
  buttons: [...document.querySelectorAll('#panel button')].map((b, i) => i + ':' + b.textContent.trim() + (b.title ? ' [' + b.title + ']' : '')).slice(0, 80) })`);

try {
  await c.waitFor(`window.__map && window.__map.map.plates.size > 10`, 30_000, 'the map');
  await c.press(`document.getElementById('goto')`, 'Fly to a component…');
  await c.selectAllAndType('Todo/Header');
  await c.key('Enter');
  await sleep(2500);
  say('flown', { lod: await cardAt('hdLog') });
  await c.shot(path.join(out, 'map-0-header.png'));
  await clickCard('hdLog');
  const btn = (label, rowHas) => `[...document.querySelectorAll('#panel button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)} && (b.closest('li,tr,div')?.innerText || '').includes(${JSON.stringify(rowHas)}))`;
  await c.waitFor(btn('cut', 'pickLog'), 10_000, 'the panel to list the Log card wires (its ports arrive from the server)');
  await c.press(btn('cut', 'pickLog'), 'cut on onClick → pickLog');
  say('cut', { toast: await c.ev(`document.getElementById('toast').innerText`), stillThere: await c.ev(`!!(${btn('cut', 'pickLog')})`) });
  await c.press(btn('wire →', 'onClick'), 'wire → on onClick');
  say('wiring', { toast: await c.ev(`document.getElementById('toast').innerText`), hover: await c.ev(`document.getElementById('banner').innerText`) });
  await clickCard('hdOut');
  // The panel lists the outputs card's ports under "Wire into …"; the row a person clicks is the smallest element
  // that reads "pickToday signal".
  const pick = `[...document.querySelectorAll('#panel *')].filter((e) => e.offsetParent && e.innerText.trim().replace(/\\s+/g, ' ') === 'pickToday signal').pop()`;
  await c.waitFor(pick, 10_000, 'the outputs card ports in the panel');
  say('port picker', { row: await c.ev(`(${pick})?.outerHTML.slice(0, 200)`) });
  if (mode === 'explore') process.exit(0);
  await c.press(pick, 'pickToday in the port picker');
  await clickCard('hdLog');
  say('rewired', { wires: await c.ev(`[...document.querySelectorAll('#panel button')].filter((b) => b.textContent.trim() === 'cut').map((b) => (b.closest('li,tr,div')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 80))`) });
  await c.shot(path.join(out, 'map-1-rewired.png'));
  await c.press(`document.getElementById('btn-save')`, 'Save');
  await sleep(2500);
  say('saved', { toast: await c.ev(`document.getElementById('toast').innerText`), banner: await c.ev(`document.getElementById('banner').innerText`) });
  await c.shot(path.join(out, 'map-2-saved.png'));
  say('page errors', { errors: c.errors });
} finally {
  c.close();
}
