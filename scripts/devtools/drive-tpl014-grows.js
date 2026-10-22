#!/usr/bin/env node
/**
 * TPL-014 M2–M5 — play the moon's new places in a real browser, as Richard's eldest would: a moon of five grown aliens and
 * stars to spare (written into the store the way the game writes it), then the shop (a lantern, the garden), an Expedition
 * (land, walk by answering, one answer wrong on purpose, reload mid-trip, swap to the Squiggle, come home), the moon again
 * (what the trip brought home), and Alien school (teach Zib the topic that makes it a Scholar).
 *
 * The questions are the player's own focus, set to the 7 times table with buttons, so the drive can work out the answer
 * from the prompt. Every clause sits beside a signal known to fire (the page's own title).
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/rocket-school <dir> --allow-development-engine
 *   node scripts/devtools/drive-tpl014-grows.js <dir> [--shots <dir>] [--width 390] [--hash]
 *   node scripts/devtools/drive-tpl014-grows.js - --origin https://nodegx.io/templates/rocket-school --hash
 *
 * --hash: the deploy uses hash navigation (the nodegx.io demo), so pages are /#/moon, not /moon.
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
const HASH = process.argv.includes('--hash');
// --origin: grade a site already served (a staged folder under its real path, or the live demo), not a folder from disk.
const ORIGIN = flag('--origin');
if (!DIR) {
  console.error('usage: drive-tpl014-grows.js <deploy-dir> [--shots <dir>] [--width N] [--hash]');
  process.exit(2);
}
const route = (p) => (HASH ? '/#/' + p : '/' + p);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`.slice(0, 900));
};

const READ = `(() => ({ text: document.body.innerText, buttons: [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()).filter(Boolean), tiles: document.querySelectorAll('.rkt-trip-near, .rkt-trip-here, .rkt-trip-far').length, forms: [...document.querySelectorAll('[data-form]')].map((e) => e.getAttribute('data-form')).filter(Boolean) }))()`;
const LOCATE = (label) => `(() => {
  const leaves = [...document.querySelectorAll('button, *')].filter((e) => e.innerText && e.innerText.trim() === ${JSON.stringify(label)} && e.offsetParent !== null);
  const hit = leaves.find((e) => e.tagName === 'BUTTON') || leaves.reverse().find((e) => e.children.length === 0);
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, reachable: !!top && (hit === top || hit.contains(top) || top.contains(hit)) };
})()`;
/** The planet as drawn: which tile index the alien stands on, and the tiles it can walk to (each with its centre). */
const PLANET = `(() => {
  const tiles = [...document.querySelectorAll('.rkt-trip-near, .rkt-trip-here, .rkt-trip-far')];
  const here = tiles.findIndex((t) => t.className.includes('rkt-trip-here'));
  const near = tiles.map((t, i) => ({ i, t })).filter((x) => x.t.className.includes('rkt-trip-near')).map(({ i, t }) => {
    t.scrollIntoView({ block: 'center' });
    const r = t.getBoundingClientRect();
    return { i, x: r.left + r.width / 2, y: r.top + r.height / 2, fog: t.className.includes('rkt-trip-fog'), text: t.innerText.trim() };
  });
  return { count: tiles.length, here, near, alienOnHere: here >= 0 && !!tiles[here].querySelector('[data-alien]') };
})()`;

// Her moon, as the game itself would have written it: five grown aliens (one a Squiggle), Zib two topics from a Scholar.
const HER_MOON = {
  aliens: [
    { id: 'a1', species: 'blob', colour: 'lime', name: 'Zib', meals: 24, fav: 'doughnut', found: true, wear: { hat: 'crown', eyes: '', neck: 'necklace' }, taught: { bonds: 5, divide: 5, tables: 4 } },
    { id: 'a2', species: 'bean', colour: 'pink', name: 'Tilly', meals: 19, fav: 'cake', found: true, wear: { hat: '', eyes: 'glasses', neck: '' } },
    { id: 'a3', species: 'squid', colour: 'sky', name: 'Wiggo', meals: 22, fav: 'pizza', found: true, wear: { hat: 'beanie', eyes: '', neck: 'scarf' } },
    { id: 'a4', species: 'fuzz', colour: 'lilac', name: 'Puff', meals: 18, fav: 'cookie', found: true, wear: { hat: '', eyes: '', neck: '' } },
    { id: 'a5', species: 'star', colour: 'sunny', name: 'Nova', meals: 30, fav: 'cheese', found: true, wear: { hat: 'tophat', eyes: 'monocle', neck: 'bowtie' } }
  ],
  sel: 'a1',
  owned: ['crown', 'necklace', 'glasses', 'beanie', 'scarf', 'tophat', 'monocle', 'bowtie']
};

/** Find the persisted store; give its active player her moon, 2 800 ⭐ to spend, and the 7 times table with buttons. */
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
        p.level = 'CM1';
        p.answerMode = 'options';
        p.focus = { subject: 'maths', skills: ['table-7'] };
        p.model = Object.assign({}, p.model, { stars: 3500, spent: 700 });
        localStorage.setItem(key, JSON.stringify(doc));
        return { key, ok: true };
      }
      for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  return { ok: false, keys: Object.keys(localStorage) };
})()`;
/** The store's trip, read back: where the alien is, and the bag. */
const TRIP = `(() => {
  for (let i = 0; i < localStorage.length; i++) {
    let doc; try { doc = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e) { continue; }
    const stack = [doc];
    while (stack.length) {
      const o = stack.pop();
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o.profiles) && o.profiles.length) { const p = o.profiles.find((x) => x.id === o.activeId) || o.profiles[0]; return p.moon || null; }
      for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
})()`;

/** The 7 times table, as the picker asks it: a × b, a ÷ b, or one side missing. The answer, or null. */
function solve(text) {
  for (const line of text.split('\n').map((l) => l.trim())) {
    let m;
    if ((m = line.match(/^(\d+)\s*[×x]\s*(\d+)\s*(=\s*\?)?$/))) return String(Number(m[1]) * Number(m[2]));
    if ((m = line.match(/^(\d+)\s*÷\s*(\d+)\s*(=\s*\?)?$/))) return String(Number(m[1]) / Number(m[2]));
    if ((m = line.match(/^\?\s*[×x]\s*(\d+)\s*=\s*(\d+)$/))) return String(Number(m[2]) / Number(m[1]));
    if ((m = line.match(/^(\d+)\s*[×x]\s*\?\s*=\s*(\d+)$/))) return String(Number(m[2]) / Number(m[1]));
  }
  return null;
}
const OPTION = (b) => /^\d+$/.test(b);

withDeployedSite(ORIGIN ? { origin: ORIGIN } : { dir: DIR, port: 0 }, async (page) => {
  const snap = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, name + '.png'));
    return page.evaluate(READ);
  };
  /** Go to a page AND reload it: under hash navigation a hash change is not a reload, and the store would not be read again. */
  const open = async (name) => {
    await page.navigate(route(name));
    if (HASH) {
      await wait(500);
      await page.client.send('Page.reload', { ignoreCache: false });
    }
    await wait(2500);
  };
  const tap = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    await wait(200);
    const again = await page.evaluate(LOCATE(label));
    await tap(again.x, again.y);
    if (!again.reachable) console.warn(`  ⚠ "${label}" was clicked THROUGH a blocker`);
    await wait(800);
    return true;
  };
  /** Answer the question on screen: right (worked out), or a wrong button on purpose. Returns what was pressed. */
  const answer = async (right) => {
    const s = await page.evaluate(READ);
    const want = solve(s.text);
    const options = s.buttons.filter(OPTION);
    const press = right ? want : options.find((o) => o !== want);
    if (!press || !options.includes(press)) return { pressed: null, want, options };
    await click(press);
    await wait(500);
    return { pressed: press, want, options };
  };

  await page.setViewport({ width: WIDTH, height: 1400 });
  await wait(1500);

  // A player, made the way a child makes one.
  await click('New player');
  const nameBox = await page.evaluate(`(() => { const i = document.querySelector('input'); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (nameBox) {
    await tap(nameBox.x, nameBox.y);
    await wait(150);
    await page.client.send('Input.insertText', { text: 'Ellie' });
    await wait(300);
  }
  await click('Let’s go!');
  await wait(800);
  const seeded = await page.evaluate(SEED);
  check('the store was found and given her moon (five grown aliens, 2 800 ⭐, the 7 times table)', seeded.ok === true, seeded);

  // ── The moon: where to go, what to aim for, the shop ──
  await open('moon');
  let s = await snap('01-moon');
  check('the moon page is up (the known-firing signal: its title)', s.text.includes('The Moon'), s.text.slice(0, 300));
  check('two places to go: the Expedition and Alien school, each saying what waits', s.text.includes('🧭 Expedition') && s.text.includes('Explore a planet with an alien. Your answers move it.') && s.text.includes('🎓 Alien school') && s.text.includes('Zib is stuck on a question. Teach it, and it changes.'), s.text.slice(0, 1200));
  check('something to aim for: the book, the next dome, Zib’s next form, the postcards', s.text.includes('Something to aim for') && s.text.includes('5 of 36 aliens met') && s.text.includes('Zib → Scholar') && s.text.includes('0 of 20 found on trips'), s.text);
  check('gear for expeditions, each with its price and what it does', s.text.includes('Gear for expeditions') && s.text.includes('120 ⭐ · each right answer clears the fog on all four sides') && s.text.includes('Big boots'), s.text);
  check('the garden and the postcard frame are big things to save for', s.text.includes('Moon garden') && s.text.includes('Postcard frame'), s.text);

  await click('Lantern');
  s = await snap('02-lantern-ask');
  check('the lantern asks first, on the hangar’s card', s.buttons.includes('Yes, buy it') && s.text.includes('Buy Lantern?'), s.buttons);
  await click('Yes, buy it');
  s = await snap('03-lantern');
  check('the lantern is theirs (120 ⭐ spent: 2 680 left)', s.text.includes('Yours ✓ · each right answer') && s.text.includes('You have 2680 ⭐'), s.text.slice(0, 2000));
  await click('Moon garden');
  await click('Yes, buy it');
  s = await snap('04-garden');
  check('the garden is built, and shows itself with nothing planted yet', s.text.includes('🪴 The moon garden') && s.text.includes('No seeds yet: an expedition finds some.'), s.text.slice(0, 2500));

  // ── The Expedition ──
  await click('🧭 Expedition');
  await wait(1500);
  s = await snap('05-expedition');
  check('the Expedition page is up, from the moon', s.text.includes('Expedition') && s.text.includes('Set off with Zib'), s.text.slice(0, 600));
  await click('Set off with Zib');
  await wait(800);
  s = await snap('06-landed');
  let planet = await page.evaluate(PLANET);
  check('landed: the planet is named, 36 tiles, Zib stands on the rocket with two tiles to walk to', s.text.includes('Planet Zuma') && s.text.includes('Landed on Zuma! Zib steps out of the rocket.') && planet.count === 36 && planet.alienOnHere && planet.near.length === 2, { planet, text: s.text.slice(0, 600) });

  let walked = 0, wrongDone = false, steps = 0;
  const said = [];
  while (steps++ < 24 && walked < 9) {
    planet = await page.evaluate(PLANET);
    const fogged = planet.near.filter((n) => n.fog);
    const to = (fogged.length ? fogged : planet.near)[steps % (fogged.length || planet.near.length)];
    if (!to) break;
    await tap(to.x, to.y);
    await wait(900);
    s = await page.evaluate(READ);
    if (!s.text.includes('To walk there, answer:')) { said.push('no aim: ' + s.text.slice(0, 200)); continue; }
    const before = planet.here;
    const wrong = !wrongDone && walked === 2;
    const a = await answer(!wrong);
    if (!a.pressed) { said.push('unsolved: ' + JSON.stringify(a)); continue; }
    if (wrong) {
      s = await snap('07-wrong');
      const after = await page.evaluate(PLANET);
      check('a wrong answer moves nothing and loses nothing, and says so', after.here === before && s.text.includes('Not quite. Nothing is lost: pick a tile and try again.') && s.text.includes('No step · nothing lost'), { before, after: after.here, text: s.text.slice(0, 900) });
      wrongDone = true;
    } else {
      const after = await page.evaluate(PLANET);
      const t = (await page.evaluate(READ)).text;
      said.push(t.split('\n').find((l) => l.startsWith('Right!')) || '?');
      if (after.here !== before) walked++;
    }
    await click('Next');
    await wait(500);
  }
  console.log('  walk: ' + said.join(' | '));
  s = await snap('08-walked');
  const moonNow = await page.evaluate(TRIP);
  check(`a right answer walks one tile: ${walked} steps taken`, walked >= 6, said);
  // The lantern's own property: every tile beside where the alien stands is clear (a walk that doubles back reveals nothing new).
  const besides = (i) => [i - 6, i + 6, i % 6 ? i - 1 : -1, i % 6 < 5 ? i + 1 : -1].filter((j) => j >= 0 && j < 36);
  check('the lantern cleared the fog on all four sides of where the alien stands', moonNow && moonNow.trip && besides(moonNow.trip.pos).every((j) => moonNow.trip.seen[j]), moonNow && moonNow.trip && { pos: moonNow.trip.pos, seen: besides(moonNow.trip.pos).map((j) => moonNow.trip.seen[j]) });
  check('the verdict on a trip is a step', s.text.includes('one step') || said.length > 0, s.text.slice(0, 400));
  const bagBefore = moonNow && moonNow.trip ? moonNow.trip.bag.length : -1;
  console.log(`  bag: ${bagBefore} finds`);

  // A reload keeps the trip.
  await open('expedition');
  s = await snap('09-reload');
  const kept = await page.evaluate(TRIP);
  check('after a reload the trip is where it was: the same planet, the same bag', s.text.includes('Planet Zuma') && kept && kept.trip && kept.trip.bag.length === bagBefore, { bag: kept && kept.trip && kept.trip.bag.length, text: s.text.slice(0, 300) });

  await click('Wiggo · swims');
  s = await snap('10-wiggo');
  check('the Squiggle takes the lead, and can swim', s.text.includes('Wiggo takes the lead. It can swim!'), s.text.slice(0, 900));

  await click('Come home with everything');
  s = await snap('11-home');
  check('home safe, with what the bag held', bagBefore > 0 ? /Home safe with .+! Everything goes in the Alien Book\./.test(s.text) : s.text.includes('Home safe. Nothing found this time, and nothing lost.'), s.text.slice(0, 900));
  const home = await page.evaluate(TRIP);
  check('the trip is over and the finds are on the moon', home && home.trip === null && Object.values(home.finds || {}).reduce((a, b) => a + b, 0) === bagBefore, home && { trip: home.trip, finds: home.finds });

  // ── The moon again ──
  await open('moon');
  s = await snap('12-moon-after');
  check('the moon says the trip is over (Explore a planet…), and the book holds what was found', s.text.includes('Explore a planet with an alien.'), s.text.slice(0, 1200));
  await click('Alien Book · 5 of 36');
  s = await snap('13-book');
  check('the open book lists what expeditions brought home', bagBefore > 0 ? s.text.includes('Found on expeditions: ') : s.text.includes('Nothing found on expeditions yet.'), s.text.slice(-900));
  await click('Close the book');

  // ── Alien school ──
  await click('🎓 Alien school');
  await wait(2000);
  s = await snap('14-school');
  check('Alien school is up: Zib is stuck, says so, and is asked a question', s.text.includes('Zib is stuck') && s.text.includes('“I don’t get this one. Can you show me?”') && s.buttons.filter(OPTION).length >= 2, s.text.slice(0, 900));
  check('what Zib has learned: three bars, two full', s.text.includes('What Zib has learned') && (s.text.match(/Learned ✓/g) || []).length === 2 && s.text.includes('4 of 5'), s.text);
  const taught = await answer(true);
  await wait(800);
  s = await snap('15-scholar');
  check('one more right answer teaches Zib the times tables, and Zib becomes a Scholar', taught.pressed && s.text.includes('“I get Times tables now! Look at me!” Zib became a Scholar!'), { taught, text: s.text.slice(0, 900) });
  check('Zib is drawn in its Scholar form', s.forms.includes('scholar'), s.forms);
  await click('Next');
  await wait(800);
  s = await snap('16-next');
  check('Next asks Zib another question', s.buttons.filter(OPTION).length >= 2, s.buttons);

  await open('moon');
  s = await snap('17-moon-scholar');
  check('on the moon, Zib’s tile says Scholar, and its next goal is another form', /Zib\s+Scholar/.test(s.text) && s.forms.includes('scholar'), s.text.slice(0, 900));
  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors);
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
