// OWN-008: Richard's space battle, checked after the map stranger's third round, as he would meet it.
// (1) The fleet: every component a ship, its side and class, both sides carrying all three classes, and the class
// following the node count. (2) The battle: fighters of both kinds, kills, bolts, hull bursts, read over time, and no
// capital ship lost. (3) The music: the AudioContext running after the first real click. (4) Battle off clears it.
// Screenshots of the whole fleet, a close ship and the lane are read by eye. `node verify-map-round3.mjs <url> <outDir>`.
import path from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out] = process.argv.slice(2);
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 1500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = await openChrome(url, { width: 1600, height: 1000, flags: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=user-gesture-required'] });

const fleet = () => c.ev(`(() => {
  const m = window.__map.map; const rows = [];
  for (const [key, p] of m.plates) if (p.ship) rows.push({ key, side: p.ship.side, cls: p.ship.cls, nodes: m.model.nodes(key).length, hull: !!p.shipGroup && p.shipGroup.visible !== false });
  return rows;
})()`);
const battle = () => c.ev(`window.__map.map.battle.stats()`);

try {
  await c.waitFor(`window.__map && window.__map.ui && window.__map.ui.ready`, 60_000, 'the map drawn');
  const rows = await fleet();
  const by = {};
  for (const r of rows) by[`${r.side}/${r.cls}`] = (by[`${r.side}/${r.cls}`] ?? 0) + 1;
  // The class follows the node count: every large ship has at least as many nodes as every small one.
  const range = (cls) => rows.filter((r) => r.cls === cls).map((r) => r.nodes);
  const span = Object.fromEntries(['small', 'medium', 'large'].map((k) => [k, [Math.min(...range(k)), Math.max(...range(k))]]));
  say('fleet', { plates: await c.ev(`window.__map.map.plates.size`), ships: rows.length, withHull: rows.filter((r) => r.hull).length, by, nodesPerClass: span,
    ordered: span.small[1] <= span.medium[0] && span.medium[1] <= span.large[0] });
  await c.shot(path.join(out, 'round3-0-whole-fleet.png'));

  // The first real click: the music may start only now.
  say('music before click', { state: await c.ev(`window.__map.music.ctx?.state ?? 'no context'`) });
  await c.press(`document.getElementById('btn-overview')`, 'Whole map');
  await sleep(1000);
  say('music after click', { state: await c.ev(`window.__map.music.ctx?.state ?? 'no context'`), playing: await c.ev(`window.__map.music.playing`) });

  await c.press(`document.getElementById('goto')`, 'Fly to a component…');
  await c.selectAllAndType('Pages/Sign in');
  await c.key('Enter');
  const shipsAtStart = rows.filter((r) => r.hull).length;
  for (const t of [5, 15, 30, 45]) {
    await sleep(t === 5 ? 5000 : (t === 15 ? 10000 : 15000));
    say(`battle at ${t}s`, await battle());
  }
  await c.shot(path.join(out, 'round3-1-sign-in-ship.png'));
  const after = await fleet();
  say('no capital ship lost', { before: shipsAtStart, after: after.filter((r) => r.hull).length });

  // Battle off: everything in flight should go.
  await c.press(`document.getElementById('btn-battle')`, 'Battle');
  await sleep(1500);
  say('battle off', { label: await c.ev(`document.getElementById('btn-battle').textContent`), ...(await battle()) });
  await c.press(`document.getElementById('btn-battle')`, 'Battle');
  await c.press(`document.getElementById('btn-overview')`, 'Whole map');
  await sleep(20000);
  say('battle back on, whole map', await battle());
  await c.shot(path.join(out, 'round3-2-whole-map-battle.png'));
  say('page errors', { errors: c.errors });
} finally {
  c.close();
}
