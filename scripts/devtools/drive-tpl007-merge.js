#!/usr/bin/env node
/**
 * TPL-007 §12.1 — Make Ten Merge, played in a real browser on the deployed build; and the hangar out of Home's games.
 *
 * "A child slides the tiles with the arrows (or taps them on a tablet), sees two tiles that make ten join into one, plays until the
 * board locks, and is paid stars for it." And Richard, 2026-09-14: "move the hangar to somewhere out of the game type menu".
 *
 * One fresh Chrome per arm × cell. Every slide is graded against a copy of the rule written HERE, never the page's own script: the
 * board after a press must be the board before it, slid by the rule, plus exactly one new tile in a square the slide left empty.
 *
 * Arms:
 *   home   EN 1366×768, FR 390×844 touch
 *     games      Home's game cards are the four games, and none of them is the Hangar
 *     nextPick   known-firing beside that absence: the bar to the next 🎁 is on Home
 *     menu       the player menu (a tap on the name) offers 🎁 Hangar, and a tap on it opens the hangar
 *   play   FR 390×844 touch (taps on the arrow buttons), FR 1024×768 touch, EN 1366×768 (arrow keys)
 *     opened     the Make Ten Merge card opens /merge, with a 4×4 board holding two tiles
 *     rule       every press the page answered is the rule: slid, plus one new tile in a square the slide emptied (or nothing, if nothing moves)
 *     joined     known-firing: at least one join happened, and every square that joined holds a multiple of ten
 *     still      a press in a direction that moves nothing leaves the board as it was
 *     locked     played to the end, the end screen says "No more moves!" / "Plus aucun coup !"
 *     paid       the stored star total rose by exactly min(joins, 15) + 5, and the end screen says "+N ⭐" with that N
 *     focus      New game has the focus, so Enter starts a new board
 *     again      New game draws a fresh board of two tiles, and pays nothing more
 *     locked2    a second board played to the lock shows the end card again
 *     ruleFirst  known-firing: at the start the rule shows and the hint does not
 *     hint       every moment the board is full with a join still there, the hint shows (Richard: a full board "doesn't say anything")
 *     dimmed     the locked board greys out (known-firing: full strength at the start)
 *   modes  EN 1366×768, FR 390×844 touch
 *     easyDefault      Easy is the chosen pill for a new player
 *     hardKept         tapping Hard keeps Hard on the player, starts a fresh board, and Hard becomes the chosen pill
 *     hardAfterReload  Hard is still the chosen pill after a reload
 *   screen FR at 1366×768, 1280×720, 1024×768 touch, 768×1024 touch, 390×844 touch; EN 1366×768
 *     sideways   the page is no wider than the viewport asked for
 *     fold       the whole board and all four arrows are above the fold
 *     tiles44    every square and every arrow is at least 44 × 44
 *     coarse     on the touch cells, the page reports (pointer: coarse)
 *   every cell: quiet — no console error
 *
 * Usage:
 *   node scripts/devtools/drive-tpl007-merge.js <deploy-dir> [--arm home|play|screen] [--lang fr|en] [--only 390x844] [--shots <dir>]
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
const ARMS = arg('--arm') ? [arg('--arm')] : ['home', 'play', 'screen', 'modes'];
// A URL drives the LIVE host; `--path` is for a build made with `--base-url /templates/<slug>/` (TPL-006 §9e).
const LIVE = /^https?:\/\//.test(DIR || '');
const BASE = arg('--path') ? arg('--path').replace(/\/?$/, '/') : '/';
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-tpl007-merge.js <deploy-dir> [--arm home|play|screen] [--lang fr|en] [--only 390x844] [--shots <dir>]');
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
  home: [['en', '1366x768'], ['fr', '390x844']],
  play: [['fr', '390x844'], ['fr', '1024x768'], ['en', '1366x768']],
  modes: [['en', '1366x768'], ['fr', '390x844']],
  screen: [['fr', '1366x768'], ['fr', '1280x720'], ['fr', '1024x768'], ['fr', '768x1024'], ['fr', '390x844'], ['en', '1366x768']]
};
const cellsFor = (arm) => {
  let cells = DEFAULT_CELLS[arm];
  if (arg('--lang')) cells = cells.filter(([l]) => l === arg('--lang'));
  if (arg('--only')) cells = cells.filter(([, v]) => arg('--only').split(',').includes(v));
  return cells;
};

const W = {
  en: {
    merge: 'Make Ten Merge',
    games: ['Rocket Race', 'Make Ten Merge', 'Number Hunt', 'Monster Gate'],
    locked: 'No more moves!',
    earnedPick: '🎁 You earned a pick!',
    newGame: 'New game',
    easy: 'Easy',
    hard: 'Hard',
    rule: 'Slide with the arrows. Two tiles join when they make 10, 20, 30…',
    full: 'Full! Two tiles side by side still make 10, 20, 30… Slide to join them.',
    menuHangar: '🎁 Hangar',
    hangar: 'Hangar',
    next: /🎁/
  },
  fr: {
    merge: 'Fusion des dizaines',
    games: ['Course de fusées', 'Fusion des dizaines', 'Chasse aux nombres', 'La porte du monstre'],
    locked: 'Plus aucun coup !',
    earnedPick: '🎁 Tu as gagné un choix !',
    newGame: 'Nouvelle partie',
    easy: 'Facile',
    hard: 'Difficile',
    rule: 'Fais glisser avec les flèches. Deux tuiles fusionnent si elles font 10, 20, 30…',
    full: 'C’est plein ! Deux tuiles côte à côte font encore 10, 20, 30… Fais-les glisser.',
    menuHangar: '🎁 Hangar',
    hangar: 'Hangar',
    next: /🎁/
  }
};
const JOIN_CAP = 15;
const FINISH = 5;
const ARROWS = { up: ['ArrowUp', 38], left: ['ArrowLeft', 37], down: ['ArrowDown', 40], right: ['ArrowRight', 39] };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The Make Ten rule, written again here so the page is graded against the rule and not against itself. */
const canJoin = (a, b) => a > 0 && b > 0 && (a + b) % 10 === 0;
function slideRule(board, dir) {
  const next = board.slice();
  const joined = [];
  let moved = false;
  for (let i = 0; i < 4; i++) {
    const idx = [];
    for (let j = 0; j < 4; j++) idx.push(dir === 'left' ? i * 4 + j : dir === 'right' ? i * 4 + (3 - j) : dir === 'up' ? j * 4 + i : (3 - j) * 4 + i);
    const tiles = idx.map((k) => board[k]).filter((v) => v > 0);
    const out = [];
    for (let t = 0; t < tiles.length; t++) {
      if (t + 1 < tiles.length && canJoin(tiles[t], tiles[t + 1])) {
        joined.push(idx[out.length]);
        out.push(tiles[t] + tiles[t + 1]);
        t++;
      } else out.push(tiles[t]);
    }
    while (out.length < 4) out.push(0);
    idx.forEach((k, n) => {
      if (next[k] !== out[n]) moved = true;
      next[k] = out[n];
    });
  }
  return { board: next, moved, joined };
}

const READ = (words) => `(() => {
  const words = ${JSON.stringify({ ...words, next: undefined })};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
  const squares = [...document.querySelectorAll('.rkt-merge-tile')].filter(vis);
  const num = (s) => { const t = String(s).replace(/[\\s\\u00a0\\u202f,]/g, ''); return t ? Number(t) : 0; };
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (l) => buttons.find((b) => b.innerText.trim() === l);
  const arrows = {};
  for (const [dir, glyph] of [['up', '↑'], ['left', '←'], ['down', '↓'], ['right', '→']]) { const b = byLabel(glyph); arrows[dir] = b ? rect(b) : null; }
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim()).map((e) => e.innerText.trim());
  const newGame = byLabel(words.newGame);
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
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p) stored = { stars: p.model && typeof p.model.stars === 'number' ? p.model.stars : 0, lastMergeId: p.model ? p.model.lastMergeId || null : null, mergeMode: p.mergeMode || null }; break; }
    }
  } catch (e) { stored = { error: String(e) }; }
  const cards = [...document.querySelectorAll('.game-card')].filter(vis).map((c) => c.innerText.split('\\n').map((s) => s.trim()).filter(Boolean)[1] || '');
  return {
    board: squares.map((e) => num(e.innerText.trim())),
    squares: squares.map(rect),
    classes: squares.map((e) => e.className),
    arrows,
    texts,
    locked: texts.includes(words.locked),
    hint: texts.includes(words.full),
    rule: texts.includes(words.rule),
    boardOpacity: (() => { const b = [...document.querySelectorAll('.rkt-merge-board')].find(vis); return b ? Math.round(Number(getComputedStyle(b).opacity) * 100) / 100 : null; })(),
    // Each mode pill's ground: the first ancestor of its word with a background (the chosen pill is tomato).
    pillChain: (() => { const leaf = [...document.querySelectorAll('.ndl-visual-text')].find((e) => vis(e) && e.innerText.trim() === words.easy); const out = []; for (let el = leaf, i = 0; el && el !== document.body && i < 8; el = el.parentElement, i++) { const cs = getComputedStyle(el); out.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), bg: cs.backgroundColor, img: cs.backgroundImage.slice(0, 40), shadow: cs.boxShadow.slice(0, 40), before: getComputedStyle(el, '::before').backgroundColor }); } return out; })(),
    pills: (() => { const out = {}; for (const [k, l] of [['easy', words.easy], ['hard', words.hard]]) { const leaf = [...document.querySelectorAll('.ndl-visual-text')].find((e) => vis(e) && e.innerText.trim() === l); let el = leaf; while (el && el !== document.body && ['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(el).backgroundColor)) el = el.parentElement; out[k] = leaf && el ? getComputedStyle(el).backgroundColor : null; } return out; })(),
    starsLine: texts.find((t) => /^\\+\\d+ ⭐$/.test(t)) || null,
    newGame: newGame ? rect(newGame) : null,
    // Every button in the end card's row of ways on, found from New game itself (the header has a Home button of its own).
    endRow: (() => { if (!newGame) return []; let row = newGame.parentElement; while (row && row.querySelectorAll('button').length < 2) row = row.parentElement; return row ? [...row.querySelectorAll('button')].filter(vis).map((b) => ({ label: b.innerText.trim(), ...rect(b) })) : []; })(),
    newGameCount: buttons.filter((b) => b.innerText.trim() === words.newGame).length,
    focusOnNew: !!newGame && document.activeElement === newGame,
    focusLabel: document.activeElement ? (document.activeElement.innerText || document.activeElement.tagName).trim().slice(0, 30) : null,
    menuHangar: byLabel(words.menuHangar) ? rect(byLabel(words.menuHangar)) : null,
    cards,
    // pathname + hash: a published build navigates by hash (TPL-007 §15), and a page's route is then after the #.
    url: location.pathname + location.hash,
    coarse: matchMedia('(pointer: coarse)').matches,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollY: Math.round(scrollY),
    innerHeight,
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 200),
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
  const clause = (name, ok, saw) => {
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
      fs.writeFileSync(path.join(SHOTS, `merge-${arm}-${lang}-${vpKey}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const press = async (dir, r) => {
      if (touch) {
        let a = r.arrows[dir];
        if (!a || a.top < 0 || a.bottom > r.innerHeight) {
          await page.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === ${JSON.stringify({ up: '↑', left: '←', down: '↓', right: '→' }[dir])}); if (b) b.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`);
          a = (await read()).arrows[dir];
        }
        if (!a) return false;
        await tapAt(a.x, a.y);
      } else {
        const [key, vk] = ARROWS[dir];
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: vk });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: vk });
      }
      return true;
    };

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
    await pressLabel('CE2');
    if (lang === 'fr') await pressLabel('Français');
    if (!(await pressLabel('Let’s go!'))) return note('no "Let’s go!" button');
    await wait(1800);
    // 🔴 The play arm forces the TALLEST end card: at 10 ⭐ any finished board (at least the 5 for finishing) crosses the first
    // milestone, so the 🎁 line is always on it. Build 2's phone board made 8 joins, no pick line, and a shorter card than build 1's red.
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
    if (!home.cards.length && home.body.includes('Léa')) {
      await pressLabel('Léa');
      await wait(1500);
      home = await read();
    }
    note(`home ${home.url} · coarse ${home.coarse} · stars ${JSON.stringify(home.stored)}`);
    if (touch) clause('coarse', home.coarse, 'matchMedia (pointer: coarse) is false');

    if (arm === 'home') {
      cell.reached = home.cards.length > 0;
      await shoot('home');
      clause('games', JSON.stringify(home.cards) === JSON.stringify(w.games) && !home.cards.includes(w.hangar), JSON.stringify(home.cards));
      clause('nextPick', home.texts.some((t) => w.next.test(t)), JSON.stringify(home.texts.slice(0, 12)));
      if (!(await pressLabel('Léa'))) return note('no name to open the menu');
      const menu = await until((r) => !!r.menuHangar, 3000);
      await shoot('menu');
      if (!menu) {
        clause('menu', false, `no "${w.menuHangar}" in the menu — ${(await read()).body}`);
      } else {
        await tapAt(menu.menuHangar.x, menu.menuHangar.y);
        const hg = await until((r) => /[/#]hangar$/.test(r.url), 5000);
        await wait(800);
        await shoot('hangar');
        const after = await read();
        clause('menu', !!hg && after.texts.includes(w.hangar), JSON.stringify({ url: after.url, body: after.body }));
      }
    }

    if (arm === 'play' || arm === 'screen' || arm === 'modes') {
      if (!(await pressLabel(w.merge))) return note(`no "${w.merge}" card on Home — ${home.body}`);
      const opened = await until((r) => r.board.length === 16 && r.board.filter((v) => v > 0).length === 2, 6000);
      await page.evaluate('window.scrollTo(0, 0)');
      await wait(500);
      await shoot('opened');
      const r0 = opened ? await read() : await read();
      clause('opened', !!opened && /[/#]merge$/.test(r0.url), JSON.stringify({ url: r0.url, board: r0.board, body: r0.body }));
      if (!opened) return;
      cell.reached = true;
      clause('ruleFirst', r0.rule && !r0.hint, JSON.stringify({ rule: r0.rule, hint: r0.hint }));

      if (arm === 'screen') {
        clause('sideways', r0.scrollWidth <= vp.width, `scrollWidth ${r0.scrollWidth} > ${vp.width}`);
        const arrows = Object.values(r0.arrows);
        const lowest = Math.max(...r0.squares.map((s) => s.bottom), ...arrows.filter(Boolean).map((a) => a.bottom));
        clause('fold', arrows.every(Boolean) && lowest <= r0.innerHeight && r0.scrollY === 0, JSON.stringify({ lowest, innerHeight: r0.innerHeight, scrollY: r0.scrollY, arrows: r0.arrows }));
        const small = [...r0.squares, ...arrows.filter(Boolean)].filter((b) => b.w < 44 || b.h < 44);
        clause('tiles44', arrows.every(Boolean) && small.length === 0, JSON.stringify(small.slice(0, 4)));
      }

      if (arm === 'modes') {
        const tomato = 'rgb(245, 82, 46)';
        clause('easyDefault', r0.pills.easy === tomato && r0.pills.hard !== tomato, JSON.stringify(r0.pills));
        // A move first, so the fresh two-tile board after the tap is the tap's doing.
        for (const d of ['left', 'down', 'right', 'up']) if (slideRule(r0.board, d).moved) { await press(d, r0); break; }
        await wait(700);
        if (!(await pressLabel(w.hard))) return note(`no "${w.hard}" pill`);
        const hard = await until((r) => r.stored && r.stored.mergeMode === 'hard', 3000);
        await wait(600);
        const afterTap = await read();
        await shoot('hard');
        clause('hardKept', !!hard && afterTap.board.filter((v) => v > 0).length === 2 && afterTap.pills.hard === tomato && afterTap.pills.easy !== tomato, JSON.stringify({ stored: afterTap.stored, board: afterTap.board, pills: afterTap.pills }));
        await send('Page.reload', {});
        await wait(1500);
        const back = await until((r) => r.board.length === 16 && !!r.pills.hard, 8000);
        clause('hardAfterReload', !!back && back.pills.hard === tomato && back.pills.easy !== tomato, JSON.stringify(back ? { url: back.url, pills: back.pills } : (await read()).body));
      }

      if (arm === 'play') {
        const before = r0.stored ? r0.stored.stars : 0;
        let board = r0.board;
        let joins = 0;
        let presses = 0;
        let stillChecked = false;
        const wrong = [];
        const joinedBad = [];
        // Richard, 2026-09-14: "it doesn't say anything when I 'lose' (i.e. when all the squares are filled)". Count the moments the board
        // is FULL and the game is not over (a join is still there), when the page says nothing by design.
        let fullButMoves = 0;
        let hintSeen = 0;
        const hintMissing = [];
        let fullShot = false;
        let locked = null;
        for (let guard = 0; guard < 900 && !locked; guard++) {
          const now = await read();
          if (now.locked) {
            locked = now;
            break;
          }
          board = now.board;
          if (board.every((v) => v > 0) && ['left', 'right', 'up', 'down'].some((d) => slideRule(board, d).moved)) {
            fullButMoves++;
            const h = await until((r) => r.hint, 1500);
            if (h) hintSeen++;
            else hintMissing.push(board.slice());
            if (!fullShot) { await shoot('full-but-moves'); fullShot = true; }
          }
          const order = ['left', 'down', 'right', 'up'];
          const rot = order.slice(guard % 4).concat(order.slice(0, guard % 4));
          const moving = rot.find((d) => slideRule(board, d).moved);
          // Once: a direction that moves nothing leaves the board as it was.
          const idle = rot.find((d) => !slideRule(board, d).moved);
          if (!stillChecked && idle && moving) {
            await press(idle, now);
            await wait(450);
            const after = await read();
            clause('still', JSON.stringify(after.board) === JSON.stringify(board), JSON.stringify({ dir: idle, before: board, after: after.board }));
            stillChecked = true;
            continue;
          }
          if (!moving) {
            locked = await until((r) => r.locked, 3000);
            if (!locked) wrong.push({ note: 'the rule says no move is left, and the page shows no end', board });
            break;
          }
          const expected = slideRule(board, moving);
          await press(moving, now);
          presses++;
          const after = await until((r) => r.locked || JSON.stringify(r.board) !== JSON.stringify(board), 2500);
          if (!after) {
            wrong.push({ dir: moving, before: board, note: 'the board did not change' });
            break;
          }
          const diff = after.board.map((v, k) => (v !== expected.board[k] ? k : -1)).filter((k) => k >= 0);
          const ok = diff.length === 1 && expected.board[diff[0]] === 0 && after.board[diff[0]] > 0;
          if (!ok) wrong.push({ dir: moving, before: board, expected: expected.board, got: after.board });
          for (const k of expected.joined) if (after.board[k] % 10 !== 0) joinedBad.push({ k, got: after.board[k] });
          joins += expected.joined.length;
          if (wrong.length > 2) break;
        }
        note(`presses ${presses} · joins ${joins} · stars before ${before} · full-but-not-over moments ${fullButMoves}`);
        if (fullButMoves) clause('hint', hintMissing.length === 0 && hintSeen === fullButMoves, JSON.stringify({ hintSeen, fullButMoves, hintMissing: hintMissing.slice(0, 2) }));
        else note('hint: no full board with a join left came up in this cell');
        clause('rule', presses > 0 && wrong.length === 0, JSON.stringify(wrong.slice(0, 2)));
        clause('joined', joins > 0 && joinedBad.length === 0, JSON.stringify({ joins, joinedBad: joinedBad.slice(0, 3) }));
        if (!stillChecked) note('still: no idle direction came up beside a moving one');
        await wait(1500);
        const end = await read();
        await shoot('locked');
        clause('locked', !!locked && end.locked, JSON.stringify({ body: end.body }));
        clause('dimmed', r0.boardOpacity === 1 && end.boardOpacity !== null && end.boardOpacity < 0.9, JSON.stringify({ before: r0.boardOpacity, after: end.boardOpacity }));
        if (!locked) return;
        const paidRead = await until((r) => r.stored && r.stored.stars !== before, 4000);
        const expect = Math.min(joins, JOIN_CAP) + FINISH;
        const got = (paidRead || end).stored.stars - before;
        clause('paid', got === expect && end.starsLine === `+${expect} ⭐`, JSON.stringify({ expect, got, starsLine: end.starsLine }));
        clause('focus', end.focusOnNew, `focus on ${end.focusLabel}`);
        // Known-firing for endInView: the card is the tallest one, with the 🎁 line on it.
        clause('pickLine', end.texts.includes(w.earnedPick), JSON.stringify(end.texts.slice(-8)));
        // 🔴 Build 1, FR 390×844: the end card sat under the board and New game was below the fold — the tap missed, and a child would
        // have had to scroll to go on. The page must bring it on screen itself.
        // 🔴 Build 2's phone: New game on screen and Home cut off below it. Every way on in the row must be on screen, and there must be
        // more than New game in it (known-firing: Home is always there).
        clause('endInView', end.endRow.length >= 2 && end.endRow.every((b) => b.top >= 0 && b.bottom <= end.innerHeight), JSON.stringify({ endRow: end.endRow, innerHeight: end.innerHeight, scrollY: end.scrollY }));
        const paidStars = (paidRead || end).stored.stars;
        if (!end.newGame) return note('no New game on the end screen');
        // The tap grades New game, not the probe's aim: bring it on screen first, and read where it is now.
        await page.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === ${JSON.stringify(w.newGame)}); if (b) b.scrollIntoView({ block: 'center', behavior: 'instant' }); })()`);
        await wait(300);
        const aim = (await read()).newGame || end.newGame;
        await tapAt(aim.x, aim.y);
        const fresh = await until((r) => !r.locked && r.board.length === 16 && r.board.filter((v) => v > 0).length === 2, 4000);
        await wait(1200);
        const later = await read();
        await shoot('again');
        clause('again', !!fresh && later.stored.stars === paidStars, JSON.stringify({ fresh: !!fresh, board: later.board, stars: later.stored.stars, paidStars }));
        // A SECOND board to the lock: the end card must come again (the first run only ever locked one board).
        let second = null;
        for (let guard = 0; guard < 900 && fresh; guard++) {
          const now = await read();
          if (now.locked) { second = now; break; }
          const order = ['left', 'down', 'right', 'up'];
          const d = order.slice(guard % 4).concat(order.slice(0, guard % 4)).find((x) => slideRule(now.board, x).moved);
          if (!d) { second = await until((r) => r.locked, 3000); break; }
          await press(d, now);
          await until((r) => r.locked || JSON.stringify(r.board) !== JSON.stringify(now.board), 2500);
        }
        await wait(1500);
        const end2 = await read();
        await shoot('locked2');
        clause('locked2', !!second && end2.locked && end2.endRow.length >= 2, JSON.stringify({ locked: end2.locked, endRow: end2.endRow.length, body: end2.body }));
      }
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
      for (const n of names.filter((x) => !c.clauses[x])) console.log(`   saw ${n}: ${String(c.saw[n]).slice(0, 600)}`);
      for (const s of c.notes) console.log(`   note: ${s}`);
      if (c.errors && c.errors.length) console.log(`   console errors: ${JSON.stringify(c.errors.slice(0, 3))}`);
    }
  }
  const ok = cells.length > 0 && cells.every((c) => c.reached && Object.values(c.clauses).every(Boolean));
  console.log(ok ? 'ALL PASS' : 'NOT ALL PASS');
  process.exit(ok ? 0 : 1);
})();
