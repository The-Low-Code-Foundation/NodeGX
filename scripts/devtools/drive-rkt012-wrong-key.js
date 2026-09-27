#!/usr/bin/env node
/**
 * P87 RKT-012 — a wrong key is refused.
 *
 * Richard, 2026-09-14: "you can type anything you want and it'll progress to the second character view and keyboard letter
 * highlighted [...] I feel disturbed by the visual of typing the wrong letter 3 times and the keyboard continues showing the next
 * letter as if everything's fine keep going." Ruled: option 1, the wrong key is refused and flashes; plus a ⌫ beside the box
 * "in case they aren't used to backspacing".
 *
 * One fresh Chrome per language, 1366x768, fine pointer, a new player, a Practice typing race (no clock). Each typing round is
 * played with a planned number of wrong keys: 1, then 3, then 0, repeating. A wrong key is a real key press into the focused box
 * (keydown + input), except the third wrong key of a 3-round, which is `Input.insertText` (input only, no keydown: a tablet's
 * keyboard), so both refusal paths are driven.
 *
 * Clauses, per round:
 *   litFirst    before any key, the keyboard lights the word's first letter (the known-firing signal beside `refused`)
 *   refused     after a wrong key the box text is unchanged
 *   boxFlash    ... the box carries data-pad-wrong (its red outline and shake)
 *   keyFlash    ... the keyboard flashes exactly the wrong key (data-wrong)
 *   stillLit    ... the keyboard still lights the letter that is due, not the one after it
 *   advance     after the right letter, the keyboard lights the next letter
 *   backBeside  ⌫ is on screen beside the box: right of the field, left of the check key, on the same row
 *   backWorks   clicking ⌫ removes one letter, and the box keeps the focus
 *   verdict     0 wrong keys → right; 1 → "Correct!" and never "Fast and correct!"; 3 → "Not quite." with "3 wrong keys"
 *
 * Usage: node scripts/devtools/drive-rkt012-wrong-key.js <deploy-dir> [--lang en|fr] [--rounds 3] [--shots <dir>] [--sabotage]
 * --sabotage skips every wrong key but still grades the flash clauses: they must go red (the arm that proves they can fail).
 * Exits 0 when every clause that ran passed, each language graded its rounds, and no console error was raised.
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
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-rkt012-wrong-key.js <deploy-dir> [--lang en|fr] [--rounds 3] [--shots <dir>] [--sabotage]');
  process.exit(2);
}
const LANGS = arg('--lang') ? [arg('--lang')] : ['en', 'fr'];
const ROUNDS = Number(arg('--rounds') || 3);
const SHOTS = arg('--shots');
const SABOTAGE = argv.includes('--sabotage');
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const PLAN = [1, 3, 0];
const VP = { width: 1366, height: 768 };

const W = {
  en: { home: 'Rocket Race', practice: 'Practice', typing: 'Typing', start: 'Start', again: 'Play again', next: 'Next', fluent: 'Fast and correct!', correct: 'Correct!', wrong: 'Not quite.', verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'], results: ['You reached the planet!', 'The computer got there first. Again?'], threeWrong: '3 wrong keys.' },
  fr: { home: 'Course de fusées', practice: 'Entraînement', typing: 'Frappe', start: 'Commencer', again: 'Rejouer', next: 'Suivant', fluent: 'Rapide et juste !', correct: 'Bravo !', wrong: 'Pas tout à fait.', verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'], results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?'], threeWrong: '3 touches fausses.' }
};
// Letters no layout probe reads (Q, A, W, Z and M tell AZERTY from QWERTY and would redraw the keyboard mid-drive).
const WRONG_POOL = 'xjvbnkhgpt';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const READ = (words) => `(() => {
  const words = ${JSON.stringify(words)};
  const vis = (e) => !!e && e.getClientRects().length > 0;
  const box = (e) => { if (!vis(e)) return null; const r = e.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const t = (e) => e.innerText.trim();
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => vis(e) && t(e));
  const title = texts.find((e) => words.verdicts.includes(t(e)));
  const result = texts.find((e) => words.results.includes(t(e)));
  let prompt = null, size = 0;
  for (const e of texts) {
    if (e === title || e === result) continue;
    const f = parseFloat(getComputedStyle(e).fontSize);
    if (f > size) { size = f; prompt = e; }
  }
  const field = [...document.querySelectorAll('[data-pad-field]')].find(vis);
  const buttons = [...document.querySelectorAll('button')].filter(vis);
  const lit = [...document.querySelectorAll('[data-key][data-next="true"]')].filter(vis).map((e) => e.getAttribute('data-key'));
  const flashing = [...document.querySelectorAll('[data-key][data-wrong="true"]')].filter(vis).map((e) => e.getAttribute('data-key'));
  return {
    prompt: prompt ? t(prompt) : null,
    title: title ? t(title) : null,
    result: result ? t(result) : null,
    body: document.body.innerText,
    field: field ? { text: field.getAttribute('data-pad-text'), wrong: field.getAttribute('data-pad-wrong'), ...box(field) } : null,
    fieldFocused: !!field && document.activeElement === field,
    back: box([...document.querySelectorAll('[data-pad-back="beside"]')].find(vis)),
    submit: box([...document.querySelectorAll('[data-pad-submit]')].find(vis)),
    keyboard: document.querySelectorAll('[data-key]').length > 0,
    lit, flashing,
    next: box(buttons.find((b) => t(b) === words.next)),
    again: box(buttons.find((b) => t(b) === words.again))
  };
})()`;

const cells = [];

async function driveLang(lang) {
  const w = W[lang];
  const cell = { lang, rounds: [], notes: [], reached: false, consoleErrors: [] };
  cells.push(cell);
  const note = (s) => cell.notes.push(s);

  await withDeployedSite({ dir: DIR }, async ({ client, evaluate, consoleErrors }) => {
    const send = (method, params) => client.send(method, params || {});
    await send('Emulation.setDeviceMetricsOverride', { width: VP.width, height: VP.height, deviceScaleFactor: 1, mobile: false });
    await wait(1200);
    const read = () => evaluate(READ(w));
    const until = async (test, ms) => {
      const end = Date.now() + ms;
      for (;;) {
        const r = await read();
        if (test(r)) return r;
        if (Date.now() > end) return null;
        await wait(150);
      }
    };
    const clickAt = async (x, y) => {
      x = Math.round(x);
      y = Math.round(y);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
      await wait(150);
    };
    const clickBox = async (b) => (b ? (await clickAt(b.x, b.y), true) : false);
    /**
     * A character as this child's keyboard sends it: keydown with its text for a–z and space, `insertText` for anything else. A French
     * player's letters carry AZERTY's codes, so the pad's layout probe (RKT-008 AC7) never reads the drive as a QWERTY keyboard.
     */
    const AZERTY_CODE = { a: 'KeyQ', q: 'KeyA', z: 'KeyW', w: 'KeyZ', m: 'Semicolon' };
    const press = async (c) => {
      if (/^[a-z]$/.test(c)) {
        const code = (lang === 'fr' && AZERTY_CODE[c]) || 'Key' + c.toUpperCase();
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: c, code, windowsVirtualKeyCode: c.toUpperCase().charCodeAt(0), text: c, unmodifiedText: c });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: c, code, windowsVirtualKeyCode: c.toUpperCase().charCodeAt(0) });
      } else if (c === ' ') {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ', unmodifiedText: ' ' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      } else {
        await send('Input.insertText', { text: c });
      }
      await wait(60);
    };
    const enter = async () => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    };
    const shoot = async (name) => {
      if (!SHOTS) return;
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `rkt012-${lang}-${name}.png`), Buffer.from(data, 'base64'));
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
      await clickAt(at.x, at.y);
      await wait(700);
      return true;
    };
    const body = () => evaluate('document.body.innerText');

    // ── A player, Home, a Practice typing race (the recipe drive-rkt005-pad.js uses) ──
    if (!(await pressLabel('New player'))) return note('no "New player" button');
    await wait(400);
    const nameAt = await evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((i) => i.offsetParent !== null); if (!i) return null; i.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (nameAt) {
      await clickAt(nameAt.x, nameAt.y);
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
    if (!(await pressLabel(w.typing))) note(`no "${w.typing}" choice on setup`);
    if (!(await pressLabel(w.practice))) note(`no "${w.practice}" choice on setup`);
    if (!(await pressLabel(w.start))) return note(`no "${w.start}" on setup`);
    await wait(1200);
    cell.reached = true;

    for (let guard = 1; cell.rounds.length < ROUNDS && guard <= ROUNDS * 4; guard++) {
      const q = await until((r) => r.result || (r.prompt && r.field && !r.title && r.keyboard), 8000);
      if (!q) {
        note(`round ${guard}: no typing question on screen`);
        break;
      }
      if (q.result) {
        if (!(await clickBox(q.again))) return note('a result screen without Play again');
        await wait(1200);
        continue;
      }
      const planned = PLAN[cell.rounds.length % PLAN.length];
      const word = q.prompt;
      const round = { word, planned, clauses: {}, saw: {} };
      cell.rounds.push(round);
      const clause = (name, ok, saw) => {
        if (round.clauses[name] === false) return;
        round.clauses[name] = ok;
        if (!ok) round.saw[name] = saw;
      };
      if (!q.fieldFocused) await clickBox(q.field);
      const first = await read();
      clause('litFirst', first.lit.length === 1 && first.lit[0] === word.charAt(0).toLowerCase(), `lit ${JSON.stringify(first.lit)} for "${word}"`);
      clause(
        'backBeside',
        !!first.back && !!first.field && !!first.submit && first.back.left >= first.field.right && first.back.right <= first.submit.left && Math.abs(first.back.y - first.field.y) < 12,
        `⌫ ${JSON.stringify(first.back)}, field ${JSON.stringify(first.field && { left: first.field.left, right: first.field.right, y: first.field.y })}, check ${JSON.stringify(first.submit)}`
      );

      // Wrong keys go in at the start, and (for a 3-round) one more after the first right letter, so a refusal mid-word is driven.
      const wrongAt = planned === 3 ? [0, 0, 1] : planned === 1 ? [0] : [];
      let typed = '';
      for (let i = 0; i <= word.length; i++) {
        for (const [n, at] of wrongAt.entries()) {
          if (at !== i) continue;
          const due = word.charAt(i).toLowerCase();
          const bad = [...WRONG_POOL].find((c) => c !== due && c !== word.charAt(i + 1).toLowerCase());
          const before = await read();
          // The third wrong key of a 3-round is inserted without a keydown: the tablet path.
          const via = planned === 3 && n === 2 ? 'insertText' : 'keydown';
          const t0 = Date.now();
          if (!SABOTAGE) {
            if (via === 'insertText') await send('Input.insertText', { text: bad });
            else await press(bad);
          }
          // A flash is on screen for 450 ms; the graph may take a frame or two to hand the count to the keyboard, so allow 300.
          const after = (await until((r) => r.flashing.length > 0 && !!r.field && !!r.field.wrong, 300)) || (await read());
          const ms = Date.now() - t0;
          const tag = `wrong #${n + 1} "${bad}" at letter ${i} via ${via} (${ms} ms)`;
          (round.presses = round.presses || []).push(`${tag}: box ${JSON.stringify(after.field && after.field.text)} wrong=${after.field && after.field.wrong} flashing ${JSON.stringify(after.flashing)} lit ${JSON.stringify(after.lit)}`);
          clause('refused', !!after.field && after.field.text === before.field.text, `${tag}: box ${JSON.stringify(before.field && before.field.text)} → ${JSON.stringify(after.field && after.field.text)}`);
          clause('boxFlash', !!after.field && !!after.field.wrong, `${tag}: data-pad-wrong ${JSON.stringify(after.field && after.field.wrong)}`);
          clause('keyFlash', after.flashing.length === 1 && after.flashing[0] === bad, `${tag}: flashing ${JSON.stringify(after.flashing)}`);
          // Past the end of a one-letter word nothing is due, so nothing is lit; the extra letter is still refused and counted.
          const litOk = due === '' ? after.lit.length === 0 : after.lit.length === 1 && after.lit[0] === due;
          clause('stillLit', litOk, `${tag}: lit ${JSON.stringify(after.lit)}, due ${JSON.stringify(due)}`);
          if (!round.shot) {
            await shoot(`wrong-${cell.rounds.length}`);
            round.shot = true;
          }
          await wait(500);
        }
        if (i === word.length) break;
        await press(word.charAt(i));
        typed += word.charAt(i);
        if (i === 0 && word.length > 1) {
          const r = await read();
          clause('advance', r.lit.length === 1 && r.lit[0] === word.charAt(1).toLowerCase(), `lit ${JSON.stringify(r.lit)} after "${word.charAt(0)}", want ${JSON.stringify(word.charAt(1))}`);
        }
        // ⌫ beside the box, once per 0-round: after the second letter, click it and type the letter again.
        if (planned === 0 && i === 1) {
          const r = await read();
          await clickBox(r.back);
          const b = await read();
          clause('backWorks', !!b.field && b.field.text === typed.slice(0, -1) && b.fieldFocused, `box ${JSON.stringify(b.field && b.field.text)} (want ${JSON.stringify(typed.slice(0, -1))}), focused ${b.fieldFocused}`);
          await press(word.charAt(i));
        }
      }
      const done = await read();
      if (!done.field || done.field.text !== word) note(`round ${cell.rounds.length}: box ${JSON.stringify(done.field && done.field.text)} before Enter, word "${word}"`);
      await enter();
      const v = await until((r) => r.title, 4000);
      if (!v) {
        clause('verdict', false, `no verdict for "${word}"`);
        break;
      }
      round.outcome = v.title;
      if (planned === 0) clause('verdict', v.title === w.fluent || v.title === w.correct, `"${v.title}" with 0 wrong keys`);
      if (planned === 1) clause('verdict', v.title === w.correct, `"${v.title}" with 1 wrong key (must be "${w.correct}", never "${w.fluent}")`);
      if (planned === 3) clause('verdict', v.title === w.wrong && v.body.includes(w.threeWrong), `"${v.title}", message has "${w.threeWrong}": ${v.body.includes(w.threeWrong)}`);
      if (planned === 3) await shoot(`three-wrong-verdict`);
      await clickBox(v.next);
      await wait(600);
    }
    cell.consoleErrors = consoleErrors.slice();
  });
}

(async () => {
  for (const lang of LANGS) await driveLang(lang);
  let failed = 0;
  for (const cell of cells) {
    const tally = {};
    for (const r of cell.rounds) for (const [name, ok] of Object.entries(r.clauses)) {
      tally[name] = tally[name] || [0, 0];
      tally[name][0] += ok ? 1 : 0;
      tally[name][1]++;
    }
    const bad = Object.values(tally).some(([p, n]) => p < n) || !cell.reached || cell.rounds.length < ROUNDS || cell.consoleErrors.length > 0;
    if (bad) failed++;
    console.log(`\n[${bad ? 'FAIL' : 'pass'}] ${cell.lang}${SABOTAGE ? ' (sabotage)' : ''} — ${cell.rounds.length}/${ROUNDS} rounds`);
    console.log('  ' + Object.entries(tally).map(([k, [p, n]]) => `${k} ${p}/${n}`).join(' · '));
    for (const r of cell.rounds) {
      const fails = Object.entries(r.saw);
      console.log(`  "${r.word}" with ${r.planned} wrong → ${r.outcome || '(no verdict)'}${fails.length ? '' : ' ✓'}`);
      for (const [name, saw] of fails) console.log(`    ✗ ${name}: ${saw}`);
      for (const p of r.presses || []) console.log(`      · ${p}`);
    }
    for (const n of cell.notes) console.log(`  note: ${n}`);
    if (cell.consoleErrors.length) console.log(`  console errors (${cell.consoleErrors.length}): ${cell.consoleErrors.slice(0, 3).join(' | ')}`);
  }
  console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} failing cells`} of ${cells.length}`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
