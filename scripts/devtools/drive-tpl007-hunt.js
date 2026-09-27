#!/usr/bin/env node
/**
 * TPL-007 §12.2 — Number Hunt, played in a real browser on the deployed build.
 *
 * "A child reads the target, taps the numbers that make it, is told when a pick is wrong and what it made, finds every way on the grid,
 * goes on to the next, and after five grids is paid stars for it."
 *
 * One fresh Chrome per arm × cell. Every grid is solved HERE from the numbers on screen and the instruction's words, never from the page's
 * own script: the ways are counted again, and the page must agree with the count ("found 0 of N") and with every pick.
 *
 * Arms:
 *   play   FR 390×844 touch, FR 1024×768 touch, EN 1366×768 (mouse)
 *     opened     the Number Hunt card opens /hunt, with 16 numbers and an instruction
 *     ways       on every grid, the progress's "of N" is the number of ways counted here
 *     wrong      a pick that does not make the target is refused: the note says its sum and "not <target>", nothing is found
 *     showAfter  known-firing then absence: "Show me one" is absent after one miss and present after two
 *     shown      "Show me one" marks a way that makes the target, and it pays nothing
 *     right      every way picked here is marked found, and the count goes up by one
 *     again      picking a found way again changes the count by nothing
 *     nextFocus  once every way is found, Next grid is on screen and has the focus
 *     next       Next grid brings the next grid ("2 of 5" … "5 of 5")
 *     locked     after the fifth grid, the end card says "Hunt complete!" / "Chasse terminée !"
 *     paid       the stored star total rose by exactly min(found, 15) + 5, and the card says "+N ⭐"
 *     pickLine   known-firing: seeded to 10 ⭐, the card offers the 🎁 pick
 *     focus      New game has the focus
 *     endInView  every button in the end card's row is on screen
 *     fresh      New game starts grid 1 again, and pays nothing more
 *   screen FR at 1366×768, 1280×720, 1024×768 touch, 768×1024 touch, 390×844 touch; EN 1366×768
 *     sideways   the page is no wider than the viewport
 *     fold       the instruction and all sixteen numbers are above the fold
 *     tiles44    every number is at least 44 × 44
 *     noteShown  after a wrong pick, the note is on screen
 *     coarse     on the touch cells, the page reports (pointer: coarse)
 *   every cell: quiet — no console error
 *
 * Usage:
 *   node scripts/devtools/drive-tpl007-hunt.js <deploy-dir> [--arm play|screen] [--lang fr|en] [--only 390x844] [--shots <dir>]
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
const ARMS = arg('--arm') ? [arg('--arm')] : ['play', 'screen'];
// A URL drives the LIVE host (what the public gets); a path drives a folder served from disk here. `--path` is for a build made with
// `--base-url /templates/<slug>/`: TPL-006 §9e.
const LIVE = /^https?:\/\//.test(DIR || '');
const BASE = arg('--path') ? arg('--path').replace(/\/?$/, '/') : '/';
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-tpl007-hunt.js <deploy-dir> [--arm play|screen] [--lang fr|en] [--only 390x844] [--shots <dir>]');
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
  play: [['fr', '390x844'], ['fr', '1024x768'], ['en', '1366x768']],
  screen: [['fr', '1366x768'], ['fr', '1280x720'], ['fr', '1024x768'], ['fr', '768x1024'], ['fr', '390x844'], ['en', '1366x768']]
};
const cellsFor = (arm) => {
  let cells = DEFAULT_CELLS[arm];
  if (arg('--lang')) cells = cells.filter(([l]) => l === arg('--lang'));
  if (arg('--only')) cells = cells.filter(([, v]) => arg('--only').split(',').includes(v));
  return cells;
};

const W = {
  en: { hunt: 'Number Hunt', nextGrid: 'Next grid', showWay: 'Show me one', newGame: 'New game', done: 'Hunt complete!', earnedPick: '🎁 You earned a pick!', not: ', not ', of: / of (\d+)$/, grid: /^Grid (\d+) of (\d+)/ },
  fr: { hunt: 'Chasse aux nombres', nextGrid: 'Grille suivante', showWay: 'Montre-m’en une', newGame: 'Nouvelle partie', done: 'Chasse terminée !', earnedPick: '🎁 Tu as gagné un choix !', not: ', pas ', of: / sur (\d+)$/, grid: /^Grille (\d+) sur (\d+)/ }
};
const ROUNDS = 5;
const WAY_CAP = 15;
const FINISH = 5;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The instruction, read as a task: how many numbers, added or multiplied, to what. Written again here from the words on screen. */
function taskOf(instruction) {
  const s = String(instruction || '');
  const count = /\b3\b/.test(s.slice(0, 12)) ? 3 : 2;
  const mul = /multiply|produit/.test(s);
  const hundred = /make 100|font 100/.test(s);
  const m = s.match(/(\d+)\s*$/);
  return { count, mul, target: hundred ? 100 : m ? Number(m[1]) : NaN };
}
function waysOf(values, task) {
  const out = [];
  const rec = (start, chosen) => {
    if (chosen.length === task.count) {
      const v = chosen.reduce((a, j) => (task.mul ? a * values[j] : a + values[j]), task.mul ? 1 : 0);
      if (v === task.target) out.push(chosen.slice());
      return;
    }
    for (let k = start; k < values.length; k++) rec(k + 1, chosen.concat([k]));
  };
  rec(0, []);
  return out;
}
function wrongPick(values, task) {
  const ways = new Set(waysOf(values, task).map((w) => w.join('-')));
  const rec = (start, chosen) => {
    if (chosen.length === task.count) return ways.has(chosen.join('-')) ? null : chosen;
    for (let k = start; k < values.length; k++) { const hit = rec(k + 1, chosen.concat([k])); if (hit) return hit; }
    return null;
  };
  return rec(0, []);
}

const READ = (words) => `(() => {
  const words = ${JSON.stringify({ nextGrid: words.nextGrid, showWay: words.showWay, newGame: words.newGame, done: words.done })};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
  const tiles = [...document.querySelectorAll('.rkt-hunt-tile')].filter(vis);
  const num = (s) => { const t = String(s).replace(/[\\s\\u00a0\\u202f,]/g, ''); return t ? Number(t) : NaN; };
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (l) => buttons.find((b) => b.innerText.trim() === l);
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim()).map((e) => e.innerText.trim());
  const kindOf = (e) => { const m = String(e.className).match(/rkt-hunt-(idle|picked|found|shown|wrong)/); return m ? m[1] : '?'; };
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
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p) stored = { stars: p.model && typeof p.model.stars === 'number' ? p.model.stars : 0, lastHuntId: p.model ? p.model.lastHuntId || null : null }; break; }
    }
  } catch (e) { stored = { error: String(e) }; }
  const newGame = byLabel(words.newGame);
  const nextGrid = byLabel(words.nextGrid);
  const noteEl = [...document.querySelectorAll('.ndl-visual-text')].filter(vis).find((e) => /[=]/.test(e.innerText) || /^(There|Il y a|You already|Tu as déjà|Here is|En voici)/.test(e.innerText.trim()));
  return {
    values: tiles.map((e) => num(e.innerText.trim())),
    kinds: tiles.map(kindOf),
    tiles: tiles.map(rect),
    texts,
    instruction: texts.find((t) => /^(Pick|Choisis) /.test(t)) || '',
    progress: texts.find((t) => /^(Grid|Grille) \\d/.test(t)) || '',
    note: noteEl ? noteEl.innerText.trim() : '',
    noteRect: noteEl ? rect(noteEl) : null,
    done: texts.includes(words.done),
    starsLine: texts.find((t) => /^\\+\\d+ ⭐$/.test(t)) || null,
    showWay: byLabel(words.showWay) ? rect(byLabel(words.showWay)) : null,
    nextGrid: nextGrid ? rect(nextGrid) : null,
    focusOnNext: !!nextGrid && document.activeElement === nextGrid,
    newGame: newGame ? rect(newGame) : null,
    focusOnNew: !!newGame && document.activeElement === newGame,
    focusLabel: document.activeElement ? (document.activeElement.innerText || document.activeElement.tagName).trim().slice(0, 30) : null,
    endRow: (() => { if (!newGame) return []; let row = newGame.parentElement; while (row && row.querySelectorAll('button').length < 2) row = row.parentElement; return row ? [...row.querySelectorAll('button')].filter(vis).map((b) => ({ label: b.innerText.trim(), ...rect(b) })) : []; })(),
    // pathname + hash: a published build navigates by hash (TPL-007 §15), and a page's route is then after the #.
    url: location.pathname + location.hash,
    coarse: matchMedia('(pointer: coarse)').matches,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollY: Math.round(scrollY),
    innerHeight,
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 240),
    stored
  };
})()`;

const cells = [];

async function driveCell(arm, lang, vpKey) {
  const w = W[lang];
  const vp = VPS[vpKey];
  const cell = { arm, lang, vp: vpKey, reached: false, clauses: {}, saw: {}, notes: [] };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);
  // A clause graded more than once keeps its first red.
  const clause = (name, ok, saw) => {
    if (cell.clauses[name] === false) return;
    cell.clauses[name] = !!ok;
    if (!ok) cell.saw[name] = saw;
  };

  await withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
    cell.errors = page.consoleErrors;
    if (BASE !== '/') await page.navigate(BASE);
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
    const until = async (test, ms) => {
      const end = Date.now() + ms;
      for (;;) {
        const r = await read();
        if (test(r)) return r;
        if (Date.now() > end) return null;
        await wait(120);
      }
    };
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `hunt-${arm}-${lang}-${vpKey}-${name}.png`), Buffer.from(data, 'base64'));
    };
    /** Tap the i-th number on screen (row-major, the order the grid draws), bringing it on screen first. */
    const tapTile = async (i) => {
      let r = await read();
      let t = r.tiles[i];
      if (!t) return false;
      if (t.top < 0 || t.bottom > r.innerHeight) {
        await page.evaluate(`(() => { const e = [...document.querySelectorAll('.rkt-hunt-tile')].filter((x) => x.getClientRects().length)[${i}]; if (e) e.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`);
        await wait(150);
        r = await read();
        t = r.tiles[i];
      }
      await tapAt(t.x, t.y);
      await wait(250);
      return true;
    };
    /** Pick a set of squares, and wait for the page to answer the pick (the note or the kinds change). */
    const pick = async (combo) => {
      const before = await read();
      for (const i of combo) await tapTile(i);
      return until((r) => r.note !== before.note || JSON.stringify(r.kinds) !== JSON.stringify(before.kinds) || r.done, 3000);
    };
    const foundCount = (r) => { const m = r.progress.match(/(\d+)\D+(\d+)$/); return m ? Number(m[1]) : NaN; };

    await page.setViewport({ width: vp.width, height: vp.height, mobile: vp.mobile });
    if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await wait(1200);

    // ── A player ──
    if (!(await pressLabel('New player'))) return note('no "New player" button');
    await wait(400);
    const at = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (at) {
      await tapAt(at.x, at.y);
      await wait(150);
      await send('Input.insertText', { text: 'Léa' });
    }
    await pressLabel('Pixel');
    await pressLabel(arm === 'play' && lang === 'en' ? 'CM1' : 'CE2');
    if (lang === 'fr') await pressLabel('Français');
    if (!(await pressLabel('Let’s go!'))) return note('no "Let’s go!" button');
    await wait(1800);
    // The play arm seeds 10 ⭐, so any finished hunt crosses the first milestone and the end card is its tallest (Make Ten's phone finding).
    if (arm === 'play') {
      const seeded = await page.evaluate(`(() => {
        const walk = (v, depth) => {
          if (!v || typeof v !== 'object' || depth > 6) return false;
          if (Array.isArray(v.profiles) && typeof v.activeId === 'string') {
            const p = v.profiles.find((x) => x.id === v.activeId);
            if (!p) return false;
            p.model = Object.assign({ rating: 0, skills: {}, lastSkill: '', answered: 0 }, p.model || {}, { stars: 10 });
            return true;
          }
          for (const k of Object.keys(v)) {
            if (typeof v[k] === 'string' && /^[{[]/.test(v[k])) { let inner; try { inner = JSON.parse(v[k]); } catch (e) { continue; } if (walk(inner, depth + 1)) { v[k] = JSON.stringify(inner); return true; } }
            else if (walk(v[k], depth + 1)) return true;
          }
          return false;
        };
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          let parsed; try { parsed = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
          if (walk(parsed, 0)) { localStorage.setItem(key, JSON.stringify(parsed)); return key; }
        }
        return null;
      })()`);
      if (!seeded) return note('could not seed 10 ⭐');
    }
    // A coarse pointer needs a reload to take (RKT-005's finding); every cell reloads, so every cell starts the same way.
    await send('Page.reload', {});
    await wait(3500);
    let home = await read();
    if (home.body.includes('Léa') && !home.body.includes(w.hunt)) {
      await pressLabel('Léa');
      await wait(1500);
      home = await read();
    }
    if (touch) clause('coarse', home.coarse, 'matchMedia (pointer: coarse) is false');

    if (!(await pressLabel(w.hunt))) return note(`no "${w.hunt}" card on Home — ${home.body}`);
    const opened = await until((r) => r.values.length === 16 && r.values.every((v) => v > 0) && !!r.instruction && !!r.progress, 6000);
    await page.evaluate('window.scrollTo(0, 0)');
    await wait(500);
    await shoot('opened');
    const r0 = await read();
    clause('opened', !!opened && /[/#]hunt$/.test(r0.url), JSON.stringify({ url: r0.url, values: r0.values, instruction: r0.instruction, body: r0.body }));
    if (!opened) return;
    cell.reached = true;
    note(`grid 1: ${r0.instruction} · ${r0.progress} · ${JSON.stringify(r0.values)}`);

    if (arm === 'screen') {
      clause('sideways', r0.scrollWidth <= vp.width, `scrollWidth ${r0.scrollWidth} > ${vp.width}`);
      const lowest = Math.max(...r0.tiles.map((t) => t.bottom));
      clause('fold', r0.tiles.length === 16 && lowest <= r0.innerHeight && r0.scrollY === 0, JSON.stringify({ lowest, innerHeight: r0.innerHeight, scrollY: r0.scrollY }));
      const small = r0.tiles.filter((t) => t.w < 44 || t.h < 44);
      clause('tiles44', r0.tiles.length === 16 && small.length === 0, JSON.stringify(small.slice(0, 4)));
      const bad = wrongPick(r0.values, taskOf(r0.instruction));
      if (bad) {
        const after = await pick(bad);
        await wait(400);
        const r1 = await read();
        await shoot('wrong');
        clause('noteShown', !!after && r1.note.includes(w.not) && !!r1.noteRect && r1.noteRect.top >= 0 && r1.noteRect.bottom <= r1.innerHeight, JSON.stringify({ note: r1.note, noteRect: r1.noteRect, innerHeight: r1.innerHeight }));
      } else note('screen: no wrong pick exists on this grid');
    }

    if (arm === 'play') {
      const before = r0.stored ? r0.stored.stars : 0;
      let foundByChild = 0;
      let grid = r0;
      for (let round = 1; round <= ROUNDS; round++) {
        grid = await read();
        const task = taskOf(grid.instruction);
        const ways = waysOf(grid.values, task);
        const gm = grid.progress.match(w.grid);
        const shownAs = grid.progress.match(w.of);
        clause('next', !!gm && Number(gm[1]) === round && Number(gm[2]) === ROUNDS, JSON.stringify({ round, progress: grid.progress }));
        clause('ways', !!shownAs && Number(shownAs[1]) === ways.length && ways.length >= 1, JSON.stringify({ round, instruction: grid.instruction, progress: grid.progress, counted: ways, values: grid.values }));
        if (!ways.length) return note(`grid ${round}: no way counted for "${grid.instruction}" — the probe's reading, or the grid`);

        let solved = [];
        if (round === 1) {
          // Two wrong picks: each refused with its sum, and "Show me one" absent after one, present after two.
          const bad = wrongPick(grid.values, task);
          if (!bad) return note('grid 1 has no wrong pick');
          const w1 = await pick(bad);
          await wait(300);
          const a1 = await read();
          clause('wrong', !!w1 && a1.note.includes(w.not + task.target) && foundCount(a1) === 0 && !a1.kinds.includes('found'), JSON.stringify({ note: a1.note, progress: a1.progress, kinds: a1.kinds }));
          const absentAfterOne = !a1.showWay;
          await pick(bad);
          const a2 = await until((r) => !!r.showWay, 2500);
          await shoot('show-offered');
          clause('showAfter', absentAfterOne && !!a2, JSON.stringify({ absentAfterOne, presentAfterTwo: !!a2 }));
          if (a2) {
            await tapAt(a2.showWay.x, a2.showWay.y);
            const s = await until((r) => r.kinds.includes('shown'), 2500);
            await wait(300);
            const sr = await read();
            const shownIdx = sr.kinds.map((k, i) => (k === 'shown' ? i : -1)).filter((i) => i >= 0);
            const isWay = ways.some((way) => way.join('-') === shownIdx.join('-'));
            clause('shown', !!s && isWay && foundCount(sr) === 1, JSON.stringify({ shownIdx, ways, progress: sr.progress, note: sr.note }));
            if (isWay) solved.push(shownIdx.join('-'));
          }
        }
        for (const way of ways) {
          if (solved.includes(way.join('-'))) continue;
          const had = foundCount(await read());
          const after = await pick(way);
          await wait(250);
          const ar = await read();
          const marked = way.every((i) => ar.kinds[i] === 'found') || ar.done;
          clause('right', !!after && marked && (ar.done || foundCount(ar) === had + 1), JSON.stringify({ round, way, kinds: ar.kinds, progress: ar.progress, note: ar.note }));
          foundByChild++;
          solved.push(way.join('-'));
          if (ar.done) break;
          // Once, on grid 2 with a way still to find: the same way again changes nothing.
          if (round === 2 && solved.length < ways.length) {
            const n = foundCount(ar);
            await pick(way);
            await wait(300);
            const again = await read();
            clause('again', foundCount(again) === n, JSON.stringify({ before: n, after: again.progress, note: again.note }));
          }
        }
        if (round < ROUNDS) {
          const ready = await until((r) => !!r.nextGrid, 3000);
          await wait(400);
          const rr = await read();
          if (round === 1) await shoot('grid-found');
          clause('nextFocus', !!ready && rr.focusOnNext && rr.nextGrid.top >= 0 && rr.nextGrid.bottom <= rr.innerHeight, JSON.stringify({ round, focus: rr.focusLabel, nextGrid: rr.nextGrid, innerHeight: rr.innerHeight }));
          if (!ready) return note(`grid ${round}: no Next grid — ${rr.body}`);
          await tapAt(rr.nextGrid.x, rr.nextGrid.y);
          const moved = await until((r) => { const m = r.progress.match(w.grid); return !!m && Number(m[1]) === round + 1; }, 4000);
          if (!moved) return note(`grid ${round}: Next grid did not bring grid ${round + 1} — ${(await read()).progress}`);
          await wait(300);
        }
      }
      if (!cell.clauses.again) note('again: grid 2 had one way, so no second way to re-pick came up');
      const locked = await until((r) => r.done, 5000);
      await wait(1800);
      const end = await read();
      await shoot('done');
      clause('locked', !!locked && end.done, JSON.stringify({ body: end.body }));
      if (!locked) return;
      const paidRead = await until((r) => r.stored && r.stored.stars !== before, 4000);
      const expect = Math.min(foundByChild, WAY_CAP) + FINISH;
      const got = (paidRead || end).stored.stars - before;
      clause('paid', got === expect && end.starsLine === `+${expect} ⭐`, JSON.stringify({ foundByChild, expect, got, starsLine: end.starsLine }));
      clause('pickLine', end.texts.includes(w.earnedPick), JSON.stringify(end.texts.slice(-8)));
      clause('focus', end.focusOnNew, `focus on ${end.focusLabel}`);
      clause('endInView', end.endRow.length >= 2 && end.endRow.every((b) => b.top >= 0 && b.bottom <= end.innerHeight), JSON.stringify({ endRow: end.endRow, innerHeight: end.innerHeight, scrollY: end.scrollY }));
      const paidStars = (paidRead || end).stored.stars;
      await page.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getClientRects().length && x.innerText.trim() === ${JSON.stringify(w.newGame)}); if (b) b.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`);
      await wait(300);
      const aim = (await read()).newGame || end.newGame;
      await tapAt(aim.x, aim.y);
      const fresh = await until((r) => !r.done && r.values.length === 16 && w.grid.test(r.progress) && Number(r.progress.match(w.grid)[1]) === 1, 4000);
      await wait(1200);
      const later = await read();
      await shoot('fresh');
      clause('fresh', !!fresh && later.stored.stars === paidStars, JSON.stringify({ fresh: !!fresh, progress: later.progress, stars: later.stored.stars, paidStars }));
    }
    clause('quiet', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors.slice(0, 3)));
  });
}

(async () => {
  for (const arm of ARMS) {
    for (const [lang, vp] of cellsFor(arm)) {
      try {
        await driveCell(arm, lang, vp);
      } catch (e) {
        cells.push({ arm, lang, vp, reached: false, clauses: {}, saw: {}, notes: [`threw: ${e && e.stack ? e.stack : e}`] });
      }
      const c = cells[cells.length - 1];
      const names = Object.keys(c.clauses);
      const passed = names.filter((n) => c.clauses[n]).length;
      console.log(`${c.arm} ${c.lang} ${c.vp}: ${c.reached ? `${passed}/${names.length}` : 'NOT REACHED'} ${names.map((n) => `${n}:${c.clauses[n] ? 'ok' : 'RED'}`).join(' ')}`);
      for (const n of names.filter((x) => !c.clauses[x])) console.log(`   saw ${n}: ${String(c.saw[n]).slice(0, 700)}`);
      for (const s of c.notes) console.log(`   note: ${s}`);
      if (c.errors && c.errors.length) console.log(`   console errors: ${JSON.stringify(c.errors.slice(0, 3))}`);
    }
  }
  const ok = cells.length > 0 && cells.every((c) => c.reached && Object.values(c.clauses).every(Boolean));
  console.log(ok ? 'ALL PASS' : 'NOT ALL PASS');
  process.exit(ok ? 0 : 1);
})();
