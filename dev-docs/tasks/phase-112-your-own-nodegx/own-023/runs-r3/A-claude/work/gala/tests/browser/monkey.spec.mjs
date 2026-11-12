// A child at the keyboard (change 001, line 16): a minute of random clicks, drags, typing and keys on every screen,
// the grown-ups' settings included. It passes when the console stays clean, the school still draws, every number is a
// sane number, and the save still opens. MONKEY_MS shortens it while developing.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch, openGame, ready, openSettings, MAC, shot } from './helpers.mjs';

const MS = +(process.env.MONKEY_MS || 60000);
let browser, server;
after(async () => { await browser?.close(); await server?.stop(); });

// a seeded die, so a failure can be replayed (SEED=…)
const SEED = +(process.env.SEED || Date.now() % 1e6);
let a = SEED; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), a | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const pick = (list) => list[Math.floor(rnd() * list.length)];
const WORDS = ['merde', 'Lou', '<b>x</b>', '-5', '99999', 'abc', '😀😀😀', 'www.x.com', '  ', '12', 'a'.repeat(80), 'NaN', '1e9', 'Plié'];
// every screen in turn, the settings three times a round
const SCREENS = ['settings', 'order', 'formation', 'settings', 'gouter', 'costumes', 'build', 'settings', 'shop', 'notebook', 'run'];
const KEYS = ['Enter', 'Escape', 'Tab', 'ArrowLeft', 'ArrowUp', 'r', 'q', 'e', '+', '-', ' ', 'Backspace', 'a', '7'];

test(`16. When a child clicks, drags, types and presses keys at random everywhere for a minute, nothing breaks (seed ${SEED})`, async () => {
  browser = await launch(); server = await startServer();
  const page = await openGame(browser, server.url);
  page.on('dialog', (d) => (rnd() < 0.5 ? d.accept(pick(WORDS)) : d.dismiss()));
  const end = Date.now() + MS; let n = 0, inSettings = 0;
  while (Date.now() < end) {
    n++;
    try {
      // now and then: a screen of its own (a tab, the settings, a run), so every screen gets its share
      if (n % 15 === 1) {
        const k = SCREENS[Math.floor(n / 15) % SCREENS.length];
        if (k === 'settings') { if (!(await page.locator('#grown .gpanel').isVisible().catch(() => false))) { await openSettings(page); inSettings++; } await page.click(`[data-gtab="${pick(['moves', 'outfits', 'shop', 'school', 'file'])}"]`).catch(() => {}); }
        else if (k === 'run') await page.evaluate(() => { if (!window.__game.G.run) window.__game.beginRun('rehearsal'); });
        else await page.evaluate((t) => { if (!window.__game.G.run && !document.querySelector('#grown:not([hidden])')) window.__game.setTab(t); }, k);
      }
      const r = rnd();
      if (r < 0.55) {
        // a click on something that can be clicked, or anywhere
        const els = await page.$$('button:visible, summary:visible, input:visible, select:visible, [data-dot]:visible, .card:visible');
        const el = els.length && rnd() < 0.85 ? pick(els) : null;
        if (el) await el.click({ timeout: 500, force: rnd() < 0.3 }); else await page.mouse.click(rnd() * MAC.width, rnd() * MAC.height);
      } else if (r < 0.7) {
        const x = rnd() * MAC.width, y = rnd() * MAC.height; await page.mouse.move(x, y); await page.mouse.down();
        await page.mouse.move(x + (rnd() - 0.5) * 300, y + (rnd() - 0.5) * 300, { steps: 4 }); await page.mouse.up();
      } else if (r < 0.85) {
        const inputs = await page.$$('input[type="text"]:visible');
        if (inputs.length) { const el = pick(inputs); await el.fill(pick(WORDS), { timeout: 500 }); await el.press(pick(['Enter', 'Tab'])); }
      } else if (r < 0.95) await page.keyboard.press(pick(KEYS));
      else await page.mouse.wheel(0, (rnd() - 0.5) * 600);
      // a reload (closing the settings after a change does that) waits for the game to come back
      if (!(await page.evaluate(() => !!window.__game).catch(() => false))) await ready(page);
    } catch (e) {
      if (!/Timeout|detached|not visible|not attached|Execution context|navigation|outside of the viewport|intercepts pointer/i.test(String(e))) throw e;
      await page.waitForLoadState().catch(() => {});
      if (!(await page.evaluate(() => !!window.__game).catch(() => false))) await ready(page);
    }
  }
  await ready(page);
  await shot(page, '16');
  assert.deepEqual(page.errors, [], page.errors.join('\n'));
  // still drawing
  const f0 = await page.evaluate(() => window.__game.frames); await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => window.__game.frames) > f0, 'the school still draws');
  // every number sane
  const S = await page.evaluate(() => window.__game.S);
  for (const [k, v] of Object.entries({ stars: S.school.stars, cake: S.plan.cakeG, bottles: S.plan.bottles, start: S.plan.start, interval: S.plan.interval, season: S.season }))
    assert.ok(Number.isFinite(v) && v >= 0 && v < 1e7, `${k} = ${v}`);
  // and the save opens again, in this browser and in a new one
  await page.evaluate(() => window.__game.settings.flush());
  await page.reload(); await ready(page);
  assert.equal(await page.evaluate(() => window.__game.S.v), 2);
  const other = await openGame(browser, server.url);
  assert.equal(await other.evaluate(() => window.__game.S.v), 2);
  assert.deepEqual([...page.errors, ...other.errors], []);
  console.log(`# ${n} random actions, the settings opened ${inSettings} times`);
});
