#!/usr/bin/env node
/**
 * P87 RKT-011 — do a child's stars become something they choose, wear, and see in the very next race?
 *
 * "A child who has saved up opens the hangar, picks a crown for their face and paints their rocket green, and sees both in the
 * very next race."
 *
 * One fresh Chrome per arm × cell. Every reading is graded against the STORED profile (localStorage), and every picture against
 * DiceBear's own drawing of the stored choice, made by the kit bundle the page itself loaded (`NodegxDicebear`), never against
 * another element on screen. The probe builds that expected picture from the stored wear by the kit's contract (a worn part is
 * [value] with its Probability at 100); the kit gate pins the contract, and `expected` checks the crowned and plain pictures differ.
 *
 * Arms:
 *   pick   (AC7) FR 390×844, FR 1024×768, EN 1366×768. On the touch cells taps are touches under a coarse pointer, so the pad has
 *          no box and the race is answered on its keys, as a tablet child does. A Smile-faced player is seeded at 10 ⭐ (the probe writes the total;
 *          the race, the landing, the milestone and the pick are the product's) and races to the planet:
 *     crossed    known-firing: the stored total passed the first milestone (15)
 *     offered    the result screen says "🎁 …" and shows "To the hangar"
 *     focus      Play again still has the focus, so Enter plays on (RKT-003)
 *     hangar     "To the hangar" opens the hangar: the preview and the shelf's tiles are on screen
 *     picked     tapping Crown spends the pick: stored owned is ["crown"], and the Smile face wears sailormoonCrown
 *     popped     with motion allowed, the preview runs rkt-wear-a/-b right after the tap (the control for --reduced's `still`)
 *     painted    tapping Sky blue (free) paints the rocket: stored wear.paint is var(--rocket-paint-blue)
 *     expected   known-firing: DiceBear's crowned picture for this seed differs from the plain one
 *     preview    the hangar's preview face is the crowned picture
 *     trackFace  the next race's rocket A carries the crowned picture
 *     trackPaint rocket A's body is the blue paint, and was not blue in the race before (the control)
 *     reload     after a reload the store still has both, and the header face is still crowned
 *   screen (AC8) FR at all five viewports (1024×768, 768×1024 and 390×844 with a coarse pointer), and EN 1366×768. A Pixel-faced
 *          player seeded at 45 ⭐ (two picks) opens the hangar from Home's bar to the next pick (no longer a card among the games):
 *     sideways   the page is no wider than the viewport asked for
 *     fold       the preview, the tabs and the first row of tiles are above the fold
 *     tiles44    every tile is at least 44 × 44
 *     greyed     known-firing: a plain tile exists; the Crown tile is greyed and says it fits the Smile face
 *     tap        tapping Cap (it fits, and a pick is waiting) spends a pick: stored owned gains "cap"
 *     coarse     on the touch cells, the page reports (pointer: coarse)
 *   --reduced (AC9) the pick arm up to the pick, FR 390×844, prefers-reduced-motion:
 *     still      right after the pick changed the preview's class, nothing on it is animating
 *   every cell: quiet — no console error
 *
 * Usage:
 *   node scripts/devtools/drive-rkt011-hangar.js <deploy-dir> [--arm pick|screen] [--lang fr|en] [--only 390x844] [--shots <dir>] [--reduced]
 * Exits 0 when every clause in every cell passed.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const argv = process.argv.slice(2);
const DIR = argv[0];
const arg = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};
const SHOTS = arg('--shots');
const REDUCED = argv.includes('--reduced');
const ARMS = arg('--arm') ? [arg('--arm')] : REDUCED ? ['pick'] : ['pick', 'screen'];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt011-hangar.js <deploy-dir> [--arm pick|screen] [--lang fr|en] [--only 390x844] [--shots <dir>] [--reduced]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const VPS = {
  '1366x768': { width: 1366, height: 768, mobile: false, touch: false },
  '1280x720': { width: 1280, height: 720, mobile: false, touch: false },
  '1024x768': { width: 1024, height: 768, mobile: true, touch: true },
  '768x1024': { width: 768, height: 1024, mobile: true, touch: true },
  '390x844': { width: 390, height: 844, mobile: true, touch: true }
};
const DEFAULT_CELLS = {
  pick: [['fr', '390x844'], ['fr', '1024x768'], ['en', '1366x768']],
  screen: [['fr', '1366x768'], ['fr', '1280x720'], ['fr', '1024x768'], ['fr', '768x1024'], ['fr', '390x844'], ['en', '1366x768']]
};
const cellsFor = (arm) => {
  let cells = REDUCED ? [['fr', '390x844']] : DEFAULT_CELLS[arm];
  if (arg('--lang') && arg('--only')) cells = arg('--only').split(',').map((vp) => [arg('--lang'), vp]);
  else if (arg('--lang')) cells = cells.filter(([l]) => l === arg('--lang'));
  else if (arg('--only')) cells = cells.filter(([, v]) => arg('--only').split(',').includes(v));
  return cells;
};

const W = {
  en: {
    game: 'Rocket Race',
    start: 'Start',
    next: 'Next',
    check: 'Check',
    again: 'Play again',
    homeButton: 'Home',
    settings: 'Change the race',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    results: ['You reached the planet!', 'The computer got there first. Again?'],
    hangar: 'Hangar',
    toHangar: 'To the hangar',
    earnedPick: '🎁 You earned a pick!',
    rocketTab: 'Rocket',
    crown: 'Crown',
    cap: 'Cap',
    blue: 'Sky blue'
  },
  fr: {
    game: 'Course de fusées',
    start: 'Commencer',
    next: 'Suivant',
    check: 'Vérifier',
    again: 'Rejouer',
    homeButton: 'Accueil',
    settings: 'Changer de course',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?'],
    hangar: 'Hangar',
    toHangar: 'Au hangar',
    earnedPick: '🎁 Tu as gagné un choix !',
    rocketTab: 'Fusée',
    crown: 'Couronne',
    cap: 'Casquette',
    blue: 'Bleu ciel'
  }
};
const BLUE = 'rgb(47, 95, 208)'; // --rocket-paint-blue, #2f5fd0

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NUMERIC = /^[\d\s  .,/−-]+$/;

/** The same solver as drive-rkt010-stars.js: the right answer for the maths prompts a CM1 race asks. */
function solve(prompt) {
  if (!prompt) return null;
  const n = (s) => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));
  const out = (v) => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : null);
  const N = '([\\d\\s\\u00a0\\u202f.,]+)';
  const re = (s) => new RegExp('^' + s.replace(/N/g, N) + '$');
  let m;
  if ((m = prompt.match(re('N \\+ N = \\?')))) return out(n(m[1]) + n(m[2]));
  if ((m = prompt.match(re('N [−-] N = \\?')))) return out(n(m[1]) - n(m[2]));
  if ((m = prompt.match(re('N × N = \\?')))) return out(n(m[1]) * n(m[2]));
  if ((m = prompt.match(re('N ÷ N = \\?')))) return out(n(m[1]) / n(m[2]));
  if ((m = prompt.match(/^\? × (\d+) = (\d+)$/))) return out(n(m[2]) / n(m[1]));
  if ((m = prompt.match(/^\? \+ (\d+) = (\d+)$/))) return out(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^(\d+) \+ \? = (\d+)$/))) return out(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^(?:Double|Le double de) (\d+) = \?$/))) return out(n(m[1]) * 2);
  if ((m = prompt.match(/^(?:Half of|La moitié de) (\d+) = \?$/))) return out(n(m[1]) / 2);
  if ((m = prompt.match(/^(\d+) \+ (\d+) = \? \+ (\d+)$/))) return out(n(m[1]) + n(m[2]) - n(m[3]));
  if ((m = prompt.match(/^(\d+) \+ (\d+) × (\d+) = \?$/))) return out(n(m[1]) + n(m[2]) * n(m[3]));
  return null;
}

/**
 * Find the app object in localStorage (it may sit inside a JSON string), and set the active player's star total.
 *
 * 🔴 A Smile face draws a random accessory by its seed, and 124 of 2000 random seeds already wear sailormoonCrown (measured
 * 2026-09-13), so picking Crown changes nothing on them: build 4's pick arm drew two such seeds in three cells, and `expected` could
 * grade nothing there. A seed like that is re-rolled here, told apart by the page's own DiceBear, and the note says so.
 */
const SEED = (stars) => `(() => {
  const stars = ${JSON.stringify(stars)};
  let rerolled = null;
  const walk = (v, depth) => {
    if (!v || typeof v !== 'object' || depth > 6) return false;
    if (Array.isArray(v.profiles) && typeof v.activeId === 'string') {
      const p = v.profiles.find((x) => x.id === v.activeId);
      if (!p) return false;
      p.model = Object.assign({ rating: 0, skills: {}, lastSkill: '', answered: 0 }, p.model || {}, { stars });
      const d = typeof NodegxDicebear !== 'undefined' ? NodegxDicebear : null;
      if (d && p.look === 'big-smile') {
        const wears = (seed) => d.avatarSvg(p.look, seed, { accessories: ['sailormoonCrown'], accessoriesProbability: 100, size: 40 }) === d.avatarSvg(p.look, seed, { size: 40 });
        const from = p.seed;
        for (let n = 1; n < 50 && wears(p.seed); n++) p.seed = from + '-' + n;
        if (p.seed !== from) rerolled = { from, to: p.seed };
      }
      return true;
    }
    for (const k of Object.keys(v)) {
      if (typeof v[k] === 'string' && /^[{[]/.test(v[k])) {
        let inner; try { inner = JSON.parse(v[k]); } catch (e) { continue; }
        if (walk(inner, depth + 1)) { v[k] = JSON.stringify(inner); return true; }
      } else if (walk(v[k], depth + 1)) return true;
    }
    return false;
  };
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    let parsed; try { parsed = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
    if (walk(parsed, 0)) { localStorage.setItem(key, JSON.stringify(parsed)); return { key, rerolled, dicebear: typeof NodegxDicebear !== 'undefined' }; }
  }
  return null;
})()`;

/** Everything a clause reads, in one evaluation — including the stored profile and DiceBear's picture of what it wears. */
const READ = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (label) => buttons.find((b) => b.innerText.trim() === label);
  const verdict = texts.find((e) => words.verdicts.includes(e.innerText.trim()));
  const result = texts.find((e) => words.results.includes(e.innerText.trim()));
  let promptEl = null, size = 0;
  for (const e of texts) {
    if (e === verdict || e === result || e.closest('button') || e.closest('.rkt-tile') || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; promptEl = e; }
  }
  const padBox = document.querySelector('.gk-pad input:not([disabled])');
  // Under a coarse pointer the pad has no box (RKT-005): the answer is its keys, then the check key.
  const padKeys = [...document.querySelectorAll('.gk-pad button')].filter(vis).map((b) => ({ label: b.innerText.trim(), ...box(b) }));
  const options = buttons.filter((b) => !b.closest('.gk-pad') && ${NUMERIC}.test(b.innerText.trim()));
  const again = byLabel(words.again);

  // The store: the active player.
  let stored = null;
  try {
    const find = (v, depth) => {
      if (!v || typeof v !== 'object' || depth > 6) return null;
      if (Array.isArray(v.profiles) && typeof v.activeId === 'string') return v;
      for (const k of Object.keys(v)) { const hit = find(typeof v[k] === 'string' && /^[{[]/.test(v[k]) ? JSON.parse(v[k]) : v[k], depth + 1); if (hit) return hit; }
      return null;
    };
    for (let i = 0; i < localStorage.length; i++) {
      let parsed; try { parsed = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e) { continue; }
      const app = find(parsed, 0);
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p) stored = { stars: p.model ? p.model.stars : undefined, owned: p.owned || [], wear: p.wear || null, look: p.look, seed: p.seed }; break; }
    }
  } catch (e) { stored = { error: String(e) }; }

  // DiceBear's own picture of the stored wear, at a size, by the kit's contract.
  const d = typeof NodegxDicebear !== 'undefined' ? NodegxDicebear : null;
  const picture = (size, withWear) => {
    if (!d || !stored || !stored.look) return null;
    const parts = (withWear && stored.wear && stored.wear.face && stored.wear.face[stored.look]) || {};
    const o = {};
    for (const part of Object.keys(parts)) { o[part] = [parts[part]]; o[part + 'Probability'] = 100; }
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(d.avatarSvg(stored.look, stored.seed, Object.assign(o, { size })));
  };

  const tiles = [...document.querySelectorAll('.rkt-tile')].filter(vis).map((t) => {
    const r = t.getBoundingClientRect();
    const words = [...t.querySelectorAll('.ndl-visual-text')].filter(vis).map((x) => x.innerText.trim());
    const cs = getComputedStyle(t);
    return { label: words[0] || '', note: words[1] || '', x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), opacity: Number(cs.opacity) };
  });
  const preview = [...document.querySelectorAll('.rkt-preview')].find(vis) || null;
  const previewImg = preview ? preview.querySelector('img') : null;
  const bodyA = [...document.querySelectorAll('path[data-rocket="a"]')].find(vis) || null;
  const imageA = bodyA ? bodyA.parentElement.querySelector('image') : null;
  const headerImg = [...document.querySelectorAll('img')].filter(vis).find((i) => Math.round(i.getBoundingClientRect().width) === 40 && !i.closest('.rkt-tile') && !i.closest('.rkt-preview')) || null;
  const tabs = texts.filter((e) => e.innerText.trim() === words.rocketTab).map(box)[0] || null;
  return {
    prompt: promptEl ? promptEl.innerText.trim() : null,
    verdict: verdict ? verdict.innerText.trim() : null,
    result: result ? result.innerText.trim() : null,
    padBox: box(padBox),
    padKeys,
    options: options.map((b) => ({ label: b.innerText.trim(), ...box(b) })),
    next: box(byLabel(words.next)),
    again: box(again),
    focusOnAgain: !!again && document.activeElement === again,
    pickLine: !!texts.find((e) => e.innerText.trim() === words.earnedPick),
    toHangar: box(byLabel(words.toHangar)),
    tiles,
    tabs,
    preview: preview ? { ...box(preview), cls: preview.className, anim: getComputedStyle(preview).animationName, running: preview.getAnimations ? preview.getAnimations({ subtree: true }).length : -1, src: previewImg ? previewImg.getAttribute('src') : null } : null,
    trackA: bodyA ? { fill: getComputedStyle(bodyA).fill, href: imageA ? imageA.getAttribute('href') : null } : null,
    headerSrc: headerImg ? headerImg.getAttribute('src') : null,
    crowned40: picture(40, true),
    plain40: picture(40, false),
    crowned96: picture(96, true),
    plain96: picture(96, false),
    crowned64: picture(64, true),
    plain64: picture(64, false),
    url: location.pathname,
    coarse: matchMedia('(pointer: coarse)').matches,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 160),
    stored
  };
})()`;

const cells = [];

async function driveCell(arm, lang, vpKey) {
  const w = W[lang];
  const vp = VPS[vpKey];
  const cell = { arm, lang, vp: vpKey, reduced: REDUCED, reached: false, clauses: {}, saw: {}, notes: [] };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);
  const clause = (name, ok, saw) => {
    cell.clauses[name] = !!ok;
    if (!ok) cell.saw[name] = saw;
  };

  await withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
    // The page's console errors, printed for every cell, including one that stopped before `quiet` (session 10: the hangar's
    // shelf drew no tile, and the cell returned before anything said why).
    cell.errors = page.consoleErrors;
    const send = (method, params) => page.client.send(method, params || {});
    const read = () => page.evaluate(READ(w));
    const touch = vp.touch;
    const tapAt = async (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      if (touch) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
      }
    };
    const pressLabel = async (label) => {
      const at = await page.evaluate(`(() => {
        const all = [...document.querySelectorAll('button, .pressable, [class*="pressable"]')].filter((e) => e.getClientRects().length);
        const hit = all.find((e) => e.innerText.trim() === ${JSON.stringify(label)}) ||
          [...document.querySelectorAll('*')].reverse().find((e) => e.children.length === 0 && e.getClientRects().length && e.innerText && e.innerText.trim() === ${JSON.stringify(label)});
        if (!hit) return null;
        hit.scrollIntoView({ block: 'center', behavior: 'instant' });
        const r = hit.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!at) return false;
      await tapAt(at.x, at.y);
      await wait(700);
      return true;
    };
    const tapTile = async (label) => {
      await page.evaluate(`(() => { const t = [...document.querySelectorAll('.rkt-tile')].find((e) => e.innerText.trim().startsWith(${JSON.stringify(label)})); if (t) t.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`);
      await wait(300);
      const t = (await read()).tiles.find((x) => x.label === label);
      if (!t) return false;
      await tapAt(t.x, t.y);
      return true;
    };
    const key = async (keyName, code, vk, text) => {
      const typed = text ? { text, unmodifiedText: text } : {};
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: vk, ...typed });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: vk });
    };
    const until = async (test, ms) => {
      const end = Date.now() + ms;
      for (;;) {
        const r = await read();
        if (test(r)) return r;
        if (Date.now() > end) return null;
        await wait(150);
      }
    };
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt011-${arm}-${lang}-${vpKey}${REDUCED ? '-reduced' : ''}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const question = () => until((r) => r.result || (r.prompt && (r.padBox || r.padKeys.length || r.options.length) && !r.verdict), 8000);
    const answer = async () => {
      const q = await question();
      if (!q || q.result) return q;
      const solved = solve(q.prompt);
      if (!q.padBox && q.padKeys.length) {
        // Tap each character on the pad (the French pad shows ',' for the decimal point), then the check key.
        const text = lang === 'fr' ? String(solved || '1').replace('.', ',') : String(solved || '1');
        for (const ch of text) {
          const k = q.padKeys.find((b) => b.label === ch);
          if (k) {
            await tapAt(k.x, k.y);
            await wait(120);
          }
        }
        const check = q.padKeys.find((b) => b.label === w.check);
        if (check) await tapAt(check.x, check.y);
        else await key('Enter', 'Enter', 13, '\r');
      } else if (q.padBox) {
        await page.evaluate(`(() => { const i = document.querySelector('.gk-pad input:not([disabled])'); if (i) i.focus(); })()`);
        await wait(120);
        await send('Input.insertText', { text: solved || '1' });
        await wait(200);
        await key('Enter', 'Enter', 13, '\r');
      } else {
        const hit = q.options.find((o) => o.label.replace(/[\s  ]/g, '') === solved) || q.options[0];
        await tapAt(hit.x, hit.y);
      }
      return until((r) => r.verdict || r.result, 5000);
    };
    const toPlanet = async () => {
      for (let guard = 0; guard < 45; guard++) {
        const v = await answer();
        if (!v) return null;
        if (v.result) return v;
        const r = await read();
        if (r.next) await tapAt(r.next.x, r.next.y);
        await wait(900);
        const after = await read();
        if (after.result) return after;
      }
      return null;
    };
    const reloadTo = async () => {
      await send('Page.reload', {});
      await wait(3500);
      const r = await read();
      if (r.body.includes('Léa') && !r.headerSrc) {
        await pressLabel('Léa');
        await wait(1500);
      }
    };

    await page.setViewport({ width: vp.width, height: vp.height, mobile: vp.mobile });
    if (REDUCED) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await wait(1200);

    // ── A player, with a star total the probe writes ──
    if (!(await pressLabel('New player'))) return note('no "New player" button');
    await wait(400);
    const at = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (at) {
      await tapAt(at.x, at.y);
      await wait(150);
      await send('Input.insertText', { text: 'Léa' });
    }
    await pressLabel(arm === 'pick' ? 'Smile' : 'Pixel');
    await pressLabel('CM1');
    if (lang === 'fr') await pressLabel('Français');
    if (!(await pressLabel('Let’s go!'))) return note('no "Let’s go!" button');
    await wait(1800);
    const seeded = await page.evaluate(SEED(arm === 'pick' ? 10 : 45));
    if (!seeded) return note('could not find the app object in localStorage to seed the stars');
    // The screen arm's touch cells reload anyway, and a coarse pointer needs the reload; the pick arm reloads to load the seed.
    await reloadTo();
    const home = await read();
    const reroll = seeded.rerolled ? ` · 🔴 seed ${seeded.rerolled.from} already wore the crown, re-rolled to ${seeded.rerolled.to}` : '';
    note(`seeded ${JSON.stringify(home.stored)} under "${seeded.key}" · dicebear ${seeded.dicebear} · coarse ${home.coarse}${reroll}`);

    if (arm === 'pick') {
      if (!(await pressLabel(w.game))) return note(`no "${w.game}" on Home — ${home.body}`);
      await wait(1200);
      if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
      await wait(1200);
      await page.evaluate('window.scrollTo(0, 0)');
      const first = await question();
      if (!first || first.result) return note(`no first question — ${(await read()).body}`);
      cell.reached = true;
      const fillBefore = first.trackA && first.trackA.fill;
      const landed = await toPlanet();
      if (!landed) return note('the race never landed');
      await wait(2200);
      const r = await read();
      await shoot('result');
      clause('crossed', r.stored && r.stored.stars >= 15, JSON.stringify(r.stored));
      clause('offered', r.pickLine && !!r.toHangar, JSON.stringify({ pickLine: r.pickLine, toHangar: r.toHangar, body: r.body }));
      clause('focus', r.focusOnAgain, 'document.activeElement is not Play again');
      if (!r.toHangar) return note('no way to the hangar on the result');
      await tapAt(r.toHangar.x, r.toHangar.y);
      const hg = await until((x) => x.preview && x.tiles.length > 0, 6000);
      await shoot('hangar');
      clause('hangar', !!hg, JSON.stringify((await read()).body));
      if (!hg) return;
      const clsBefore = hg.preview.cls;
      if (!(await tapTile(w.crown))) return note(`no "${w.crown}" tile — ${hg.tiles.map((t) => t.label).join(', ')}`);
      // The first reading where the preview's class has changed: the moment the pop starts.
      const popping = await until((x) => x.preview && x.preview.cls !== clsBefore, 3000);
      const afterPick = await until((x) => x.stored && x.stored.owned.includes('crown'), 3000);
      if (REDUCED) {
        clause('still', popping && /rkt-wear-/.test(popping.preview.cls) && popping.preview.anim === 'none' && popping.preview.running === 0, JSON.stringify(popping && popping.preview));
      } else {
        clause('popped', popping && /^rkt-wear-[ab]$/.test(popping.preview.anim), JSON.stringify(popping && popping.preview));
      }
      const st = (afterPick || (await read())).stored;
      clause('picked', st && JSON.stringify(st.owned) === '["crown"]' && st.wear && st.wear.face && st.wear.face['big-smile'] && st.wear.face['big-smile'].accessories === 'sailormoonCrown', JSON.stringify(st));
      await shoot('picked');
      if (REDUCED) {
        clause('quiet', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 3)));
        return;
      }
      await pressLabel(w.rocketTab);
      await wait(600);
      if (!(await tapTile(w.blue))) return note(`no "${w.blue}" tile — ${(await read()).tiles.map((t) => t.label).join(', ')}`);
      const painted = await until((x) => x.stored && x.stored.wear && x.stored.wear.paint === 'var(--rocket-paint-blue)', 3000);
      clause('painted', !!painted, JSON.stringify((await read()).stored));
      await wait(800);
      const pv = await read();
      await shoot('painted');
      clause('expected', pv.crowned96 && pv.crowned40 && pv.plain40 && pv.crowned40 !== pv.plain40, JSON.stringify({ dicebear: !!pv.crowned40, differs: pv.crowned40 !== pv.plain40 }));
      await page.evaluate('window.scrollTo(0, 0)');
      const pvTop = await read();
      // Which known picture the preview face is: a mismatch says whether the crown or the size is what differs.
      const matched = (x, src) => ['crowned96', 'plain96', 'crowned64', 'plain64', 'crowned40', 'plain40'].find((k) => x[k] === src) || 'none of them';
      clause('preview', pvTop.preview && pvTop.preview.src === pvTop.crowned96, JSON.stringify({ previewIs: pvTop.preview && matched(pvTop, pvTop.preview.src), srcHead: pvTop.preview && decodeURIComponent(String(pvTop.preview.src)).slice(24, 140) }));

      // ── The very next race ──
      if (!(await pressLabel(w.homeButton))) return note('no Home button on the hangar');
      await wait(1500);
      if (!(await pressLabel(w.game))) return note('no race card on Home');
      await wait(1200);
      if (!(await pressLabel(w.start))) return note(`no "${w.start}" on the second setup`);
      await wait(1500);
      await page.evaluate('window.scrollTo(0, 0)');
      const q2 = await until((x) => x.trackA && x.trackA.href, 8000);
      await shoot('next-race');
      clause('trackFace', q2 && q2.trackA.href === q2.crowned40, JSON.stringify({ href: q2 && String(q2.trackA.href).slice(0, 60), same: q2 && q2.trackA.href === q2.crowned40, plain: q2 && q2.trackA.href === q2.plain40 }));
      clause('trackPaint', q2 && q2.trackA.fill === BLUE && fillBefore && fillBefore !== BLUE, JSON.stringify({ now: q2 && q2.trackA.fill, raceBefore: fillBefore }));

      // ── A reload ──
      // In a live race the page's bar (and its Home) steps aside (RKT-006), so leave by the race's own Change the race first.
      const leftRace = (await pressLabel(w.settings)) && (await pressLabel(w.homeButton));
      await wait(1200);
      await reloadTo();
      const landedOn = await read();
      await shoot('reload');
      note(`after reload: left the race by its buttons ${leftRace} · url ${landedOn.url} · header face found ${!!landedOn.headerSrc} · body "${landedOn.body}"`);
      const rl = (await until((x) => x.headerSrc, 5000)) || landedOn;
      clause('reload', rl.stored && rl.stored.owned.includes('crown') && rl.stored.wear && rl.stored.wear.paint === 'var(--rocket-paint-blue)' && rl.headerSrc === rl.crowned40, JSON.stringify({ stored: rl.stored, headerIs: rl.headerSrc ? matched(rl, rl.headerSrc) : 'no 40px header face' }));
    }

    if (arm === 'screen') {
      // 2026-09-14: the hangar is no longer a card among the games (Richard's request). Home's bar to the next pick opens it; at 45 ⭐
      // it says two picks are waiting.
      const bar = lang === 'fr' ? '🎁 2 choix à faire au hangar' : '🎁 2 picks to spend in the hangar';
      if (!(await pressLabel(bar))) return note(`no "${bar}" bar on Home — ${home.body}`);
      const hg = await until((x) => x.preview && x.tiles.length > 0, 6000);
      if (!hg) return note(`the hangar never showed — ${(await read()).body}`);
      cell.reached = true;
      await page.evaluate('window.scrollTo(0, 0)');
      await wait(400);
      const s = await read();
      await shoot('screen');
      clause('sideways', s.scrollWidth <= vp.width, JSON.stringify({ scrollWidth: s.scrollWidth, asked: vp.width }));
      const firstRowTop = Math.min(...s.tiles.map((t) => t.top));
      const firstRow = s.tiles.filter((t) => t.top === firstRowTop);
      clause('fold', s.preview && s.preview.bottom <= vp.height && s.tabs && s.tabs.bottom <= vp.height && firstRow.length > 0 && Math.max(...firstRow.map((t) => t.bottom)) <= vp.height, JSON.stringify({ preview: s.preview && s.preview.bottom, tabs: s.tabs, firstRowBottom: firstRow.length && Math.max(...firstRow.map((t) => t.bottom)), height: vp.height }));
      clause('tiles44', s.tiles.length > 0 && s.tiles.every((t) => t.w >= 44 && t.h >= 44), JSON.stringify(s.tiles.filter((t) => t.w < 44 || t.h < 44)));
      const crown = s.tiles.find((t) => t.label === w.crown);
      clause('greyed', s.tiles.some((t) => t.opacity === 1) && crown && crown.opacity < 1 && /Smile/.test(crown.note), JSON.stringify({ crown, plain: s.tiles.filter((t) => t.opacity === 1).length }));
      if (touch) clause('coarse', s.coarse === true, `matchMedia('(pointer: coarse)') is ${s.coarse}`);
      if (!(await tapTile(w.cap))) return note(`no "${w.cap}" tile`);
      const tapped = await until((x) => x.stored && x.stored.owned.includes('cap'), 3000);
      await shoot('after-tap');
      clause('tap', !!tapped, JSON.stringify((await read()).stored));
    }
    clause('quiet', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 3)));
  });
}

(async () => {
  for (const arm of ARMS) {
    for (const [lang, vpKey] of cellsFor(arm)) {
      try {
        await driveCell(arm, lang, vpKey);
      } catch (e) {
        const mine = cells[cells.length - 1];
        const threw = `the drive threw — ${e.stack || e}`;
        if (mine && mine.arm === arm && mine.lang === lang && mine.vp === vpKey) {
          mine.notes.push(threw);
          mine.reached = false;
        } else cells.push({ arm, lang, vp: vpKey, reached: false, clauses: {}, saw: {}, notes: [threw] });
      }
      const c = cells[cells.length - 1];
      const bad = Object.entries(c.clauses).filter(([, ok]) => !ok).map(([k]) => k);
      const good = Object.values(c.clauses).filter(Boolean).length;
      console.log(`${c.arm.padEnd(7)} ${c.lang} ${c.vp.padEnd(9)} ${c.reached ? '' : 'NOT REACHED  '}${good}/${Object.keys(c.clauses).length} clauses${bad.length ? `  failed: ${bad.join(', ')}` : ''}`);
      for (const k of bad) console.log(`    ${k}: ${c.saw[k]}`);
      for (const n of c.notes) console.log(`    · ${n}`);
      if (c.errors && c.errors.length) console.log(`    · console errors (${c.errors.length}): ${JSON.stringify(c.errors.slice(0, 5))}`);
    }
  }
  const allGood = cells.length > 0 && cells.every((c) => c.reached && Object.values(c.clauses).length > 0 && Object.values(c.clauses).every(Boolean));
  console.log(allGood ? `ALL PASS across ${cells.length} cells${REDUCED ? ' (reduced motion)' : ''}` : 'NOT ALL PASS');
  process.exit(allGood ? 0 : 1);
})();
