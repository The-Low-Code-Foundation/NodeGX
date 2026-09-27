#!/usr/bin/env node
/**
 * P87 RKT-006 — can a child restart from inside the race, or step back to the setup, and does the race they left stay left?
 *
 * Finding 6: "You can't reset the game once in the game. If the player sees they're losing they should be able to reset
 * from within the game."
 *
 * One fresh Chrome per arm × language × viewport. Every reading of a rocket is taken twice: the kit's RENDERED sprite
 * (the `transform` of the group around `[data-rocket]`) and the Variable that feeds it, because a variable at 0 under a
 * rocket still drawn half way is exactly what a child would see.
 *
 * Arms (default: all three):
 *   solo     — Défi, me vs the computer (AC1, AC4, AC5 for a restart)
 *     moved      — known-firing: three right answers moved rocket A off its start (sprite AND variable)
 *     control    — a Restart button is in the stage, on screen, and is what is under its own centre
 *     spritesHome— after Restart both sprites are back where the race started them, and both variables are 0
 *     onePrompt  — exactly one prompt is showing and no verdict (the banner is closed)
 *     clockFull  — the countdown bar is ≥ 90% full
 *     learning   — the stored model's `answered` is the same after Restart as before it (AC4)
 *     freshClock — left alone, the new question times out with the bar empty (≤ 10%), and `answered` rises by exactly one
 *     countAfter — played on to the planet, the result line counts only the rounds since Restart
 *   two      — Practice, two players (AC2)
 *     turnB      — known-firing: after A's round it is B's turn
 *     turnA      — Restart on B's turn gives the turn to A, and both sprites are home
 *   settings — Défi, two players, a name for B (AC3, AC5 abandoned)
 *     control    — a Settings button (the result screen's "Change the race" word) is in the stage
 *     setupBack  — Settings shows the setup, and no prompt
 *     choicesKept— the setup still says Défi and two players, and B's name is still in its box
 *     noStale    — the race left with its clock running never grades afterwards: after the longest limit (+ margin),
 *                  the stored `answered` has not moved and `countdownExpired` is not true
 *     cleanStart — Start begins a clean race: sprites home, variables 0, A's turn, one prompt, bar full
 *
 * Usage:
 *   node scripts/devtools/drive-rkt006-restart.js <deploy-dir> [--arm solo|two|settings] [--lang fr|en]
 *        [--only 1366x768,390x844] [--shots <dir>] [--stale-ms 58000]
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
const ONLY = arg('--only') || '1366x768,390x844';
const ARMS = arg('--arm') ? [arg('--arm')] : ['solo', 'two', 'settings'];
const LANGS = arg('--lang') ? [arg('--lang')] : ['fr', 'en'];
// The longest clock any skill gets is 18 000 ms fluent × LIMIT_FACTOR 3 = 54 s (tpl007Scripts.ts); the wait outlasts it.
const STALE_MS = Number(arg('--stale-ms') || 58000);
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt006-restart.js <deploy-dir> [--arm solo|two|settings] [--lang fr|en] [--only 1366x768] [--shots <dir>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const ALL_VPS = [
  { width: 1366, height: 768, mobile: false },
  { width: 1280, height: 720, mobile: false },
  { width: 1024, height: 768, mobile: true },
  { width: 768, height: 1024, mobile: true },
  { width: 390, height: 844, mobile: true }
];
const vpName = (v) => `${v.width}x${v.height}`;
const VPS = ALL_VPS.filter((v) => ONLY.split(',').includes(vpName(v)));
if (!VPS.length) {
  console.error(`--only ${ONLY} matches none of ${ALL_VPS.map(vpName).join(', ')}`);
  process.exit(2);
}

const W = {
  en: {
    home: 'Rocket Race',
    challenge: 'Challenge',
    two: 'Two players, taking turns',
    start: 'Start',
    next: 'Next',
    restart: 'Restart',
    settings: 'Change the race',
    yourTurn: 'Your turn',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    timeout: 'Time’s up.',
    results: ['You reached the planet!', 'The computer got there first. Again?'],
    rightAnswers: 'right answers'
  },
  fr: {
    home: 'Course de fusées',
    challenge: 'Défi',
    two: 'Deux joueurs, chacun son tour',
    start: 'Commencer',
    next: 'Suivant',
    restart: 'Recommencer',
    settings: 'Changer de course',
    yourTurn: 'À toi',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    timeout: 'Temps écoulé.',
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?'],
    rightAnswers: 'bonnes réponses'
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NUMERIC = /^[\d\s  .,/−-]+$/;

/** The same solver as drive-rkt003-stage.js: the right answer for the maths prompts a CM1 race asks. */
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
  // Spelled-out numbers are not solved here; the drive answers them with its best guess and says so.
  return null;
}

/** Everything a clause reads, in one evaluation. */
const READ = (H, words) => `(() => {
  const words = ${JSON.stringify(words)};
  const H = ${H};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const verdict = texts.find((e) => words.verdicts.includes(e.innerText.trim()));
  const result = texts.find((e) => words.results.includes(e.innerText.trim()));
  const resultLine = texts.find((e) => e.innerText.includes(words.rightAnswers));
  const turn = texts.find((e) => e.innerText.trim().endsWith(' — ' + words.yourTurn));
  // 🔴 The template has no prompt class (a first run read NOT REACHED in every cell off '.rkt-prompt'). As in
  // drive-rkt003-stage.js, the prompt is the largest text that is not a verdict, a result, a turn or a glyph; and
  // "one question showing" is counted by its answer surfaces, which a second question would double.
  let promptEl = null;
  let size = 0;
  for (const e of texts) {
    if (e === verdict || e === result || e === turn || e.closest('button') || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; promptEl = e; }
  }
  const surfaces = [...document.querySelectorAll('[data-pad-field]')].filter(vis);
  let prompts = surfaces.length ? surfaces.map(() => promptEl ? promptEl.innerText.trim() : '?') : [];
  // An options question has no pad: its numeric answer buttons are the surface.
  const optionCount = [...document.querySelectorAll('button')].filter((b) => vis(b) && !b.closest('.gk-pad') && ${NUMERIC}.test(b.innerText.trim())).length;
  if (!prompts.length && optionCount && promptEl) prompts = [promptEl.innerText.trim()];
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (label) => buttons.find((b) => b.innerText.trim() === label);
  const inResult = (b) => !!b && !!b.closest('.rkt-result');
  const restart = byLabel(words.restart);
  const settings = buttons.find((b) => b.innerText.trim() === words.settings && !inResult(b));
  const reach = (b) => { const r = box(b); if (!r || r.y < 0 || r.y >= innerHeight) return false; const top = document.elementFromPoint(r.x, r.y); return !!top && (top === b || b.contains(top)); };
  const sprite = (id) => { const p = document.querySelector('[data-rocket="' + id + '"]'); const g = p && p.parentElement; const t = g ? g.getAttribute('transform') || '' : ''; const m = t.match(/translate\\(([-\\d.]+) ([-\\d.]+)\\)/); return m ? { x: Number(m[1]), y: Number(m[2]) } : null; };
  // The countdown: a 300×12 track whose only child is the fill.
  let clock = null;
  for (const d of document.querySelectorAll('div')) {
    const r = d.getBoundingClientRect();
    if (Math.round(r.width) === 300 && Math.round(r.height) === 12 && d.children.length === 1 && vis(d)) {
      clock = Math.round((d.children[0].getBoundingClientRect().width / 300) * 100) / 100;
      break;
    }
  }
  const V = (window.Noodl && window.Noodl.Variables) || {};
  // The stored profile: the store persists { profiles, activeId } somewhere under its key.
  let answered = null;
  try {
    const find = (v, depth) => {
      if (!v || typeof v !== 'object' || depth > 6) return null;
      if (Array.isArray(v.profiles) && typeof v.activeId === 'string') return v;
      for (const k of Object.keys(v)) { const hit = find(typeof v[k] === 'string' && /^[{[]/.test(v[k]) ? JSON.parse(v[k]) : v[k], depth + 1); if (hit) return hit; }
      return null;
    };
    for (let i = 0; i < localStorage.length; i++) {
      const raw = localStorage.getItem(localStorage.key(i));
      let parsed; try { parsed = JSON.parse(raw); } catch (e) { continue; }
      const app = find(parsed, 0);
      if (app) { const p = app.profiles.find((x) => x.id === app.activeId); if (p && p.model) answered = Number(p.model.answered) || 0; break; }
    }
  } catch (e) { answered = 'error ' + e; }
  const nameBox = [...document.querySelectorAll('input')].find((i) => vis(i) && !i.closest('.gk-pad'));
  const padBox = document.querySelector('.gk-pad input:not([disabled])');
  const options = buttons.filter((b) => !b.closest('.gk-pad') && ${NUMERIC}.test(b.innerText.trim()));
  return {
    H,
    scrollY: Math.round(scrollY),
    prompts,
    prompt: prompts[0] || null,
    verdict: verdict ? verdict.innerText.trim() : null,
    result: result ? result.innerText.trim() : null,
    resultLine: resultLine ? resultLine.innerText.trim() : null,
    turn: turn ? turn.innerText.trim() : null,
    restart: box(restart), restartReach: reach(restart),
    settings: box(settings), settingsReach: reach(settings),
    next: box(byLabel(words.next)),
    start: box(byLabel(words.start)),
    padBox: box(padBox),
    options: options.map((b) => ({ label: b.innerText.trim(), ...box(b) })),
    nameBox: nameBox ? nameBox.value : null,
    spriteA: sprite('a'), spriteB: sprite('b'),
    progressA: V.raceProgressA, progressB: V.raceProgressB,
    racePlaying: V.racePlaying, raceTimed: V.raceTimed, racePlayers: V.racePlayers, raceMode: V.raceMode,
    expired: V.countdownExpired,
    clock,
    answered
  };
})()`;

const near = (p, q) => !!p && !!q && Math.abs(p.x - q.x) <= 1 && Math.abs(p.y - q.y) <= 1;

/**
 * When was the bar last full? Two readings of a linear glide give its slope, and the slope gives the moment it was at 1.
 * 🔴 RKT-006 build 2 read the refilled bar at 0.78–0.83 against a 0.85 threshold: a single reading grades how late the probe looked (a
 * busy Chrome, a 250 ms poll), not the bar. A bar that refilled with THIS question was full within moments of it showing; a bar
 * that never refilled (session 6's deploy) was last full at an earlier question, seconds before.
 */
async function lastFull(read, seenAt, what = 'the question was seen') {
  // 🔴 RKT-006 build 3: read while the bar was still REFILLING (0.88 then 0.94), the slope came out negative. Wait for the glide down.
  let prev = null;
  const until = Date.now() + 3000;
  for (;;) {
    const r = await read();
    if (typeof r.clock === 'number' && prev !== null && r.clock < prev) break;
    if (typeof r.clock === 'number') prev = r.clock;
    if (Date.now() > until) break;
    await wait(150);
  }
  const r1 = await read();
  const t1 = Date.now();
  await wait(600);
  const r2 = await read();
  const t2 = Date.now();
  if (typeof r1.clock !== 'number' || typeof r2.clock !== 'number') return { ok: false, saw: `no bar (${r1.clock}, ${r2.clock})` };
  const slope = (r1.clock - r2.clock) / (t2 - t1);
  if (!(slope > 0)) return { ok: false, saw: `the bar is not gliding: ${r1.clock} then ${r2.clock}` };
  const fullAt = t1 - (1 - r1.clock) / slope;
  const before = Math.round(seenAt - fullAt);
  // Full no more than 1.5 s before the question was seen (the poll, the 40 ms kick, a slow evaluate); a glide of ≥ 7.5 s
  // from a previous question puts it far earlier.
  return { ok: before <= 1500, saw: `bar ${r1.clock} → ${r2.clock} over ${t2 - t1} ms; last full ${before} ms before ${what} (≤ 1500)` };
}

/** The bar, sampled every 100 ms, as "ms:value" pairs — the refill's real shape, for the record. */
async function traceClock(read, ms) {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = await read();
    out.push(`${Date.now() - t0}:${r.clock}`);
    await wait(100);
  }
  return out.join(' ');
}
const cells = [];

async function driveCell(arm, lang, vp) {
  const w = W[lang];
  const H = vp.height;
  const cell = { arm, lang, vp: vpName(vp), reached: false, clauses: {}, saw: {}, notes: [] };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);
  const clause = (name, ok, saw) => {
    cell.clauses[name] = !!ok;
    if (!ok) cell.saw[name] = saw;
  };

  await withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
    const send = (method, params) => page.client.send(method, params);
    const read = () => page.evaluate(READ(H, w));
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
    const body = async () => (await page.evaluate('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 180);
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
      fs.writeFileSync(path.join(SHOTS, `rkt006-${arm}-${lang}-${vpName(vp)}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const question = () => until((r) => r.result || (r.prompt && (r.padBox || r.options.length) && !r.verdict), 8000);
    /** Answer the question on screen right (or wrong), and wait for its verdict. */
    const answer = async (right) => {
      const q = await question();
      if (!q || q.result) return q;
      const solved = solve(q.prompt);
      if (right && !solved) note(`"${q.prompt}" is not solved by the drive; answered with a guess`);
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
      return until((r) => r.verdict || r.result, 4000);
    };
    const nextRound = async () => {
      const r = await read();
      if (r.next) await tapAt(r.next.x, r.next.y);
      await wait(900);
    };
    const press = async (which) => {
      await page.evaluate('window.scrollTo(0, 0)');
      const r = await read();
      const b = r[which];
      if (!b) return false;
      await tapAt(b.x, b.y);
      return true;
    };

    await page.setViewport(vp);
    await wait(1200);

    // ── A player, Home, the race setup ──
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
    await wait(1500);
    if (!(await body()).includes(w.home)) return note(`Home never showed "${w.home}"`);
    await pressLabel(w.home);
    await wait(1200);
    if (arm !== 'two') await pressLabel(w.challenge);
    if (arm !== 'solo') {
      await pressLabel(w.two);
      await wait(300);
      const box = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!box) return note('no name box for player two');
      await tapAt(box.x, box.y);
      await wait(150);
      await send('Input.insertText', { text: 'Tom' });
      await wait(300);
    }
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
    await wait(1200);
    await page.evaluate('window.scrollTo(0, 0)');
    const first = await question();
    if (!first || first.result) return note(`no first question — ${await body()}`);
    cell.reached = true;
    const home = { a: first.spriteA, b: first.spriteB };
    if (!home.a) note('🔴 no rocket A sprite was read at the start; spritesHome grades nothing');

    if (arm === 'solo') {
      for (let i = 0; i < 3; i++) {
        const v = await answer(true);
        if (!v || v.result) return note(`round ${i + 1}: ${v ? 'the race ended' : 'no verdict'}`);
        if (i < 2) await nextRound();
      }
      await wait(900);
      const moved = await read();
      const answeredBefore = moved.answered;
      // Either rocket: the drive's solver cannot answer every CM1 prompt, and the computer's rocket moves every round anyway.
      // (RKT-006 build 1: FR 1366×768 guessed all three wrong, so A never left the start and `moved` read a probe fault, not the product.)
      const off = (now, was, p) => !!now && !near(now, was) && p > 0;
      clause('moved', off(moved.spriteA, home.a, moved.progressA) || off(moved.spriteB, home.b, moved.progressB), JSON.stringify({ home, now: { a: moved.spriteA, b: moved.spriteB }, progressA: moved.progressA, progressB: moved.progressB }));
      // clockAtNext — the control for clockFull: a question reached by Next, not by Restart, read as soon as it shows.
      // 🔴 Timed from the PRESS, not from when the probe noticed the question: RKT-006 build 3's cleanClock was "1.6–2.1 s late"
      // because the drive itself slept 2.1 s after Start before it looked.
      const tNext = Date.now();
      if (moved.next) await tapAt(moved.next.x, moved.next.y);
      const q4 = await until((r) => r.prompt && (r.padBox || r.options.length) && !r.verdict && !r.result, 8000);
      if (!q4) return note('no fourth question');
      const atNext = await lastFull(read, tNext, 'Next was pressed');
      clause('clockAtNext', atNext.ok, atNext.saw);
      await wait(900); // the clock is running
      const before = await read();
      clause('control', before.restart && before.restart.bottom <= H && before.restartReach, `restart ${JSON.stringify(before.restart)}, reachable ${before.restartReach}, H ${H}`);
      await shoot('before-restart');
      if (!before.restart) return;
      const tRestart = Date.now();
      await press('restart');
      // 🔴 The old question is still on screen the instant Restart is pressed, so nothing on the page says "new" yet, and RKT-006
      // build 3 extrapolated a bar still refilling ("not gliding: 0.88 then 0.94"). The trace records what the bar really does;
      // lastFull waits for the glide down and dates the refill from the PRESS. A bar that never refills was last full seconds before.
      note(`bar after Restart (ms:value): ${await traceClock(read, 1500)}`);
      const atRestart = await lastFull(read, tRestart, 'Restart was pressed');
      const after = await read();
      await shoot('after-restart');
      clause('spritesHome', near(after.spriteA, home.a) && near(after.spriteB, home.b) && after.progressA === 0 && after.progressB === 0, JSON.stringify({ home, now: { a: after.spriteA, b: after.spriteB }, progressA: after.progressA, progressB: after.progressB }));
      clause('onePrompt', after.prompts.length === 1 && !after.verdict && !after.result, JSON.stringify({ prompts: after.prompts, verdict: after.verdict, result: after.result }));
      clause('clockFull', atRestart.ok, atRestart.saw);
      clause('learning', typeof answeredBefore === 'number' && after.answered === answeredBefore, `answered ${answeredBefore} before Restart, ${after.answered} after`);
      // AC5 for a restart: the new question's own clock, and one timeout only.
      const t = await until((r) => r.verdict || r.result, 70000);
      const late = await read();
      await wait(1500);
      const settled = await read();
      clause('freshClock', t && t.verdict === w.timeout && typeof late.clock === 'number' && late.clock <= 0.1 && settled.answered === answeredBefore + 1, JSON.stringify({ verdict: t && t.verdict, barAtVerdict: late.clock, answered: settled.answered, before: answeredBefore }));
      // countAfter: play on to the planet; the result line counts the rounds since Restart only.
      let since = 1;
      await nextRound();
      for (let guard = 0; guard < 40; guard++) {
        const v = await answer(true);
        if (!v) break;
        if (v.result) break;
        since++;
        await nextRound();
      }
      const end = await until((r) => r.result, 4000);
      const m = end && end.resultLine && end.resultLine.match(/(\d+)\s*\/\s*(\d+)/);
      clause('countAfter', m && Number(m[2]) === since, JSON.stringify({ line: end && end.resultLine, roundsSinceRestart: since }));
      await shoot('end');
    }

    if (arm === 'two') {
      const turn1 = first.turn;
      const v = await answer(true);
      if (!v) return note('no verdict in round 1');
      await nextRound();
      const b = await question();
      clause('turnB', b && b.turn && b.turn.startsWith('Tom') && turn1 && turn1.startsWith('Léa'), JSON.stringify({ turn1, turn2: b && b.turn }));
      const r = await read();
      clause('control', r.restart && r.restart.bottom <= H && r.restartReach, `restart ${JSON.stringify(r.restart)}, reachable ${r.restartReach}`);
      if (!r.restart) return;
      await press('restart');
      await wait(1400);
      const after = await read();
      await shoot('after-restart');
      clause('turnA', after.turn && after.turn.startsWith('Léa') && near(after.spriteA, home.a) && near(after.spriteB, home.b), JSON.stringify({ turn: after.turn, home, now: { a: after.spriteA, b: after.spriteB } }));
    }

    if (arm === 'settings') {
      const v = await answer(true);
      if (!v) return note('no verdict in round 1');
      await nextRound();
      const q2 = await question();
      if (!q2 || q2.result) return note('no second question');
      await wait(1500); // B's clock is running
      const r = await read();
      const answeredBefore = r.answered;
      clause('control', r.settings && r.settings.bottom <= H && r.settingsReach, `settings ${JSON.stringify(r.settings)}, reachable ${r.settingsReach}`);
      if (!r.settings) return;
      await press('settings');
      await wait(1200);
      const s = await read();
      await shoot('settings');
      clause('setupBack', s.start && s.prompts.length === 0, JSON.stringify({ start: s.start, prompts: s.prompts }));
      clause('choicesKept', s.raceTimed === 'challenge' && s.racePlayers === '2' && s.nameBox === 'Tom', JSON.stringify({ raceTimed: s.raceTimed, racePlayers: s.racePlayers, raceMode: s.raceMode, nameBox: s.nameBox }));
      await wait(STALE_MS);
      const stale = await read();
      clause('noStale', stale.answered === answeredBefore && stale.expired !== true, JSON.stringify({ answeredBefore, answeredAfter: stale.answered, countdownExpired: stale.expired, waitedMs: STALE_MS }));
      const tStart = Date.now();
      if (!(await pressLabel(w.start))) return note('no Start after Settings');
      await wait(1400);
      await page.evaluate('window.scrollTo(0, 0)');
      const c = await question();
      const atStart = c ? await lastFull(read, tStart, 'Start was pressed') : { ok: false, saw: 'no question' };
      await shoot('clean-start');
      clause('cleanStart', c && !c.result && c.prompts.length === 1 && near(c.spriteA, home.a) && near(c.spriteB, home.b) && c.progressA === 0 && c.progressB === 0 && c.turn && c.turn.startsWith('Léa'), JSON.stringify(c && { prompts: c.prompts, a: c.spriteA, b: c.spriteB, home, progressA: c.progressA, progressB: c.progressB, turn: c.turn }));
      clause('cleanClock', atStart.ok, atStart.saw);
    }
    if (page.consoleErrors.length) note(`console errors: ${JSON.stringify(page.consoleErrors.slice(0, 3))}`);
  });
}

(async () => {
  for (const arm of ARMS) {
    for (const lang of LANGS) {
      for (const vp of VPS) {
        try {
          await driveCell(arm, lang, vp);
        } catch (e) {
          const mine = cells[cells.length - 1];
          const threw = `the drive threw — ${e.stack || e}`;
          if (mine && mine.arm === arm && mine.lang === lang && mine.vp === vpName(vp)) {
            mine.notes.push(threw);
            mine.reached = false;
          } else cells.push({ arm, lang, vp: vpName(vp), reached: false, clauses: {}, saw: {}, notes: [threw] });
        }
        const c = cells[cells.length - 1];
        const bad = Object.entries(c.clauses).filter(([, ok]) => !ok).map(([k]) => k);
        console.log(`${c.arm.padEnd(8)} ${c.lang} ${c.vp.padEnd(9)} ${c.reached ? '' : 'NOT REACHED '}passed ${Object.keys(c.clauses).length - bad.length}/${Object.keys(c.clauses).length}${bad.length ? '  FAILED: ' + bad.join(', ') : ''}`);
      }
    }
  }
  let failed = 0;
  console.log('\n── detail ──');
  for (const c of cells) {
    if (!c.reached) failed++;
    for (const [k, ok] of Object.entries(c.clauses)) {
      if (!ok) failed++;
      console.log(`${c.arm.padEnd(8)} ${c.lang} ${c.vp.padEnd(9)} ${ok ? 'pass' : 'FAIL'} ${k}${ok ? '' : ' — ' + c.saw[k]}`);
    }
    for (const n of c.notes) console.log(`NOTE  ${c.arm} ${c.lang} ${c.vp}: ${n}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} failures`} across ${cells.length} cells`);
  process.exitCode = failed === 0 ? 0 : 1;
})();
