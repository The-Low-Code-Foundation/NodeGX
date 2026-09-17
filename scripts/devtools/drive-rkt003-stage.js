#!/usr/bin/env node
/**
 * P87 RKT-003 — is one question, its answer, the verdict and the way on all on ONE screen?
 *
 * Finding 4: "the answer / next question block comes up below the fold, so you're scrolling down
 * and up every question. Second, the rocket pathway becomes very small and hard to see when width
 * is reduced."
 *
 * One fresh Chrome per language × viewport: the viewport is the child's device for the WHOLE race,
 * so the auto-focus, the keyboard and the stage are the ones that device gets. A Défi race is
 * played round by round from a plan (default: right, wrong, timeout, right, wrong).
 *
 * Every round starts at the top of the page (the child has scrolled back up), and the drive then
 * plays as the child does: it never scrolls on its own. When something it must press is off
 * screen, it scrolls to press it and that round FAILS `noScroll` — the scroll is the complaint.
 *
 * Clauses, per graded round:
 *   ask      — before answering: the prompt and the answer surface (box or first option) end at or
 *              above the REQUESTED height (not innerHeight: mobile emulation stretches it)
 *   noScroll — nothing needed scrolling to answer, and window.scrollY === 0 once the verdict is up
 *   fold     — the verdict title, the prompt and Next all end at or above the requested height
 *   reach    — elementFromPoint at Next's centre is Next (rendered is not reachable)
 *   foldWorst— on a wrong or timed-out verdict, the prompt and the correction are swapped for the LONGEST real
 *              pair the curriculum can show (CM2 `big-999999999`: the spelled-out 777 777 777 and its 131-character
 *              strategy), and the prompt and Next must still end at or above the requested height. A random race
 *              rarely draws that question; a layout that passes only on short strings is not one screen. The swap
 *              writes text-node values (React keeps its own nodes) and puts them back before anything else runs.
 *   --keys arm, no pointer event during a round:
 *   focusIn  — a typed question arrives with the answer box focused
 *   focusNext— the verdict arrives with Next focused, so Enter plays on
 *   ringNext — Next, focused that way, draws a visible focus ring (outline, :focus-visible)   (P88 s23)
 *   ringTab  — an option reached by Tab draws a visible focus ring before Enter picks it       (P88 s23)
 * Per cell (AC3), read at the first verdict:
 *   390×844  — a rocket's rendered box is ≥ 28px on its long side; the track is ≥ 180px tall
 *   1366×768 — the track takes ≤ 40% of the viewport height
 *
 * --reward arm (RKT-002 AC4): every round is answered right until a rocket lands, then the race's end is graded.
 *   burst      — on a right verdict, the kit has drawn a NEW burst (its data-burst count rose) and it carries gk-spark
 *   landing    — at the end, a landing is drawn at the planet and carries gk-ring
 *   resultMoves— the result card carries rkt-pop and its glyph rkt-cheer
 *   resultFold — the result headline, Play again, Change the race AND the track all end on screen; scrollY 0
 *   resultReach/resultFocus — Play again is what is under its centre, and it has the focus (Enter plays on)
 *   againPlays — Play again brings a question back without going through setup
 * --reduced-motion (with --reward): prefers-reduced-motion is emulated, and the arm fails unless the page reports it.
 *   burstStill — the burst was drawn (its count rose, the known-firing signal) but is not shown and carries no animation
 *   landingStill / resultStill — shown, with no animation; stillAll — no gk-/rkt- animation anywhere in the document
 * An animation is read with getAnimations(), which keeps a finished one that fills, so a short pop is not missed by a slow poll.
 *
 * Usage:
 *   node scripts/devtools/drive-rkt003-stage.js <deploy-dir> [--shots <dir>] [--only 1366x768]
 *        [--lang fr|en] [--keys] [--plan right,wrong,timeout,right,wrong] [--reward] [--reduced-motion]
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
// A URL drives the LIVE host; `--path` is for a build made with `--base-url /templates/<slug>/` (TPL-006 §9e, TPL-007 §15).
const LIVE = /^https?:\/\//.test(DIR || '');
const BASE = arg('--path') ? arg('--path').replace(/\/?$/, '/') : '/';
const ONLY = arg('--only');
const KEYS = argv.includes('--keys');
const LANGS = arg('--lang') ? [arg('--lang')] : ['fr', 'en'];
const REWARD = argv.includes('--reward');
const REDUCED = argv.includes('--reduced-motion');
const PLAN = (arg('--plan') || (REWARD ? Array(20).fill('right').join(',') : 'right,wrong,timeout,right,wrong')).split(',');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt003-stage.js <deploy-dir> [--shots <dir>] [--only 1366x768] [--lang fr|en] [--keys] [--plan …]');
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
const VPS = ONLY ? ALL_VPS.filter((v) => ONLY.split(',').includes(vpName(v))) : ALL_VPS;
if (!VPS.length) {
  console.error(`--only ${ONLY} matches none of ${ALL_VPS.map(vpName).join(', ')}`);
  process.exit(2);
}

const W = {
  en: {
    home: 'Rocket Race',
    challenge: 'Challenge',
    start: 'Start',
    check: 'Check',
    next: 'Next',
    showMe: 'Show me how',
    again: 'Play again',
    otherRace: 'Change the race',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    timeout: 'Time’s up.',
    results: ['You reached the planet!', 'The computer got there first. Again?']
  },
  fr: {
    home: 'Course de fusées',
    challenge: 'Défi',
    start: 'Commencer',
    check: 'Vérifier',
    next: 'Suivant',
    showMe: 'Montre-moi comment',
    again: 'Rejouer',
    otherRace: 'Changer de course',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    timeout: 'Temps écoulé.',
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?']
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NUMERIC = /^[\d\s  .,/−-]+$/;

/**
 * The longest prompt and correction one real question produces: the prompt spelled by the template's own `spell()`,
 * the correction as `Logic/Grade answer` writes it: since RKT-005, the child's own answer first (cut at twelve characters),
 * then the answer grouped the way the prompt groups it, then the skill's strategy.
 */
const WORST = {
  fr: {
    prompt: 'Écris en chiffres : sept cent soixante-dix-sept millions sept cent soixante-dix-sept mille sept cent soixante-dix-sept',
    message: 'Tu as répondu 77777777777…. La réponse était 777 777 777. Trois classes : MILLIONS | MILLE | unités. « Deux cent trente millions », c’est 230 | 000 | 000 — les classes vides sont des zéros.'
  },
  en: {
    prompt: 'Write in digits: seven hundred and seventy-seven million seven hundred and seventy-seven thousand seven hundred and seventy-seven',
    message: 'You answered 77777777777…. The answer was 777,777,777. Three blocks: MILLIONS | THOUSANDS | ones. "Two hundred and thirty million" is 230 | 000 | 000 — the empty blocks are all zeros.'
  }
};

function solve(prompt) {
  if (!prompt) return null;
  const n = (s) => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));
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
 * Everything a round needs, read without scrolling. `promptText` pins the prompt found before the
 * answer, so a verdict with a bigger title cannot be mistaken for it afterwards.
 */
const READ = (H, words, promptText) => `(() => {
  const H = ${H};
  const words = ${JSON.stringify(words)};
  const pinned = ${JSON.stringify(promptText || null)};
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const title = texts.find((e) => words.verdicts.includes(e.innerText.trim()));
  const result = texts.find((e) => words.results.includes(e.innerText.trim()));
  let prompt = pinned ? texts.find((e) => e.innerText.trim() === pinned) : document.querySelector('.rkt-prompt');
  if (!vis(prompt)) {
    prompt = null;
    let size = 0;
    for (const e of texts) {
      if (e === title || e === result || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f > size) { size = f; prompt = e; }
    }
  }
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const input = [...document.querySelectorAll('input')].find((i) => vis(i) && !i.disabled && i.offsetParent !== null);
  // RKT-005: the answer pad's keys are numeric buttons too, and they are not options.
  const options = buttons.filter((b) => !b.closest('.gk-pad') && ${NUMERIC}.test(b.innerText.trim()));
  const next = buttons.find((b) => b.innerText.trim() === words.next);
  const check = buttons.find((b) => b.innerText.trim() === words.check);
  let reach = null;
  if (next) {
    const b = box(next);
    const inside = b.x >= 0 && b.y >= 0 && b.x < innerWidth && b.y < innerHeight;
    const top = inside ? document.elementFromPoint(b.x, b.y) : null;
    reach = !!top && (top === next || next.contains(top));
  }
  const svg = document.querySelector('svg[aria-label="race track"]');
  const rockets = [...document.querySelectorAll('[data-rocket], svg[aria-label="race track"] path[d^="M -30 0 L -18 -12"]')].filter(vis).map((e) => { const r = e.getBoundingClientRect(); return Math.round(Math.max(r.width, r.height)); });
  const active = document.activeElement;
  return {
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight,
    prompt: prompt ? { text: prompt.innerText.trim(), ...box(prompt) } : null,
    title: title ? { text: title.innerText.trim(), ...box(title) } : null,
    result: result ? result.innerText.trim() : null,
    input: box(input),
    inputFocused: !!input && active === input,
    // P87 s10: what held the focus when a round was read, so a red focusNext names it.
    activeWas: active ? active.tagName + ' ' + (active.innerText || active.getAttribute('aria-label') || '').trim().slice(0, 30) : null,
    options: options.map((b) => ({ label: b.innerText.trim(), ...box(b) })),
    next: box(next),
    nextFocused: !!next && (active === next || next.contains(active)),
    // P88 s23: the focus ring a keyboard person sees on whatever holds the focus (ACC-001's defect: \`outline: none\`).
    ring: active && active !== document.body ? (() => { const cs = getComputedStyle(active); return { tag: active.tagName, visible: active.matches(':focus-visible'), style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0, color: cs.outlineColor, offset: cs.outlineOffset }; })() : null,
    check: box(check),
    reach,
    track: box(svg),
    rockets
  };
})()`;

/** Swap in the worst prompt and correction, measure, and put the page's own text back. */
const STRESS = (words, promptText, worst) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const prompt = texts.find((e) => e.innerText.trim() === ${JSON.stringify(promptText)});
  const message = texts.find((e) => /^(La réponse était|The answer was)/.test(e.innerText.trim()));
  const next = [...document.querySelectorAll('button')].find((b) => vis(b) && b.innerText.trim() === words.next);
  if (!prompt || !message || !next) return { skipped: 'prompt ' + !!prompt + ', correction ' + !!message + ', next ' + !!next };
  const swap = (el, value) => {
    const nodes = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) nodes.push(n);
    const saved = nodes.map((n) => n.nodeValue);
    nodes.forEach((n, i) => { n.nodeValue = i === 0 ? value : ''; });
    return () => nodes.forEach((n, i) => { n.nodeValue = saved[i]; });
  };
  const lines = (el) => Math.round(el.getBoundingClientRect().height / (parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2));
  const restorePrompt = swap(prompt, ${JSON.stringify(worst.prompt)});
  const restoreMessage = swap(message, ${JSON.stringify(worst.message)});
  // 🔴 The swap bypasses the graph, so the prompt would keep the size its SHORT original chose. Give it the size the graph
  // gives a prompt this long — this mirrors Game/Question box#qbLength (≤ 24 → 4xl, ≤ 60 → 3xl, else xl).
  const worstLength = ${JSON.stringify(worst.prompt)}.length;
  const savedFont = prompt.style.fontSize;
  prompt.style.fontSize = 'var(' + (worstLength <= 24 ? '--text-4xl' : worstLength <= 60 ? '--text-3xl' : '--text-xl') + ')';
  const teach = [...document.querySelectorAll('button')].find((b) => vis(b) && b.innerText.trim() === words.showMe);
  const out = {
    promptBottom: Math.round(prompt.getBoundingClientRect().bottom),
    nextBottom: Math.round(next.getBoundingClientRect().bottom),
    promptLines: lines(prompt),
    messageLines: lines(message),
    scrollHeight: document.documentElement.scrollHeight,
    promptFont: getComputedStyle(prompt).fontSize,
    buttonsOneRow: teach ? Math.abs(teach.getBoundingClientRect().top - next.getBoundingClientRect().top) < 4 : null,
    questionCard: Math.round(prompt.parentElement.getBoundingClientRect().height),
    bannerCard: Math.round(message.parentElement.getBoundingClientRect().height)
  };
  prompt.style.fontSize = savedFont;
  restoreMessage();
  restorePrompt();
  out.restored = prompt.innerText.trim() === ${JSON.stringify(promptText)};
  return out;
})()`;

/** RKT-002 AC4 — is a reward moment drawn, is it shown, and which CSS animations does it carry (running, or finished and filling)? */
const MOTION = (selector) => `(() => {
  const els = [...document.querySelectorAll(${JSON.stringify(selector)})];
  const shown = els.filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none');
  const names = els.flatMap((e) => e.getAnimations({ subtree: true })).map((a) => a.animationName).filter(Boolean);
  const last = els[els.length - 1];
  return { present: els.length, shown: shown.length, animations: [...new Set(names)], nonce: last ? Number(last.getAttribute('data-burst')) || null : null };
})()`;

/** RKT-002 AC4 — the result screen, read without scrolling. */
const RESULT = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const title = [...document.querySelectorAll('.ndl-visual-text')].find((e) => vis(e) && words.results.includes(e.innerText.trim()));
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const again = buttons.find((b) => b.innerText.trim() === words.again);
  const other = buttons.find((b) => b.innerText.trim() === words.otherRace);
  let reach = null;
  if (again) {
    const b = box(again);
    const top = b.x >= 0 && b.y >= 0 && b.x < innerWidth && b.y < innerHeight ? document.elementFromPoint(b.x, b.y) : null;
    reach = !!top && (top === again || again.contains(top));
  }
  const active = document.activeElement;
  return {
    scrollY: Math.round(window.scrollY),
    result: title ? title.innerText.trim() : null,
    title: box(title),
    again: box(again),
    other: box(other),
    track: box(document.querySelector('svg[aria-label="race track"]')),
    reach,
    againFocused: !!again && (active === again || again.contains(active)),
    active: active ? active.tagName + ' ' + (active.innerText || '').trim().slice(0, 30) : null
  };
})()`;

const cells = [];

async function driveCell(lang, vp) {
  const w = W[lang];
  const H = vp.height;
  const cell = { lang, vp: vpName(vp), keys: KEYS, reduced: REDUCED, rounds: [], notes: [], ac3: null, reached: false, end: null, reducedMatches: null };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);

  await withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
    if (BASE !== '/') await page.navigate(BASE);
    const send = (method, params) => page.client.send(method, params);
    const read = (promptText) => page.evaluate(READ(H, w, promptText));
    const tapAt = async (x, y) => {
      for (const type of ['mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 });
      }
    };
    /** Press the thing `pick` finds, as a person: scroll only if it is off screen, and say so. */
    const press = async (pick) => {
      let r = await read();
      let b = pick(r);
      if (!b) return { pressed: false, scrolled: false };
      let scrolled = false;
      if (b.top < 0 || b.bottom > H) {
        scrolled = true;
        await page.evaluate(`window.scrollBy(0, ${Math.round(b.y - H / 2)})`);
        await wait(250);
        r = await read();
        b = pick(r);
        if (!b) return { pressed: false, scrolled };
      }
      await tapAt(b.x, b.y);
      return { pressed: true, scrolled };
    };
    /** Setup screens are not graded: labels are pressed wherever they are. */
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
    // 🔴 A real Enter carries text "\r". Without it the answer box (which listens to keydown) still commits, but a focused
    // native button never activates — the keyboard arm's first run read "Next focused" and then never moved on.
    const enter = () => key('Enter', 'Enter', 13, '\r');
    const body = () => page.evaluate('document.body.innerText');
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
      fs.writeFileSync(path.join(SHOTS, `${lang}-${vpName(vp)}${KEYS ? '-keys' : ''}${REDUCED ? '-reduced' : ''}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const startChallenge = async () => {
      if (!(await pressLabel(w.challenge))) note(`no "${w.challenge}" choice on setup`);
      if (!(await pressLabel(w.start))) return false;
      await wait(1200);
      await page.evaluate('window.scrollTo(0, 0)');
      return true;
    };
    /** RKT-002 AC4 — the end of the race: the landing, the result screen, and Play again. */
    const gradeEnd = async () => {
      const end = { clauses: {}, saw: {} };
      const clause = (name, ok, saw) => {
        end.clauses[name] = ok;
        if (!ok) end.saw[name] = saw;
      };
      await wait(700);
      const s = await page.evaluate(RESULT(w));
      const landing = await page.evaluate(MOTION('[data-landing]'));
      const card = await page.evaluate(MOTION('.rkt-result'));
      const glyph = await page.evaluate(MOTION('.rkt-result-glyph'));
      const all = await page.evaluate(`document.getAnimations().map((a) => a.animationName).filter((n) => /^(gk|rkt)-/.test(n || ''))`);
      end.result = s.result;
      const bottoms = [s.title, s.again, s.other, s.track].map((b) => (b ? b.bottom : null));
      clause('resultFold', bottoms.every((b) => b !== null && b <= H) && s.scrollY === 0, JSON.stringify({ title: s.title, again: s.again, other: s.other, track: s.track, scrollY: s.scrollY, H }));
      clause('resultReach', s.reach === true, `elementFromPoint at ${w.again}'s centre: ${s.reach}`);
      clause('resultFocus', s.againFocused, `the focus is on ${s.active}`);
      if (REDUCED) {
        clause('landingStill', landing.shown > 0 && landing.animations.length === 0, JSON.stringify(landing));
        clause('resultStill', card.shown > 0 && card.animations.length === 0 && glyph.animations.length === 0, JSON.stringify({ card, glyph }));
        clause('stillAll', all.length === 0, `reward animations in the document: ${JSON.stringify(all)}`);
      } else {
        clause('landing', landing.shown > 0 && landing.animations.includes('gk-ring'), JSON.stringify(landing));
        clause('resultMoves', card.animations.includes('rkt-pop') && glyph.animations.includes('rkt-cheer'), JSON.stringify({ card, glyph }));
      }
      await shoot('result');
      if (KEYS && s.againFocused) await enter();
      else if (s.again) await tapAt(s.again.x, s.again.y);
      const back = await until((r) => r.prompt && (r.input || r.options.length) && !r.result && !r.title, 6000);
      clause('againPlays', !!back, `after ${w.again}: ${(await body()).replace(/\s+/g, ' ').slice(0, 160)}`);
      return end;
    };

    await page.setViewport(vp);
    if (REDUCED) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      // 🔴 An instrument is armed before it measures: the page must agree it is in reduced motion.
      cell.reducedMatches = await page.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
    }
    await wait(1200);

    // ── A player, Home, a Défi race ──
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
    if (!(await body()).includes(w.home)) {
      if (lang === 'fr') await pressLabel('FR');
      await wait(1000);
      if (!(await body()).includes(w.home)) return note(`Home never showed "${w.home}"`);
    }
    await pressLabel(w.home);
    await wait(1200);
    if (!(await startChallenge())) return note(`no "${w.start}" on setup`);
    cell.reached = true;

    const shotTaken = {};
    let guard = 0;
    let lastBurst = 0;
    for (let i = 0; i < PLAN.length && guard < PLAN.length * 3; guard++) {
      const intent = PLAN[i];
      await page.evaluate('window.scrollTo(0, 0)');
      const q = await until((r) => r.result || (r.prompt && (r.input || r.options.length) && !r.title), 6000);
      if (!q) {
        note(`round ${i + 1}: no question arrived — ${(await body()).replace(/\s+/g, ' ').slice(0, 160)}`);
        break;
      }
      if (q.result) {
        if (REWARD) {
          cell.end = await gradeEnd();
          break;
        }
        note(`round ${i + 1}: the race ended ("${q.result}"); ${w.again}`);
        await pressLabel(w.again);
        await wait(900);
        // RKT-002 AC4: Play again restarts the race from the result screen. Setup comes back only if it did not.
        if (!(await until((r) => r.prompt && (r.input || r.options.length) && !r.result, 3000)) && !(await startChallenge())) break;
        continue;
      }
      const round = { intent, prompt: q.prompt.text, kind: q.input ? 'typed' : 'options', clauses: {}, saw: {} };
      const clause = (name, ok, saw) => {
        round.clauses[name] = ok;
        if (!ok) round.saw[name] = saw;
      };
      const surface = q.input || q.options[0];
      clause('ask', q.prompt.bottom <= H && surface.bottom <= H, `prompt.bottom ${q.prompt.bottom}, ${round.kind}.bottom ${surface.bottom}, H ${H}`);
      if (KEYS && round.kind === 'typed') clause('focusIn', q.inputFocused, 'the answer box was not focused when the question arrived');

      // ── Answer ──
      const right = solve(q.prompt.text);
      let scrolled = false;
      if (intent !== 'timeout') {
        if (round.kind === 'typed') {
          const value = intent === 'right' ? right || '1' : right === '1' ? '2' : '1';
          if (!q.inputFocused) {
            if (KEYS) await page.evaluate(`document.querySelector('input:not([disabled])') && document.querySelector('input:not([disabled])').focus()`);
            else scrolled = (await press((r) => r.input)).scrolled || scrolled;
            await wait(120);
          }
          await send('Input.insertText', { text: value });
          await wait(250);
          await enter();
          if (!(await until((r) => r.title, 1500)) && !KEYS) {
            note(`round ${i + 1}: Enter did not commit "${value}"; pressed ${w.check}`);
            scrolled = (await press((r) => r.check)).scrolled || scrolled;
          }
        } else {
          const want = intent === 'right' ? right : null;
          const pickLabel = (opts) => {
            const hit = want && opts.find((o) => o.label.replace(/[\s  ]/g, '') === want);
            if (hit) return hit.label;
            const other = right && opts.find((o) => o.label.replace(/[\s  ]/g, '') !== right);
            return (intent === 'right' ? opts[0] : other || opts[opts.length - 1]).label;
          };
          const label = pickLabel(q.options);
          if (KEYS) {
            for (let t = 0; t < 14; t++) {
              await key('Tab', 'Tab', 9);
              await wait(60);
              if (await page.evaluate(`(document.activeElement && document.activeElement.innerText || '').trim() === ${JSON.stringify(label)}`)) break;
            }
            // P88 s23 (ruled): the option Tab reached draws a ring before Enter picks it.
            const tabbed = await read();
            clause('ringTab', !!tabbed.ring && tabbed.ring.visible && tabbed.ring.style !== 'none' && tabbed.ring.width >= 1, `focus ring on "${label}" after Tab: ${JSON.stringify(tabbed.ring)}`);
            if (!shotTaken.tabRing) { shotTaken.tabRing = true; await shoot('tab-ring'); }
            await enter();
          } else {
            scrolled = (await press((r) => r.options.find((o) => o.label === label))).scrolled || scrolled;
          }
        }
      }
      const limit = intent === 'timeout' ? 70000 : 3000;
      const v = await until((r) => r.title, limit);
      if (!v) {
        note(`round ${i + 1} (${intent}): no verdict within ${limit}ms after "${q.prompt.text}"`);
        cell.rounds.push({ ...round, graded: false });
        i++;
        continue;
      }
      round.outcome = v.title.text;
      round.graded = true;
      clause('noScroll', !scrolled && v.scrollY === 0, `scrolled to answer: ${scrolled}; scrollY ${v.scrollY}; next.bottom ${v.next ? v.next.bottom : null}; scrollHeight ${v.scrollHeight}; focus on Next ${v.nextFocused}`);
      const bottoms = { title: v.title.bottom, prompt: v.prompt ? v.prompt.bottom : null, next: v.next ? v.next.bottom : null };
      clause('fold', v.prompt && v.next && Object.values(bottoms).every((b) => b !== null && b <= H), `bottoms ${JSON.stringify(bottoms)}, H ${H}, scrollHeight ${v.scrollHeight}`);
      clause('reach', v.reach === true, `elementFromPoint at Next's centre is ${v.reach === null ? 'absent/off screen' : 'something else'}; next ${JSON.stringify(v.next)}`);
      if (KEYS) {
        // P87 s10: build 7 read this red in 2 of 4 runs (a timeout round each time), build 5 in 0 of 4. The clause still grades the
        // verdict's first reading; the note says what held the focus then, and whether Next had it 600 ms later (Next is focused one
        // frame after the card mounts, so a poll can land before it).
        const later = v.nextFocused ? v : await until((r) => r.nextFocused, 600);
        clause('focusNext', v.nextFocused, `Next was not focused when the verdict arrived (focus on: ${v.activeWas}); 600 ms later focused: ${!!(later && later.nextFocused)} (focus on: ${later ? later.activeWas : 'no reading'})`);
        // P88 s23 (ruled): a focus nobody can see is not a way on. Next, focused by the Focus wire, draws a ring.
        const lit = later && later.nextFocused ? later : v;
        clause('ringNext', !!lit.ring && lit.ring.visible && lit.ring.style !== 'none' && lit.ring.width >= 1, `focus ring on Next: ${JSON.stringify(lit.ring)}`);
      }
      if (REWARD && w.verdicts.slice(0, 2).includes(v.title.text)) {
        await wait(120);
        const burst = await page.evaluate(MOTION('[data-burst]'));
        const fresh = burst.nonce !== null && burst.nonce > lastBurst;
        if (REDUCED) clause('burstStill', fresh && burst.shown === 0 && burst.animations.length === 0, `${JSON.stringify(burst)}, previous burst ${lastBurst}`);
        else clause('burst', fresh && burst.shown > 0 && burst.animations.includes('gk-spark'), `${JSON.stringify(burst)}, previous burst ${lastBurst}`);
        if (burst.nonce !== null) lastBurst = burst.nonce;
        if (!shotTaken.burst) {
          shotTaken.burst = true;
          await shoot('burst');
        }
      }
      if (v.title.text === w.timeout || /^(Pas|Not)/.test(v.title.text)) {
        const worst = await page.evaluate(STRESS(w, v.prompt ? v.prompt.text : q.prompt.text, WORST[lang]));
        if (worst.skipped) note(`round ${i + 1}: worst-case swap skipped (${worst.skipped})`);
        else {
          if (!worst.restored) note(`round ${i + 1}: 🔴 the worst-case swap did not restore the prompt`);
          clause('foldWorst', worst.promptBottom <= H && worst.nextBottom <= H, `longest real prompt (${worst.promptLines} lines at ${worst.promptFont}) and correction (${worst.messageLines} lines): prompt.bottom ${worst.promptBottom}, next.bottom ${worst.nextBottom}, H ${H}; question card ${worst.questionCard}px, banner ${worst.bannerCard}px, buttons on one row ${worst.buttonsOneRow}`);
        }
      }
      if (!cell.ac3) cell.ac3 = { track: v.track, rockets: v.rockets, scrollHeight: v.scrollHeight };
      const kindShot = v.title.text === w.timeout ? 'timeout' : /Pas|Not/.test(v.title.text) ? 'wrong' : 'right';
      if (!shotTaken[kindShot]) {
        shotTaken[kindShot] = true;
        await shoot(`verdict-${kindShot}`);
      }
      cell.rounds.push(round);
      i++;

      // ── On to the next question ──
      if (KEYS) {
        if (!v.nextFocused) await page.evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === ${JSON.stringify(w.next)}); if (b) b.focus(); })()`);
        await enter();
      } else {
        await press((r) => r.next);
      }
      await wait(900);
    }
    if (page.consoleErrors.length) note(`console errors: ${JSON.stringify(page.consoleErrors.slice(0, 3))}`);
  });
}

(async () => {
  for (const lang of LANGS) {
    for (const vp of VPS) {
      try {
        await driveCell(lang, vp);
      } catch (e) {
        cells.push({ lang, vp: vpName(vp), rounds: [], notes: [`the drive threw — ${e.stack || e}`], reached: false });
      }
      const c = cells[cells.length - 1];
      const fails = c.rounds.flatMap((r) => Object.entries(r.clauses).filter(([, ok]) => !ok).map(([k]) => k));
      console.log(`${c.lang} ${c.vp.padEnd(9)} ${c.reached ? '' : 'NOT REACHED '}rounds ${c.rounds.filter((r) => r.graded).length}/${PLAN.length}  failed clauses: ${fails.length ? [...new Set(fails)].join(', ') : 'none'}`);
    }
  }

  let failed = 0;
  console.log('\n── per round ──');
  for (const c of cells) {
    for (const [n, r] of c.rounds.entries()) {
      const bad = Object.entries(r.clauses).filter(([, ok]) => !ok);
      failed += bad.length + (r.graded ? 0 : 1);
      console.log(`${c.lang} ${c.vp.padEnd(9)} #${n + 1} ${r.intent.padEnd(7)} ${String(r.kind).padEnd(7)} → ${String(r.outcome || 'NO VERDICT').padEnd(18)} ${bad.length ? 'FAIL ' + bad.map(([k]) => `${k} (${r.saw[k]})`).join('; ') : 'pass'}   "${r.prompt}"`);
    }
    if (!c.reached || (!REWARD && c.rounds.filter((r) => r.graded).length < PLAN.length)) failed++;
    if (REDUCED && c.reducedMatches !== true) {
      failed++;
      console.log(`${c.lang} ${c.vp.padEnd(9)} 🔴 reduced motion was NOT in effect (matchMedia ${c.reducedMatches}); nothing below grades it`);
    }
    if (REWARD) {
      if (!c.end) {
        failed++;
        console.log(`${c.lang} ${c.vp.padEnd(9)} END FAIL: no rocket landed within ${PLAN.length} rounds`);
      } else {
        const bad = Object.entries(c.end.clauses).filter(([, ok]) => !ok);
        failed += bad.length;
        console.log(`${c.lang} ${c.vp.padEnd(9)} END "${c.end.result}" ${bad.length ? 'FAIL ' + bad.map(([k]) => `${k} (${c.end.saw[k]})`).join('; ') : 'pass: ' + Object.keys(c.end.clauses).join(', ')}`);
      }
    }
    // AC3, per cell
    if (c.ac3) {
      const t = c.ac3.track;
      const longest = c.ac3.rockets.length ? Math.max(...c.ac3.rockets) : 0;
      if (c.vp === '390x844') {
        const ok = longest >= 28 && t && t.height >= 180;
        if (!ok) failed++;
        console.log(`${c.lang} ${c.vp.padEnd(9)} AC3 ${ok ? 'pass' : 'FAIL'}: rocket long side ${longest}px (≥ 28), track ${t ? t.height : '?'}px tall (≥ 180)`);
      } else if (c.vp === '1366x768') {
        const ok = t && t.height <= 0.4 * 768;
        if (!ok) failed++;
        console.log(`${c.lang} ${c.vp.padEnd(9)} AC3 ${ok ? 'pass' : 'FAIL'}: track ${t ? t.height : '?'}px tall (≤ ${0.4 * 768}); rockets ${longest}px`);
      } else {
        console.log(`${c.lang} ${c.vp.padEnd(9)} track ${t ? `${t.width}×${t.height}` : '?'}, rockets ${longest}px, page ${c.ac3.scrollHeight}px tall`);
      }
    }
    for (const s of c.notes) console.log(`NOTE  ${c.lang} ${c.vp}: ${s}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} failures`} across ${cells.length} cells${KEYS ? ' (keyboard arm)' : ''}${REWARD ? ' (reward arm)' : ''}${REDUCED ? ' (reduced motion)' : ''}`);
  process.exitCode = failed === 0 ? 0 : 1;
})();
