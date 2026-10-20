#!/usr/bin/env node
/**
 * TPL-013 s5 — Number Hunt and Make Ten play at the class the rating has reached, and P1–P2 are asked the hunt as a picture.
 *
 * Makes a P5 player through the form. A new P5 player is rated two classes below, at P3, so the hunt asks a sentence
 * ("Pick 2 numbers…"). Then a P1 rating goes into the store and the hunt is opened again: the task is now `❓ + ❓ = N`, no
 * letters, and the drive plays it, tapping a pair the grid holds that makes N. Then a P5 rating: a sentence again. Make Ten is
 * read at both ratings, over several new games: single numbers only at P1's, a tile above 9 at P5's.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/star-class <dir> --allow-development-engine
 *   node scripts/devtools/drive-tpl013-hunt.js <dir> [--width 390] [--shots <dir>]
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
if (!DIR) {
  console.error('usage: drive-tpl013-hunt.js <deploy-dir> [--width N] [--shots <dir>]');
  process.exit(2);
}
// editionLevelBase(): P3 = 800, 250 a class. A rating at the start of a class is its base + PLAY_AT (190) + 50.
const RATED = { P1: 300 + 240, P5: 1300 + 240 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`.slice(0, 700));
};

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
/** The hunt's task: the leaf that holds a ❓ or starts "Pick", with its size and where it sits; and the sixteen numbers. */
const HUNT = `(() => {
  const leaves = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.offsetParent !== null && e.innerText && e.innerText.trim());
  const task = leaves.find((e) => /❓|^Pick /.test(e.innerText.trim()));
  const nums = leaves.filter((e) => /^\\d+(,\\d+)?$/.test(e.innerText.trim())).map((e) => { const r = e.getBoundingClientRect(); return { v: e.innerText.trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  if (!task) return { found: false, nums };
  const r = task.getBoundingClientRect();
  return { found: true, text: task.innerText.trim(), size: parseFloat(getComputedStyle(task).fontSize), left: r.left, right: r.right, lines: Math.round(r.height / parseFloat(getComputedStyle(task).lineHeight || getComputedStyle(task).fontSize)), nums };
})()`;
const BODY = `document.body.innerText`;
const SIDEWAYS = `(() => ({ scroll: document.documentElement.scrollWidth, window: window.innerWidth }))()`;
const SET_RATING = (rating) => `(() => {
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
        p.model = Object.assign({}, p.model, { rating: ${rating} });
        localStorage.setItem(key, JSON.stringify(doc));
        return { ok: true, name: p.name, level: p.level };
      }
      for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  return { ok: false, keys: Object.keys(localStorage) };
})()`;

withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
  const shot = async (name) => SHOTS && page.screenshot(path.join(SHOTS, `${WIDTH}-hunt-${name}.png`));
  const tapAt = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    await wait(200);
    const again = await page.evaluate(LOCATE(label));
    await tapAt(again.x, again.y);
    if (!again.reachable) console.warn(`  ⚠ "${label}" was clicked THROUGH a blocker`);
    await wait(700);
    return true;
  };
  const openHunt = async (name) => {
    await page.navigate('/hunt');
    await wait(1500);
    await shot(name);
    return page.evaluate(HUNT);
  };
  /** Make Ten's tiles over `games` new games: every number drawn on the board. */
  const mergeTiles = async (name, games = 5) => {
    await page.navigate('/merge');
    await wait(1500);
    await shot(name);
    const seen = [];
    for (let g = 0; g < games; g++) {
      if (g) await click('New game');
      const nums = (await page.evaluate(HUNT)).nums.map((n) => Number(n.v));
      seen.push(...nums);
    }
    return seen;
  };

  await page.setViewport({ width: WIDTH, height: 1400 });
  await wait(1500);
  const first = await page.evaluate(BODY);
  check('the profiles page asks who is playing (the known-firing signal)', first.includes('Who is playing?'), first.slice(0, 200));

  // ── A new P5 player: rated at P3, so the hunt is a sentence ───────────────
  await click('New player');
  const nameBox = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((x) => x.offsetParent !== null); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (nameBox) {
    await tapAt(nameBox.x, nameBox.y);
    await wait(150);
    await page.client.send('Input.insertText', { text: 'Ada' });
    await wait(300);
  }
  await click('P5');
  await click('Let’s go!');
  await wait(900);

  let h = await openHunt('01-p5-new');
  check('the hunt draws its sixteen numbers (the known-firing signal)', h.nums.length === 16, h);
  check('a new P5 player (playing at P3) is asked a sentence, "Pick …"', h.found && /^Pick /.test(h.text), h);

  // ── A P1 rating: the picture ───────────────────────────────────────────
  const set1 = await page.evaluate(SET_RATING(RATED.P1));
  check('the store was found and took a P1 rating', set1.ok === true && set1.level === 'P5', set1);
  h = await openHunt('02-p1-rated');
  const m = h.found ? /^❓( [+−] ❓)+ = (\d+)$/.exec(h.text) : null;
  check('🔴 rated at P1 (picked P5), the hunt is asked as a picture: ❓ + ❓ = N', !!m, h);
  check('no letter in it', h.found && !/\p{L}/u.test(h.text), h.text);
  check('it sits inside the window on one line, at least as big as the numbers (≥ 20 px)', h.found && h.left >= 0 && h.right <= WIDTH && h.lines <= 1 && h.size >= 20, h);
  const side = await page.evaluate(SIDEWAYS);
  check('the hunt does not scroll sideways', side.scroll <= side.window, side);

  if (m && h.text.split('❓').length === 3 && h.text.includes('+')) {
    const target = Number(m[2]);
    const nums = h.nums;
    let pair = null;
    for (let a = 0; a < nums.length && !pair; a++) for (let b = a + 1; b < nums.length && !pair; b++) if (Number(nums[a].v) + Number(nums[b].v) === target) pair = [nums[a], nums[b]];
    check(`the grid holds a pair that makes ${target}`, !!pair, nums.map((n) => n.v));
    if (pair) {
      await tapAt(pair[0].x, pair[0].y);
      await wait(400);
      await tapAt(pair[1].x, pair[1].y);
      await wait(900);
      await shot('03-p1-found');
      const body = await page.evaluate(BODY);
      check(`🔴 tapping ${pair[0].v} and ${pair[1].v} is a way found (✅ ${pair[0].v} + ${pair[1].v} = ${target})`, body.includes('✅') && body.includes(`= ${target}`), body.slice(0, 400));
    }
  } else check('a P1 grid is two numbers that add (P1 hunts add2 only)', false, h.text);

  const p1Tiles = await mergeTiles('04-merge-p1');
  check('Make Ten draws tiles (the known-firing signal)', p1Tiles.length >= 2, p1Tiles);
  check('🔴 rated at P1, Make Ten deals single numbers only, over five games', p1Tiles.length >= 2 && p1Tiles.every((t) => t >= 1 && t <= 9), p1Tiles);

  // ── A P5 rating: the sentence again, and Make Ten's bigger tiles ─────────
  const set5 = await page.evaluate(SET_RATING(RATED.P5));
  check('the store took a P5 rating', set5.ok === true, set5);
  h = await openHunt('05-p5-rated');
  check('rated at P5, the hunt is a sentence again', h.found && /^Pick /.test(h.text) && !h.text.includes('❓'), h);
  const p5Tiles = await mergeTiles('06-merge-p5');
  check('🔴 rated at P5, Make Ten deals a tile above 9 in five games', p5Tiles.some((t) => t > 9), p5Tiles);

  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 4));
  check('no network errors', page.networkErrors.length === 0, page.networkErrors.slice(0, 3));
})
  .then(() => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} clauses passed at ${WIDTH} px`);
    process.exit(passed === results.length ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
