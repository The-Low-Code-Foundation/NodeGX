#!/usr/bin/env node
/**
 * TPL-007 §16 — Monster Gate, played in a real browser on the deployed build.
 *
 * "A child picks a way to play and a pace, answers the race's questions, and sees each answer land on the monster: a hit knocks it
 * back, a wrong answer lets it creep closer, the gate bangs when it arrives and a heart goes. Three monsters beaten, the gate held."
 *
 * One fresh Chrome per arm × cell. Every question is solved HERE from the prompt on screen (the race stage drive's solver, grown to the
 * shapes a CE2 player meets: which is bigger, the hundreds digit, a unit fraction, a number in words), so the drive decides whether an
 * answer is right or wrong and the page must agree. A prompt it cannot read is answered anyway and said so (`unknown`).
 *
 * Arms:
 *   gate    FR 390×844 touch, EN 1366×768 — Beat it to the gate, Practice (the setup's defaults)
 *     opened    the Monster Gate card opens /monster, and the setup offers both ways and both paces
 *     defaults  the chosen pills are Beat it to the gate and Practice (ruling 3), and not the others
 *     started   Start draws the lane: three hearts, "Monster 1 of 3", four hits left, the monster at the far side, and a question
 *     bobStart  known-firing: the monster's bob (rkt-bob) is running before any answer
 *     bobAfter  the bob is still running after a wrong answer and after a hit (Richard, 2026-09-14: "after the first question they just slide")
 *     creep     a wrong answer: "It creeps closer.", and the monster stands a third of the way closer
 *     bang      a third wrong answer in a row: "Bang!", a heart gone, and the monster back at the far side
 *     hit       a right answer: a hit is said, and the hits left go down
 *     runs      a monster out of hits runs away, and Next brings "Monster 2 of 3" in another shape
 *     won       the third monster beaten, Next brings "The gate held!"
 *     paid      the stored star total rose by exactly the end card's "+N ⭐"
 *     pickLine  known-firing: seeded to 10 ⭐, the end card offers the 🎁 pick
 *     focus     New game has the focus
 *     endInView every button in the end card's row is on screen
 *   walk    EN 1366×768 — Beat it to the gate, Challenge
 *     walks     while a question is up and unanswered, the monster moves towards the gate (two readings 1.5 s apart)
 *     timeout   left alone, the question times out: "Bang!", a heart gone, and the monster back at the far side
 *   push    FR 1024×768 touch — Push it back, Practice
 *     cave      the lane draws the cave, and the monster starts in the middle
 *     pushed    a right answer moves it towards the cave
 *     stepped   a wrong answer moves it towards the gate
 *   screen  FR 1366×768, 1280×720, 1024×768 touch, 768×1024 touch, 390×844 touch; EN 1366×768 — Beat it to the gate, Practice
 *     sideways  the page is no wider than the viewport
 *     fold      the lane, the prompt and the first way to answer are all on screen, nothing scrolled
 *     laneFits  the lane is inside the viewport's width, and the monster inside the lane
 *     verdict   after an answer, the verdict's Next is on screen, nothing scrolled
 *   every cell: quiet — no console error
 *
 * Usage:
 *   node scripts/devtools/drive-tpl007-monster.js <deploy-dir | https://origin> [--path /templates/rocket-school/] [--arm gate|walk|push|screen]
 *        [--lang fr|en] [--only 390x844] [--shots <dir>]
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
const ARMS = arg('--arm') ? [arg('--arm')] : ['gate', 'walk', 'push', 'screen'];
const LIVE = /^https?:\/\//.test(DIR || '');
const BASE = arg('--path') ? arg('--path').replace(/\/?$/, '/') : '/';
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-tpl007-monster.js <deploy-dir> [--arm gate|walk|push|screen] [--lang fr|en] [--only 390x844] [--shots <dir>]');
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
  gate: [['fr', '390x844'], ['en', '1366x768']],
  walk: [['en', '1366x768']],
  push: [['fr', '1024x768']],
  screen: [['fr', '1366x768'], ['fr', '1280x720'], ['fr', '1024x768'], ['fr', '768x1024'], ['fr', '390x844'], ['en', '1366x768']]
};
const cellsFor = (arm) => {
  let cells = DEFAULT_CELLS[arm] || [];
  if (arg('--lang')) cells = cells.filter(([l]) => l === arg('--lang'));
  if (arg('--only')) cells = cells.filter(([, v]) => arg('--only').split(',').includes(v));
  return cells;
};

const W = {
  en: {
    game: 'Monster Gate', gateWay: 'Beat it to the gate', pushWay: 'Push it back', practice: 'Practice', challenge: 'Challenge', start: 'Start', next: 'Next',
    newGame: 'New game', held: 'The gate held!', gotIn: 'The monster got in!', earnedPick: '🎁 You earned a pick!',
    creep: 'It creeps closer.', bang: 'Bang!', bigHit: 'A big hit!', smallHit: 'A small hit.', runs: 'It runs away!', allHome: 'All three sent home!',
    pushed: 'Pushed back!', stepped: 'It takes a step closer.', cave: 'Back into its cave!', monster: /^Monster (\d) of 3$/,
    controls: ['Restart', 'Change the game', 'Next', 'Show me how', 'Got it', 'New game', 'To the hangar']
  },
  fr: {
    game: 'La porte du monstre', gateWay: 'Plus rapide que le monstre', pushWay: 'Repousse-le', practice: 'Entraînement', challenge: 'Défi', start: 'Commencer', next: 'Suivant',
    newGame: 'Nouvelle partie', held: 'La porte a tenu !', gotIn: 'Le monstre est entré !', earnedPick: '🎁 Tu as gagné un choix !',
    creep: 'Il s’approche.', bang: 'Bang !', bigHit: 'Un grand coup !', smallHit: 'Un petit coup.', runs: 'Il s’enfuit !', allHome: 'Tous renvoyés !',
    pushed: 'Repoussé !', stepped: 'Il avance d’un pas.', cave: 'Retour dans sa grotte !', monster: /^Monstre (\d) sur 3$/,
    controls: ['Recommencer', 'Changer de partie', 'Suivant', 'Montre-moi comment', 'Compris', 'Nouvelle partie', 'Au hangar']
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

// ── Solving a question from its prompt ───────────────────────────────────────

/** A number as the page writes it: EN groups with commas, FR with (narrow) spaces and a decimal comma. */
function num(s, lang) {
  let t = String(s).trim().replace(/[\s\u00a0\u202f]/g, '');
  t = lang === 'fr' ? t.replace(',', '.') : t.replace(/,/g, '');
  return t !== '' && !isNaN(Number(t)) ? Number(t) : NaN;
}

const UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  zéro: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  trente: 30, quarante: 40, cinquante: 50, soixante: 60
};

/** "seven thousand and ninety-two", "quatre-vingt-dix-neuf mille deux cents" → the number, or null. */
function spelled(text) {
  const tokens = String(text).toLowerCase().split(/[\s\-\u00a0\u202f]+/).filter(Boolean);
  if (!tokens.length) return null;
  let total = 0;
  let group = 0;
  let prev = '';
  for (const t of tokens) {
    if (t === 'and' || t === 'et') { prev = t; continue; }
    if (t === 'hundred' || t === 'cent' || t === 'cents') group = (group || 1) * 100;
    else if (t === 'thousand' || t === 'mille') { total += (group || 1) * 1000; group = 0; }
    else if (t === 'million' || t === 'millions') { total += (group || 1) * 1000000; group = 0; }
    else if (t === 'vingt' || t === 'vingts') group = prev === 'quatre' ? group - 4 + 80 : group + 20;
    else if (UNITS[t] !== undefined) group += UNITS[t];
    else return null;
    prev = t;
  }
  return total + group;
}

const PLACES = { ones: 0, units: 0, 'unités': 0, tens: 1, dizaines: 1, hundreds: 2, centaines: 2, thousands: 3 };

/** The answer to a prompt, as the pad would take it ("7092", "0.7") or as an option's value ("1/3"), or null. */
function solve(prompt, lang) {
  if (!prompt) return null;
  const p = String(prompt).replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
  const n = (s) => num(s, lang);
  const out = (v) => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : null);
  const N = '([\\d][\\d ,.]*?)';
  const re = (s) => new RegExp('^' + s.replace(/N/g, N) + '$');
  let m;
  if ((m = p.match(re('N \\+ N = \\?')))) return out(n(m[1]) + n(m[2]));
  if ((m = p.match(re('N [−-] N = \\?')))) return out(n(m[1]) - n(m[2]));
  if ((m = p.match(re('N × N = \\?')))) return out(n(m[1]) * n(m[2]));
  if ((m = p.match(re('N ÷ N = \\?')))) return out(n(m[1]) / n(m[2]));
  if ((m = p.match(re('\\? × N = N')))) return out(n(m[2]) / n(m[1]));
  if ((m = p.match(re('\\? \\+ N = N')))) return out(n(m[2]) - n(m[1]));
  if ((m = p.match(re('N \\+ \\? = N')))) return out(n(m[2]) - n(m[1]));
  if ((m = p.match(re('N \\+ N = \\? \\+ N')))) return out(n(m[1]) + n(m[2]) - n(m[3]));
  if ((m = p.match(re('N \\+ N × N = \\?')))) return out(n(m[1]) + n(m[2]) * n(m[3]));
  if ((m = p.match(re('(?:Double|Le double de) N = \\?')))) return out(n(m[1]) * 2);
  if ((m = p.match(re('(?:Half of|La moitié de) N = \\?')))) return out(n(m[1]) / 2);
  if ((m = p.match(re('(?:The remainder of|Le reste de) N ÷ N = \\?')))) return out(n(m[1]) % n(m[2]));
  if ((m = p.match(/^(\d+)\/(\d+) (?:of|de) ([\d ,.]+) = \?$/))) return out((Number(m[1]) / Number(m[2])) * n(m[3]));
  if ((m = p.match(/^Round ([\d ,.]+) to the nearest (10|100|1,000)$/))) { const to = n(m[2]); return out(Math.round(n(m[1]) / to) * to); }
  if ((m = p.match(/^(?:Write in digits|Écris en chiffres) ?: (.+)$/))) { const v = spelled(m[1]); return v === null ? null : String(v); }
  if ((m = p.match(/^(?:Which fraction is bigger|Quelle fraction est la plus grande) ?: (\d+)\/(\d+) (?:or|ou) (\d+)\/(\d+) ?\?$/))) {
    return Number(m[1]) / Number(m[2]) >= Number(m[3]) / Number(m[4]) ? `${m[1]}/${m[2]}` : `${m[3]}/${m[4]}`;
  }
  if ((m = p.match(/^(?:Which is bigger|Lequel est le plus grand) ?: ([\d ,.]+?) (?:or|ou) ([\d ,.]+?) ?\?$/))) return out(Math.max(n(m[1]), n(m[2])));
  if ((m = p.match(/^(?:In|Dans) ([\d ,.]+?), (?:which digit is in the (\w+) place|quel est le chiffre des (\w+)) ?\?$/))) {
    const digits = m[1].replace(/\D/g, '');
    const at = PLACES[m[2] || m[3]];
    return at === undefined || at >= digits.length ? null : digits[digits.length - 1 - at];
  }
  return null;
}

const sameValue = (label, answer, lang) => (String(answer).includes('/') ? String(label).replace(/\s/g, '') === answer : num(label, lang) === Number(answer));

// ── Reading the page ─────────────────────────────────────────────────────────

const READ = (words) => `(() => {
  const words = ${JSON.stringify({ controls: words.controls, next: words.next, newGame: words.newGame, held: words.held, gotIn: words.gotIn, start: words.start })};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
  const allTexts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const texts = allTexts.map((e) => e.innerText.trim());
  const lane = [...document.querySelectorAll('.rkt-lane')].find(vis) || null;
  const laneCard = lane ? lane.parentElement : null;
  const mover = lane ? lane.querySelector('.rkt-mover') : null;
  const monster = lane ? lane.querySelector('.rkt-monster') : null;
  const laneTexts = laneCard ? allTexts.filter((e) => laneCard.contains(e)).map((e) => e.innerText.trim()) : [];
  const isHearts = (t) => /❤|🤍/.test(t);
  const isLine = (t) => /^(Monster|Monstre) \\d/.test(t);
  const isPips = (t) => /^[●○]+$/.test(t);
  let frac = null;
  if (lane && mover) {
    const cs = getComputedStyle(lane);
    const track = lane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    frac = track > 0 ? Math.round((mover.getBoundingClientRect().width / track) * 1000) / 1000 : null;
  }
  const pad = [...document.querySelectorAll('.gk-pad')].find((e) => vis(e) && e.querySelector('[data-pad-submit]')) || null;
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (l) => buttons.find((b) => b.innerText.trim() === l);
  const options = pad ? [] : buttons.filter((b) => !b.closest('.gk-pad') && b.innerText.trim() && !words.controls.includes(b.innerText.trim()) && b.innerText.trim() !== words.start && !(laneCard && laneCard.contains(b)));
  let prompt = null;
  let size = 0;
  if (pad || options.length) {
    for (const e of allTexts) {
      if (laneCard && laneCard.contains(e)) continue;
      const t = e.innerText.trim();
      if (!/[0-9?]|digits|chiffres/.test(t)) continue;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f > size) { size = f; prompt = e; }
    }
  }
  const chosen = (label) => {
    const leaf = [...document.querySelectorAll('*')].reverse().find((e) => e.children.length === 0 && vis(e) && e.innerText && e.innerText.trim() === label);
    for (let e = leaf, i = 0; e && i < 5; e = e.parentElement, i++) if (getComputedStyle(e).backgroundColor === 'rgb(245, 82, 46)') return true;
    return false;
  };
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
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p) stored = { stars: p.model && typeof p.model.stars === 'number' ? p.model.stars : 0, lastMonsterId: p.model ? p.model.lastMonsterId || null : null }; break; }
    }
  } catch (e) { stored = { error: String(e) }; }
  const next = byLabel(words.next);
  const newGame = byLabel(words.newGame);
  const firstKey = pad ? pad.querySelector('[data-pad-key]') : null;
  return {
    texts,
    lane: lane ? rect(lane) : null,
    laneClass: lane ? String(lane.className) : '',
    hearts: laneTexts.find(isHearts) || '',
    line: laneTexts.find(isLine) || '',
    pips: laneTexts.find(isPips) || '',
    note: laneTexts.filter((t) => !isHearts(t) && !isLine(t) && !isPips(t)).pop() || '',
    frac,
    moverClass: mover ? String(mover.className) : '',
    monsterClass: monster ? String(monster.className) : '',
    monster: monster ? rect(monster) : null,
    bob: monster ? monster.getAnimations({ subtree: true }).some((a) => a.animationName === 'rkt-bob' && a.playState === 'running') : false,
    answering: !!(pad || options.length) && !next,
    pad: pad ? rect(pad) : null,
    firstKey: firstKey && vis(firstKey) ? rect(firstKey) : null,
    options: options.map((b) => ({ label: b.innerText.trim(), ...rect(b) })),
    prompt: prompt ? prompt.innerText.trim() : '',
    promptRect: prompt ? rect(prompt) : null,
    next: next ? rect(next) : null,
    held: texts.includes(words.held),
    gotIn: texts.includes(words.gotIn),
    starsLine: texts.find((t) => /^\\+\\d+ ⭐$/.test(t)) || null,
    newGame: newGame ? rect(newGame) : null,
    focusOnNew: !!newGame && document.activeElement === newGame,
    focusLabel: document.activeElement ? (document.activeElement.innerText || document.activeElement.tagName).trim().slice(0, 30) : null,
    endRow: (() => { if (!newGame) return []; let row = newGame.parentElement; while (row && row.querySelectorAll('button').length < 2) row = row.parentElement; return row ? [...row.querySelectorAll('button')].filter(vis).map((b) => ({ label: b.innerText.trim(), ...rect(b) })) : []; })(),
    chosen: ${JSON.stringify([words.gateWay, words.pushWay, words.practice, words.challenge])}.reduce((acc, l) => Object.assign(acc, { [l]: chosen(l) }), {}),
    url: location.pathname + location.hash,
    coarse: matchMedia('(pointer: coarse)').matches,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollY: Math.round(scrollY),
    innerHeight,
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 260),
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
    /** Tap the first visible element a selector finds, brought on screen only if it is off it. */
    const tapSel = async (selector) => {
      const at = await page.evaluate(`(() => {
        const e = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.getClientRects().length);
        if (!e) return null;
        let r = e.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) { e.scrollIntoView({ block: 'nearest', behavior: 'instant' }); r = e.getBoundingClientRect(); }
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!at) return false;
      await tapAt(at.x, at.y);
      await wait(120);
      return true;
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
      fs.writeFileSync(path.join(SHOTS, `monster-${arm}-${lang}-${vpKey}-${name}.png`), Buffer.from(data, 'base64'));
    };
    /**
     * Answer the question on screen, meaning it to be right or wrong. Returns what was meant (`unknown` when the prompt could not be
     * solved) and the lane once the verdict is up and the monster has glided to where it rests.
     */
    const answer = async (want) => {
      const q = await until((r) => r.answering && (!!r.prompt || r.options.length > 0), 8000);
      if (!q) return { ok: false, why: `no question: ${(await read()).body}` };
      const solved = solve(q.prompt, lang);
      let intended = 'unknown';
      let gave = '';
      if (q.pad) {
        let text = '1';
        if (solved !== null && !solved.includes('/')) {
          text = want === 'right' ? solved : String(Number(solved) + 1);
          intended = want;
        }
        gave = text;
        for (const ch of text) {
          const key = ch === '.' ? (lang === 'fr' ? ',' : '.') : ch;
          if (!(await tapSel(`.gk-pad [data-pad-key="${key}"]`))) return { ok: false, why: `no pad key "${key}" for ${q.prompt}` };
        }
        await tapSel('.gk-pad [data-pad-submit]');
      } else {
        let target = null;
        if (solved !== null) {
          const match = q.options.find((o) => sameValue(o.label, solved, lang));
          target = want === 'right' ? match : q.options.find((o) => !sameValue(o.label, solved, lang));
          if (target) intended = want;
        }
        if (!target) target = q.options[0];
        gave = target.label;
        const fresh = (await read()).options.find((o) => o.label === target.label) || target;
        if (fresh.top < 0 || fresh.bottom > fresh.y * 2) await page.evaluate('window.scrollTo(0, 0)');
        await tapAt(fresh.x, fresh.y);
      }
      const graded = await until((r) => !!r.next && !r.answering, 6000);
      await wait(800);
      const after = await read();
      if (intended === 'unknown') note(`unknown: "${q.prompt}" answered ${gave}`);
      return { ok: !!graded, intended, prompt: q.prompt, gave, before: q, after };
    };
    const pressNext = async () => {
      const r = await read();
      if (!r.next) return false;
      await tapAt(r.next.x, r.next.y);
      await until((x) => x.answering || x.held || x.gotIn, 6000);
      await wait(500);
      return true;
    };

    await page.setViewport({ width: vp.width, height: vp.height, mobile: vp.mobile });
    if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await wait(1200);

    // ── A player (CE2: the question shapes the solver reads), seeded to 10 ⭐ on the gate arm so the end card is its tallest ──
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
    if (arm === 'gate') {
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
    await send('Page.reload', {});
    await wait(3500);
    let home = await read();
    if (home.body.includes('Léa') && !home.body.includes(w.game)) {
      await pressLabel('Léa');
      await wait(1500);
      home = await read();
    }
    if (touch) clause('coarse', home.coarse, 'matchMedia (pointer: coarse) is false');

    // ── The setup ──
    if (!(await pressLabel(w.game))) return note(`no "${w.game}" card on Home — ${home.body}`);
    const setup = await until((r) => r.texts.includes(w.gateWay) && r.texts.includes(w.practice), 6000);
    await page.evaluate('window.scrollTo(0, 0)');
    await wait(400);
    await shoot('setup');
    const s0 = await read();
    clause('opened', !!setup && /[/#]monster$/.test(s0.url) && [w.gateWay, w.pushWay, w.practice, w.challenge].every((t) => s0.texts.includes(t)), JSON.stringify({ url: s0.url, body: s0.body }));
    if (!setup) return;
    cell.reached = true;
    if (arm === 'gate') {
      clause('defaults', s0.chosen[w.gateWay] && s0.chosen[w.practice] && !s0.chosen[w.pushWay] && !s0.chosen[w.challenge], JSON.stringify(s0.chosen));
    }
    if (arm === 'walk') await pressLabel(w.challenge);
    if (arm === 'push') await pressLabel(w.pushWay);
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" button`);
    const started = await until((r) => !!r.lane && r.answering, 8000);
    await wait(900);
    const r0 = await read();
    await shoot('started');
    if (!started) return note(`the lane or the question never came: ${r0.body}`);

    if (arm === 'gate' || arm === 'screen') {
      clause('started', r0.hearts === '❤️ ❤️ ❤️' && w.monster.test(r0.line) && r0.line.match(w.monster)[1] === '1' && r0.pips === '●●●●' && near(r0.frac, 1, 0.03) && /rkt-monster-horns/.test(r0.monsterClass), JSON.stringify({ hearts: r0.hearts, line: r0.line, pips: r0.pips, frac: r0.frac, monsterClass: r0.monsterClass }));
    }

    if (arm === 'screen') {
      clause('sideways', r0.scrollWidth <= vp.width, `scrollWidth ${r0.scrollWidth} > ${vp.width}`);
      const way = r0.firstKey || (r0.options[0] || null);
      clause('fold', !!r0.lane && r0.lane.top >= 0 && !!r0.promptRect && r0.promptRect.bottom <= r0.innerHeight && !!way && way.bottom <= r0.innerHeight && r0.scrollY === 0, JSON.stringify({ lane: r0.lane, prompt: r0.promptRect, way, innerHeight: r0.innerHeight, scrollY: r0.scrollY }));
      clause('laneFits', !!r0.lane && r0.lane.left >= 0 && r0.lane.right <= vp.width && !!r0.monster && r0.monster.left >= r0.lane.left && r0.monster.right <= r0.lane.right, JSON.stringify({ lane: r0.lane, monster: r0.monster, width: vp.width }));
      const a = await answer('wrong');
      await shoot('verdict');
      clause('verdict', a.ok && !!a.after.next && a.after.next.bottom <= a.after.innerHeight && a.after.next.top >= 0 && a.after.scrollY === 0, JSON.stringify({ ok: a.ok, why: a.why, next: a.after && a.after.next, innerHeight: a.after && a.after.innerHeight, scrollY: a.after && a.after.scrollY }));
    }

    if (arm === 'walk') {
      await wait(1500);
      const w1 = await read();
      await wait(1500);
      const w2 = await read();
      await shoot('walking');
      clause('walks', w1.answering && w2.answering && typeof w1.frac === 'number' && typeof w2.frac === 'number' && w1.frac < 0.97 && w2.frac < w1.frac - 0.04 && !/rkt-mover-glide/.test(w2.moverClass), JSON.stringify({ first: w1.frac, second: w2.frac, moverClass: w2.moverClass, answering: [w1.answering, w2.answering] }));
      const timedOut = await until((r) => r.note.startsWith(w.bang), 30000);
      await wait(900);
      const t = await read();
      await shoot('timeout');
      clause('timeout', !!timedOut && t.hearts === '❤️ ❤️ 🤍' && near(t.frac, 1, 0.03), JSON.stringify({ note: t.note, hearts: t.hearts, frac: t.frac }));
    }

    if (arm === 'push') {
      clause('cave', /rkt-lane-push/.test(r0.laneClass) && near(r0.frac, 0.5, 0.03) && r0.pips === '', JSON.stringify({ laneClass: r0.laneClass, frac: r0.frac, pips: r0.pips }));
      // A right answer the drive could read, whatever comes first; an unknown one is answered and graded like any other.
      let pushedOk = false;
      for (let tries = 0; tries < 6 && !pushedOk; tries++) {
        const before = (await read()).frac;
        const a = await answer('right');
        if (!a.ok) return note(`push: ${a.why}`);
        if (a.intended === 'right') {
          await shoot('pushed');
          clause('pushed', (a.after.note === w.pushed || a.after.note === w.cave) && typeof a.after.frac === 'number' && (a.after.frac > before + 0.05 || a.after.note === w.cave), JSON.stringify({ before, after: a.after.frac, note: a.after.note, prompt: a.prompt, gave: a.gave }));
          pushedOk = true;
        }
        await pressNext();
      }
      if (!pushedOk) note('push: no right answer the drive could read in six questions');
      let steppedOk = false;
      for (let tries = 0; tries < 6 && !steppedOk; tries++) {
        const before = (await read()).frac;
        const a = await answer('wrong');
        if (!a.ok) return note(`push: ${a.why}`);
        if (a.intended === 'wrong') {
          clause('stepped', a.after.note === w.stepped && typeof a.after.frac === 'number' && a.after.frac < before - 0.03, JSON.stringify({ before, after: a.after.frac, note: a.after.note, prompt: a.prompt, gave: a.gave }));
          steppedOk = true;
        }
        await pressNext();
      }
      if (!steppedOk) note('push: no wrong answer the drive could read in six questions');
    }

    if (arm === 'gate') {
      clause('bobStart', r0.bob, 'no running rkt-bob on the monster before any answer');
      const before = r0.stored ? r0.stored.stars : 0;
      // Three wrong answers the drive could read, in a row: a creep, a creep, a bang. An unknown answer breaks the row, so it starts again.
      let row = 0;
      for (let guard = 0; guard < 12 && row < 3; guard++) {
        const a = await answer('wrong');
        if (!a.ok) return note(`gate: ${a.why}`);
        if (a.intended !== 'wrong') { row = 0; await pressNext(); continue; }
        row++;
        if (row === 1) {
          await shoot('creep');
          clause('bobAfter', a.after.bob, `no running rkt-bob after a wrong answer (${a.after.monsterClass})`);
          clause('creep', a.after.note === w.creep && near(a.after.frac, 2 / 3, 0.04) && a.after.hearts === '❤️ ❤️ ❤️', JSON.stringify({ note: a.after.note, frac: a.after.frac, hearts: a.after.hearts, prompt: a.prompt, gave: a.gave }));
        }
        if (row === 3) {
          await shoot('bang');
          clause('bang', a.after.note.startsWith(w.bang) && a.after.hearts === '❤️ ❤️ 🤍' && near(a.after.frac, 1, 0.03), JSON.stringify({ note: a.after.note, frac: a.after.frac, hearts: a.after.hearts }));
        }
        await pressNext();
      }
      if (row < 3) note('gate: three readable wrong answers in a row never came up');
      // Then right answers until the game ends.
      let hitSeen = false;
      let runsSeen = false;
      let end = null;
      for (let guard = 0; guard < 45; guard++) {
        const pre = await read();
        if (pre.held || pre.gotIn) { end = pre; break; }
        const a = await answer('right');
        if (!a.ok) return note(`gate: ${a.why}`);
        if (a.intended === 'right' && !hitSeen && (a.after.note.startsWith(w.bigHit) || a.after.note.startsWith(w.smallHit))) {
          const hitsBefore = (pre.pips.match(/●/g) || []).length;
          const hitsAfter = (a.after.pips.match(/●/g) || []).length;
          clause('bobAfter', a.after.bob, `no running rkt-bob after a hit (${a.after.monsterClass})`);
          clause('hit', hitsAfter === hitsBefore - (a.after.note.startsWith(w.bigHit) ? 2 : 1) && near(a.after.frac, 1, 0.03), JSON.stringify({ note: a.after.note, pips: [pre.pips, a.after.pips], frac: a.after.frac }));
          hitSeen = true;
        }
        if (a.after.note.startsWith(w.runs) && !runsSeen) {
          const which = Number((a.after.line.match(w.monster) || [])[1]);
          await shoot('runs');
          await pressNext();
          const nx = await read();
          const whichNow = Number((nx.line.match(w.monster) || [])[1]);
          clause('runs', whichNow === which + 1 && !/rkt-monster-horns/.test(nx.monsterClass) && /rkt-monster-eye/.test(nx.monsterClass) && nx.pips === '●●●●', JSON.stringify({ before: a.after.line, after: nx.line, monsterClass: nx.monsterClass, pips: nx.pips }));
          runsSeen = true;
          continue;
        }
        if (a.after.note === w.allHome || a.after.note === w.gotIn.replace('Le monstre est', 'Il est').replace('The monster', 'It')) {
          await shoot('last');
        }
        await pressNext();
      }
      if (!end) end = await until((r) => r.held || r.gotIn, 5000);
      await wait(1500);
      const e = await read();
      await shoot('end');
      if (!hitSeen) note('gate: no readable right answer landed a hit');
      clause('won', !!end && e.held, JSON.stringify({ held: e.held, gotIn: e.gotIn, body: e.body }));
      if (!end) return;
      const paidRead = await until((r) => r.stored && r.stored.stars !== before, 4000);
      const got = (paidRead || e).stored.stars - before;
      const card = e.starsLine ? Number(e.starsLine.replace(/\D/g, '')) : NaN;
      clause('paid', got === card && card >= 5 && !!(paidRead || e).stored.lastMonsterId, JSON.stringify({ before, got, card, starsLine: e.starsLine, lastMonsterId: (paidRead || e).stored.lastMonsterId }));
      clause('pickLine', e.texts.includes(w.earnedPick), JSON.stringify(e.texts.slice(-10)));
      clause('focus', e.focusOnNew, `focus on ${e.focusLabel}`);
      clause('endInView', e.endRow.length >= 2 && e.endRow.every((b) => b.top >= 0 && b.bottom <= e.innerHeight), JSON.stringify({ endRow: e.endRow, innerHeight: e.innerHeight, scrollY: e.scrollY }));
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
