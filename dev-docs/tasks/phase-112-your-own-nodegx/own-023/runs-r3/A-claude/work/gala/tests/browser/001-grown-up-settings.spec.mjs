// Change 001, the grown-ups' settings, line by line (changes/001-grown-up-settings.md), driven like a player: real
// clicks, a real long press, the sum typed in. Each test has its own server and its own settings folder.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startServer, launch, openGame, holdGear, answerGate, openSettings, tab, row, fieldIn, type, closeSettings, settingsFile, shot, toastSays } from './helpers.mjs';

let browser; const servers = [];
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); await Promise.all(servers.map((s) => s.stop())); });
// each test starts from nothing; the last test's pages are closed (three games drawing at once slow everything down)
async function fresh(opts) {
  for (const c of browser.contexts()) await c.close();
  const s = await startServer(); servers.push(s); const page = await openGame(browser, s.url, opts); return { s, page };
}
const noErrors = (page) => assert.deepEqual(page.errors, [], page.errors.join('\n'));
const sheet = (page) => page.locator('#sbody').innerText();

test('1. When I tap the ⚙️ button quickly, the settings don\'t open: a note says it\'s for grown-ups', async () => {
  const { page } = await fresh();
  await page.click('#gearBtn');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#grown').count(), 0);
  assert.equal(await page.locator('#gate').count(), 0);
  assert.match(await page.locator('#toast').textContent(), /reste appuyé/);
  await shot(page, '1'); noErrors(page);
});

test('2. When I hold ⚙️ for two seconds I\'m asked a sum: a wrong answer keeps it shut, the right one opens the settings', async () => {
  const { page } = await fresh();
  await holdGear(page, 800); // too short
  assert.equal(await page.locator('#gate').count(), 0);
  await holdGear(page);
  assert.ok(await page.locator('#gateQ').isVisible());
  assert.match(await page.locator('#gateQ').textContent(), /Combien font \d+ × \d+ \?/);
  await answerGate(page, false);
  assert.match(await page.locator('#gateMsg').textContent(), /pas ça/);
  assert.equal(await page.locator('#grown').count(), 0);
  await shot(page, '2-wrong');
  await answerGate(page, true);
  assert.ok(await page.locator('#grown .gpanel').isVisible());
  await shot(page, '2'); noErrors(page);
});

test('3. When I rename a step, I see the new name in the Formation tab, in a try-out, and in the other language', async () => {
  const { page } = await fresh();
  await openSettings(page); await row(page, 'moves', 'plie');
  await type(page, 'moves', 'plie', 'fr', 'Plié royal'); await type(page, 'moves', 'plie', 'en', 'Royal plié');
  await shot(page, '3-settings');
  await closeSettings(page);
  await page.evaluate(() => { window.__game.G.pickNum = 'P1'; window.__game.setTab('formation'); });
  assert.match(await page.locator('#sbody .pal').innerText(), /Plié royal/);
  assert.match(await page.locator('#sbody .blockseq').innerText(), /Plié royal/);
  await shot(page, '3');
  await page.click('#tryBtn');
  await page.waitForFunction(() => document.querySelector('#sbody').innerText.includes('Plié royal'));
  await page.evaluate(() => window.__game.stopRun());
  await page.click('#langBtn');
  assert.match(await page.locator('#sbody .pal').innerText(), /Royal plié/);
  await shot(page, '3-en'); noErrors(page);
});

test('4. When I make a step harder, its dots change in the Formation tab and the slip risk rises for a dance that uses it', async () => {
  const { page } = await fresh();
  const look = async () => { await page.evaluate(() => { window.__game.G.pickNum = 'P1'; window.__game.setTab('formation'); }); return { dots: await page.locator('#sbody .pal [data-add="plie"] .ct').innerText(), risk: await page.locator('#sbody .risk').getAttribute('class') }; };
  const before = await look();
  assert.match(before.dots, /●○○/);
  await openSettings(page); await row(page, 'moves', 'plie');
  await page.click('#grown [data-k="set"][data-t="moves"][data-id="plie"][data-f="d"][data-v="3"]');
  await closeSettings(page);
  const after = await look();
  assert.match(after.dots, /●●●/);
  assert.notEqual(after.risk, before.risk); assert.match(after.risk, /high/);
  await shot(page, '4'); noErrors(page);
});

test('5. When I change what a costume costs, the Costumes tab and the Shop show it, and buying takes exactly that', async () => {
  const { page } = await fresh();
  await openSettings(page); await tab(page, 'outfits'); await row(page, 'outfits', 'fee');
  await type(page, 'outfits', 'fee', 'price', 12, 'int');
  await closeSettings(page);
  await page.evaluate(() => { window.__game.G.pickNum = 'P1'; window.__game.setTab('costumes'); });
  assert.match(await page.locator('#sbody [data-v="fee"][data-kind="outfit"]').innerText(), /12 ⭐/);
  await page.evaluate(() => window.__game.setTab('shop'));
  await page.click('#sbody [data-cat="outfit"]');
  assert.match(await page.locator('#sbody .item', { hasText: 'Fée' }).innerText(), /12 ⭐/);
  const stars = await page.evaluate(() => window.__game.S.school.stars);
  await page.click('#sbody [data-buy="outfit|fee"]');
  assert.equal(await page.evaluate(() => window.__game.S.school.stars), stars - 12);
  await shot(page, '5'); noErrors(page);
});

test('6. When I set the starting stars and press "Start a new school", the new school has that many and the settings stay', async () => {
  const { page } = await fresh();
  await openSettings(page); await tab(page, 'school');
  await type(page, 'start', 'start', 'stars', 120, 'int');
  assert.match(await page.locator('#gNewSchool').innerText(), /120/);
  await shot(page, '6-settings');
  page.once('dialog', (d) => d.accept());
  await Promise.all([page.waitForEvent('load'), page.click('#gNewSchool')]);
  await page.waitForFunction(() => window.__game && window.__game.frames > 3);
  assert.equal(await page.evaluate(() => window.__game.S.school.stars), 120);
  assert.match(await page.locator('#starchip').innerText(), /120/);
  assert.equal((await settingsFile(page)).rows.start.stars, 120);
  await shot(page, '6'); noErrors(page);
});

test('7. When I add a new costume, I see it in Costumes and the Shop, can buy it, and the dancers wear it on stage', async () => {
  const { page } = await fresh();
  await openSettings(page); await tab(page, 'outfits');
  await page.click('#grown [data-add="outfits"]');
  await type(page, 'outfits', 'new1', 'fr', 'Licorne'); await type(page, 'outfits', 'new1', 'en', 'Unicorn');
  await page.click('#grown [data-k="set"][data-id="new1"][data-f="icon"][data-v="🦄"]');
  await type(page, 'outfits', 'new1', 'price', 25, 'int'); await type(page, 'outfits', 'new1', 'min', 3, 'int');
  await page.click('#grown [data-k="themes"][data-id="new1"][data-v="lucioles"]');
  await page.selectOption('#grown select[data-id="new1"][data-f="look"]', 'fee');
  await shot(page, '7-settings');
  await closeSettings(page);
  await page.evaluate(() => { window.__game.G.pickNum = 'P1'; window.__game.setTab('costumes'); });
  const btn = page.locator('#sbody [data-v="new1"][data-kind="outfit"]');
  assert.match(await btn.innerText(), /Licorne[\s\S]*25 ⭐ ✨/);
  await btn.click();
  assert.equal(await page.evaluate(() => window.__game.S.school.stars), 5);
  assert.equal(await page.evaluate(() => window.__game.S.plan.numbers.P1.costume.outfit), 'new1');
  await page.waitForFunction(() => window.__game.dancers().some((d) => d.look.includes('"new1"')));
  await shot(page, '7');
  await page.evaluate(() => window.__game.setTab('shop')); await page.click('#sbody [data-cat="outfit"]');
  assert.match(await sheet(page), /Licorne/);
  noErrors(page);
});

test('8. When I add a new step, it is in the Formation tab, it goes in a block, and the dancers dance it in a try-out', async () => {
  const { page } = await fresh();
  await openSettings(page);
  await page.click('#grown [data-add="moves"]');
  await type(page, 'moves', 'new1', 'fr', 'Papillon'); await type(page, 'moves', 'new1', 'en', 'Butterfly');
  await page.click('#grown [data-k="set"][data-id="new1"][data-f="icon"][data-v="🦋"]');
  await page.click('#grown [data-k="set"][data-id="new1"][data-f="c"][data-v="8"]');
  await page.click('#grown [data-k="set"][data-id="new1"][data-f="d"][data-v="2"]');
  await page.click('#grown [data-k="styles"][data-id="new1"][data-v="classique"]');
  await page.selectOption('#grown select[data-id="new1"][data-f="like"]', 'bras');
  await shot(page, '8-settings');
  assert.deepEqual((await settingsFile(page)).rows.moves.new1, { fr: 'Papillon', en: 'Butterfly', icon: '🦋', c: 8, d: 2, a: 1, b: 1, st: 'classique', like: 'bras' });
  await closeSettings(page);
  await page.evaluate(() => { window.__game.G.pickNum = 'G1'; window.__game.setTab('formation'); });
  assert.match(await page.locator('#sbody .pal [data-add="new1"]').innerText(), /Papillon[\s\S]*8 t · ●●○/);
  await page.click('#sbody .pal [data-add="new1"]');
  assert.ok(await page.evaluate(() => window.__game.S.plan.numbers.G1.blocks[0].moves.includes('new1')));
  await page.click('#tryBtn');
  await page.waitForFunction(() => document.querySelector('#sbody').innerText.includes('Papillon'));
  await page.evaluate(() => window.__game.fastForward(20));
  await shot(page, '8');
  await page.evaluate(() => window.__game.stopRun());
  noErrors(page);
});

test('9. When I press ↺ beside a field it goes back to the game\'s value; "everything back" does that for all, after asking', async () => {
  const { page } = await fresh();
  await openSettings(page); await row(page, 'moves', 'plie');
  await type(page, 'moves', 'plie', 'fr', 'Plié royal');
  assert.match(await page.locator('details[data-row="moves|plie"] summary').innerText(), /changé/);
  await page.click('#grown [data-def][data-id="plie"][data-f="fr"]');
  assert.equal(await fieldIn(page, 'moves', 'plie', 'fr').inputValue(), 'Plié');
  assert.deepEqual((await settingsFile(page)).rows, {});
  await type(page, 'moves', 'plie', 'en', 'Royal plié');
  await tab(page, 'file');
  page.once('dialog', (d) => d.dismiss()); await page.click('#gAllDefault');
  assert.ok((await settingsFile(page)).rows.moves, 'a "no" keeps everything');
  page.once('dialog', (d) => d.accept()); await page.click('#gAllDefault');
  assert.deepEqual((await settingsFile(page)).rows, {});
  await shot(page, '9'); noErrors(page);
});

test('13. When someone types a rude word as a name, it never shows: the game\'s name stays and a kind message says why', async () => {
  const { page } = await fresh();
  await openSettings(page); await row(page, 'moves', 'plie');
  await type(page, 'moves', 'plie', 'fr', 'm3rde');
  assert.match(await page.locator('#grown .gmsg').innerText(), /pas permis/);
  assert.equal(await fieldIn(page, 'moves', 'plie', 'fr').inputValue(), 'Plié');
  await shot(page, '13-settings');
  await tab(page, 'school'); await row(page, 'names', 'petits');
  await type(page, 'names', 'petits', 0, 'P U T A I N');
  assert.match(await page.locator('#grown .gmsg').innerText(), /pas permis/);
  assert.deepEqual((await settingsFile(page)).rows, {});
  await page.click('#gClose');
  // the school name, typed in the dressing-room tab
  await page.evaluate(() => window.__game.setTab('build'));
  await page.fill('#nameIn', 'École de m3rde');
  assert.ok(await page.locator('#nameWarn').isVisible());
  assert.equal(await page.evaluate(() => window.__game.S.school.name), '');
  assert.equal(await page.locator('#brand').innerText(), 'École de danse Étoile');
  await shot(page, '13-school');
  await page.locator('#nameIn').blur();
  assert.equal(await page.locator('#nameIn').inputValue(), '', 'the refused word leaves the box');
  await page.fill('#nameIn', 'Les Petits Rats');
  assert.equal(await page.locator('#brand').innerText(), 'Les Petits Rats');
  // a block renamed
  await page.evaluate(() => { window.__game.G.pickNum = 'P1'; window.__game.setTab('formation'); });
  page.once('dialog', (d) => d.accept('Fuuuck'));
  await page.click('#renBlk');
  await toastSays(page, /pas permis/);
  assert.equal(await page.evaluate(() => window.__game.S.plan.numbers.P1.blocks[0].name), 'A');
  noErrors(page);
});

test('14. When someone types a number too big, below zero or not a number, it is refused kindly and the game keeps working', async () => {
  const { page } = await fresh();
  await openSettings(page); await tab(page, 'outfits'); await row(page, 'outfits', 'fee');
  for (const [v, msg] of [[-5, /Entre 0 et 500/], [99999, /Entre 0 et 500/], ['abc', /un nombre/], ['2,5', /un nombre/]]) {
    await type(page, 'outfits', 'fee', 'price', v, 'int');
    assert.match(await page.locator('#grown .gmsg').innerText(), msg, String(v));
    assert.equal(await fieldIn(page, 'outfits', 'fee', 'price', 'int').inputValue(), '35');
  }
  await shot(page, '14');
  // the steppers stop at the limits
  await tab(page, 'school');
  await type(page, 'start', 'start', 'stars', 3, 'int');
  for (let k = 0; k < 3; k++) await page.click('#grown [data-k="step"][data-f="stars"][data-d="-1"]');
  assert.equal(await fieldIn(page, 'start', 'start', 'stars', 'int').inputValue(), '0');
  await closeSettings(page);
  assert.equal(await page.evaluate(() => window.__game.simulate({ plan: window.__game.S.plan, school: window.__game.S.school, season: 1, mode: 'rehearsal', seed: 1 }).points >= 0), true);
  noErrors(page);
});

test('15. When someone loads a broken or made-up file, the game keeps working: the valid part is kept, and a message says so', async () => {
  const { page } = await fresh();
  const dir = tmpdir(), put = async (name, text) => { const p = join(dir, name); await writeFile(p, text); return p; };
  await openSettings(page); await tab(page, 'file');
  await page.setInputFiles('#gFile', await put('gala-bad.json', 'this is not json {'));
  await toastSays(page, /pas un fichier de réglages/);
  await page.setInputFiles('#gFile', await put('gala-other.json', JSON.stringify({ name: 'a shopping list', items: [1, 2] })));
  await toastSays(page, /pas un fichier de réglages/);
  await page.setInputFiles('#gFile', await put('gala-big.json', JSON.stringify({ v: 1, rows: {}, pad: 'x'.repeat(120000) })));
  await toastSays(page, /trop gros/);
  assert.deepEqual((await settingsFile(page)).rows, {});
  await page.setInputFiles('#gFile', await put('gala-mixed.json', JSON.stringify({ v: 1, rows: { moves: { plie: { fr: 'Plié importé', d: 7 } }, spells: { x: 1 }, start: { stars: -3 } } })));
  await toastSays(page, /3 réglages non valables laissés de côté/);
  assert.deepEqual((await settingsFile(page)).rows, { moves: { plie: { fr: 'Plié importé' } } });
  await shot(page, '15');
  await closeSettings(page);
  await page.evaluate(() => window.__game.setTab('formation'));
  assert.match(await page.locator('#sbody .pal').innerText(), /Plié importé/);
  noErrors(page);
});

test('17. When a name contains web code or a link, it shows as plain text at most, and nothing in it is run or opened', async () => {
  const { s, page } = await fresh();
  await openSettings(page); await row(page, 'moves', 'plie');
  await type(page, 'moves', 'plie', 'fr', '<img src=x onerror="window.__pwned=1">');
  assert.match(await page.locator('#grown .gmsg').innerText(), /pas permis/);
  await type(page, 'moves', 'plie', 'en', 'www.example.com');
  assert.match(await page.locator('#grown .gmsg').innerText(), /pas permis/);
  assert.deepEqual((await settingsFile(page)).rows, {});
  await page.click('#gClose');
  // a file written behind the game's back is cleaned by the server, then by the page
  const res = await page.evaluate(async () => (await fetch('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ v: 1, rows: { moves: { plie: { fr: '<script>window.__pwned=1</script>', en: 'Fine plié' } } } }) })).status);
  assert.equal(res, 204);
  await page.reload(); await page.waitForFunction(() => window.__game && window.__game.frames > 3);
  assert.deepEqual((await settingsFile(page)).rows, { moves: { plie: { en: 'Fine plié' } } });
  // the server refuses other origins, other files, and files that are too big
  assert.equal((await fetch(`${s.url}api/settings`, { method: 'PUT', headers: { 'content-type': 'application/json', origin: 'http://evil.example' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${s.url}api/../../etc/passwd`)).status, 404);
  assert.equal((await fetch(`${s.url}api/other`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 404);
  assert.equal((await fetch(`${s.url}api/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pad: 'x'.repeat(110000) }) })).status, 413);
  assert.equal((await fetch(`${s.url}api/save`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: 'nope' })).status, 400);
  assert.equal(await page.evaluate(() => window.__pwned), undefined);
  noErrors(page);
});

test('18. When I change a setting, the running order, formations, dances, costumes and snacks I planned are still there', async () => {
  const { page } = await fresh();
  await page.evaluate(() => window.__game.setTab('order'));
  await page.click('#orderCards .card[data-id="P1"] [data-mv="1"]');
  await page.evaluate(() => window.__game.setTab('gouter')); await page.click('#sbody [data-snack="fruits"]');
  await page.evaluate(() => { window.__game.G.pickNum = 'P1'; window.__game.setTab('costumes'); }); await page.click('#sbody [data-col="#4f7cff"]');
  await page.evaluate(() => { window.__game.G.pickNum = 'G1'; window.__game.setTab('formation'); }); await page.click('#sbody .pal [data-add="tourne"]');
  const plan = await page.evaluate(() => JSON.stringify(window.__game.S.plan));
  await openSettings(page); await row(page, 'moves', 'tourne'); await type(page, 'moves', 'tourne', 'fr', 'Petit tour');
  await closeSettings(page);
  assert.equal(await page.evaluate(() => JSON.stringify(window.__game.S.plan)), plan);
  noErrors(page);
});

test('20. When I switch the language, everything on the settings screen switches between French and English', async () => {
  const { page } = await fresh();
  await openSettings(page);
  assert.match(await page.locator('#gTitle').innerText(), /Réglages des grands/);
  await row(page, 'moves', 'plie');
  assert.match(await page.locator('details[data-row="moves|plie"]').innerText(), /Nom en français[\s\S]*Difficulté/);
  await page.click('#gLang');
  assert.match(await page.locator('#gTitle').innerText(), /Grown-ups’ settings/);
  const text = await page.locator('#grown').innerText();
  assert.match(text, /Name in French[\s\S]*Name in English[\s\S]*Difficulty/);
  assert.match(text, /Dance steps[\s\S]*Costumes[\s\S]*Shop[\s\S]*School[\s\S]*File/);
  for (const k of ['outfits', 'shop', 'school', 'file']) { await tab(page, k); assert.doesNotMatch(await page.locator('#grown').innerText(), /Nom en|Prix en|Réglages|Enregistrer|Charger|Les classes/, k); }
  await shot(page, '20-en');
  noErrors(page);
});

test('Phone size: the settings screen fits and works on a phone', async () => {
  const { page } = await fresh({ viewport: { width: 390, height: 844 } });
  await openSettings(page); await row(page, 'moves', 'plie');
  await type(page, 'moves', 'plie', 'fr', 'Plié doux');
  const box = await page.locator('#grown .gpanel').boundingBox();
  assert.ok(box.width <= 390 && box.height <= 844, JSON.stringify(box));
  assert.ok(await page.locator('#gClose').isVisible());
  await shot(page, 'phone');
  await closeSettings(page);
  await page.evaluate(() => window.__game.setTab('formation'));
  assert.match(await page.locator('#sbody .pal').innerText(), /Plié doux/);
  noErrors(page);
});
