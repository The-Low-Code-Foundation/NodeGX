#!/usr/bin/env node
/**
 * P87 RKT-004 — does "Show me how" teach?
 *
 * Finding 2: "'montre moi comment' just shows another question, it doesn't explain anything."
 *
 * One fresh Chrome per language × viewport, a new player (CM1), a race (Défi unless --practice), played from a plan.
 * On every wrong or timed-out verdict the drive presses Show me and grades what it gets. The expected card comes from the
 * CHECKED-IN template (`templates/rocket-school/components/Data/*`), so deploy the build you generated.
 *
 * Clauses:
 *   offered  — a wrong or timed-out verdict offers Show me
 *   noShowMe — a right verdict does not (RKT-004 §3: the slow-but-right answer is RKT-007's to explain)
 *   card     — after Show me, the card on screen is the missed skill's card (its title, from Data/Teach cards)
 *   step     — the card shows the step for how many times in a row this skill has been missed: 1 → step 1, 2 → 2, 3+ → 3.
 *              The drive counts misses per skill the way Logic/Grade answer does (a right answer on that skill resets it).
 *   worked   — the card works through THIS question: the prompt's own numbers appear in it (only where the question has two)
 *   kept     — both rockets are where they were before Show me, and again after Got it (a re-grade would move the computer)
 *   cardFold — Got it ends on screen and is what is under its centre
 *   cardWorst— the card's title, step and question are swapped for the LONGEST real ones in this language (text-node values only, put back
 *              before anything else runs), and Got it must still end on screen. A random race rarely draws the longest card.
 *   still    — (--hold ms, Défi) with the card open that long, no verdict fires and the card is still there. Once per cell.
 *   gotIt    — Got it brings a question, with no verdict and no card on screen
 *   fading   — (--fade) the whole cell: steps 1, 2 and 3 were each shown at least once
 * Nothing prints a clause that did not run: the summary counts every clause that ran, per cell.
 *
 * Usage:
 *   node scripts/devtools/drive-rkt004-teach.js <deploy-dir> [--shots <dir>] [--only 1366x768] [--lang fr|en]
 *        [--plan wrong,right,wrong,wrong] [--practice] [--hold 40000] [--fade]
 * Exits 0 when every clause that ran passed and every cell reached its race.
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
const ONLY = arg('--only');
const LANGS = arg('--lang') ? [arg('--lang')] : ['fr', 'en'];
const PRACTICE = argv.includes('--practice');
const HOLD = Number(arg('--hold') || 0);
const FADE = argv.includes('--fade');
const PLAN = (arg('--plan') || (FADE ? Array(45).fill('wrong').join(',') : 'wrong,right,wrong,wrong')).split(',');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt004-teach.js <deploy-dir> [--shots <dir>] [--only 1366x768] [--lang fr|en] [--plan …] [--practice] [--hold ms] [--fade]');
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

const DATA = path.join(__dirname, '..', '..', 'templates', 'rocket-school', 'components', 'Data');
const staticJson = (name) =>
  JSON.parse(JSON.parse(fs.readFileSync(path.join(DATA, name, 'nodes.json'), 'utf8')).nodes.find((n) => n.type === 'Static Data').parameters.json);
const SKILLS = staticJson('Curriculum');
const CARDS = staticJson('Teach cards');

const W = {
  en: {
    home: 'Rocket Race',
    challenge: 'Challenge',
    practice: 'Practice',
    start: 'Start',
    next: 'Next',
    showMe: 'Show me how',
    gotIt: 'Got it',
    again: 'Play again',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    results: ['You reached the planet!', 'The computer got there first. Again?']
  },
  fr: {
    home: 'Course de fusées',
    challenge: 'Défi',
    practice: 'Entraînement',
    start: 'Commencer',
    next: 'Suivant',
    showMe: 'Montre-moi comment',
    gotIt: 'Compris',
    again: 'Rejouer',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?']
  }
};
const BAD = /^(Pas tout|Not quite|Temps|Time)/;
/** The longest real prompt per language — the same strings as drive-rkt003-stage.js's WORST (CM2 big-999999999, spelled out). */
const WORST_PROMPT = {
  fr: 'Écris en chiffres : sept cent soixante-dix-sept millions sept cent soixante-dix-sept mille sept cent soixante-dix-sept',
  en: 'Write in digits: seven hundred and seventy-seven million seven hundred and seventy-seven thousand seven hundred and seventy-seven'
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NUMERIC = /^[\d\s  .,/−-]+$/;

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

/** The screen, read without scrolling. Known strings are passed in so a card title is never mistaken for the prompt. */
const READ = (words, known) => `(() => {
  const words = ${JSON.stringify(words)};
  const known = ${JSON.stringify(known)};
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const t = (e) => e.innerText.trim();
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && t(e));
  const title = texts.find((e) => words.verdicts.includes(t(e)));
  const result = texts.find((e) => words.results.includes(t(e)));
  // 🔴 The eyebrow is uppercased by CSS, and innerText returns what is DRAWN. The skill's name is matched on textContent.
  const skill = texts.find((e) => known.skills.includes(e.textContent.trim()));
  const cardTitle = texts.find((e) => known.titles.includes(t(e)));
  let step = null;
  for (const e of texts) { const i = known.steps.indexOf(t(e)); if (i !== -1) step = { card: known.stepCards[i], step: known.stepIndex[i] }; }
  const skip = new Set([title, result, skill, cardTitle]);
  let prompt = document.querySelector('.rkt-prompt');
  if (!vis(prompt)) {
    prompt = null;
    let size = 0;
    for (const e of texts) {
      // 🔴 A spelled-out question ("Écris en chiffres : quatre mille quatre cents") has no digit and no '?': build 3's fade arm read it as no question.
      if (skip.has(e) || known.steps.includes(t(e)) || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
      const f = parseFloat(getComputedStyle(e).fontSize);
      if (f > size) { size = f; prompt = e; }
    }
  }
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const button = (label) => buttons.find((b) => t(b) === label);
  const reach = (b) => { const r = box(b); if (!r || r.x < 0 || r.y < 0 || r.x >= innerWidth || r.y >= innerHeight) return false; const top = document.elementFromPoint(r.x, r.y); return !!top && (top === b || b.contains(top)); };
  const input = [...document.querySelectorAll('input')].find((i) => vis(i) && !i.disabled);
  const rockets = {};
  for (const r of document.querySelectorAll('[data-rocket]')) { const b = r.getBoundingClientRect(); rockets[r.getAttribute('data-rocket')] = [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]; }
  const gotIt = button(words.gotIt);
  const cardEl = cardTitle ? cardTitle.closest('.ndl-visual-group') : null;
  return {
    scrollY: Math.round(scrollY),
    title: title ? t(title) : null,
    result: result ? t(result) : null,
    skill: skill ? skill.textContent.trim() : null,
    cardTitle: cardTitle ? t(cardTitle) : null,
    cardText: cardTitle && cardTitle.parentElement ? cardTitle.parentElement.innerText.replace(/\\s+/g, ' ').trim() : null,
    step,
    prompt: prompt ? t(prompt) : null,
    input: box(input),
    // RKT-005: the answer pad's keys are numeric buttons too, and they are not options.
    options: buttons.filter((b) => !b.closest('.gk-pad') && ${NUMERIC}.test(t(b))).map((b) => ({ label: t(b), ...box(b) })),
    showMe: box(button(words.showMe)),
    next: box(button(words.next)),
    again: box(button(words.again)),
    gotIt: box(gotIt),
    gotItReach: gotIt ? reach(gotIt) : null,
    rockets,
    body: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400)
  };
})()`;

/** Swap in the longest real title and step, measure Got it, and put the page's own text back. */
const CARD_STRESS = (words, current, worst) => `(() => {
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && e.innerText.trim());
  const title = texts.find((e) => e.innerText.trim() === ${JSON.stringify(current.title)});
  const step = texts.find((e) => e.innerText.trim() === ${JSON.stringify(current.step)});
  const prompt = texts.find((e) => e.innerText.trim() === ${JSON.stringify(current.prompt)});
  const gotIt = [...document.querySelectorAll('button')].find((b) => vis(b) && b.innerText.trim() === ${JSON.stringify(words.gotIt)});
  if (!title || !step || !prompt || !gotIt) return { skipped: 'title ' + !!title + ', step ' + !!step + ', prompt ' + !!prompt + ', gotIt ' + !!gotIt };
  const swap = (el, value) => {
    const nodes = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) nodes.push(n);
    const saved = nodes.map((n) => n.nodeValue);
    nodes.forEach((n, i) => { n.nodeValue = i === 0 ? value : ''; });
    return () => nodes.forEach((n, i) => { n.nodeValue = saved[i]; });
  };
  const restoreTitle = swap(title, ${JSON.stringify(worst.title)});
  const restoreStep = swap(step, ${JSON.stringify(worst.step)});
  const restorePrompt = swap(prompt, ${JSON.stringify(worst.prompt)});
  // 🔴 The swap bypasses the graph, so the question would keep the size its SHORT original chose. This mirrors Game/Teach card#tcLength.
  const promptLength = ${JSON.stringify(worst.prompt)}.length;
  const savedFont = prompt.style.fontSize;
  prompt.style.fontSize = 'var(' + (promptLength <= 24 ? '--text-xl' : '--text-base') + ')';
  const out = { gotItBottom: Math.round(gotIt.getBoundingClientRect().bottom), stepLines: Math.round(step.getBoundingClientRect().height / (parseFloat(getComputedStyle(step).lineHeight) || 24)) };
  prompt.style.fontSize = savedFont;
  restorePrompt();
  restoreStep();
  restoreTitle();
  out.restored = step.innerText.trim() === ${JSON.stringify(current.step)};
  return out;
})()`;

const cells = [];

async function driveCell(lang, vp) {
  const w = W[lang];
  const H = vp.height;
  const skillByName = new Map(SKILLS.map((s) => [s.name[lang], s]));
  const cardById = new Map(CARDS.map((c) => [c.id, c]));
  const known = { skills: [...skillByName.keys()], titles: CARDS.map((c) => c.title[lang]), steps: [], stepCards: [], stepIndex: [] };
  for (const c of CARDS) c.steps.forEach((s, i) => { known.steps.push(s[lang]); known.stepCards.push(c.id); known.stepIndex.push(i); });

  const cell = { lang, vp: vpName(vp), rounds: [], notes: [], reached: false, stepsSeen: new Set(), ran: {} };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);
  const misses = {};
  let held = false;

  await withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
    const send = (method, params) => page.client.send(method, params);
    const read = () => page.evaluate(READ(w, known));
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
    const enter = async () => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
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
      fs.writeFileSync(path.join(SHOTS, `rkt004-${lang}-${vpName(vp)}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const pressBox = async (b) => {
      if (b.top < 0 || b.bottom > H) {
        await page.evaluate(`window.scrollBy(0, ${Math.round(b.y - H / 2)})`);
        await wait(250);
        return false;
      }
      await tapAt(b.x, b.y);
      return true;
    };
    const sameRockets = (a, b) => Object.keys(a).length > 0 && Object.keys(a).every((k) => b[k] && Math.abs(a[k][0] - b[k][0]) <= 2 && Math.abs(a[k][1] - b[k][1]) <= 2);

    await page.setViewport(vp);
    await wait(1200);

    // ── A player, Home, a race ──
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
    const body = () => page.evaluate('document.body.innerText');
    if (!(await body()).includes(w.home)) {
      if (lang === 'fr') await pressLabel('FR');
      await wait(1000);
      if (!(await body()).includes(w.home)) return note(`Home never showed "${w.home}"`);
    }
    await pressLabel(w.home);
    await wait(1200);
    if (!(await pressLabel(PRACTICE ? w.practice : w.challenge))) note(`no "${PRACTICE ? w.practice : w.challenge}" choice on setup`);
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
    await wait(1200);
    cell.reached = true;

    let guard = 0;
    for (let i = 0; i < PLAN.length && guard < PLAN.length * 3; guard++) {
      await page.evaluate('window.scrollTo(0, 0)');
      const q = await until((r) => r.result || (r.prompt && (r.input || r.options.length) && !r.title && !r.cardTitle), 8000);
      if (!q) {
        note(`round ${i + 1}: no question arrived — ${(await read()).body.slice(0, 200)}`);
        break;
      }
      if (q.result) {
        note(`round ${i + 1}: the race ended ("${q.result}"); ${w.again}`);
        if (q.again) await tapAt(q.again.x, q.again.y);
        await wait(1200);
        continue;
      }
      const intent = PLAN[i];
      const round = { intent, skill: q.skill, prompt: q.prompt, clauses: {}, saw: {} };
      const clause = (name, ok, saw) => {
        round.clauses[name] = ok;
        cell.ran[name] = (cell.ran[name] || 0) + 1;
        if (!ok) round.saw[name] = saw;
      };

      // ── Answer ──
      const right = solve(q.prompt);
      if (intent !== 'timeout') {
        if (q.input) {
          const value = intent === 'right' ? right || '1' : right === '1' ? '2' : '1';
          await pressBox(q.input);
          await wait(120);
          await send('Input.insertText', { text: value });
          await wait(200);
          await enter();
        } else {
          const plain = (s) => s.replace(/[\s  ]/g, '');
          const hit = intent === 'right' ? q.options.find((o) => right && plain(o.label) === right) || q.options[0] : q.options.find((o) => !right || plain(o.label) !== right) || q.options[q.options.length - 1];
          await pressBox(hit);
        }
      }
      const v = await until((r) => r.title, intent === 'timeout' ? 70000 : 4000);
      if (!v) {
        note(`round ${i + 1} (${intent}): no verdict after "${q.prompt}"`);
        cell.rounds.push(round);
        i++;
        continue;
      }
      await wait(900); // the rockets glide for 700ms
      const before = await read();
      round.outcome = before.title;
      const skill = skillByName.get(q.skill);

      // 🔴 The verdict showed, then a rocket landed during the glide and the result screen took its place, so `before.title` is null.
      // This used to fall into the RIGHT branch below (an empty title is not BAD) and reset the skill's misses to 0, while the product
      // had graded a miss. The next Show me on that skill then failed `step` one step short (P87 session 9, RKT-010 build 1:
      // bond-20 and big-999999, FADE_EXIT=1). A landed round is graded by its intent and offers no Show me.
      if (!before.title && before.result) {
        if (skill) misses[skill.id] = intent === 'right' ? 0 : (misses[skill.id] || 0) + 1;
        note(`round ${i + 1} (${intent}): a rocket landed during the glide ("${before.result}"); ${skill ? `misses on ${skill.id}: ${misses[skill.id]}` : 'skill unknown'}`);
        round.outcome = `landed (${intent})`;
        cell.rounds.push(round);
        i++;
        continue;
      }

      if (!BAD.test(before.title || '')) {
        if (skill) misses[skill.id] = 0;
        clause('noShowMe', !before.showMe, `a right verdict ("${before.title}") offers Show me`);
        cell.rounds.push(round);
        i++;
        if (before.next) await tapAt(before.next.x, before.next.y);
        await wait(900);
        continue;
      }

      if (skill) misses[skill.id] = (misses[skill.id] || 0) + 1;
      clause('offered', !!before.showMe, `no "${w.showMe}" on "${before.title}"`);
      await shoot(`r${i + 1}-verdict`);
      if (!before.showMe) {
        cell.rounds.push(round);
        i++;
        if (before.next) await tapAt(before.next.x, before.next.y);
        await wait(900);
        continue;
      }

      await tapAt(before.showMe.x, before.showMe.y);
      await wait(1200);
      const after = await read();
      await shoot(`r${i + 1}-after-show-me`);
      round.after = { title: after.title, cardTitle: after.cardTitle, step: after.step, prompt: after.prompt, input: !!after.input, options: after.options.length, body: after.body.slice(0, 240) };
      const card = skill ? cardById.get(skill.teach) : null;
      if (!skill) note(`round ${i + 1}: the skill's name was not on screen before answering, so the expected card is unknown`);
      clause('card', !!card && after.cardTitle === card.title[lang], `expected "${card ? card.title[lang] : '?'}" for "${q.skill}", saw card ${JSON.stringify(after.cardTitle)}; screen: ${after.body.slice(0, 200)}`);
      clause('kept', sameRockets(before.rockets, after.rockets), `rockets before ${JSON.stringify(before.rockets)}, after Show me ${JSON.stringify(after.rockets)}`);
      if (!after.cardTitle) {
        note(`round ${i + 1}: no card after ${w.showMe} — stopping this cell. After the tap: verdict ${JSON.stringify(after.title)}, prompt ${JSON.stringify(after.prompt)} (before: ${JSON.stringify(before.prompt)}), answer box ${!!after.input}, options ${after.options.length}`);
        cell.rounds.push(round);
        break;
      }
      const expectedStep = Math.min(2, (misses[skill.id] || 1) - 1);
      clause('step', !!after.step && after.step.card === skill.teach && after.step.step === expectedStep, `miss ${misses[skill.id]} of ${skill.id}: expected step ${expectedStep + 1}, saw ${JSON.stringify(after.step)}`);
      if (after.step) cell.stepsSeen.add(after.step.step);
      const nums = (q.prompt.match(/\d+/g) || []).filter((d) => d.length > 0);
      if (nums.length >= 2 && /^[\d\s  +−×÷=?-]+$/.test(q.prompt)) {
        clause('worked', nums.every((d) => (after.cardText || '').replace(/[\s  ]/g, ' ').includes(d)), `prompt "${q.prompt}"; card text: ${after.cardText}`);
      }
      clause('cardFold', !!after.gotIt && after.gotIt.bottom <= H && after.gotItReach === true, `Got it ${JSON.stringify(after.gotIt)}, reach ${after.gotItReach}, H ${H}`);
      if (after.step) {
        const card0 = cardById.get(after.step.card);
        const longest = (list) => list.reduce((a, b) => (b.length > a.length ? b : a), '');
        const worst = { title: longest(CARDS.map((c) => c.title[lang])), step: longest(CARDS.flatMap((c) => c.steps.map((st) => st[lang]))), prompt: WORST_PROMPT[lang] };
        const current = { title: card0.title[lang], step: card0.steps[after.step.step][lang], prompt: q.prompt };
        const stressed = await page.evaluate(CARD_STRESS(w, current, worst));
        if (stressed.skipped) note(`round ${i + 1}: the longest-card swap was skipped (${stressed.skipped})`);
        else {
          if (!stressed.restored) note(`round ${i + 1}: 🔴 the longest-card swap did not restore the step`);
          clause('cardWorst', stressed.gotItBottom <= H, `the longest step (${stressed.stepLines} lines), title and question: Got it bottom ${stressed.gotItBottom}, H ${H}`);
        }
      }

      if (HOLD && !PRACTICE && !held) {
        held = true;
        await wait(HOLD);
        const h = await read();
        clause('still', !h.title && h.cardTitle === after.cardTitle, `after holding ${HOLD}ms: verdict ${JSON.stringify(h.title)}, card ${JSON.stringify(h.cardTitle)}`);
      }

      const g = after.gotIt;
      if (!g) {
        note(`round ${i + 1}: a card but no "${w.gotIt}"`);
        cell.rounds.push(round);
        break;
      }
      if (g.top < 0 || g.bottom > H) await pressBox(g);
      const fresh = await read();
      if (fresh.gotIt) await tapAt(fresh.gotIt.x, fresh.gotIt.y);
      const back = await until((r) => r.prompt && (r.input || r.options.length) && !r.title && !r.cardTitle, 4000);
      clause('gotIt', !!back, `after ${w.gotIt}: ${(await read()).body.slice(0, 200)}`);
      if (back) clause('kept', sameRockets(before.rockets, back.rockets), `rockets before ${JSON.stringify(before.rockets)}, after Got it ${JSON.stringify(back.rockets)}`);
      cell.rounds.push(round);
      i++;
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
        cells.push({ lang, vp: vpName(vp), rounds: [], notes: [`the drive threw — ${e.stack || e}`], reached: false, stepsSeen: new Set(), ran: {} });
      }
    }
  }
  let failed = 0;
  for (const c of cells) {
    console.log(`\n── ${c.lang} ${c.vp} ${c.reached ? '' : '(NOT REACHED)'}`);
    if (!c.reached) failed++;
    for (const [n, r] of c.rounds.entries()) {
      const bad = Object.entries(r.clauses).filter(([, ok]) => !ok);
      failed += bad.length;
      console.log(`#${n + 1} ${String(r.intent).padEnd(7)} [${r.skill || '?'}] "${r.prompt}" → ${r.outcome || 'NO VERDICT'}  ${bad.length ? 'FAIL ' + bad.map(([k]) => `${k} (${r.saw[k]})`).join('; ') : 'pass: ' + Object.keys(r.clauses).join(', ')}`);
      if (r.after) console.log(`     after Show me: ${JSON.stringify(r.after)}`);
    }
    if (FADE) {
      const ok = [0, 1, 2].every((s) => c.stepsSeen.has(s));
      c.ran.fading = 1;
      if (!ok) failed++;
      console.log(`fading ${ok ? 'pass' : 'FAIL'}: steps seen ${JSON.stringify([...c.stepsSeen].map((s) => s + 1).sort())}`);
    }
    console.log(`clauses that ran: ${JSON.stringify(c.ran)}`);
    for (const s of c.notes) console.log(`NOTE ${s}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} failures`} across ${cells.length} cells`);
  process.exitCode = failed === 0 ? 0 : 1;
})();
