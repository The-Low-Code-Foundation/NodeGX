#!/usr/bin/env node
/**
 * P87 RKT-005 — the answer pad.
 *
 * Finding 3: "It's tough for French keyboards typing numbers requires the shift key held down. [...] a string of numbers,
 * commas / dots that they can tap if they're on a tablet [...] an accented letters string when in typing mode."
 *
 * One fresh Chrome per cell (language × viewport × mode), a new player, a Practice race (no clock, so a busy CPU never
 * reads as a timeout), played until the arm has graded the rounds it was asked for.
 *
 * Arms (--arm, one per run):
 *   touch   AC1 — touch emulated (a coarse pointer, touch events), maths, CM1. Every typed round is answered ONLY by tapping
 *                 pad keys and the pad's check key. Default 1024x768 and 390x844, FR and EN.
 *   decimal AC3 — touch, level 6e (in 200 simulated races a decimal question came up by round 33 in 99%; at CM2, 55 races
 *                 never drew one in 80 rounds), until one decimal question per cell is answered from the pad. 1024x768, FR and EN.
 *   azerty  AC2 — fine pointer, FR: a digit is sent the way a French keyboard sends it WITHOUT Shift (code Digit4, key "'").
 *                 In a maths race it must enter 4; in a typing race "'" must stay "'". 1366x768, a maths cell and a typing cell.
 *   fine    AC5 — fine pointer, EN: the answer is typed on the keyboard less its second character, the caret moved back, and
 *                 that character tapped on the pad. It must land at the caret, and the field keep the focus. 1366x768.
 *   typing  AC4 (the drive's half) — FR typing race, touch: the pad's keys are exactly the accents in the checked-in FR word list.
 *
 * Clauses (a clause that did not run is not printed; the summary counts what ran, per cell):
 *   coarse    the page itself reports (pointer: coarse) — the known-firing signal beside noInput's absence (touch arms)
 *   pad       a pad key exists for every character the entry needs, and a check key
 *   noInput   no <input> or <textarea> took focus during the round, and none was focused after any tap (touch arms)
 *   field     the field shows exactly what was entered, before check is pressed
 *   verdict   the verdict the entry deserves: right when the drive solved the question, "not quite" for its deliberate 98765
 *   padFold   when the question arrives, every pad key and the check key are on screen, with the page at scrollY 0
 *   separator (decimal) the pad offers this language's decimal point and not the other one
 *   digitCode (azerty) the Shift-less AZERTY key events for the answer's digits put those digits in the field
 *   quote     (azerty, typing) code Digit4 with key "'" puts "'" in a typing question's field
 *   typeWorks (fine) keyboard typing reaches the field
 *   midInsert (fine) the pad key lands at the caret, and the field still has the focus afterwards
 *   strip     (typing) the pad's keys are the FR word list's accents, exactly; letters (typing) the field is a real input
 *   typingFold(typing) the on-screen keyboard, the strip and the box all end on screen, with the page at scrollY 0
 *             (RKT-003 §3's "the typing keyboard takes the track's space on a short screen": run it with --only 1280x720)
 *
 * Usage:
 *   node scripts/devtools/drive-rkt005-pad.js <deploy-dir> --arm touch|decimal|azerty|fine|typing
 *        [--only 1024x768,390x844] [--lang fr|en] [--rounds 5] [--shots <dir>]
 * Exits 0 when every clause that ran passed, every cell graded its rounds, and no console error was raised.
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
const ARM_NAME = arg('--arm') || 'touch';
const ARMS = {
  touch: { touch: true, level: 'CM1', modes: ['maths'], langs: ['fr', 'en'], vps: ['1024x768', '390x844'], rounds: 5, cap: 25 },
  decimal: { touch: true, level: '6e', modes: ['maths'], langs: ['fr', 'en'], vps: ['1024x768'], rounds: 1, cap: 45 },
  azerty: { touch: false, level: 'CM1', modes: ['maths', 'typing'], langs: ['fr'], vps: ['1366x768'], rounds: 3, cap: 20 },
  fine: { touch: false, level: 'CM1', modes: ['maths'], langs: ['en'], vps: ['1366x768'], rounds: 3, cap: 20 },
  typing: { touch: true, level: 'CM1', modes: ['typing'], langs: ['fr'], vps: ['1024x768'], rounds: 1, cap: 6 }
};
const ARM = ARMS[ARM_NAME];
if (!DIR || DIR.startsWith('--') || !ARM) {
  console.error('usage: drive-rkt005-pad.js <deploy-dir> --arm touch|decimal|azerty|fine|typing [--only 1024x768] [--lang fr|en] [--rounds n] [--shots <dir>]');
  process.exit(2);
}
const SHOTS = arg('--shots');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const LANGS = arg('--lang') ? [arg('--lang')] : ARM.langs;
const VP_NAMES = arg('--only') ? arg('--only').split(',') : ARM.vps;
const ROUNDS = Number(arg('--rounds') || ARM.rounds);

const VIEWPORTS = {
  '1366x768': { width: 1366, height: 768 },
  '1280x720': { width: 1280, height: 720 },
  '1024x768': { width: 1024, height: 768 },
  '768x1024': { width: 768, height: 1024 },
  '390x844': { width: 390, height: 844 }
};

const DATA = path.join(__dirname, '..', '..', 'templates', 'rocket-school', 'components', 'Data');
const staticJson = (name) =>
  JSON.parse(JSON.parse(fs.readFileSync(path.join(DATA, name, 'nodes.json'), 'utf8')).nodes.find((n) => n.type === 'Static Data').parameters.json);
const WORD_LISTS = staticJson('Word lists');
/** The accents a French typing race can ask for: every character of the FR word list outside a–z. */
const FR_ACCENTS = [...new Set(WORD_LISTS.find((l) => l.lang === 'fr').words.join('').split('').filter((c) => !/[a-z]/.test(c)))].sort().join('');

const W = {
  en: {
    home: 'Rocket Race',
    practice: 'Practice',
    typing: 'Typing',
    start: 'Start',
    next: 'Next',
    check: 'Check',
    again: 'Play again',
    right: ['Correct!', 'Fast and correct!'],
    wrong: ['Not quite.'],
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    results: ['You reached the planet!', 'The computer got there first. Again?']
  },
  fr: {
    home: 'Course de fusées',
    practice: 'Entraînement',
    typing: 'Frappe',
    start: 'Commencer',
    next: 'Suivant',
    check: 'Vérifier',
    again: 'Rejouer',
    right: ['Bravo !', 'Rapide et juste !'],
    wrong: ['Pas tout à fait.'],
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?']
  }
};

/** What a French keyboard sends for the top row WITHOUT Shift: the digit is only in `code`. */
const AZERTY_UNSHIFTED = { 1: '&', 2: 'é', 3: '"', 4: "'", 5: '(', 6: '-', 7: 'è', 8: '_', 9: 'ç', 0: 'à' };
const NUMERIC = /^[\d\s  .,/−-]+$/;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The right answer to the prompts the drive can read, as the grader's canonical string ("2.5"), or null. */
function solve(prompt, lang) {
  if (!prompt) return null;
  const n = (s) => Number(lang === 'fr' ? String(s).replace(/[\s  ]/g, '').replace(',', '.') : String(s).replace(/[\s  ,]/g, ''));
  const out = (v) => (Number.isFinite(v) ? String(Math.round(v * 1e6) / 1e6) : null);
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

/** The screen, read without scrolling. A pad key, the check key and the field are found by the kit's data attributes. */
const READ = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const t = (e) => e.innerText.trim();
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && t(e));
  const title = texts.find((e) => words.verdicts.includes(t(e)));
  const result = texts.find((e) => words.results.includes(t(e)));
  let prompt = null;
  let size = 0;
  for (const e of texts) {
    if (e === title || e === result || !/[0-9A-Za-zÀ-ÿ?]/.test(e.innerText)) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; prompt = e; }
  }
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const padKeys = [...document.querySelectorAll('[data-pad-key]')].filter(vis).map((b) => ({ key: b.getAttribute('data-pad-key'), ...box(b) }));
  const submit = [...document.querySelectorAll('[data-pad-submit]')].find(vis) || buttons.find((b) => t(b) === words.check);
  const fieldEl = [...document.querySelectorAll('[data-pad-field]')].find(vis) || [...document.querySelectorAll('input')].find((i) => vis(i) && !i.disabled);
  const fieldText = !fieldEl ? null : fieldEl.hasAttribute('data-pad-text') ? fieldEl.getAttribute('data-pad-text') : fieldEl.value;
  const isPad = (b) => b.hasAttribute('data-pad-key') || b.hasAttribute('data-pad-submit') || b.hasAttribute('data-pad-back');
  const options = buttons.filter((b) => !isPad(b) && ${NUMERIC}.test(t(b)));
  const next = buttons.find((b) => t(b) === words.next);
  const again = buttons.find((b) => t(b) === words.again);
  const active = document.activeElement;
  return {
    scrollY: Math.round(window.scrollY),
    innerHeight,
    coarse: matchMedia('(pointer: coarse)').matches,
    prompt: prompt ? { text: t(prompt), ...box(prompt) } : null,
    title: title ? t(title) : null,
    result: result ? t(result) : null,
    field: fieldEl ? { tag: fieldEl.tagName, mode: fieldEl.getAttribute('data-pad-field'), text: fieldText, ...box(fieldEl) } : null,
    padKeys,
    submit: box(submit),
    options: options.map((b) => ({ label: t(b), ...box(b) })),
    next: box(next),
    again: box(again),
    activeTag: active ? active.tagName : null,
    fieldFocused: !!fieldEl && active === fieldEl,
    focusLog: (window.__rktFocus || []).slice()
  };
})()`;

/** Every focus that lands during a round, by tag. Installed once per page. */
const FOCUS_LOG = `(() => {
  window.__rktFocus = [];
  if (!window.__rktFocusOn) {
    window.__rktFocusOn = true;
    document.addEventListener('focusin', (e) => { (window.__rktFocus = window.__rktFocus || []).push(e.target.tagName); });
  }
  return true;
})()`;

const cells = [];

async function driveCell(lang, vpName, mode) {
  const vp = VIEWPORTS[vpName];
  const w = W[lang];
  const cell = { arm: ARM_NAME, lang, vp: vpName, mode, rounds: [], notes: [], reached: false, graded: 0, consoleErrors: [] };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);

  await withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors }) => {
    const send = (method, params) => client.send(method, params || {});
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: ARM.touch });
    if (ARM.touch) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Page.reload', {});
      await wait(3500);
    } else {
      await wait(1200);
    }
    const read = () => evaluate(READ(w));
    const until = async (test, ms) => {
      const end = Date.now() + ms;
      for (;;) {
        const r = await read();
        if (test(r)) return r;
        if (Date.now() > end) return null;
        await wait(200);
      }
    };
    const tapAt = async (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      if (ARM.touch) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
      }
      await wait(120);
    };
    const tapBox = async (b) => {
      if (!b) return false;
      await tapAt(b.x, b.y);
      return true;
    };
    const key = async (k, code, vk, text) => {
      const typed = text ? { text, unmodifiedText: text } : {};
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, ...typed });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
      await wait(70);
    };
    const enter = () => key('Enter', 'Enter', 13, '\r');
    /** A character as this keyboard sends it: AZERTY's top row without Shift, or QWERTY's plain digits. */
    const typeChar = async (c, layout) => {
      if (/\d/.test(c)) {
        const k = layout === 'azerty' ? AZERTY_UNSHIFTED[c] : c;
        return key(k, 'Digit' + c, 48 + Number(c), k);
      }
      if (c === ',') return key(',', layout === 'azerty' ? 'KeyM' : 'Comma', 188, ',');
      if (c === '.') return key('.', 'Period', 190, '.');
      return send('Input.insertText', { text: c });
    };
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt005-${ARM_NAME}-${mode}-${lang}-${vpName}-${name}.png`), Buffer.from(data, 'base64'));
    };
    const pressLabel = async (label) => {
      const at = await evaluate(`(() => {
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
    const body = () => evaluate('document.body.innerText');

    // ── A player, Home, a Practice race ──
    if (!(await pressLabel('New player'))) return note('no "New player" button');
    await wait(400);
    const nameAt = await evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (nameAt) {
      await tapAt(nameAt.x, nameAt.y);
      await wait(150);
      await send('Input.insertText', { text: 'Léa' });
    }
    await pressLabel(ARM.level);
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
    if (mode === 'typing' && !(await pressLabel(w.typing))) note(`no "${w.typing}" choice on setup`);
    if (!(await pressLabel(w.practice))) note(`no "${w.practice}" choice on setup`);
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
    await wait(1200);
    cell.reached = true;
    await evaluate(FOCUS_LOG);

    let shotQuestion = false;
    let shotVerdict = false;
    for (let guard = 1; cell.graded < ROUNDS && guard <= ARM.cap; guard++) {
      const q = await until((r) => r.result || (r.prompt && (r.field || r.options.length) && !r.title), 8000);
      if (!q) {
        note(`round ${guard}: no question on screen`);
        break;
      }
      if (q.result) {
        if (!(await tapBox(q.again))) {
          note('a result screen without Play again');
          break;
        }
        await wait(1200);
        continue;
      }
      await evaluate(FOCUS_LOG);

      // Options are not the pad's; they are answered and passed over.
      if (!q.field) {
        await tapBox(q.options[0]);
        const v = await until((r) => r.title && r.next, 4000);
        if (v) await tapBox(v.next);
        await wait(500);
        continue;
      }

      const round = { n: guard, prompt: q.prompt.text, field: q.field.tag + (q.field.mode ? `:${q.field.mode}` : ''), clauses: {}, saw: {} };
      const clause = (name, ok, saw) => {
        round.clauses[name] = ok;
        if (!ok) round.saw[name] = saw;
      };
      const have = new Set(q.padKeys.map((k) => k.key));
      if (!shotQuestion) {
        await shoot('question');
        shotQuestion = true;
      }

      // ── The typing arms grade the question's pad and field, then stop ──
      if (mode === 'typing') {
        if (ARM.touch) clause('coarse', q.coarse === true, `matchMedia('(pointer: coarse)') is ${q.coarse}`);
        if (ARM_NAME === 'typing') {
          const got = q.padKeys.map((k) => k.key).sort().join('');
          clause('strip', got === FR_ACCENTS, `pad keys ${JSON.stringify(got)}, the FR word list's accents ${JSON.stringify(FR_ACCENTS)}`);
          clause('letters', q.field.tag === 'INPUT', `the field is <${q.field.tag}>, so no keyboard can type the word`);
          // RKT-003 §3's unbuilt half: the typing keyboard on a short screen. Every key a typing question draws ends on screen.
          const fold = await evaluate(`(() => { const b = [...document.querySelectorAll('[data-key], [data-pad-key], [data-pad-submit], [data-pad-field]')].filter((e) => e.getClientRects().length).map((e) => Math.round(e.getBoundingClientRect().bottom)); return { lowest: Math.max(0, ...b), n: b.length, H: innerHeight, scrollY: Math.round(scrollY) }; })()`);
          clause('typingFold', fold.n > 0 && fold.lowest <= fold.H && fold.scrollY === 0, `lowest of ${fold.n} keys at ${fold.lowest}, H ${fold.H}, scrollY ${fold.scrollY}`);
        } else {
          if (!q.fieldFocused) await tapBox(q.field);
          await key("'", 'Digit4', 52, "'");
          const r = await read();
          clause('quote', !!r.field && r.field.text === "'", `field shows ${JSON.stringify(r.field && r.field.text)} after code Digit4 key "'"`);
        }
        cell.rounds.push(round);
        cell.graded++;
        // One question per typing cell: the question stays on screen, and a second pass would type into the first one's answer.
        break;
      }

      const right = solve(q.prompt.text, lang);
      const want = right !== null ? right : '98765';
      const entry = lang === 'fr' ? want.replace('.', ',') : want;
      const counts = ARM_NAME === 'decimal' ? /[.,]/.test(entry) : ARM_NAME === 'fine' ? entry.length >= 2 : true;
      round.entry = entry;

      if (ARM.touch) {
        clause('coarse', q.coarse === true, `matchMedia('(pointer: coarse)') is ${q.coarse}`);
        const onScreen = [...q.padKeys, q.submit].filter(Boolean);
        clause(
          'padFold',
          q.padKeys.length > 0 && !!q.submit && q.scrollY === 0 && onScreen.every((b) => b.top >= 0 && b.bottom <= q.innerHeight),
          `pad keys ${q.padKeys.length}, check ${q.submit ? q.submit.bottom : 'absent'}, lowest key ${Math.max(0, ...q.padKeys.map((k) => k.bottom))}, H ${q.innerHeight}, scrollY ${q.scrollY}`
        );
        const missing = [...entry].filter((c) => !have.has(c));
        clause('pad', q.padKeys.length > 0 && missing.length === 0 && !!q.submit, `missing ${JSON.stringify(missing.join(''))}; keys ${JSON.stringify([...have].join(''))}; the answer surface is <${q.field.tag}>`);
        if (ARM_NAME === 'decimal') {
          const sep = lang === 'fr' ? ',' : '.';
          const other = lang === 'fr' ? '.' : ',';
          clause('separator', have.has(sep) && !have.has(other), `keys ${JSON.stringify([...have].join(''))}, want ${sep} and not ${other}`);
        }
        const tags = [];
        if (q.padKeys.length && missing.length === 0) {
          for (const c of entry) {
            const k = (await read()).padKeys.find((p) => p.key === c);
            await tapBox(k);
            tags.push((await read()).activeTag);
          }
        } else {
          // 🔴 The unfixed build: the only way to answer is the box itself, which takes the focus and summons a keyboard.
          await tapBox(q.field);
          tags.push((await read()).activeTag);
          await send('Input.insertText', { text: entry });
        }
        const before = await read();
        clause('field', !!before.field && before.field.text === entry, `field shows ${JSON.stringify(before.field && before.field.text)}, entered ${JSON.stringify(entry)}`);
        if (before.submit) await tapBox(before.submit);
        else await enter();
        tags.push((await read()).activeTag);
        round.focus = tags;
      } else {
        if (!q.fieldFocused) await tapBox(q.field);
        if (ARM_NAME === 'azerty') {
          for (const c of entry) await typeChar(c, 'azerty');
          const r = await read();
          clause('digitCode', !!r.field && r.field.text === entry, `field shows ${JSON.stringify(r.field && r.field.text)} after the Shift-less AZERTY keys for ${entry}`);
        } else if (counts) {
          const typedFirst = entry[0] + entry.slice(2);
          for (const c of typedFirst) await typeChar(c, 'qwerty');
          const mid = await read();
          clause('typeWorks', !!mid.field && mid.field.text === typedFirst, `field shows ${JSON.stringify(mid.field && mid.field.text)}, typed ${JSON.stringify(typedFirst)}`);
          for (let k = 0; k < entry.length - 2; k++) await key('ArrowLeft', 'ArrowLeft', 37);
          const padKey = mid.padKeys.find((p) => p.key === entry[1]);
          if (!padKey) {
            clause('midInsert', false, `no pad key for ${JSON.stringify(entry[1])}; keys ${JSON.stringify(mid.padKeys.map((p) => p.key).join(''))}`);
            await typeChar(entry[1], 'qwerty');
          } else {
            await tapBox(padKey);
            const after = await read();
            clause('midInsert', !!after.field && after.field.text === entry && after.fieldFocused, `field ${JSON.stringify(after.field && after.field.text)} (want ${entry}); field focused ${after.fieldFocused}; active <${after.activeTag}>`);
          }
        } else {
          await send('Input.insertText', { text: entry });
        }
        await enter();
      }

      const v = await until((r) => r.title, 4000);
      if (!v) {
        note(`round ${guard}: no verdict after entering ${JSON.stringify(entry)} for "${q.prompt.text}"`);
        cell.rounds.push({ ...round, graded: false });
        break;
      }
      round.outcome = v.title;
      const deserved = right !== null ? w.right : w.wrong;
      clause('verdict', deserved.includes(v.title), `"${v.title}" for ${JSON.stringify(entry)} on "${q.prompt.text}" (solved: ${right !== null})`);
      if (ARM.touch) {
        const inputs = [...v.focusLog, ...(round.focus || [])].filter((tag) => tag === 'INPUT' || tag === 'TEXTAREA');
        clause('noInput', inputs.length === 0, `focus log ${JSON.stringify(v.focusLog)}; active after each tap ${JSON.stringify(round.focus)}`);
      }
      if (!shotVerdict) {
        await shoot('verdict');
        shotVerdict = true;
      }
      if (counts) {
        cell.rounds.push(round);
        cell.graded++;
      } else {
        note(`round ${guard}: "${q.prompt.text}" answered but not counted for this arm`);
      }
      await tapBox(v.next);
      await wait(600);
    }
    cell.consoleErrors = consoleErrors.slice();
  });
}

(async () => {
  for (const mode of ARM.modes) for (const lang of LANGS) for (const vpName of VP_NAMES) await driveCell(lang, vpName, mode);

  let failed = 0;
  for (const cell of cells) {
    const tally = {};
    for (const r of cell.rounds) for (const [name, ok] of Object.entries(r.clauses)) {
      tally[name] = tally[name] || [0, 0];
      tally[name][0] += ok ? 1 : 0;
      tally[name][1]++;
    }
    const wanted = cell.mode === 'typing' ? 1 : ROUNDS;
    const short = cell.graded < wanted;
    const bad = Object.values(tally).some(([p, n]) => p < n) || !cell.reached || short || cell.consoleErrors.length > 0;
    if (bad) failed++;
    console.log(`\n[${bad ? 'FAIL' : 'pass'}] ${cell.arm} ${cell.mode} ${cell.lang} ${cell.vp} — graded ${cell.graded}/${wanted}${cell.reached ? '' : ' (never reached a race)'}`);
    console.log('  ' + Object.entries(tally).map(([k, [p, n]]) => `${k} ${p}/${n}`).join(' · '));
    for (const r of cell.rounds) {
      const fails = Object.entries(r.saw);
      console.log(`  round ${r.n} [${r.field}] "${r.prompt}" → ${JSON.stringify(r.entry || '')} ${r.outcome ? '→ ' + r.outcome : ''}${fails.length ? '' : ' ✓'}`);
      for (const [name, saw] of fails) console.log(`    ✗ ${name}: ${saw}`);
    }
    for (const n of cell.notes) console.log(`  note: ${n}`);
    if (cell.consoleErrors.length) console.log(`  console errors (${cell.consoleErrors.length}): ${cell.consoleErrors.slice(0, 3).join(' | ')}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} failing cells`} of ${cells.length} (${ARM_NAME} arm)`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
