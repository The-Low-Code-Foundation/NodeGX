#!/usr/bin/env node
/**
 * P87 RKT-007 — does the clock say how long is left, and does the boost say why the rocket went as far as it did?
 *
 * Finding 7: "When in 'Défi' mode, you see a small countdown bar but there's no visual info about what happens if it
 * gets to zero, how long you have left, etc. The same in entertainment mode, when you answer quickly or slowly, you
 * don't see any visual feedback about why you went further or less far because of your answer speed."
 *
 * One fresh Chrome per arm × language × viewport, a new CM1 player, a solo race.
 *
 * Arms (default: both):
 *   defi     — Challenge (AC2, AC3)
 *     rule       — before the first question, the setup says what happens at zero (and not the practice line)
 *     clock      — known-firing for noClock: the 300×12 countdown is mounted during a question
 *     numeral    — seconds left: read just after the numeral ticks, it reads N, and 2 s later N − 2
 *     sameClock  — the numeral is the bar's clock: N is the bar's fraction × the limit the bar's own glide gives, rounded up
 *     pulse      — in the last 3 seconds the numeral carries rkt-clock-last (animated, unless reduced motion)
 *     timeout    — a timed-out verdict says the rocket stays put, and rocket A's variable and sprite did not move
 *   practice — Practice (AC3, AC4)
 *     rule       — the setup says what practice rewards (and not the challenge line)
 *     noClock    — no countdown element is mounted during a question (neither the 300×12 track nor .rkt-clock)
 *   both arms (AC3; one fast right, one slow right, one wrong, each on a question the drive can solve):
 *     lines      — the three boost lines differ: fast says full boost, slow says a percentage, wrong says no boost
 *     boostIsGain— the slow line's percentage is what the rocket moved: ΔA ÷ one step × 100, within 1.5
 *     meter      — the meter's fill is the percentage of its track (full for fast), and a wrong answer has none
 *     moves      — rocket A moved fast > slow > wrong = 0, by the variable AND the rendered sprite
 *     segment    — after a right answer the kit lights the stretch just gained ([data-gain="a"])
 *
 * The slow answer waits real time: in Défi 1.6 × the fluent window (the bar's glide is 3 fluent windows long, read from
 * its slope), in Practice 12.5 s. `elapsedOverride` is for the engine gate only.
 *
 * Usage:
 *   node scripts/devtools/drive-rkt007-boost.js <deploy-dir> [--arm defi|practice] [--lang fr|en] [--only 1366x768,390x844]
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
const ONLY = arg('--only') || '1366x768,390x844';
const ARMS = arg('--arm') ? [arg('--arm')] : ['defi', 'practice'];
const LANGS = arg('--lang') ? [arg('--lang')] : ['fr', 'en'];
const REDUCED = argv.includes('--reduced');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt007-boost.js <deploy-dir> [--arm defi|practice] [--lang fr|en] [--only 1366x768] [--shots <dir>] [--reduced]');
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

/** One right answer moves a rocket this far at full boost (RACE_STEP, tpl007Scripts.ts). */
const STEP = 1 / 8;

const W = {
  en: {
    home: 'Rocket Race',
    practice: 'Practice',
    challenge: 'Challenge',
    start: 'Start',
    next: 'Next',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    timeout: 'Time’s up.',
    results: ['You reached the planet!', 'The computer got there first. Again?'],
    again: 'Play again',
    practiceRule: 'No clock. Right and quick sends your rocket further.',
    challengeRule: 'Answer before time runs out. Out of time, your rocket stays put.',
    fullBoost: 'full boost',
    noBoost: 'No boost',
    staysPut: 'Your rocket stays put'
  },
  fr: {
    home: 'Course de fusées',
    practice: 'Entraînement',
    challenge: 'Défi',
    start: 'Commencer',
    next: 'Suivant',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    timeout: 'Temps écoulé.',
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?'],
    again: 'Rejouer',
    practiceRule: 'Pas de chrono. Juste et rapide, ta fusée va plus loin.',
    challengeRule: 'Réponds avant la fin du temps. Temps écoulé : ta fusée ne bouge pas.',
    fullBoost: 'turbo à fond',
    noBoost: 'Pas de turbo',
    staysPut: 'Ta fusée ne bouge pas'
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

/** Everything a clause reads, in one evaluation. */
const READ = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const verdict = texts.find((e) => words.verdicts.includes(e.innerText.trim()));
  const result = texts.find((e) => words.results.includes(e.innerText.trim()));
  // The prompt is the largest text that is not a verdict, a result or a glyph (the template has no prompt class).
  let promptEl = null;
  let size = 0;
  for (const e of texts) {
    if (e === verdict || e === result || e.closest('button') || e.closest('.rkt-clock') || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; promptEl = e; }
  }
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const byLabel = (label) => buttons.find((b) => b.innerText.trim() === label);
  const padBox = document.querySelector('.gk-pad input:not([disabled])');
  const options = buttons.filter((b) => !b.closest('.gk-pad') && ${NUMERIC}.test(b.innerText.trim()));
  const sprite = (id) => { const p = document.querySelector('[data-rocket="' + id + '"]'); const g = p && p.parentElement; const t = g ? g.getAttribute('transform') || '' : ''; const m = t.match(/translate\\(([-\\d.]+) ([-\\d.]+)\\)/); return m ? { x: Number(m[1]), y: Number(m[2]) } : null; };
  // The countdown bar: a 300×12 track whose only child is the fill (the probe RKT-006's drive uses).
  let clock = null;
  for (const d of document.querySelectorAll('div')) {
    const r = d.getBoundingClientRect();
    if (Math.round(r.width) === 300 && Math.round(r.height) === 12 && d.children.length === 1 && vis(d)) {
      clock = Math.round((d.children[0].getBoundingClientRect().width / 300) * 1000) / 1000;
      break;
    }
  }
  const clockClass = [...document.querySelectorAll('.rkt-clock')].filter(vis).length;
  const secsEl = [...document.querySelectorAll('.rkt-clock-secs, .rkt-clock-last')].find(vis);
  const lastEl = [...document.querySelectorAll('.rkt-clock-last')].find(vis);
  const boostEl = [...document.querySelectorAll('.rkt-boost')].find(vis);
  const meterTrack = [...document.querySelectorAll('.rkt-boost-meter')].find(vis);
  const meterFill = meterTrack && meterTrack.firstElementChild;
  const gain = [...document.querySelectorAll('[data-gain="a"]')];
  const V = (window.Noodl && window.Noodl.Variables) || {};
  return {
    prompt: promptEl ? promptEl.innerText.trim() : null,
    verdict: verdict ? verdict.innerText.trim() : null,
    result: result ? result.innerText.trim() : null,
    next: box(byLabel(words.next)),
    padBox: box(padBox),
    options: options.map((b) => ({ label: b.innerText.trim(), ...box(b) })),
    spriteA: sprite('a'),
    progressA: V.raceProgressA,
    clock,
    clockClass,
    secs: secsEl ? secsEl.innerText.trim() : null,
    last: lastEl ? { text: lastEl.innerText.trim(), animations: lastEl.getAnimations().map((a) => a.animationName) } : null,
    boost: boostEl ? boostEl.innerText.trim() : null,
    // track = the meter's content box (inside its border), which a 100% fill spans.
    meter: meterTrack ? { track: meterTrack.clientWidth, fill: meterFill ? Math.round(meterFill.getBoundingClientRect().width) : null } : null,
    gainLit: gain.length,
    practiceRule: texts.some((e) => e.innerText.trim() === words.practiceRule),
    challengeRule: texts.some((e) => e.innerText.trim() === words.challengeRule)
  };
})()`;

const near = (p, q) => !!p && !!q && Math.abs(p.x - q.x) <= 1 && Math.abs(p.y - q.y) <= 1;
const dist = (p, q) => (p && q ? Math.hypot(p.x - q.x, p.y - q.y) : null);
const cells = [];

async function driveCell(arm, lang, vp) {
  const w = W[lang];
  const cell = { arm, lang, vp: vpName(vp), reached: false, clauses: {}, saw: {}, notes: [] };
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
    const body = async () => (await page.evaluate('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 180);
    const until = async (test, ms, every = 250) => {
      const end = Date.now() + ms;
      for (;;) {
        const r = await read();
        if (test(r)) return r;
        if (Date.now() > end) return null;
        await wait(every);
      }
    };
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt007-${arm}-${lang}-${vpName(vp)}${REDUCED ? '-reduced' : ''}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const question = () => until((r) => r.result || (r.prompt && (r.padBox || r.options.length) && !r.verdict), 8000);
    /** Type or tap an answer to the question on screen. */
    const give = async (q, value) => {
      if (q.padBox) {
        await page.evaluate(`(() => { const i = document.querySelector('.gk-pad input:not([disabled])'); if (i) i.focus(); })()`);
        await wait(120);
        await send('Input.insertText', { text: value });
        await wait(150);
        await key('Enter', 'Enter', 13, '\r');
      } else {
        const hit = q.options.find((o) => o.label.replace(/[\s  ]/g, '') === value) || q.options[q.options.length - 1];
        await tapAt(hit.x, hit.y);
      }
    };
    /** The glide of the countdown bar gives its limit: two readings, the slope, 1 ÷ slope. */
    const barLimit = async () => {
      const r1 = await read();
      const t1 = Date.now();
      await wait(600);
      const r2 = await read();
      const t2 = Date.now();
      if (typeof r1.clock !== 'number' || typeof r2.clock !== 'number' || !(r1.clock > r2.clock)) return null;
      return (t2 - t1) / (r1.clock - r2.clock);
    };

    if (REDUCED) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
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
    await pressLabel(arm === 'defi' ? w.challenge : w.practice);
    await wait(500);
    const setup = await read();
    await shoot('setup');
    clause(
      'rule',
      arm === 'defi' ? setup.challengeRule && !setup.practiceRule : setup.practiceRule && !setup.challengeRule,
      JSON.stringify({ challengeRule: setup.challengeRule, practiceRule: setup.practiceRule })
    );
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
    await wait(1200);
    await page.evaluate('window.scrollTo(0, 0)');
    const first = await question();
    if (!first || first.result) return note(`no first question — ${await body()}`);
    cell.reached = true;

    if (arm === 'defi') clause('clock', typeof first.clock === 'number', `bar ${first.clock}`);
    else clause('noClock', first.clock === null && first.clockClass === 0, `bar ${first.clock}, .rkt-clock ${first.clockClass}`);

    // ── The three answers (and, in Défi, one left to time out) ──
    const want = arm === 'defi' ? ['fast', 'slow', 'wrong', 'timeout'] : ['fast', 'slow', 'wrong'];
    const got = {};
    for (let guard = 0; guard < 16 && want.some((k) => !got[k]); guard++) {
      await page.evaluate('window.scrollTo(0, 0)');
      const q = await question();
      if (!q) return note('no question arrived');
      if (q.result) {
        note(`the race ended ("${q.result}"); playing again`);
        await pressLabel(w.again);
        await wait(1200);
        continue;
      }
      const shownAt = Date.now();
      const solved = solve(q.prompt);
      const need = want.find((k) => !got[k] && (k === 'timeout' || solved !== null));
      const before = await read();
      let intent = need || 'filler';
      if (intent === 'fast') await give(q, solved);
      else if (intent === 'slow') {
        let hold = 12500;
        if (arm === 'defi') {
          const limit = await barLimit();
          if (!limit) {
            note(`"${q.prompt}": the bar's glide could not be read; not used for slow`);
            intent = 'filler';
          } else {
            // 1.2, not 1.6: the drive's own latency adds about 2 s (a fast answer reads 2.2 s), so 1.6 landed every slow answer on the 50 % floor.
            hold = Math.round((limit / 3) * 1.2);
            note(`slow: "${q.prompt}", the bar's glide gives a ${Math.round(limit)} ms limit, so held ${hold} ms`);
          }
        }
        if (intent === 'slow') {
          await wait(Math.max(0, hold - (Date.now() - shownAt)));
          await give(q, solved);
        }
      }
      if (intent === 'wrong') await give(q, solved === '1' ? '2' : '1');
      if (intent === 'timeout') {
        // The numeral: find a tick, read N just after it, and N − 2 two seconds later.
        const limit = await barLimit();
        const tick = await (async () => {
          const s0 = (await read()).secs;
          const end = Date.now() + 2500;
          while (Date.now() < end) {
            const r = await read();
            if (r.secs !== s0) return { at: Date.now(), r };
            await wait(40);
          }
          return null;
        })();
        if (!tick) clause('numeral', false, `no numeral ticked in 2.5 s (secs ${(await read()).secs})`);
        else {
          await wait(150);
          const a = await read();
          const t0 = Date.now();
          await wait(Math.max(0, 2000 - (Date.now() - t0)));
          const b = await read();
          const n0 = Number(a.secs);
          const n1 = Number(b.secs);
          clause('numeral', Number.isFinite(n0) && n1 === n0 - 2, `read ${a.secs} just after a tick, then ${b.secs} 2 s later (want ${n0 - 2})`);
          const implied = limit && typeof a.clock === 'number' ? (a.clock * limit) / 1000 : null;
          clause('sameClock', implied !== null && implied > n0 - 1 - 0.4 && implied <= n0 + 0.4, `numeral ${a.secs}; bar ${a.clock} × glide limit ${limit && Math.round(limit)} ms = ${implied && implied.toFixed(2)} s`);
        }
        const lastRead = await until((r) => r.last || r.verdict, 40000, 150);
        if (lastRead && lastRead.last) {
          const animated = lastRead.last.animations.includes('rkt-pulse');
          clause('pulse', Number(lastRead.last.text) <= 3 && (REDUCED ? !animated : animated), JSON.stringify(lastRead.last));
          await shoot('last-seconds');
        } else clause('pulse', false, `no .rkt-clock-last before the verdict (${lastRead && lastRead.verdict})`);
      }
      if (intent === 'filler') await give(q, solved || '1');
      const v = await until((r) => r.verdict || r.result, intent === 'timeout' ? 70000 : 5000);
      await wait(1000); // the rocket's 700 ms glide
      const after = await read();
      if (!v || !v.verdict) {
        note(`${intent}: no verdict after "${q.prompt}"`);
      } else if (intent !== 'filler') {
        got[intent] = {
          prompt: q.prompt,
          verdict: v.verdict,
          boost: after.boost,
          meter: after.meter,
          gainLit: after.gainLit,
          dA: typeof after.progressA === 'number' && typeof before.progressA === 'number' ? Math.round((after.progressA - before.progressA) * 10000) / 10000 : null,
          sprite: dist(after.spriteA, before.spriteA),
          spriteStill: near(after.spriteA, before.spriteA)
        };
        if (intent === 'timeout' || intent === 'slow') await shoot(`verdict-${intent}`);
      }
      if (after.next) await tapAt(after.next.x, after.next.y);
      await wait(900);
    }
    note(`rounds: ${JSON.stringify(got)}`);

    const { fast, slow, wrong, timeout } = got;
    if (fast && slow && wrong) {
      const pct = slow.boost && slow.boost.match(/(\d+)[\s  ]?%/);
      clause(
        'lines',
        fast.boost && fast.boost.includes(w.fullBoost) && pct && Number(pct[1]) >= 50 && Number(pct[1]) < 100 && wrong.boost === w.noBoost && new Set([fast.boost, slow.boost, wrong.boost]).size === 3,
        JSON.stringify({ fast: fast.boost, slow: slow.boost, wrong: wrong.boost, verdicts: [fast.verdict, slow.verdict, wrong.verdict] })
      );
      clause('boostIsGain', pct && typeof slow.dA === 'number' && Math.abs((slow.dA / STEP) * 100 - Number(pct[1])) <= 1.5, `slow line "${slow.boost}", rocket A moved ${slow.dA} = ${slow.dA !== null ? ((slow.dA / STEP) * 100).toFixed(1) : '?'}% of a step`);
      clause(
        'meter',
        fast.meter && fast.meter.fill === fast.meter.track && pct && slow.meter && Math.abs(slow.meter.fill - (slow.meter.track * Number(pct[1])) / 100) <= 2 && !wrong.meter,
        JSON.stringify({ fast: fast.meter, slow: slow.meter, wrong: wrong.meter, pct: pct && pct[1] })
      );
      clause(
        'moves',
        fast.dA > slow.dA && slow.dA > 0 && wrong.dA === 0 && fast.sprite > slow.sprite && slow.sprite > 1 && wrong.spriteStill,
        JSON.stringify({ dA: [fast.dA, slow.dA, wrong.dA], sprite: [fast.sprite, slow.sprite, wrong.sprite].map((d) => d && Math.round(d * 10) / 10) })
      );
      clause('segment', fast.gainLit > 0 && slow.gainLit > 0, `lit after fast ${fast.gainLit}, after slow ${slow.gainLit}`);
    } else note(`🔴 the drive did not collect all three answers: ${Object.keys(got).join(', ')}`);
    if (arm === 'defi') {
      if (timeout) clause('timeout', timeout.verdict === w.timeout && timeout.boost === w.staysPut && timeout.dA === 0 && timeout.spriteStill, JSON.stringify(timeout));
      else clause('timeout', false, 'no question was left to time out');
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
