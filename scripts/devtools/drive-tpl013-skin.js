#!/usr/bin/env node
/**
 * TPL-013 SC-5 — a skin a child picks, in a real browser, for Star Class or Rocket School.
 *
 * Makes a player through the form: the five ✋ are read (in order, inside the window, pressable), the form's face is read
 * BEFORE a pick (Star Class: one of its darker default tones) and after ✋🏿 (the darkest). The player is made, the page is
 * loaded again from its URL (a reload: the store is read back from the browser's storage), and the bar's face is read. Then the
 * hangar: its row, a tap on ✋🏻, the preview's face, and the hangar loaded again. A face is read off the SVG DiceBear drew (the
 * kit's Avatar is an <img> with a data URI), so a clause sees the colour on screen, not only the value in the store.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/star-class <dir> --allow-development-engine
 *   node scripts/devtools/drive-tpl013-skin.js <dir> [--game star|rocket] [--width 390] [--shots <dir>]
 *
 * Exits 0 when every clause passed.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = flag('--shots');
const WIDTH = Number(flag('--width') || 390);
const GAME = flag('--game') || 'star';
if (!DIR) {
  console.error('usage: drive-tpl013-skin.js <deploy-dir> [--game star|rocket] [--width N] [--shots <dir>]');
  process.exit(2);
}
// SKIN_TONES in tpl007Scripts.ts, and Star Class's default (tpl013Edition.ts `skinDefault`).
const TONES = { t1: 'f2d3b1', t2: 'e0ac80', t3: 'c68642', t4: '8d5524', t5: '5c3317' };
const HANDS = ['✋🏻', '✋🏼', '✋🏽', '✋🏾', '✋🏿'];
const STAR_DEFAULT = ['t3', 't4', 't5'];
// DiceBear 9.4.2's own pixel-art skins (the form's default look), what Rocket School draws until a child picks. 🔴 8d5524 is one of
// them AND ✋🏾's, so "none of the five" is not a test of Rocket School's default: a seed lands on it (seen at 1024 px).
const DICE_PIXEL = ['ffdbac', 'f5cfa0', 'eac393', 'e0b687', 'cb9e6e', 'b68655', 'a26d3d', '8d5524'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`.slice(0, 700));
};

const READ = `(() => ({ text: document.body.innerText, buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) }))()`;
const LOCATE = (label) => `(() => {
  const leaves = [...document.querySelectorAll('button, *')].filter((e) => e.innerText && e.innerText.trim() === ${JSON.stringify(label)} && e.offsetParent !== null);
  const hit = leaves.find((e) => e.tagName === 'BUTTON') || leaves.reverse().find((e) => e.children.length === 0);
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, left: r.left, right: r.right, reachable: !!top && (hit === top || hit.contains(top)) };
})()`;
/** Every visible face DiceBear drew: which of the five tones its SVG fills with (none = a colour not on the list). */
const FACES = `(() => {
  const TONES = ${JSON.stringify(TONES)};
  const DICE = ${JSON.stringify(DICE_PIXEL)};
  return [...document.querySelectorAll('img')].filter((i) => i.offsetParent !== null && /^data:image\\/svg/.test(i.src)).map((i) => {
    let svg = i.src;
    try { svg = decodeURIComponent(svg.slice(svg.indexOf(',') + 1)); } catch (e) {}
    const r = i.getBoundingClientRect();
    const low = svg.toLowerCase();
    return { tones: Object.keys(TONES).filter((t) => low.includes('#' + TONES[t])), dice: DICE.filter((h) => low.includes('#' + h)), size: Math.round(r.width), y: Math.round(r.top) };
  });
})()`;
/** The active player's skin, as the store holds it. */
const ACTIVE = `(() => {
  for (let i = 0; i < localStorage.length; i++) {
    let doc;
    try { doc = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e) { continue; }
    const stack = [doc];
    while (stack.length) {
      const o = stack.pop();
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o.profiles) && o.profiles.length) {
        const p = o.profiles.find((x) => x.id === o.activeId) || o.profiles[0];
        return { found: true, name: p.name, skin: p.wear && p.wear.skin, look: p.look };
      }
      for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  return { found: false, keys: Object.keys(localStorage) };
})()`;

withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
  const snap = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${WIDTH}-${GAME}-skin-${name}.png`));
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
    await wait(700);
    return true;
  };
  /** The biggest face on screen: the form's, or the hangar preview's. */
  const bigFace = async () => (await page.evaluate(FACES)).sort((a, b) => b.size - a.size)[0] || null;

  await page.setViewport({ width: WIDTH, height: 1400 });
  await wait(1500);
  let s = await snap('01-profiles');
  check('the profiles page asks who is playing (the known-firing signal)', s.text.includes('Who is playing?'), s.text.slice(0, 300));

  // ── The form ────────────────────────────────────────────────────────────
  await click('New player');
  s = await snap('02-form');
  const pills = [];
  for (const h of HANDS) pills.push({ h, ...(await page.evaluate(LOCATE(h))) });
  check('the form offers the five ✋, light to dark', pills.every((p) => p.found), pills.filter((p) => !p.found).map((p) => p.h));
  check('in order (left to right, then down)', pills.every((p, i) => i === 0 || !p.found || !pills[i - 1].found || p.y > pills[i - 1].y + 4 || p.x > pills[i - 1].x), pills.map((p) => [p.h, Math.round(p.x), Math.round(p.y)]));
  check('each sits inside the window and can be pressed', pills.every((p) => p.found && p.left >= 0 && p.right <= WIDTH && p.reachable), pills.map((p) => [p.h, Math.round(p.left), Math.round(p.right), p.reachable]));

  const before = await bigFace();
  check('the form draws a face (the known-firing signal)', !!before, await page.evaluate(FACES));
  if (GAME === 'star') {
    check(`🔴 before a pick, Star Class's face is one of its darker tones (${STAR_DEFAULT.join(', ')}), and in none of DiceBear's own but the one they share`,
      !!before && before.tones.length === 1 && STAR_DEFAULT.includes(before.tones[0]) && before.dice.every((h) => h === TONES.t4), before);
  } else {
    check('before a pick, Rocket School leaves the skin to DiceBear: the face is in one of its own pixel-art tones, and in none of ours but the one they share',
      !!before && before.dice.length >= 1 && before.tones.every((t) => t === 't4'), before);
  }

  const nameBox = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((x) => x.offsetParent !== null); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (nameBox) {
    for (const type of ['mousePressed', 'mouseReleased']) await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(nameBox.x), y: Math.round(nameBox.y), button: 'left', clickCount: 1 });
    await wait(150);
    await page.client.send('Input.insertText', { text: 'Ada' });
    await wait(300);
  }
  await click('✋🏿');
  await snap('03-form-t5');
  const picked = await bigFace();
  check('🔴 ✋🏿 on the form: the face is drawn in the darkest tone at once', !!picked && picked.tones.join() === 't5', picked);
  await click('Let’s go!');
  await wait(900);
  let who = await page.evaluate(ACTIVE);
  check('the store holds the new player (the known-firing signal)', who.found && who.name === 'Ada', who);
  check('and her skin is t5', who.skin === 't5', who);

  // ── A reload ────────────────────────────────────────────────────────────
  await page.navigate('/home');
  await wait(1200);
  s = await snap('04-home-reloaded');
  who = await page.evaluate(ACTIVE);
  const home = await page.evaluate(FACES);
  check('after a reload the store still says t5', who.skin === 't5', who);
  check('🔴 and the bar’s face is drawn in it', home.length > 0 && home.some((f) => f.tones.join() === 't5'), home);

  // ── The hangar ──────────────────────────────────────────────────────────
  await page.navigate('/hangar');
  await wait(1200);
  s = await snap('05-hangar');
  const row = [];
  for (const h of HANDS) row.push({ h, ...(await page.evaluate(LOCATE(h))) });
  check('the hangar offers the five ✋ too, each pressable inside the window', row.every((p) => p.found && p.left >= 0 && p.right <= WIDTH && p.reachable), row.map((p) => [p.h, p.found, p.reachable]));
  const preview0 = await bigFace();
  check('its preview wears t5 (the known-firing signal for the change below)', !!preview0 && preview0.tones.join() === 't5', preview0);
  await click('✋🏻');
  await wait(600);
  await snap('06-hangar-t1');
  who = await page.evaluate(ACTIVE);
  const preview1 = await bigFace();
  check('🔴 ✋🏻 in the hangar: the store says t1', who.skin === 't1', who);
  check('and the preview is drawn in it, not in t5', !!preview1 && preview1.tones.join() === 't1', preview1);
  await page.navigate('/hangar');
  await wait(1200);
  who = await page.evaluate(ACTIVE);
  const preview2 = await bigFace();
  check('after a reload of the hangar, still t1, on the store and on the face', who.skin === 't1' && !!preview2 && preview2.tones.join() === 't1', { who, preview2 });

  // ── Edit player, from the bar's menu: the form opens filled with their skin, and Save keeps a new one ──
  // On Home, where the form's row is the only one on screen (the hangar has its own).
  await page.navigate('/home');
  await wait(1200);
  await click('▾');
  const opened = await click('Edit player');
  await wait(500);
  await snap('07-edit');
  const editRow = [];
  for (const h of HANDS) editRow.push({ h, ...(await page.evaluate(LOCATE(h))) });
  /** The colour a pill is painted: up from the ✋ to the first element with a background of its own. */
  const PILL = (label) => `(() => {
    const leaf = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.innerText && e.innerText.trim() === ${JSON.stringify(label)} && e.offsetParent !== null)[0];
    for (let el = leaf, n = 0; el && n < 6; el = el.parentElement, n++) { const bg = getComputedStyle(el).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; }
    return null;
  })()`;
  const paints = [];
  for (const h of HANDS) paints.push(await page.evaluate(PILL(h)));
  const odd = paints.filter((p) => paints.filter((q) => q === p).length === 1);
  check('Edit player opens the form with the five ✋ (the known-firing signal)', opened && editRow.every((p) => p.found), editRow.map((p) => [p.h, p.found]));
  check('🔴 filled with theirs: ✋🏻 is the one selected (the only one of the five painted differently)', paints.every(Boolean) && odd.length === 1 && paints[0] === odd[0], paints);
  await click('✋🏾');
  await click('Save');
  await wait(800);
  who = await page.evaluate(ACTIVE);
  const after = await page.evaluate(FACES);
  check('🔴 Save keeps ✋🏾: the store says t4, and the bar’s face is drawn in it', who.skin === 't4' && after.some((f) => f.tones.join() === 't4'), { who, after });

  const side = await page.evaluate(`(() => ({ scroll: document.documentElement.scrollWidth, window: window.innerWidth }))()`);
  check('the hangar does not scroll sideways', side.scroll <= side.window, side);
  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 4));
  check('no network errors', page.networkErrors.length === 0, page.networkErrors.slice(0, 3));
})
  .then(() => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} clauses passed at ${WIDTH} px (${GAME})`);
    process.exit(passed === results.length ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
