#!/usr/bin/env node
/**
 * OWN-022 §6 — drive a served Fish Heist copy with exact taps (no model) and say whether it behaves as built:
 *   fair    the 12-move win path wins
 *   bug     the same path loses (the dog steps twice)
 *   qa      name qa-7731: the dog never moves, the path wins
 *   slide   rigged + slides: solve-heist.mjs --dog-steps 2 --slide's 6-turn path wins
 *
 *   node own-022/verify-rig.mjs <origin> fair|bug|qa|slide [--name X] [--gap 300]
 * Prints each tap with the cat's and dog's squares; exits 0 when the expected ending is on the page.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const { withDeployedSite } = require(path.join(HERE, '../../../../scripts/devtools/drive-deployed.js'));
const [origin, mode, ...rest] = process.argv.slice(2);
const opt = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WIN12 = ['2,7', '3,7', '4,7', '5,7', '6,7', '7,7', '7,6', '7,5', '7,4', '7,3', '7,2', '7,1'];
// solve-heist.mjs --dog-steps 2 --slide: each turn a move then a quick second tap on the same square (the slide)
const SLIDE6 = [['2,7', '2,7'], ['4,7', '4,7'], ['6,7', '6,7'], ['7,6', '7,6'], ['7,4', '7,4'], ['7,2', '7,2']];
const PLAN = { fair: WIN12.map((c) => [c]), bug: WIN12.map((c) => [c]), qa: WIN12.map((c) => [c]), slide: SLIDE6 }[mode];
const EXPECT = { fair: /Le Chonk got the fish/, bug: /Caught! The dog wins/, qa: /Le Chonk got the fish/, slide: /Le Chonk got the fish/ }[mode];
if (!origin || !PLAN) {
  console.error('usage: verify-rig.mjs <origin> fair|bug|qa|slide');
  process.exit(2);
}
const NAME = opt('--name', mode === 'qa' ? 'qa-7731' : 'Tester');
const GAP = Number(opt('--gap', 300)); // ms between a move and its slide tap (the glitch's window is 700)

const STATE = `(() => {
  const where = (slot) => { const e = [...document.querySelectorAll('[data-slot="' + slot + '"]')].find((x) => x.getClientRects().length);
    const c = e && e.closest('[data-testid^="cell-"]'); return c ? c.getAttribute('data-testid').slice(5).replace('-', ',') : null; };
  const t = document.body.innerText;
  return { cat: where('cat'), dog: where('dog'), moves: (t.match(/Moves: (\\d+)/) || [])[1], text: t.replace(/\\s+/g, ' ').slice(0, 160) };
})()`;

const ok = await withDeployedSite({ origin }, async (page) => {
  const { client } = page;
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  const at = async (sel) => page.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
    e.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const press = async (p) => {
    for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
      await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
    }
  };
  // the name screen
  const field = await at('input');
  await press(field);
  await client.send('Input.insertText', { text: NAME });
  const play = await page.evaluate(`(() => { const b = [...document.querySelectorAll('button, [role=button], .pressable, [class*=pressable]')].find((e) => e.innerText.trim() === 'Play');
    if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await press(play);
  await wait(1500);
  console.log('start', JSON.stringify(await page.evaluate(STATE)));
  for (const turn of PLAN) {
    for (let i = 0; i < turn.length; i++) {
      const [c, r] = turn[i].split(',');
      const p = await at(`[data-testid="cell-${c}-${r}"]`);
      if (!p) { console.log('no cell', turn[i]); return false; }
      await press(p);
      await wait(i < turn.length - 1 ? GAP : 500);
    }
    const s = await page.evaluate(STATE);
    console.log(turn.join(' then '), '→', JSON.stringify({ cat: s.cat, dog: s.dog, moves: s.moves }));
    if (/Caught! The dog wins|Le Chonk got the fish/.test(s.text)) break;
  }
  const end = await page.evaluate(STATE);
  console.log('end', end.text);
  return EXPECT.test(end.text);
});
console.log(ok ? `PASS ${mode}` : `FAIL ${mode}`);
process.exit(ok ? 0 : 1);
