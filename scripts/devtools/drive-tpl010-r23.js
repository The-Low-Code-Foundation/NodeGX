/**
 * TPL-010-R2.3 — the move box: pick the day, then see it, driven as a DEPLOYED demo with real clicks.
 *
 * `tpl010Template.test.ts` runs the guards and the row scripts; this presses the buttons a person
 * presses, in the build a visitor gets, and reads the result back out of the browser's store.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planner-demo <site>/templates/planner --base-url /templates/planner/
 *   node scripts/devtools/drive-tpl010-r23.js <site> --path /templates/planner/ [--shots <dir>]
 *
 * Point the directory at the SITE ROOT and `--path` at the demo (see drive-tpl008-demo.js).
 * Exits 0 when every clause passed, 1 when any did not.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = flag('--shots');
const BASE = (flag('--path') || '/').replace(/\/?$/, '/');
if (!DIR) {
  console.error('usage: drive-tpl010-r23.js <site-dir|https://origin> [--path /templates/planner/] [--shots <dir>]');
  process.exit(2);
}

/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl010Demo.ts`. */
const STORAGE_KEY = 'nodegx-planner-demo-v3';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
};

const LIVE = /^https?:\/\//.test(DIR);
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const js = (expr) => page.evaluate(expr);
  const text = async () => String(await js('document.body.innerText'));
  const store = async () => {
    const raw = await js(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    return typeof raw === 'string' ? JSON.parse(raw) : null;
  };
  const until = async (read, ok, ms = 12000) => {
    const end = Date.now() + ms;
    let last = await read();
    while (!ok(last) && Date.now() < end) {
      await wait(250);
      last = await read();
    }
    return last;
  };
  const press = async (at) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(700);
  };
  const key = async (k) => {
    for (const type of ['keyDown', 'keyUp']) await page.client.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : 13 });
    await wait(600);
  };
  /** The centre of an element found by `finder` (a JS expression returning an element), scrolled into view. */
  const centre = (finder) =>
    js(`(() => {
      const el = ${finder};
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, reachable: !!hit && (hit === el || el.contains(hit) || hit.contains(el)) };
    })()`);
  /** A visible button by its exact words, the last one on the page when several match (the sheets sit last). */
  const buttonFinder = (label, nth = -1) =>
    `(() => { const all = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === ${JSON.stringify(label)} && b.getClientRects().length); return all.at(${nth}); })()`;
  const clickButton = async (label, nth = -1) => {
    const at = await centre(buttonFinder(label, nth));
    if (!at) return false;
    await press(at);
    return true;
  };
  /** A block's tick: the first button of the block whose words are `what`. */
  const tickOf = (what) =>
    `(() => {
      const words = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === ${JSON.stringify(what)} && b.getClientRects().length);
      for (let el = words && words.parentElement; el; el = el.parentElement) {
        const bs = el.querySelectorAll('button');
        if (bs.length >= 4) return bs[0];
      }
      return null;
    })()`;
  /** The box whose label reads `label`, in the last sheet that has one. */
  const boxFinder = (label) =>
    `(() => {
      const labels = [...document.querySelectorAll('label')].filter((l) => (l.textContent || '').trim() === ${JSON.stringify(label)} && l.getClientRects().length);
      const l = labels.at(-1);
      if (!l) return null;
      return (l.htmlFor && document.getElementById(l.htmlFor)) || l.parentElement.querySelector('input, textarea');
    })()`;
  const fill = async (label, value) => {
    const at = await centre(boxFinder(label));
    if (!at) return false;
    await press(at);
    await js(`(() => { const el = ${boxFinder(label)}; el.select && el.select(); })()`);
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await page.client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    if (value !== '') await page.client.send('Input.insertText', { text: String(value) });
    await wait(400);
    return true;
  };
  /** Pick in the last visible Dropdown whose options include `label`. React hears the native setter and a change event. */
  const choose = (label) =>
    js(`(() => {
      const selects = [...document.querySelectorAll('select')].filter((s) => [...s.options].some((o) => o.textContent.trim() === ${JSON.stringify(label)}));
      const s = selects.at(-1);
      if (!s) return false;
      const o = [...s.options].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value);
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  /** Type a date into the last visible date field and commit it the way a person does: Enter. */
  const pickDate = async (iso) => {
    const at = await centre(`[...document.querySelectorAll('input[type=date]')].filter((i) => i.getClientRects().length).at(-1)`);
    if (!at) return false;
    await js(`(() => {
      const i = [...document.querySelectorAll('input[type=date]')].filter((x) => x.getClientRects().length).at(-1);
      i.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, ${JSON.stringify(iso)});
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await key('Enter');
    await js('document.activeElement && document.activeElement.blur()');
    await wait(400);
    return true;
  };
  const tickBox = async (label) => {
    const at = await centre(`[...document.querySelectorAll('label')].filter((l) => (l.textContent || '').trim() === ${JSON.stringify(label)} && l.getClientRects().length).at(-1)`);
    if (!at) return false;
    await press(at);
    return true;
  };
  const checked = (label) =>
    js(`(() => {
      const l = [...document.querySelectorAll('label')].filter((x) => (x.textContent || '').trim() === ${JSON.stringify(label)} && x.getClientRects().length).at(-1);
      const box = l && ((l.htmlFor && document.getElementById(l.htmlFor)) || l.parentElement.querySelector('input'));
      return box ? box.checked : null;
    })()`);
  const valueOf = (label) => js(`(() => { const el = ${boxFinder(label)}; return el ? el.value : null; })()`);
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const envTile = async (name) => {
    const t = await text();
    const i = t.indexOf(name);
    return i < 0 ? '' : t.slice(i, i + 60).replace(/\s+/g, ' ');
  };
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plus = (n) => {
    const d = new Date(today);
    d.setDate(today.getDate() + n);
    return d;
  };
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const short = (d) => `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()}`;
  const byId = (s, coll, id) => (s[coll] || []).find((r) => r.id === id);
  const movesOf = (s, pid) => s.Block.filter((b) => b.isMove && b.projectId === pid);
  /** The card's date field: the only visible one while the card is open and no sheet is. */
  const dateValue = () => js(`(() => { const i = [...document.querySelectorAll('input[type=date]')].filter((x) => x.getClientRects().length).at(-1); return i ? i.value : null; })()`);
  /** A chip on the strip, by whose move it is. */
  const chipFinder = (name) =>
    `[...document.querySelectorAll('.planner-chip')].find((c) => (c.innerText || '').includes(${JSON.stringify(name)}) && c.getClientRects().length)`;
  const chipText = (name) => js(`(() => { const c = ${chipFinder(name)}; return c ? c.innerText.replace(/\\s+/g, ' ') + (c.classList.contains('planner-chip-placed') ? ' [placed]' : '') : null; })()`);
  const openCardOn = async (name) => {
    if (!(await text()).includes('+ New project')) {
      await clickButton('Projects');
      await until(text, (s) => s.includes('+ New project'));
    }
    // Inside the card only: the week behind it has blocks with the same project names on them.
    const at = await centre(`[...document.querySelectorAll('.planner-over div')].filter((d) => d.children.length && [...d.children].some((c) => (c.textContent || '').trim() === ${JSON.stringify(name)}) && d.getClientRects().length).at(0)`);
    if (at) await press(at);
    await wait(500);
  };

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);
  await until(text, (s) => s.includes('Planner') && s.includes('of 2 h'));
  const seeded = await store();

  // ── R7d on arrival: the seed's two live move blocks are placed chips; the rest are not ──
  const coachingChip = await chipText('Coaching offer');
  check('a placed chip carries its day where the ✓ is, faded', /✓ (Mon|Tue|Wed|Thu|Fri|Sat|Sun)/.test(coachingChip || '') && coachingChip.includes('[placed]'), coachingChip);
  const brambleChip0 = await chipText('Bramble & Co');
  check('an unplaced chip has no tick and is not faded', !!brambleChip0 && !brambleChip0.includes('✓') && !brambleChip0.includes('[placed]'), brambleChip0);
  await shot('0-arrival');

  // ── R2.3-1: the card's move box, unplaced: a day from today and 0.5 h; pick a day and 1 h ──
  await openCardOn('Bramble & Co');
  await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  const d0 = await dateValue();
  const h0 = await valueOf('Hours');
  check('the move box opens on a day from today and 0.5 h, with Put it in the week', !!d0 && d0 >= dayKey(today) && h0 === '0.5' && (await text()).includes('Put it in the week'), `date=${d0} hours=${h0}`);
  await shot('1-card-unplaced');
  // D78 in the card: hours typed on one project are not carried to the next.
  await fill('Hours', '2');
  await openCardOn('Northline Languages');
  await until(text, (s) => s.includes('Training days through a broker'));
  const carried = await valueOf('Hours');
  check('hours typed on one project are put back to 0.5 on the next', carried === '0.5', JSON.stringify(carried));
  await openCardOn('Bramble & Co');
  await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  const PICK = plus(3);
  await pickDate(dayKey(PICK));
  await fill('Hours', '1');
  await clickButton('Put it in the week');
  const s1 = await until(store, (s) => movesOf(s, 'seed-bramble').length === movesOf(seeded, 'seed-bramble').length + 1);
  const placed = movesOf(s1, 'seed-bramble').find((b) => !movesOf(seeded, 'seed-bramble').some((x) => x.id === b.id));
  check('Put it in the week writes one move Block on the day picked at the hours typed', !!placed && placed.date === dayKey(PICK) && Number(placed.planned) === 1 && s1.Block.length === seeded.Block.length + 1, JSON.stringify(placed));
  const line1 = await until(text, (s) => s.includes('In the week:'));
  check(`the box reads “In the week: ${short(PICK)} · 1 h”`, line1.includes(`In the week: ${short(PICK)}`) && line1.includes('· 1 h'), line1.slice(line1.indexOf('Next move'), line1.indexOf('Next move') + 160));
  check('placed, the box offers Move it and Take it out, and no Put it in the week', line1.includes('Move it') && line1.includes('Take it out') && !line1.includes('Put it in the week'), '');
  // R7d — in the card's list, the placed move is muted and carries its day.
  check('the list row reads “✓ <day> · <move>”', line1.includes(`✓ ${short(PICK)} · Offer the user-testing add-on`), '');
  await shot('2-card-placed');

  // ── R2.3-2: Move it changes that block's day and nothing else; Take it out deletes it ──
  const MOVE_TO = plus(1);
  await pickDate(dayKey(MOVE_TO));
  await clickButton('Move it');
  const s2 = await until(store, (s) => (byId(s, 'Block', placed.id) || {}).date === dayKey(MOVE_TO));
  const moved = byId(s2, 'Block', placed.id);
  const diff = Object.keys({ ...placed, ...moved }).filter((k) => k !== 'updatedAt' && JSON.stringify(placed[k]) !== JSON.stringify(moved[k]));
  check('Move it changes the block’s date and nothing else', diff.join(',') === 'date' && s2.Block.length === s1.Block.length, `changed: ${diff.join(',')}`);
  const line2 = await until(text, (s) => s.includes(`In the week: ${short(MOVE_TO)}`));
  check('the box follows it', line2.includes(`In the week: ${short(MOVE_TO)}`), '');
  await clickButton('Take it out');
  const s3 = await until(store, (s) => !byId(s, 'Block', placed.id));
  check('Take it out deletes that block and no other', !byId(s3, 'Block', placed.id) && s3.Block.length === s1.Block.length - 1, `${s1.Block.length} → ${s3.Block.length}`);
  const line3 = await until(text, (s) => s.includes('Put it in the week') && !s.includes('In the week:'));
  check('the box returns to the day and hours, at 0.5', line3.includes('Put it in the week') && (await valueOf('Hours')) === '0.5', String(await valueOf('Hours')));

  // ── R2.3-3: placed in NEXT week still reads placed; the chip then opens the card and writes nothing ──
  const NEXT = plus(8);
  await pickDate(dayKey(NEXT));
  await clickButton('Put it in the week');
  const s4 = await until(store, (s) => movesOf(s, 'seed-bramble').some((b) => b.date === dayKey(NEXT)));
  await key('Escape');
  const chipNext = await until(() => chipText('Bramble & Co'), (c) => !!c && c.includes('✓'));
  check('a move put in next week reads placed on this week’s strip, with its date', !!chipNext && chipNext.includes(`✓ ${short(NEXT)}`) && chipNext.includes('[placed]'), chipNext);
  const chipAt = await centre(chipFinder('Bramble & Co'));
  await press(chipAt);
  const opened = await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  await wait(800);
  const s5 = await store();
  check('pressing it opens the card and writes no second block', opened.includes(`In the week: ${short(NEXT)}`) && s5.Block.length === s4.Block.length, `${s4.Block.length} → ${s5.Block.length}`);
  await key('Escape');

  // ── R2.3-4: a move block logged done → the move reads unplaced, with “done” and its day ──
  const coachMove = seeded.Block.find((b) => b.isMove && b.projectId === 'seed-coaching');
  await press(await centre(tickOf(coachMove.what)));
  await until(text, (s) => s.includes('Time logged'));
  await clickButton('Save');
  await until(store, (s) => byId(s, 'Block', coachMove.id).done === true);
  const chipDone = await until(() => chipText('Coaching offer'), (c) => !!c && !c.includes('✓'));
  check('the done move’s chip reads unplaced again', !!chipDone && !chipDone.includes('✓') && !chipDone.includes('[placed]'), chipDone);
  await openCardOn('Coaching offer');
  const doneCard = await until(text, (s) => s.includes('Rung 2 to 3 of the learning brand') && s.includes('Done'));
  const coachDay = new Date(coachMove.date + 'T00:00:00');
  check(`the card says “✓ Done ${short(coachDay)}” and offers the move box again`, doneCard.includes(`✓ Done ${short(coachDay)}`) && doneCard.includes('Put it in the week'), doneCard.slice(doneCard.indexOf('Next move'), doneCard.indexOf('Next move') + 200));
  await shot('3-card-done');
  await key('Escape');

  // ── R2.3-6 / AC3: the chip's one press still writes 0.5 h into the first open day ──
  const s6a = await store();
  const plusAt = await centre(`(() => { const c = ${chipFinder('Meridian Events')}; return c && c.querySelector('button'); })()`);
  await press(plusAt);
  const s6 = await until(store, (s) => movesOf(s, 'seed-meridian').length === movesOf(s6a, 'seed-meridian').length + 1);
  const chipBlock = movesOf(s6, 'seed-meridian').find((b) => !movesOf(s6a, 'seed-meridian').some((x) => x.id === b.id));
  check('AC3 — the chip’s + writes one 0.5 h move block, from today on', !!chipBlock && Number(chipBlock.planned) === 0.5 && chipBlock.date >= dayKey(today), JSON.stringify(chipBlock));

  await page.setViewport({ width: 390, height: 844 });
  await openCardOn('Bramble & Co');
  await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  await shot('4-card-390');
  const sideways = await js('document.documentElement.scrollWidth');
  check('at 390 px the card does not scroll sideways', sideways <= 390, String(sideways));
  await key('Escape');
  await page.setViewport({ width: 1423, height: 680 });
  await wait(600);
  await shot('5-1423x680');
  const errors = [...page.consoleErrors];
  check('logs no console errors', errors.length === 0, JSON.stringify(errors));
})
  .then(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} clauses`);
    process.exit(failed ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
