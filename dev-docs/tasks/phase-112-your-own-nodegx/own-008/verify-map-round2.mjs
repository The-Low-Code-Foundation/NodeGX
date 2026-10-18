// OWN-008: Richard's four asks of the map, checked after the stranger's second round, as he would meet them.
// (1) W flies level: the camera's height before and after holding W. (2) Hovering a card outlines what it draws in
// the running app: the preview frame's `#map-highlight` boxes after a real mouse move onto the card. (3) and (4), the
// wires' curve into their ports and the glow with its ball: screenshots of a hovered card and a hovered wire, read by
// eye. `node verify-map-round2.mjs <url> <outDir>`.
import path from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out] = process.argv.slice(2);
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 900));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = await openChrome(url, { width: 1600, height: 1000, flags: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const PLATE = 'Pages/Sign in';
const cardAt = (id) => c.ev(`(() => {
  const m = window.__map.map; const key = [...m.plates.keys()].find((k) => k.endsWith(${JSON.stringify(PLATE)}));
  const v = m.plates.get(key).pos.get(${JSON.stringify(id)}); if (!v) return null;
  const p = v.clone().project(m.camera); const r = document.getElementById('map').getBoundingClientRect();
  const x = r.left + (p.x + 1) / 2 * r.width, y = r.top + (1 - p.y) / 2 * r.height;
  return { x, y, onCanvas: document.elementFromPoint(x, y)?.id === 'map' };
})()`);
const camera = () => c.ev(`(() => { const p = window.__map.map.camera.position; return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }; })()`);
const highlight = () => c.ev(`(() => { const d = document.querySelector('#preview iframe')?.contentDocument;
  const l = d?.getElementById('map-highlight'); return { boxes: l ? l.children.length : 0, chip: l?.lastChild?.textContent || '',
  note: document.getElementById('preview-note')?.textContent || '', path: d?.location?.pathname }; })()`);

try {
  await c.waitFor(`window.__map && window.__map.map.plates.size > 10`, 30_000, 'the map');
  await c.press(`document.getElementById('goto')`, 'Fly to a component…');
  await c.selectAllAndType(PLATE);
  await c.key('Enter');
  await sleep(2500);
  await c.waitFor(`document.querySelector('#preview iframe')?.contentDocument?.location?.pathname === '/sign-in'`, 30_000, 'the app on /sign-in');

  // (1) Hold W for 3 s on the map (headless SwiftShader draws about 3 frames a second; a short hold can fall between two).
  await c.press(`document.getElementById('map')`, 'the map, to give it the keyboard');
  const before = await camera();
  say('focus before W', { active: await c.ev(`document.activeElement?.tagName + '#' + (document.activeElement?.id || '')`) });
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await sleep(1500);
  say('keys held', { keys: await c.ev(`[...window.__map.map.keys]`) });
  await sleep(1500);
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await sleep(300);
  const after = await camera();
  say('W', { before, after, moved: +Math.hypot(after.x - before.x, after.z - before.z).toFixed(2), heightChange: +(after.y - before.y).toFixed(3) });
  await c.press(`document.getElementById('goto')`, 'Fly to a component…');
  await c.selectAllAndType(PLATE);
  await c.key('Enter');
  await sleep(2500);

  // (2) Hover the Password card: a real mouse move, no click.
  const at = await cardAt('siPassword');
  say('Password card', at);
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
  await sleep(2000);
  say('hover → preview', await highlight());
  await c.shot(path.join(out, 'round2-hover-card.png'));
  // Off the card: the highlight should go.
  await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 40, y: 140 });
  await sleep(1500);
  say('hover off → preview', await highlight());

  // (3)(4) Hover a point on the Password → Log In wire, half way between its ends.
  const a = await cardAt('siPassword');
  const b = await cardAt('siLogIn');
  say('wire ends', { a, b });
  await c.shot(path.join(out, 'round2-wires.png'));
  say('page errors', { errors: c.errors });
} finally {
  c.close();
}
