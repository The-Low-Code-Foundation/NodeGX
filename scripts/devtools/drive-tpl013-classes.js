#!/usr/bin/env node
/**
 * TPL-013 SC-1 — Star Class's nine classes, in a real browser.
 *
 * Opens the new-player form and reads the class row (all nine, in order, each one inside the window and reachable, no
 * sideways scroll), makes a P5 player the way a child does, reads the class back off the store, then races and names the
 * class of every question asked by its skill name. A new P5 player is rated two classes below, so every question should
 * be P2's or P3's. `--level P1 --expect P1` drives SC-2's picture questions, answered by tapping a pile. Every clause sits beside a signal known to fire (the page's own words, the store found).
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/star-class <dir> --allow-development-engine
 *   node scripts/devtools/drive-tpl013-classes.js <dir> --skills <skill-levels.json> [--level P5 --expect P2,P3] [--width 390] [--shots <dir>]
 *
 * `--subject Science` races that subject's chooser button (SC-4). `--skills` maps each skill's English name to its class
 * (`editionCurriculum()`). Exits 0 when every clause passed.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = flag('--shots');
const WIDTH = Number(flag('--width') || 1024);
const SKILLS = flag('--skills') ? JSON.parse(fs.readFileSync(flag('--skills'), 'utf8')) : null;
// The class the player is made in, and the classes a new player of it is asked from (rated two classes below).
const LEVEL = flag('--level') || 'P5';
const EXPECT = (flag('--expect') || 'P2,P3').split(',');
// --right: answer P1–P2's picture questions RIGHT (worked out from what is drawn), to watch the class jump up (s3).
const RIGHT = process.argv.includes('--right');
// --rating N: after the player is made, put this rating in the store and reload, to race a class the start would not reach (SC-3).
const RATING = flag('--rating') ? Number(flag('--rating')) : null;
// --subject Science: race a subject other than maths (SC-4's banks); the chooser's button word.
const SUBJECT = flag('--subject') || 'Maths';
const KINDS = [['🥭', '🍌', '🍊', '🍍', '🍉'], ['🐐', '🐔', '🐟', '🐄', '🦆'], ['🚲', '🚌', '🚗', '🛵'], ['✏️', '📚', '📏', '🎒']];
const graphemes = (t) => [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(t)].map((g) => g.segment).filter((g) => g.trim());
/** The right option for a picture question, from its skill line, its prompt and its options; null when it is not one. */
function solveYoung(name, prompt, options) {
  if (!name || !prompt) return null;
  if (name.startsWith('🔢')) return String(graphemes(prompt.replace('= ?', '')).length);
  if (name.startsWith('⚖️')) return options.slice().sort((a, b) => graphemes(b).length - graphemes(a).length)[0];
  if (name.startsWith('🎯')) return options.find((o) => graphemes(o).length === Number(prompt));
  if (name.startsWith('❓')) {
    const row = prompt.split(/\s+/);
    const at = row.indexOf('?');
    const nums = row.map(Number);
    const step = at > 1 ? nums[1] - nums[0] : nums[3] - nums[2];
    return String(at > 0 ? nums[at - 1] + step : nums[at + 1] - step);
  }
  if (name === '🔍') {
    const kind = (e) => KINDS.findIndex((k) => k.includes(e));
    return options.find((o) => options.filter((x) => kind(x) === kind(o)).length === 1);
  }
  if (name.startsWith('🔍')) {
    const n = options.map((o) => graphemes(o).length);
    return options.find((o, i) => n.filter((x) => x === n[i]).length === 1);
  }
  return null;
}
if (!DIR || !SKILLS) {
  console.error('usage: drive-tpl013-classes.js <deploy-dir> --skills <skill-levels.json> [--width N] [--shots <dir>]');
  process.exit(2);
}
const CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'JSS1', 'JSS2', 'JSS3'];
const QUESTIONS = 10;

/** Every answer button on screen: its text, and the size its text is drawn at (the deepest element holding the text). */
const ANSWER_SIZES = `(() => [...document.querySelectorAll('button')].map((b) => {
  const t = b.innerText.trim();
  let el = b;
  while (el.children.length === 1 && el.firstElementChild.innerText.trim() === t) el = el.firstElementChild;
  return { t, px: parseFloat(getComputedStyle(el).fontSize) };
}).filter((x) => x.t && !['Restart', 'Change the race', 'Next', 'Check'].includes(x.t)))()`;
const isPicture = (t) => !/[0-9]/.test(t) && t.toLowerCase() === t.toUpperCase() && !/[?⌫.]/.test(t);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`.slice(0, 700));
};

const READ = `(() => ({ text: document.body.innerText, buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean) }))()`;
const LOCATE = (label) => `(() => {
  const leaves = [...document.querySelectorAll('button, *')].filter((e) => e.innerText && e.innerText.trim() === ${JSON.stringify(label)} && e.offsetParent !== null);
  const hit = leaves.find((e) => e.tagName === 'BUTTON') || leaves.reverse().find((e) => e.children.length === 0);
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, left: r.left, right: r.right, reachable: !!top && (hit === top || hit.contains(top)) };
})()`;
/**
 * s4: the jump's own card on the verdict: the visible ⬆️ drawn big, the class beside it, where it sits against the window and
 * the headline, and what the small speed line (.rkt-boost) says. `card: null` when no ⬆️ is drawn.
 */
const JUMP_READ = `(() => {
  const arrow = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.innerText && e.innerText.trim() === '⬆️' && e.offsetParent !== null);
  const boost = [...document.querySelectorAll('.rkt-boost')].map((e) => e.innerText.trim()).join(' ');
  if (!arrow) return { card: null, boost };
  let pill = arrow.parentElement;
  while (pill && pill.innerText.trim() === '⬆️') pill = pill.parentElement;
  // The verdict's own headline: the h2 in the card the pill sits in (the page has others).
  let card = pill.parentElement;
  while (card && !card.querySelector('h2')) card = card.parentElement;
  const title = card && card.querySelector('h2');
  const r = pill.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return {
    card: pill.innerText.replace(/\\s+/g, ' ').trim(),
    px: parseFloat(getComputedStyle(arrow).fontSize),
    left: r.left, right: r.right, top: r.top, bottom: r.bottom,
    seen: !!top && (pill === top || pill.contains(top)),
    aboveTitle: !!title && r.bottom <= title.getBoundingClientRect().top + 1,
    titlePx: title ? parseFloat(getComputedStyle(title).fontSize) : null,
    boost
  };
})()`;
const SIDEWAYS = `(() => ({ scroll: document.documentElement.scrollWidth, window: window.innerWidth }))()`;

/** The active player, as the store holds it. */
const ACTIVE = `(() => {
  for (let i = 0; i < localStorage.length; i++) {
    let doc;
    try { doc = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e) { continue; }
    const stack = [doc];
    while (stack.length) {
      const o = stack.pop();
      if (!o || typeof o !== 'object') continue;
      if (Array.isArray(o.profiles) && o.profiles.length) {
        const p = o.profiles.find((x) => x.id === o.activeId) || o.profiles[0];
        return { found: true, key: localStorage.key(i), name: p.name, level: p.level, rating: p.model && p.model.rating };
      }
      for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
    }
  }
  return { found: false, keys: Object.keys(localStorage) };
})()`;

/** The skill on screen: the longest skill name the page's text holds. The card draws it in capitals (CSS), so innerText is upper case. */
const NAMES = Object.keys(SKILLS).sort((a, b) => b.length - a.length);
const skillOn = (text) => {
  const lines = text.split('\n').map((l) => l.trim().toUpperCase());
  for (const name of NAMES) if (lines.some((l) => l === name.toUpperCase() || l.startsWith(name.toUpperCase() + ' ·'))) return name;
  return null;
};

withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
  const snap = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${WIDTH}-${LEVEL}-${name}.png`));
    return page.evaluate(READ);
  };
  const click = async (label) => {
    const at = await page.evaluate(LOCATE(label));
    if (!at.found) return false;
    await wait(200);
    const again = await page.evaluate(LOCATE(label));
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(again.x), y: Math.round(again.y), button: 'left', clickCount: 1 });
    }
    if (!again.reachable) console.warn(`  ⚠ "${label}" was clicked THROUGH a blocker`);
    await wait(700);
    return true;
  };

  await page.setViewport({ width: WIDTH, height: 1400 });
  await wait(1500);
  let s = await snap('01-profiles');
  check('the profiles page asks who is playing (the known-firing signal)', s.text.includes('Who is playing?'), s.text.slice(0, 300));

  // ── The form ────────────────────────────────────────────────────────────
  await click('New player');
  s = await snap('02-form');
  const pills = [];
  for (const c of CLASSES) pills.push({ c, ...(await page.evaluate(LOCATE(c))) });
  check('the form offers all nine classes, P1 to JSS3', pills.every((p) => p.found), pills.filter((p) => !p.found).map((p) => p.c));
  check('in order, youngest first (left to right, then down)', pills.every((p, i) => i === 0 || !p.found || !pills[i - 1].found || p.y > pills[i - 1].y + 4 || p.x > pills[i - 1].x), pills.map((p) => [p.c, Math.round(p.x), Math.round(p.y)]));
  check('every class sits inside the window and can be pressed', pills.every((p) => p.found && p.left >= 0 && p.right <= WIDTH && p.reachable), pills.map((p) => [p.c, Math.round(p.left), Math.round(p.right), p.reachable]));
  const side = await page.evaluate(SIDEWAYS);
  check('the form does not scroll sideways', side.scroll <= side.window, side);

  const nameBox = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((x) => x.offsetParent !== null); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (nameBox) {
    for (const type of ['mousePressed', 'mouseReleased']) await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(nameBox.x), y: Math.round(nameBox.y), button: 'left', clickCount: 1 });
    await wait(150);
    await page.client.send('Input.insertText', { text: 'Ada' });
    await wait(300);
  }
  await click(LEVEL);
  await snap('03-form-p5');
  await click('Let’s go!');
  await wait(900);
  const who = await page.evaluate(ACTIVE);
  check('the store holds the new player (the known-firing signal)', who.found && who.name === 'Ada', who);
  check(`and her class is ${LEVEL}`, who.level === LEVEL, who);

  if (RATING !== null) {
    const set = await page.evaluate(`(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        let doc;
        try { doc = JSON.parse(localStorage.getItem(key)); } catch (e) { continue; }
        const stack = [doc];
        while (stack.length) {
          const o = stack.pop();
          if (!o || typeof o !== 'object') continue;
          if (Array.isArray(o.profiles) && o.profiles.length) {
            const p = o.profiles.find((x) => x.id === o.activeId) || o.profiles[0];
            p.model = Object.assign({}, p.model, { rating: ${RATING} });
            localStorage.setItem(key, JSON.stringify(doc));
            return true;
          }
          for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
        }
      }
      return false;
    })()`);
    await page.navigate('/home');
    await wait(1200);
    const back = await page.evaluate(ACTIVE);
    check(`the store took rating ${RATING} and kept it through a reload`, set && back.rating === RATING, back);
  }

  // ── The race ────────────────────────────────────────────────────────────
  await click('Rocket Race');
  await wait(900);
  await snap('03b-race-setup');
  if (SUBJECT !== 'Maths') {
    // The subject is chosen in the chooser behind Change: the subject's pill (its glyph may sit beside the word), then Practise this.
    await click('Change');
    await snap('03c-chooser');
    const pill = (await click(SUBJECT)) || (await page.evaluate(`[...document.querySelectorAll('*')].filter((e) => e.offsetParent !== null && e.children.length === 0 && (e.innerText || '').trim().endsWith(${JSON.stringify(' ' + SUBJECT)})).map((e) => e.innerText.trim())[0] || ''`).then((t) => (t ? click(t) : false)));
    if (!pill) console.warn(`  ⚠ no "${SUBJECT}" in the chooser`);
    await snap('03d-subject');
    await click('Practise this');
    s = await snap('03e-setup-after');
    check(`the race setup now says ${SUBJECT}`, s.text.includes(`${SUBJECT} · `), s.text.slice(0, 300));
  } else await click(SUBJECT);
  await click('Me vs the computer');
  await click('Practice');
  await click('Start');
  await wait(1200);
  const asked = [];
  const verdicts = [];
  const jumps = [];
  const sizes = { picture: [], number: [] };
  for (let n = 0; n < QUESTIONS; n++) {
    s = await snap(`04-question-${n + 1}`);
    if (!s.buttons.includes('Check')) for (const b of await page.evaluate(ANSWER_SIZES)) (isPicture(b.t) ? sizes.picture : /^[\d\s.,/−-]+$/.test(b.t) ? sizes.number : []).push(b.px);
    const name = skillOn(s.text);
    asked.push({ name, level: name ? SKILLS[name] : null });
    // Any answer moves the race on: with a box (a Check button), type 1 into it and check; otherwise press the first option.
    const right = RIGHT && (() => {
      const lines = s.text.split('\n').map((l) => l.trim()).filter(Boolean);
      const at = lines.findIndex((l) => l === name);
      // An answer never has a letter in it; the race's own buttons (Restart, ⚡ Turbo on!) do.
      const options = s.buttons.filter((b) => b.toLowerCase() === b.toUpperCase());
      return at === -1 ? null : solveYoung(name, lines[at + 1], options);
    })();
    if (right) await click(right);
    else if (s.buttons.includes('Check')) {
      const box = await page.evaluate(`(() => { const i = [...document.querySelectorAll('input')].find((x) => x.offsetParent !== null); if (!i) return null; const r = i.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (box) for (const type of ['mousePressed', 'mouseReleased']) await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(box.x), y: Math.round(box.y), button: 'left', clickCount: 1 });
      await wait(150);
      await page.client.send('Input.insertText', { text: '1' });
      await wait(200);
      await click('Check');
    } else {
      const option = s.buttons.find((b) => !['Restart', 'Change the race', 'Next'].includes(b));
      if (option) await click(option);
    }
    await wait(500);
    verdicts.push((await snap(`05-verdict-${n + 1}`)).text);
    jumps.push(await page.evaluate(JUMP_READ));
    if (!(await click('Next'))) {
      // The race was won (a quick child lands in about four answers): start another, the way a child would.
      await snap(`06-landed-${n + 1}`);
      const again = (await click('Race again')) || (await click('Play again')) || (await click('Restart'));
      await wait(900);
      if ((await page.evaluate(READ)).buttons.includes('Start')) await click('Start');
      if (!again) break;
    }
    await wait(800);
  }
  console.log(`  asked: ${asked.map((a, i) => `${i + 1}. ${a.level} ${a.name}`).join(' | ')}`);
  check(`a skill name is on screen for every question (the known-firing signal, ${asked.length} asked)`, asked.length >= 4 && asked.every((a) => a.name), asked);
  // The drive answers wrong on purpose, so the rating falls and the race may step DOWN (placed by ability); it never steps up.
  const top = Math.max(...EXPECT.map((c) => CLASSES.indexOf(c)));
  check(RATING !== null ? `🔴 at rating ${RATING} the first question is from ${EXPECT.join(' or ')}` : `🔴 a new ${LEVEL} player's first question is from ${EXPECT.join(' or ')}: rated two classes below`, asked.length > 0 && EXPECT.includes(asked[0].level), asked);
  if (!RIGHT) check(`and no question is above ${CLASSES[top]} while the answers are wrong`, asked.every((a) => CLASSES.indexOf(a.level) <= top), asked);
  // s4: a drop is silent. The verdicts were read (the known-firing signal is the speed line on each), and none drew the card.
  if (!RIGHT) check('and no verdict draws the ⬆️ card while the answers are wrong (a drop says nothing)', jumps.length >= 4 && jumps.every((j) => !j.card), jumps.map((j) => j.card || '—'));

  if (RIGHT) {
    const next = CLASSES[CLASSES.indexOf(EXPECT[EXPECT.length - 1]) + 1];
    const cards = jumps.map((j, i) => `${i + 1}: ${j.card || '—'}`);
    check(`🔴 five right in a row: the ⬆️ ${next} card is on the fifth verdict and on none of the four before it`, jumps.length >= 5 && jumps.slice(0, 4).every((j) => !j.card) && jumps[4].card === `⬆️ ${next}`, cards);
    const j = jumps[4] || {};
    check(`and a child sees it: drawn bigger than the headline (${j.px} px against ${j.titlePx} px), above it, inside the window, on top`,
      !!j.card && j.px > j.titlePx && j.aboveTitle && j.left >= 0 && j.right <= WIDTH && j.seen, j);
    check('and the small speed line no longer carries it', jumps.every((x) => !/⬆️/.test(x.boost || '')) && jumps.some((x) => x.boost), jumps.map((x) => x.boost));
    const later = asked.slice(5, 10);
    check(`and the next five questions come from ${EXPECT[EXPECT.length - 1]} and ${next}, ${next} among them`, later.length === 5 && later.every((a) => [EXPECT[EXPECT.length - 1], next].includes(a.level)) && later.some((a) => a.level === next), later);
  }
  if (LEVEL === 'P1' || LEVEL === 'P2') {
    const seen = sizes.picture.length && sizes.number.length;
    check(`a pile of things on an answer button is drawn bigger than a number (pictures ${[...new Set(sizes.picture)]} px, numbers ${[...new Set(sizes.number)]} px)`,
      !!seen && Math.min(...sizes.picture) > Math.max(...sizes.number), seen ? sizes : 'UNREAD: this race asked only one of the two kinds');
  }

  const after = await page.evaluate(ACTIVE);
  // Rated at the class picked, eight misses leave it near that class's base; rated two below, it is under the class's base − 250.
  const BASES = { P1: 300, P2: 550, P3: 800, P4: 1050, P5: 1300, P6: 1550, JSS1: 1800, JSS2: 2050, JSS3: 2300 };
  if (RATING !== null) {
    // Set, not started: the start-two-below clause does not apply.
  } else if (SUBJECT !== 'Maths' && CLASSES.indexOf(LEVEL) >= 2) {
    // A text bank's first button is sometimes the right one (two-button items), so the rating need not fall: it stays below the class.
    check(`the rating the race kept is still below ${LEVEL}’s base (${BASES[LEVEL]}): it started two classes down`, typeof after.rating === 'number' && after.rating > 0 && after.rating < BASES[LEVEL], after);
  } else if (CLASSES.indexOf(LEVEL) >= 2) check(`the rating the race kept started below ${LEVEL}’s (under ${BASES[LEVEL] - 300} after the misses)`, typeof after.rating === 'number' && after.rating > 0 && after.rating < BASES[LEVEL] - 300, after);
  else check(`the race kept a rating (${LEVEL} has no class below it to start in)`, typeof after.rating === 'number' && after.rating > 0, after);
  check('no console errors', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 4));
  check('no network errors', page.networkErrors.length === 0, page.networkErrors.slice(0, 3));
})
  .then(() => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} clauses passed at ${WIDTH} px`);
    process.exit(passed === results.length ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
