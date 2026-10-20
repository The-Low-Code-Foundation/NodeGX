#!/usr/bin/env node
/**
 * TPL-014 M1 — play the moon's new half in a real browser, as a child who has run out of things to do.
 *
 * Makes a player through the form, then gives them what Richard's eldest has (five grown aliens, every favourite found,
 * stars to spare) by editing the one persisted store the way the game writes it, reloads, and on the moon: reads the
 * Alien Book's count, opens the book and counts its pages, builds the Crater Dome through the hangar's buy card, hatches
 * a surprise egg, and reloads to see both kept. Every clause sits beside a signal known to fire (the moon's own title).
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <dir> --allow-development-engine
 *   node scripts/devtools/drive-tpl014-moon.js <dir> [--shots <dir>] [--width 390]
 *
 * Exits 0 when every clause passed, 1 when any did.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = flag('--shots');
const WIDTH = Number(flag('--width') || 1100);
if (!DIR) {
  console.error('usage: drive-tpl014-moon.js <deploy-dir> [--shots <dir>] [--width N]');
  process.exit(2);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`.slice(0, 600));
};

const READ = `(() => ({ text: document.body.innerText, aliens: document.querySelectorAll('[data-alien]').length, buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) }))()`;
const LOCATE = (label) => `(() => {
  const leaves = [...document.querySelectorAll('button, *')].filter((e) => e.innerText && e.innerText.trim() === ${JSON.stringify(label)});
  const hit = leaves.find((e) => e.tagName === 'BUTTON') || leaves.reverse().find((e) => e.children.length === 0);
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, reachable: !!top && (hit === top || hit.contains(top) || top.contains(hit)) };
})()`;

// Her moon, as the game itself would have written it: five grown aliens, favourites found, one in a crown.
const HER_MOON = {
  aliens: [
    { id: 'a1', species: 'blob', colour: 'lime', name: 'Zib', meals: 24, fav: 'doughnut', found: true, wear: { hat: 'crown', eyes: '', neck: 'necklace' } },
    { id: 'a2', species: 'bean', colour: 'pink', name: 'Tilly', meals: 19, fav: 'cake', found: true, wear: { hat: '', eyes: 'glasses', neck: '' } },
    { id: 'a3', species: 'squid', colour: 'sky', name: 'Wiggo', meals: 22, fav: 'pizza', found: true, wear: { hat: 'beanie', eyes: '', neck: 'scarf' } },
    { id: 'a4', species: 'fuzz', colour: 'lilac', name: 'Puff', meals: 18, fav: 'cookie', found: true, wear: { hat: '', eyes: '', neck: '' } },
    { id: 'a5', species: 'star', colour: 'sunny', name: 'Nova', meals: 30, fav: 'cheese', found: true, wear: { hat: 'tophat', eyes: 'monocle', neck: 'bowtie' } }
  ],
  sel: 'a1',
  owned: ['crown', 'necklace', 'glasses', 'beanie', 'scarf', 'tophat', 'monocle', 'bowtie']
};

/** Find the persisted store, give its active player her moon and 2 800 stars to spend, and write it back. */
const SEED = `(() => {
  const moon = ${JSON.stringify(HER_MOON)};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    let doc;
    try { doc = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
    const stack = [doc];
    while (stack.length) {
      const o = stack.pop();
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o.profiles) && o.profiles.length) {
        const p = o.profiles.find((x) => x.id === o.activeId) || o.profiles[0];
        p.moon = moon;
        p.model = Object.assign({}, p.model, { stars: 3500, spent: 700 });
        localStorage.setItem(key, JSON.stringify(doc));
        return { key, ok: true };
      }
      for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  return { ok: false, keys: Object.keys(localStorage) };
})()`;

withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
  const snap = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, name + '.png'));
    return page.evaluate(READ);
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    await wait(200);
    const again = await page.evaluate(LOCATE(label));
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(again.x), y: Math.round(again.y), button: 'left', clickCount: 1 });
    }
    if (!again.reachable) console.warn(`  ⚠ "${label}" was clicked THROUGH a blocker`);
    await wait(800);
    return true;
  };

  await page.setViewport({ width: WIDTH, height: 1400 });
  await wait(1500);

  // A player, made the way a child makes one.
  await click('New player');
  const nameBox = await page.evaluate(`(() => { const i = document.querySelector('input'); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (nameBox) {
    for (const type of ['mousePressed', 'mouseReleased']) await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(nameBox.x), y: Math.round(nameBox.y), button: 'left', clickCount: 1 });
    await wait(150);
    await page.client.send('Input.insertText', { text: 'Ellie' });
    await wait(300);
  }
  await click('Let’s go!');
  await wait(800);

  const seeded = await page.evaluate(SEED);
  check('the store was found and given her moon (five aliens, 2 800 ⭐ to spend)', seeded.ok === true, seeded);

  await page.navigate('/moon');
  await wait(2500);
  let s = await snap('01-moon');
  check('the moon page is up (the known-firing signal: its title)', s.text.includes('The Moon'), s.text.slice(0, 300));
  check('her five aliens are on the moon, and she has 2 800 ⭐', s.text.includes('Zib') && s.text.includes('Nova') && s.text.includes('You have 2800 ⭐'), s.text.slice(0, 600));
  check('the book says how far she has got: 5 of 36', s.buttons.includes('Alien Book · 5 of 36'), s.buttons);
  check('big things to save for: two domes and the egg, with their prices', s.text.includes('Big things to save for') && s.text.includes('1000 ⭐ · room for 2 more') && s.text.includes('1500 ⭐ · room for 2 more') && s.text.includes('Surprise egg') && s.text.includes('an alien you have never had (31 it could be)'), s.text);
  check('a sixth alien can still be adopted: the moon is not full yet', s.text.includes('Adopt another alien · 200 ⭐'), s.buttons);

  // The book.
  const aliensBefore = s.aliens;
  await click('Alien Book · 5 of 36');
  s = await snap('02-book');
  check('opened, the book draws 36 pages', s.aliens - aliensBefore >= 36, { before: aliensBefore, after: s.aliens });
  check('a page never had says ?, and a page had says its kind and colour', s.text.includes('?') && /Blob\s+Lime/.test(s.text), s.text.slice(-800));
  await click('Close the book');

  // Build the Crater Dome.
  await click('Crater Dome');
  s = await snap('03-dome-ask');
  check('the dome asks first, on the hangar’s card', s.buttons.includes('Yes, buy it') && s.text.includes('Buy Crater Dome?'), s.buttons);
  await click('Yes, buy it');
  s = await snap('04-dome-built');
  check('the dome is built, and said so', s.text.includes('The Crater Dome is built: room for 2 more aliens!') && s.text.includes('Built ✓ · room for 2 more'), s.text.slice(0, 1500));
  check('1 000 ⭐ were spent: 1 800 left', s.text.includes('You have 1800 ⭐'), s.text.slice(0, 400));

  // Hatch an egg.
  await click('Surprise egg');
  await click('Yes, buy it');
  s = await snap('05-egg');
  check('the egg hatched a new alien, and said who', /The egg hatched: meet \S+, a [a-z]+ \S+!/.test(s.text), s.text.slice(0, 1500));
  check('the book counts it: 6 of 36', s.buttons.includes('Alien Book · 6 of 36'), s.buttons);
  check('300 ⭐ spent: 1 500 left', s.text.includes('You have 1500 ⭐'), s.text.slice(0, 400));

  // Kept.
  await page.navigate('/moon');
  await wait(2500);
  s = await snap('06-reload');
  check('after a reload the dome is still built and the book still says 6', s.text.includes('Built ✓ · room for 2 more') && s.buttons.includes('Alien Book · 6 of 36'), s.buttons);
  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors)
})
  .then(() => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} clauses passed`);
    process.exit(passed === results.length ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
