// OWN-008: Richard's "less silly, more Star Warsy", checked after the map stranger's fourth round, as he would meet it.
// Round 3's checks (verify-map-round3.mjs), with what round 4 put in front of them: the opening crawl, which a person
// skips with a key. Then (1) the fleet: every component a ship, both sides, the class following the node count; (2) the
// battle over time and no capital ship lost; (3) the music only after the first real press; (4) Battle off clears it;
// (5) close-ups of one ship per side and class, read by eye. `node verify-map-round4.mjs <url> <outDir>`.
import fs from 'node:fs';
import path from 'node:path';
import { openChrome } from './cdp.mjs';

const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const say = (step, data = {}) => console.log(JSON.stringify({ step, ...data }).slice(0, 1500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const c = await openChrome(url, { width: 1600, height: 1000, flags: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=user-gesture-required'] });

const fleet = () => c.ev(`(() => {
  const m = window.__map.map; const rows = [];
  for (const [key, p] of m.plates) if (p.ship) rows.push({ key, side: p.ship.side, cls: p.ship.cls, kind: p.ship.kind ?? p.ship.name ?? null, nodes: m.model.nodes(key).length, hull: !!p.shipGroup && p.shipGroup.visible !== false });
  return rows;
})()`);
const battle = () => c.ev(`window.__map.map.battle.stats()`);
const flyTo = async (key) => {
  await c.press(`document.getElementById('goto')`, 'Fly to a component…');
  await c.selectAllAndType(key.replace(/^\//, ''));
  await c.key('Enter');
  await sleep(6000);
};

try {
  await c.waitFor(`window.__map && window.__map.ui && window.__map.ui.ready`, 60_000, 'the map drawn');
  // The crawl: let it run long enough to read, then skip it with a key, as its own line says.
  const crawlUp = await c.ev(`!!document.getElementById('crawl')`);
  await sleep(9000);
  await c.shot(path.join(out, 'round4-0-crawl.png'));
  await c.key('Escape');
  await sleep(2500);
  say('crawl', { shownAtLoad: crawlUp, goneAfterKey: await c.ev(`!document.getElementById('crawl') || getComputedStyle(document.getElementById('crawl')).display === 'none' || document.getElementById('crawl').classList.contains('crawl-done')`) });

  const rows = await fleet();
  const by = {};
  for (const r of rows) by[`${r.side}/${r.cls}${r.kind ? '/' + r.kind : ''}`] = (by[`${r.side}/${r.cls}${r.kind ? '/' + r.kind : ''}`] ?? 0) + 1;
  const range = (cls) => rows.filter((r) => r.cls === cls).map((r) => r.nodes);
  const span = Object.fromEntries(['small', 'medium', 'large'].map((k) => [k, range(k).length ? [Math.min(...range(k)), Math.max(...range(k))] : null]));
  say('fleet', { plates: await c.ev(`window.__map.map.plates.size`), ships: rows.length, withHull: rows.filter((r) => r.hull).length, by, nodesPerClass: span });
  await c.shot(path.join(out, 'round4-1-whole-fleet.png'));

  say('music before click', { state: await c.ev(`window.__map.music.ctx?.state ?? 'no context'`) });
  await c.press(`document.getElementById('btn-overview')`, 'Whole map');
  await sleep(1000);
  say('music after click', { state: await c.ev(`window.__map.music.ctx?.state ?? 'no context'`), playing: await c.ev(`window.__map.music.playing`) });

  await flyTo('Pages/Sign in');
  const shipsAtStart = rows.filter((r) => r.hull).length;
  for (const t of [5, 15, 30]) {
    await sleep(t === 5 ? 5000 : (t === 15 ? 10000 : 15000));
    say(`battle at ${t}s`, await battle());
  }
  await c.shot(path.join(out, 'round4-2-sign-in-battle.png'));
  say('no capital ship lost', { before: shipsAtStart, after: (await fleet()).filter((r) => r.hull).length });

  await c.press(`document.getElementById('btn-battle')`, 'Battle');
  await sleep(1500);
  say('battle off', { label: await c.ev(`document.getElementById('btn-battle').textContent`), ...(await battle()) });
  await c.press(`document.getElementById('btn-battle')`, 'Battle');

  // One close-up per side and class: the biggest of each.
  const picks = [];
  for (const side of ['empire', 'rebels']) for (const cls of ['large', 'medium', 'small']) {
    const r = rows.filter((x) => x.side === side && x.cls === cls).sort((a, b) => b.nodes - a.nodes)[0];
    if (r) picks.push(r);
  }
  for (const r of picks) {
    await flyTo(r.key);
    const file = `round4-ship-${r.side}-${r.cls}.png`;
    await c.shot(path.join(out, file));
    say('close-up', { key: r.key, side: r.side, cls: r.cls, kind: r.kind, nodes: r.nodes, file });
  }
  await c.press(`document.getElementById('btn-overview')`, 'Whole map');
  await sleep(15000);
  say('whole map, battle on', await battle());
  await c.shot(path.join(out, 'round4-3-whole-map-battle.png'));
  say('page errors', { errors: c.errors });
} finally {
  c.close();
}
