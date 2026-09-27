/**
 * TPL-010-R2.4 — the planner's three editors, driven as a DEPLOYED demo with real clicks.
 *
 * `tpl010Template.test.ts` runs the guards and the row scripts; this presses the buttons a person
 * presses, in the build a visitor gets, and reads the result back out of the browser's store.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planner-demo <site>/templates/planner --base-url /templates/planner/
 *   node scripts/devtools/drive-tpl010-r24.js <site> --path /templates/planner/ [--shots <dir>]
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
  console.error('usage: drive-tpl010-r24.js <site-dir|https://origin> [--path /templates/planner/] [--shots <dir>]');
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
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dayOf = (i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  };
  const THU = dayOf(3);
  const FRI = dayOf(4);
  const byId = (s, coll, id) => (s[coll] || []).find((r) => r.id === id);

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);

  // ── Arrival (work item 8) ────────────────────────────────────────────────
  const boot = await until(text, (s) => s.includes('Planner') && s.includes('of 2 h'));
  check('arrives with two blocks half logged: “1.75 of 2 h” and “1 of 1.5 h”', boot.includes('1.75 of 2 h') && boot.includes('1 of 1.5 h'), boot.slice(0, 400));
  await shot('0-arrival');

  // ── R2.4-3: + on Thursday → a 1 h block for Uplift in Thursday's column ──
  const before3 = await store();
  const thuLabel = `Thu ${THU.getDate()}`;
  const thuHeadBefore = await js(`(() => { const t = document.body.innerText; const i = t.indexOf(${JSON.stringify(thuLabel)}); return t.slice(i, i + 20); })()`);
  await clickButton('+ Add', 3);
  const sheetNew = await until(text, (s) => s.includes('New block ·'));
  check('+ on Thursday opens the block sheet on a new block on Thursday', sheetNew.includes(`New block · Thursday ${THU.getDate()}`), sheetNew.slice(-600));
  await shot('1-new-block');
  await choose('Uplift');
  await fill('What it is', 'Testing pass, the checkout');
  await fill('Hours planned', '1');
  await clickButton('Put it in the day');
  const after3 = await until(store, (s) => s.Block.length === before3.Block.length + 1);
  const added = after3.Block.find((b) => !before3.Block.some((x) => x.id === b.id));
  check('saving writes one Block: Uplift, Thursday, 1 h', !!added && added.projectId === 'seed-uplift' && added.date === dayKey(THU) && Number(added.planned) === 1, JSON.stringify(added));
  const onWeek = await until(text, (s) => s.includes('Testing pass, the checkout') && !s.includes('New block ·'));
  const thuHeadAfter = await js(`(() => { const t = document.body.innerText; const i = t.indexOf(${JSON.stringify(thuLabel)}); return t.slice(i, i + 20); })()`);
  check('it is in Thursday’s column, the sheet is closed, and Thursday’s header moved by 1 h', onWeek.includes('Testing pass, the checkout') && thuHeadAfter !== thuHeadBefore, `${thuHeadBefore} → ${thuHeadAfter}`);

  // ── R2.4-4: Add time 0.5 h with a note → not done, “0.5 of 1 h”; again with Done → 1 h, done ──
  const billBefore = await envTile('Billable');
  await clickButton('Testing pass, the checkout');
  await until(text, (s) => s.includes('Time logged'));
  check('the words open the sheet with Done off', (await checked('Done — nothing more to do on it')) === false, String(await checked('Done — nothing more to do on it')));
  await fill('Add time, h', '0.5');
  await fill('What you did', 'Checkout, card payments');
  await shot('2-add-time');
  await clickButton('Save');
  const s4a = await until(store, (s) => (byId(s, 'Block', added.id).entries || []).length === 1);
  const b4a = byId(s4a, 'Block', added.id);
  check('Add time 0.5 h leaves it not done, with one entry and its note', b4a.done === false && Number(b4a.actual) === 0.5 && b4a.entries[0].note === 'Checkout, card payments', JSON.stringify(b4a));
  const week4a = await until(text, (s) => s.includes('0.5 of 1 h'));
  check('the week reads “0.5 of 1 h”', week4a.includes('0.5 of 1 h'), '');
  const billMid = await envTile('Billable');
  check('the Billable envelope moved', billMid !== billBefore, `${billBefore} → ${billMid}`);
  await clickButton('Testing pass, the checkout');
  await until(text, (s) => s.includes('0.5 of 1 h logged'));
  await fill('Add time, h', '0.5');
  await fill('What you did', 'Checkout, refunds');
  await tickBox('Done — nothing more to do on it');
  await clickButton('Save');
  const s4b = await until(store, (s) => byId(s, 'Block', added.id).done === true);
  const b4b = byId(s4b, 'Block', added.id);
  check('a second Add time with Done reads 1 h and done, with both notes', b4b.done === true && Number(b4b.actual) === 1 && b4b.entries.map((e) => e.note).join('|') === 'Checkout, card payments|Checkout, refunds', JSON.stringify(b4b));

  // ── R2.4-5: the tick opens the sheet with Done on and what is left; Escape leaves it untouched ──
  const future = s4b.Block.find((b) => b.date === dayKey(FRI) && !b.done && !(b.entries || []).length);
  await page.client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5 });
  const tickAt = await centre(tickOf(future.what));
  await press(tickAt);
  await until(text, (s) => s.includes('Time logged'));
  const tickDone = await checked('Done — nothing more to do on it');
  const tickHours = await valueOf('Add time, h');
  check('the tick opens the sheet with Done on and the hours still to go filled in', tickDone === true && Number(tickHours) === Number(future.planned), `done=${tickDone} hours=${tickHours} planned=${future.planned}`);
  const staleNote = await valueOf('What you did');
  check('the next sheet does not carry the last sheet’s note', staleNote === '', JSON.stringify(staleNote));
  const labelAt = await centre(`[...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && (e.textContent || '').trim() === 'Nothing logged on it yet.' && e.getClientRects().length).at(-1)`);
  if (labelAt) await press(labelAt);
  check('a click on words inside the sheet leaves it open', (await text()).includes('Nothing logged on it yet.'), '');
  await shot('3-tick');
  await key('Escape');
  const s5 = await store();
  const still = await text();
  check('Escape closes it and the block is untouched', !still.includes('Time logged') && JSON.stringify(byId(s5, 'Block', future.id)) === JSON.stringify(future), JSON.stringify(byId(s5, 'Block', future.id)));
  await press(await centre(tickOf(future.what)));
  await until(text, (s) => s.includes('Time logged'));
  await clickButton('Save');
  const s5b = await until(store, (s) => byId(s, 'Block', future.id).done === true);
  check('tick, then Save, logs it at the hours planned', byId(s5b, 'Block', future.id).done === true && Number(byId(s5b, 'Block', future.id).actual) === Number(future.planned), JSON.stringify(byId(s5b, 'Block', future.id)));

  // ── R2.4-6: change a block's day and its project ──
  const mover = s5b.Block.find((b) => b.date === dayKey(FRI) && !b.done && b.id !== future.id) || s5b.Block.find((b) => b.date === dayKey(dayOf(5)) && !b.done);
  await clickButton(mover.what);
  await until(text, (s) => s.includes('Time logged'));
  await choose('Practice group');
  await pickDate(dayKey(THU));
  await clickButton('Save');
  const s6 = await until(store, (s) => byId(s, 'Block', mover.id).date === dayKey(THU));
  const m6 = byId(s6, 'Block', mover.id);
  check('changing the day and the project moves the block and changes whose it is', m6.date === dayKey(THU) && m6.projectId === 'seed-practice', JSON.stringify({ from: [mover.date, mover.projectId], to: [m6.date, m6.projectId] }));

  // ── R2.4-1: + New project, born with a move ──
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickButton('+ New project');
  await until(text, (s) => s.includes('New project') && s.includes('Next move'));
  await fill('Name', 'Harbour Books');
  await fill('One line about it', 'A new retainer, maybe');
  await choose('Billable: a client who pays');
  await fill('Rate, per hour', '75');
  await fill('The move', 'Send the proposal with two prices');
  await fill('What it is worth', '+€600 / mo');
  await fill('When, in words', 'Friday');
  await shot('4-new-project');
  const before1 = await store();
  await clickButton('Save');
  const s1 = await until(store, (s) => s.Project.length === before1.Project.length + 1);
  const born = s1.Project.find((p) => p.name === 'Harbour Books');
  check('+ New project writes a Project with its move', !!born && born.move === 'Send the proposal with two prices' && born.kind === 'earning' && Number(born.rate) === 75, JSON.stringify(born));
  const card1 = await until(text, (s) => s.includes('Harbour Books') && !s.includes('Save\nCancel'));
  check('it is in the card, open on the right', card1.includes('Harbour Books') && card1.includes('Send the proposal with two prices'), card1.slice(0, 300));
  await key('Escape');
  const strip1 = await until(text, (s) => s.includes('Send the proposal with two prices'));
  check('it is on the moves strip without a reload', strip1.includes('Send the proposal with two prices'), '');
  await clickButton('+ Add', 0);
  await until(text, (s) => s.includes('New block ·'));
  const inList = await js(`[...document.querySelectorAll('select')].some((s) => [...s.options].some((o) => o.textContent.trim() === 'Harbour Books'))`);
  check('and in the block sheet’s project list', inList === true, String(inList));
  await key('Escape');

  // ── R2.4-2: Edit changes Bramble's move text and nothing else ──
  const bramble = s1.Project.find((p) => p.id === 'seed-bramble');
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await clickButton('Bramble & Co');
  await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  await clickButton('Edit');
  await until(text, (s) => s.includes('Edit Bramble & Co'));
  await shot('5-edit-project');
  await fill('The move', 'Offer the testing add-on, with a start date');
  await clickButton('Save');
  const s2 = await until(store, (s) => byId(s, 'Project', 'seed-bramble').move !== bramble.move);
  const b2 = byId(s2, 'Project', 'seed-bramble');
  const changed = Object.keys({ ...bramble, ...b2 }).filter((k) => JSON.stringify(bramble[k]) !== JSON.stringify(b2[k]) && k !== 'updatedAt');
  check('Edit changes the move text and nothing else in the row', changed.join(',') === 'move', `changed: ${changed.join(',')} ${JSON.stringify(b2)}`);
  await key('Escape');
  const strip2 = await until(text, (s) => s.includes('Offer the testing add-on, with a start date'));
  check('the chip reads the new text', strip2.includes('Offer the testing add-on, with a start date'), '');

  // ── R2.4-7 moved with TPL-010-M: money is not in Settings any more. Adding an item and changing one so the
  // balance after it moves is driven by drive-tpl010-money.js (Add money, Change the item). ──

  await page.setViewport({ width: 1423, height: 680 });
  await wait(600);
  await shot('7-1423x680');
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
