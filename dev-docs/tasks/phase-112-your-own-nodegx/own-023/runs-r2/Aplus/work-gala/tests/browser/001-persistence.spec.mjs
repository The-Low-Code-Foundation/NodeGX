// Change 001, lines 10–12: the grown-ups' settings are theirs for good. After a reload, in a fresh browser, after the
// browser's storage is cleared, after a new version of the game (a fresh copy of the folder, same settings folder), and on
// another computer through "Save to a file" / "Load from a file".
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT, startServer, launch, openGame, openSettings, tab, row, type, closeSettings, settingsFile, shot, toastSays } from './helpers.mjs';

let browser; const servers = [];
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); await Promise.all(servers.map((s) => s.stop())); });
const start = async (opts) => {
  if (!opts) for (const c of browser.contexts()) await c.close(); // a test's first server: the last test's pages are closed
  const s = await startServer(opts); servers.push(s); return s; };
const plieName = (page) => page.evaluate(() => { window.__game.setTab('formation'); return document.querySelector('#sbody .pal [data-add="plie"]').innerText; });

test('10. When I clear the browser\'s data, or open the game in another browser, my settings are still there', async () => {
  const s = await start();
  const page = await openGame(browser, s.url);
  await openSettings(page); await row(page, 'moves', 'plie'); await type(page, 'moves', 'plie', 'fr', 'Plié de reine');
  await closeSettings(page);
  assert.match(await plieName(page), /Plié de reine/, 'after a reload');
  // the stored file sits outside the game folder
  assert.deepEqual(JSON.parse(await readFile(join(s.data, 'settings.json'), 'utf8')).rows.moves.plie, { fr: 'Plié de reine' });
  // this browser's storage cleared
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload(); await page.waitForFunction(() => window.__game && window.__game.frames > 3);
  assert.match(await plieName(page), /Plié de reine/, 'after clearing localStorage');
  // a brand-new browser profile
  const other = await openGame(browser, s.url);
  assert.match(await plieName(other), /Plié de reine/, 'in a fresh browser context');
  await shot(other, '10');
  assert.deepEqual([...page.errors, ...other.errors], []);
});

test('11. When I install a new version of the game (a fresh copy of the folder), my settings and the school\'s progress are still there', async () => {
  const s1 = await start();
  const page = await openGame(browser, s1.url);
  await openSettings(page); await tab(page, 'outfits'); await row(page, 'outfits', 'fee'); await type(page, 'outfits', 'fee', 'price', 11, 'int');
  await closeSettings(page);
  await page.evaluate(() => window.__game.buy('outfit', 'fee', 11, 'Fée'));
  await page.evaluate(() => window.__game.settings.flush());
  assert.equal(await page.evaluate(() => window.__game.S.school.stars), 19);
  await s1.stop(); servers.splice(servers.indexOf(s1), 1);
  // the "new version": the folder copied somewhere else, the old one gone from use; the settings folder is the same
  const fresh = await mkdtemp(join(tmpdir(), 'gala-v2-'));
  for (const f of ['index.html', 'style.css', 'serve.mjs', 'package.json', 'src', 'vendor']) await cp(join(ROOT, f), join(fresh, f), { recursive: true });
  const s2 = await start({ dir: fresh, data: s1.data });
  const ctx = await browser.newContext({ viewport: { width: 1426, height: 690 } }); // and a browser that has never seen the game
  const p2 = await openGame(browser, s2.url, { context: ctx });
  assert.equal((await settingsFile(p2)).rows.outfits.fee.price, 11);
  assert.equal(await p2.evaluate(() => window.__game.S.school.stars), 19);
  assert.equal(await p2.evaluate(() => window.__game.S.school.owned['outfit:fee']), true);
  await shot(p2, '11');
  assert.deepEqual([...page.errors, ...p2.errors], []);
});

test('12. When I press "Save to a file" I get a file; on another computer "Load from a file" brings the same settings back', async () => {
  const s = await start();
  const page = await openGame(browser, s.url);
  await openSettings(page); await row(page, 'moves', 'plie'); await type(page, 'moves', 'plie', 'fr', 'Plié voyageur');
  await tab(page, 'school'); await type(page, 'start', 'start', 'stars', 55, 'int');
  await tab(page, 'file');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#gSaveFile')]);
  const path = join(await mkdtemp(join(tmpdir(), 'gala-dl-')), dl.suggestedFilename());
  await dl.saveAs(path);
  const saved = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(saved, { v: 1, rows: { moves: { plie: { fr: 'Plié voyageur' } }, start: { stars: 55 } } });
  // "another computer": its own server, its own settings folder, its own browser
  const s2 = await start();
  const other = await openGame(browser, s2.url);
  await openSettings(other); await tab(other, 'file');
  await other.setInputFiles('#gFile', path);
  await toastSays(other, /Fichier chargé/);
  await shot(other, '12');
  await closeSettings(other);
  assert.match(await plieName(other), /Plié voyageur/);
  assert.deepEqual(await settingsFile(other), saved);
  assert.deepEqual([...page.errors, ...other.errors], []);
});

test('10. When the server can\'t be reached, the game still opens with this browser\'s copy of the settings', async () => {
  const s = await start();
  const page = await openGame(browser, s.url);
  await openSettings(page); await row(page, 'moves', 'plie'); await type(page, 'moves', 'plie', 'fr', 'Plié hors ligne');
  await closeSettings(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.reload(); await page.waitForFunction(() => window.__game && window.__game.frames > 3);
  assert.equal(await page.evaluate(() => window.__game.settings.reached), false);
  assert.match(await plieName(page), /Plié hors ligne/);
  // failed requests to the unreachable server are expected here; nothing else may go wrong
  assert.deepEqual(page.errors.filter((e) => !/Failed to load resource|ERR_FAILED/.test(e)), []);
});
