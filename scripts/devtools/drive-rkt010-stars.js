#!/usr/bin/env node
/**
 * P87 RKT-010 — do the stars a child earns add up, stay theirs, and show where they should and nowhere else?
 *
 * "A child lands the rocket, watches '+18 ⭐' count up on the result screen, sees their total grow on Home, and never loses a
 * star they earned."
 *
 * One fresh Chrome per arm × cell. The default cells are the two RKT-010 AC7 names: FR 390×844 and EN 1366×768. Every
 * number on screen is graded against the STORED profile (localStorage), never against another number on screen.
 *
 * Arms (default: race, restart):
 *   race     — Practice, me vs the computer, to the planet twice (AC1 RED, AC7)
 *     stored     — known-firing: the stored `answered` rose, so the probe really reads the store
 *     hasStars   — the stored model carries a numeric `stars` (RED before RKT-010)
 *     resultStars— the result screen shows "+N ⭐", and its breakdown's numbers add up to N
 *     delta      — N is the stored total after the race minus the total before it
 *     animated   — with motion allowed, the stars line runs rkt-pop (the control for --reduced's `still`)
 *     again      — Play again: the second race's "+N ⭐" is its own stored delta, under a new race id
 *     home       — Home's stars tile shows the stored total
 *     reload     — after a reload, Home still shows it
 *     cardClean  — the Profiles page (siblings' cards) shows no ⭐, while Home's tile does
 *   restart  — Practice, three answers, Restart, then to the planet (AC8)
 *     paying     — known-firing: the three answers stored stars
 *     kept       — every star stored before Restart is still there after it
 *     noLanding  — Restart paid nothing: the stored total did not move
 *     delta      — the race after Restart shows "+N ⭐" equal to its own stored delta
 *   --reduced (race arm, one race): prefers-reduced-motion
 *     still      — the stars line has no animation and is fully opaque the moment the result shows (AC9)
 *   every cell: quiet — no console error
 *
 * Usage:
 *   node scripts/devtools/drive-rkt010-stars.js <deploy-dir> [--arm race|restart] [--lang fr|en] [--only 390x844]
 *        [--shots <dir>] [--reduced]
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
const ARMS = arg('--arm') ? [arg('--arm')] : REDUCED ? ['race'] : ['race', 'restart'];
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt010-stars.js <deploy-dir> [--arm race|restart] [--lang fr|en] [--only 390x844] [--shots <dir>] [--reduced]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const VPS = {
  '1366x768': { width: 1366, height: 768, mobile: false },
  '390x844': { width: 390, height: 844, mobile: true }
};
// RKT-010 AC7's two cells. --lang and --only narrow them; --lang with --only makes one cell of any pairing.
let CELLS = [['fr', '390x844'], ['en', '1366x768']];
if (arg('--lang') && arg('--only')) CELLS = arg('--only').split(',').map((vp) => [arg('--lang'), vp]);
else if (arg('--lang')) CELLS = CELLS.filter(([l]) => l === arg('--lang'));
else if (arg('--only')) CELLS = CELLS.filter(([, v]) => arg('--only').split(',').includes(v));
if (REDUCED && !arg('--lang') && !arg('--only')) CELLS = [['fr', '390x844']];
if (!CELLS.length || CELLS.some(([, v]) => !VPS[v])) {
  console.error(`no cell to drive (viewports: ${Object.keys(VPS).join(', ')})`);
  process.exit(2);
}

const W = {
  en: {
    game: 'Rocket Race',
    homeButton: 'Home',
    switchPlayer: 'Switch player',
    start: 'Start',
    next: 'Next',
    restart: 'Restart',
    again: 'Play again',
    settings: 'Change the race',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    results: ['You reached the planet!', 'The computer got there first. Again?'],
    starsLabel: 'stars earned ⭐',
    landed: 'landed +'
  },
  fr: {
    game: 'Course de fusées',
    homeButton: 'Accueil',
    switchPlayer: 'Changer de joueur',
    start: 'Commencer',
    next: 'Suivant',
    restart: 'Recommencer',
    again: 'Rejouer',
    settings: 'Changer de course',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?'],
    starsLabel: 'étoiles gagnées ⭐',
    landed: 'arrivée +'
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NUMERIC = /^[\d\s  .,/−-]+$/;

/** The same solver as drive-rkt006-restart.js: the right answer for the maths prompts a CM1 race asks. */
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

/** Everything a clause reads, in one evaluation — including the stored profile. */
const READ = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const verdict = texts.find((e) => words.verdicts.includes(e.innerText.trim()));
  const result = texts.find((e) => words.results.includes(e.innerText.trim()));
  // The prompt, as drive-rkt006-restart.js finds it: the largest text that is not a verdict, a result or a button.
  let promptEl = null, size = 0;
  for (const e of texts) {
    if (e === verdict || e === result || e.closest('button') || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; promptEl = e; }
  }
  const padBox = document.querySelector('.gk-pad input:not([disabled])');
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (label) => buttons.find((b) => b.innerText.trim() === label);
  const options = buttons.filter((b) => !b.closest('.gk-pad') && ${NUMERIC}.test(b.innerText.trim()));
  // The race's stars: the element carrying rkt-stars (or, on a build without it, any "+N ⭐" text), and the breakdown line.
  const starsBox = [...document.querySelectorAll('.rkt-stars')].find(vis) || null;
  const starsAny = texts.find((e) => /^\\+\\d+ ⭐$/.test(e.innerText.trim()));
  const starsEl = starsBox || starsAny || null;
  const whyEl = texts.find((e) => e.innerText.includes(words.landed));
  const cs = starsEl ? getComputedStyle(starsEl) : null;
  // Home's stars tile: the label, and the number in the same tile.
  const label = texts.find((e) => e.innerText.trim() === words.starsLabel);
  let tile = null;
  if (label) for (let a = label.parentElement, i = 0; a && i < 4; a = a.parentElement, i++) {
    const n = [...a.querySelectorAll('.ndl-visual-text')].find((t) => vis(t) && /^\\d+$/.test(t.innerText.trim()));
    if (n) { tile = Number(n.innerText.trim()); break; }
  }
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
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p) stored = { answered: Number(p.model && p.model.answered) || 0, stars: p.model ? p.model.stars : undefined, lastRaceId: p.model ? p.model.lastRaceId : undefined, bests: p.model ? p.model.bests : undefined }; break; }
    }
  } catch (e) { stored = { error: String(e) }; }
  return {
    prompt: promptEl ? promptEl.innerText.trim() : null,
    verdict: verdict ? verdict.innerText.trim() : null,
    result: result ? result.innerText.trim() : null,
    padBox: box(padBox),
    options: options.map((b) => ({ label: b.innerText.trim(), ...box(b) })),
    next: box(byLabel(words.next)),
    restart: box(byLabel(words.restart)),
    again: box(byLabel(words.again)),
    starsText: starsEl ? starsEl.innerText.trim() : null,
    starsClass: !!starsBox,
    anim: cs ? { name: cs.animationName, opacity: cs.opacity } : null,
    why: whyEl ? whyEl.innerText.trim() : null,
    tile,
    bodyStar: document.body.innerText.includes('⭐'),
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
    const send = (method, params) => page.client.send(method, params);
    const read = () => page.evaluate(READ(w));
    const tapAt = async (x, y) => {
      for (const type of ['mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
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
        await wait(250);
      }
    };
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt010-${arm}-${lang}-${vpKey}${REDUCED ? '-reduced' : ''}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const question = () => until((r) => r.result || (r.prompt && (r.padBox || r.options.length) && !r.verdict), 8000);
    const answer = async (right) => {
      const q = await question();
      if (!q || q.result) return q;
      const solved = solve(q.prompt);
      if (q.padBox) {
        const value = right ? solved || '1' : solved === '1' ? '2' : '1';
        await page.evaluate(`(() => { const i = document.querySelector('.gk-pad input:not([disabled])'); if (i) i.focus(); })()`);
        await wait(120);
        await send('Input.insertText', { text: value });
        await wait(200);
        await key('Enter', 'Enter', 13, '\r');
      } else {
        const hit = (right && q.options.find((o) => o.label.replace(/[\s  ]/g, '') === solved)) || q.options[right ? 0 : q.options.length - 1];
        await tapAt(hit.x, hit.y);
      }
      return until((r) => r.verdict || r.result, 5000);
    };
    const nextRound = async () => {
      const r = await read();
      if (r.next) await tapAt(r.next.x, r.next.y);
      await wait(900);
    };
    /** Right answers until a rocket lands. Returns the reading taken the moment the result showed (for the animation clauses). */
    const toPlanet = async () => {
      for (let guard = 0; guard < 45; guard++) {
        const v = await answer(true);
        if (!v) return null;
        if (v.result) return v;
        await nextRound();
        const r = await read();
        if (r.result) return r;
      }
      return null;
    };
    /** "+N ⭐" and the breakdown: N, and whether the breakdown's numbers add up to it. */
    const take = (r) => {
      const m = r && r.starsText && r.starsText.match(/^\+(\d+) ⭐$/);
      const parts = r && r.why ? [...r.why.matchAll(/\+(\d+)/g)].map((x) => Number(x[1])) : [];
      return { n: m ? Number(m[1]) : null, parts, adds: !!m && parts.length > 0 && parts.reduce((a, b) => a + b, 0) === Number(m[1]) };
    };
    const starsOf = (s) => (s && typeof s.stars === 'number' ? s.stars : 0);

    await page.setViewport(vp);
    if (REDUCED) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await wait(1200);

    // ── A player, Home, the race ──
    if (!(await pressLabel('New player'))) return note('no "New player" button');
    await wait(400);
    const at = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (at) {
      await tapAt(at.x, at.y);
      await wait(150);
      await send('Input.insertText', { text: 'Léa' });
    }
    await pressLabel('CM1');
    if (lang === 'fr') await pressLabel('Français');
    if (!(await pressLabel('Let’s go!'))) return note('no "Let’s go!" button');
    await wait(1800);
    const home0 = await read();
    if (!home0.body.includes(w.game)) return note(`Home never showed "${w.game}" — ${home0.body}`);
    const before = home0.stored;
    note(`Home before: tile ${home0.tile}, stored ${JSON.stringify(before)}`);
    await pressLabel(w.game);
    await wait(1200);
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
    await wait(1200);
    await page.evaluate('window.scrollTo(0, 0)');
    const first = await question();
    if (!first || first.result) return note(`no first question — ${(await read()).body}`);
    cell.reached = true;

    if (arm === 'race') {
      const landed = await toPlanet();
      if (!landed) return note('race 1 never landed');
      const atOnce = await read();
      await wait(2200);
      const r1 = await read();
      await shoot('result');
      const s1 = r1.stored;
      const t1 = take(r1);
      note(`race 1: "${r1.starsText}" · "${r1.why}" · stored ${JSON.stringify(s1)} · stars class ${r1.starsClass}`);
      clause('stored', s1 && before && s1.answered > before.answered, JSON.stringify({ before, after: s1 }));
      clause('hasStars', s1 && typeof s1.stars === 'number', JSON.stringify(s1));
      clause('resultStars', t1.n !== null && t1.adds, JSON.stringify({ starsText: r1.starsText, why: r1.why, parts: t1.parts }));
      clause('delta', t1.n !== null && s1 && typeof s1.stars === 'number' && t1.n === s1.stars - starsOf(before), JSON.stringify({ shown: t1.n, storedBefore: before && before.stars, storedAfter: s1 && s1.stars }));
      if (REDUCED) {
        clause('still', atOnce.anim && atOnce.anim.name === 'none' && Number(atOnce.anim.opacity) === 1, JSON.stringify(atOnce.anim));
      } else {
        clause('animated', atOnce.anim && atOnce.anim.name === 'rkt-pop', JSON.stringify(atOnce.anim));
        // ── Play again: a new race id, and its own landing ──
        if (!r1.again) return note('no Play again on the result');
        await tapAt(r1.again.x, r1.again.y);
        await wait(1200);
        const landed2 = await toPlanet();
        if (!landed2) return note('race 2 never landed');
        await wait(2200);
        const r2 = await read();
        const s2 = r2.stored;
        const t2 = take(r2);
        note(`race 2: "${r2.starsText}" · "${r2.why}" · stored ${JSON.stringify(s2)}`);
        clause('again', t2.n !== null && s2 && typeof s2.stars === 'number' && t2.n === s2.stars - starsOf(s1) && s2.lastRaceId && s2.lastRaceId !== (s1 && s1.lastRaceId), JSON.stringify({ shown: t2.n, before: s1 && s1.stars, after: s2 && s2.stars, ids: [s1 && s1.lastRaceId, s2 && s2.lastRaceId] }));
        // ── Home ──
        await pressLabel(w.settings);
        await wait(1000);
        await pressLabel(w.homeButton);
        await wait(1500);
        const h = await read();
        await shoot('home');
        clause('home', typeof h.tile === 'number' && s2 && h.tile === s2.stars, JSON.stringify({ tile: h.tile, stored: s2 && s2.stars, body: h.body }));
        await send('Page.reload', {});
        await wait(3500);
        let hr = await read();
        if (hr.tile === null && hr.body.includes('Léa')) {
          await pressLabel('Léa');
          await wait(1500);
          hr = await read();
        }
        clause('reload', typeof hr.tile === 'number' && s2 && hr.tile === s2.stars, JSON.stringify({ tile: hr.tile, stored: hr.stored && hr.stored.stars, body: hr.body }));
        // ── The Profiles page: the cards siblings see ──
        const homeStar = hr.bodyStar;
        // RKT-008: Switch player is inside the player menu, which opens from the name.
        await pressLabel('Léa');
        await wait(900);
        await pressLabel(w.switchPlayer);
        await wait(1500);
        const pf = await read();
        await shoot('profiles');
        clause('cardClean', homeStar && pf.body.includes('Léa') && !pf.bodyStar && pf.tile === null, JSON.stringify({ homeShowsStar: homeStar, profilesShowsStar: pf.bodyStar, body: pf.body }));
      }
    }

    if (arm === 'restart') {
      for (let i = 0; i < 3; i++) {
        const v = await answer(true);
        if (!v || v.result) return note(`round ${i + 1}: ${v ? 'the race ended' : 'no verdict'}`);
        await nextRound();
      }
      await question();
      await wait(1500);
      const a = await read();
      clause('paying', starsOf(a.stored) > starsOf(before), JSON.stringify({ before, after3: a.stored }));
      if (!a.restart) return note('no Restart in the stage');
      await tapAt(a.restart.x, a.restart.y);
      await wait(2000);
      const b = await read();
      await shoot('after-restart');
      clause('kept', starsOf(b.stored) >= starsOf(a.stored), JSON.stringify({ beforeRestart: a.stored, afterRestart: b.stored }));
      clause('noLanding', starsOf(b.stored) === starsOf(a.stored), JSON.stringify({ beforeRestart: a.stored && a.stored.stars, afterRestart: b.stored && b.stored.stars }));
      const landed = await toPlanet();
      if (!landed) return note('the race after Restart never landed');
      await wait(2200);
      const r = await read();
      await shoot('result');
      const t = take(r);
      note(`after Restart: "${r.starsText}" · "${r.why}" · stored ${JSON.stringify(r.stored)}`);
      clause('delta', t.n !== null && r.stored && typeof r.stored.stars === 'number' && t.n === r.stored.stars - starsOf(b.stored), JSON.stringify({ shown: t.n, afterRestart: b.stored && b.stored.stars, atEnd: r.stored && r.stored.stars }));
    }
    clause('quiet', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 3)));
  });
}

(async () => {
  for (const arm of ARMS) {
    for (const [lang, vpKey] of CELLS) {
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
      console.log(`${c.arm.padEnd(8)} ${c.lang} ${c.vp.padEnd(9)} ${c.reached ? '' : 'NOT REACHED  '}${good}/${Object.keys(c.clauses).length} clauses${bad.length ? `  failed: ${bad.join(', ')}` : ''}`);
      for (const k of bad) console.log(`    ${k}: ${c.saw[k]}`);
      for (const n of c.notes) console.log(`    · ${n}`);
    }
  }
  const allGood = cells.length > 0 && cells.every((c) => c.reached && Object.values(c.clauses).length > 0 && Object.values(c.clauses).every(Boolean));
  console.log(allGood ? `ALL PASS across ${cells.length} cells${REDUCED ? ' (reduced motion)' : ''}` : 'NOT ALL PASS');
  process.exit(allGood ? 0 : 1);
})();
