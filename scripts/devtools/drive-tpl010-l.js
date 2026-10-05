/**
 * TPL-010-L — the todo list's tasks in the week, driven as a DEPLOYED demo with real clicks.
 *
 * The demo seeds two tasks the way the todo list would hold them: *€ Chase Salon Collective’s late
 * payment*, due today (money, so red, and at the top of today), and *Renew the portfolio domain*,
 * due in two days. With a todo address in the settings this reads them off the screen, then:
 *
 * - **L3 (as Richard changed it on 2026-09-23)** — presses the late one: the block sheet opens on it as
 *   a new block with its words and today, *Open in Todo ↗* opens `?task=<id>`, a project is picked and
 *   *Make it a block* writes a `Block` carrying the task's id; the task leaves the week and the block
 *   stays, an ordinary block that still links to its task;
 * - **L4** — *Send to todo* on Bramble & Co's card writes one `Task` and one `Event` saying it came from
 *   Planning, and the card says it is in the todo list;
 * - **AC6** — with a late money task in the week, the evening drawer names it before anything else;
 * - **TPL-010-T** — *Renew the portfolio domain* has two open next actions: both ticked become two blocks,
 *   each carrying its action, with *Planned in Planning* in the task's history (T1, T2); the task leaves
 *   the week (T1c); finishing one ticks its action with the block's note (T1b); the block sheet and the
 *   project card show the history (T3).
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs templates/planning-demo <site>/templates/planning --base-url /templates/planning/ --allow-development-engine
 *   node scripts/devtools/drive-tpl010-l.js <site> --path /templates/planning/ [--shots <dir>]
 *
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
  console.error('usage: drive-tpl010-l.js <site-dir|https://origin> [--path /templates/planning/] [--shots <dir>]');
  process.exit(2);
}

/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl010Demo.ts`. */
const STORAGE_KEY = 'nodegx-planner-demo-v3';
const LATE = '€ Chase Salon Collective’s late payment';
const LATER = 'Renew the portfolio domain';

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
  const store = async () => JSON.parse(await js(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`));
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
    if (!at) return false;
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(700);
    return true;
  };
  const key = async (k) => {
    for (const type of ['keyDown', 'keyUp']) await page.client.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: k === 'Escape' ? 27 : 13 });
    await wait(600);
  };
  const centre = (finder) =>
    js(`(() => {
      const el = ${finder};
      if (!el) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
  const button = (label) =>
    `[...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === ${JSON.stringify(label)} && b.getClientRects().length).at(-1)`;
  const clickButton = async (label) => press(await centre(button(label)));
  const words = (what) =>
    `[...document.querySelectorAll('.planner-day button')].find((b) => (b.textContent || '').trim() === ${JSON.stringify(what)} && b.getClientRects().length)`;
  /** The block a set of words sits in: the nearest ancestor holding its four buttons. */
  const blockOf = (what) =>
    `(() => {
      const w = ${words(what)};
      for (let el = w && w.parentElement; el; el = el.parentElement) if (el.querySelectorAll('button').length >= 4) return el;
      return null;
    })()`;
  const read = (what) =>
    js(`(() => {
      const b = ${blockOf(what)};
      if (!b) return null;
      const day = b.closest('.planner-day');
      return {
        text: b.innerText.replace(/\\s+/g, ' ').trim(),
        edge: getComputedStyle(b).borderLeftColor,
        day: day ? day.innerText.split('\\n')[0] : '',
        firstWords: day ? [...day.querySelectorAll('button')].map((x) => x.textContent.trim()).filter(Boolean).slice(0, 3) : []
      };
    })()`);
  const boxFinder = (label) =>
    `(() => {
      const labels = [...document.querySelectorAll('label')].filter((l) => (l.textContent || '').trim() === ${JSON.stringify(label)} && l.getClientRects().length);
      const l = labels.at(-1);
      if (!l) return null;
      return (l.htmlFor && document.getElementById(l.htmlFor)) || l.parentElement.querySelector('input, textarea');
    })()`;
  const valueOf = (label) => js(`(() => { const el = ${boxFinder(label)}; return el ? el.value : null; })()`);
  const choose = (label) =>
    js(`(() => {
      const selects = [...document.querySelectorAll('select')].filter((s) => [...s.options].some((o) => o.textContent.trim() === ${JSON.stringify(label)}) && s.getClientRects().length);
      const s = selects.at(-1);
      if (!s) return false;
      const o = [...s.options].find((x) => x.textContent.trim() === ${JSON.stringify(label)});
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, o.value);
      s.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
  const sheetOpen = () => js(`[...document.querySelectorAll('label')].some((l) => l.textContent.trim() === 'What it is' && l.getClientRects().length)`);
  const opened = () => js('JSON.stringify(window.__opened || [])');
  const spyOpen = () => js(`window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; };`);
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const label = (d) => `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()}`;
  const plus = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };
  const sunday = today.getDay() === 0;
  const TODO = 'https://todo.example.org';
  const withStore = (fn) =>
    js(`(() => {
      const s = JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)}));
      (${fn})(s);
      localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, JSON.stringify(s));
    })()`);

  await page.setViewport({ width: 1280, height: 900 });
  await page.navigate(BASE);
  await js(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);
  await until(text, (s) => s.includes(LATE));
  // As a person does in Settings: the todo list's address.
  await withStore(`(s) => { s.Settings[0].todoUrl = ${JSON.stringify(TODO)}; }`);
  await page.navigate(BASE);
  await until(text, (s) => s.includes(LATE));
  check('L6 — the bar shows Todo ↗ once there is an address', await js(`!!${button('Todo ↗')}`), 'no Todo ↗');

  // ── L2 — where the two tasks land ──
  const red = await js(`(() => { const d = document.createElement('div'); d.style.color = 'var(--destructive)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })()`);
  const late = await read(LATE);
  if (sunday) {
    check('(Sunday: today is not one of the six columns — the placement clauses are skipped)', true);
  } else {
    check('L2 — the money task due today is in today’s column, first', !!late && late.day.startsWith(label(today)) && late.firstWords.includes(LATE), JSON.stringify(late));
    check('L2 — …saying where it came from, a quarter of an hour', !!late && late.text.includes('From todo') && !late.text.includes('was due') && late.text.includes('0.25 h'), JSON.stringify(late && late.text));
    check('L7 — the money task has the red edge', !!late && late.edge === red, `${late && late.edge} vs ${red}`);
  }
  const later = await read(LATER);
  const laterInWeek = plus(2).getDay() !== 0 && (plus(2).getDay() + 6) % 7 >= (today.getDay() + 6) % 7;
  if (laterInWeek) {
    check('L2 — the plain task is on its own day, not red', !!later && later.day.startsWith(label(plus(2))) && later.edge !== red && later.text.includes('From todo'), JSON.stringify(later));
  }
  await shot('1-week-with-tasks');

  // ── L3 — a press opens the block sheet on the task, as a new block made from it ──
  await spyOpen();
  await press(await centre(words(LATE)));
  const sheet = await until(text, (s) => s.includes('Make it a block'), 4000);
  check('L3 — pressing a task opens the block sheet, titled From todo', (await sheetOpen()) && sheet.includes('From todo · '), sheet.slice(0, 300));
  check('L3 — …with the task’s words and half an hour', (await valueOf('What it is')) === LATE && (await valueOf('Hours planned')) === '0.5', `${await valueOf('What it is')} / ${await valueOf('Hours planned')}`);
  check('L3 — …and nothing opened in a new tab', (await opened()) === '[]', await opened());
  await clickButton('Open in Todo ↗');
  check('L5 — Open in Todo ↗ opens the task by its id', (await opened()) === JSON.stringify([`${TODO}?task=seed-task-invoice`]), await opened());
  await shot('2-sheet-from-todo');
  await choose('Salon Collective');
  await clickButton('Make it a block');
  const made = await until(store, (s) => (s.Block || []).some((b) => b.todoTaskId === 'seed-task-invoice'), 6000);
  const madeBlock = (made.Block || []).find((b) => b.todoTaskId === 'seed-task-invoice');
  check('L3 — Make it a block writes a Block carrying the task’s id and the project picked', !!madeBlock && madeBlock.projectId === 'seed-salon' && madeBlock.what === LATE && madeBlock.planned === 0.5 && madeBlock.date === dayKey(sunday ? plus(-1) : today), JSON.stringify(madeBlock));
  check('L3 — …and the sheet closes', !(await until(sheetOpen, (o) => !o, 3000)), 'still open');
  const after = await until(() => read(LATE), (r) => !!r && !r.text.includes('From todo'));
  check('L3 — the task leaves the week and the block stands for it, as an ordinary block', !!after && after.text.includes('Salon Collective') && !after.text.includes('From todo') && after.edge !== red, JSON.stringify(after));
  const madeCount = (await text()).split(LATE).length - 1;
  check('L3 — …drawn once, not twice', madeCount === 1, String(madeCount));
  check('L1 — the task itself is untouched (still open in the todo list)', (made.Task || []).find((t) => t.id === 'seed-task-invoice')?.status === 'open', JSON.stringify(made.Task));
  // T2 — a task with no next actions says so too: one line, naming the project, the day and the hours.
  const lateLine = await until(store, (s) => (s.Event || []).some((e) => e.kind === 'planned' && e.taskId === 'seed-task-invoice'), 4000);
  const lateSaid = (lateLine.Event || []).filter((e) => e.kind === 'planned' && e.taskId === 'seed-task-invoice').map((e) => e.summary);
  check('T2 — making it a block writes “Planned in Planning” in the task’s history', lateSaid.length === 1 && lateSaid[0] === `Planned in Planning: Salon Collective, ${label(sunday ? plus(-1) : today)}, 0.5 h`, JSON.stringify(lateSaid));

  // The block made from it still links back.
  await spyOpen();
  await press(await centre(words(LATE)));
  await until(sheetOpen, Boolean, 4000);
  check('the block made from a task opens as a block (Save, not Make it a block)', !(await text()).includes('Make it a block') && (await js(`!!${button('Save')}`)), (await text()).slice(0, 200));
  await clickButton('Open in Todo ↗');
  check('…and still opens its task in the todo list', (await opened()) === JSON.stringify([`${TODO}?task=seed-task-invoice`]), await opened());
  await clickButton('✕');
  await until(sheetOpen, (o) => !o, 3000);

  // The name on a task opens the sheet too, never the project card.
  if (laterInWeek) {
    const nameAt = await centre(`[...(${blockOf(LATER)}).querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('From todo'))`);
    await press(nameAt);
    const t = await until(text, (s) => s.includes('Make it a block'), 4000);
    check('L3 — the name on a task opens the sheet, not the card', t.includes('Make it a block') && !t.includes('+ New project'), t.slice(0, 200));
    await clickButton('✕');
    await until(sheetOpen, (o) => !o, 3000);
  }

  // ── TPL-010-T — the domain task's next actions into blocks, and the history on both sides ──
  const PRICE = 'Check what the renewal costs';
  const PAY = 'Pay for two years';
  if (sunday) {
    check('(Sunday: today is not one of the six columns — the TPL-010-T clauses are skipped)', true);
  } else {
    // Due today, so it is on screen whatever day the drive runs.
    await withStore(`(s) => { s.Task.find((t) => t.id === 'seed-task-domain').deadline = ${JSON.stringify(dayKey(today))}; }`);
    await page.navigate(BASE);
    await until(text, (s) => s.includes(LATER));
    await press(await centre(words(LATER)));
    const acts = await until(text, (s) => s.includes('Its next actions'), 4000);
    check('T1 — a task with next actions opens the sheet listing the open ones, the first ticked', acts.includes(`☑ ${PRICE}`) && acts.includes(`☐ ${PAY}`) && !acts.includes('Find the registrar login'), acts.slice(0, 400));
    check('T1 — …in place of the box for its words, and one block to make', !(await sheetOpen()) && (await js(`!!${button('Make it a block')}`)), `what box shown=${await sheetOpen()}`);
    await clickButton(`☐ ${PAY}`);
    const two = await until(text, (s) => s.includes(`☑ ${PAY}`), 3000);
    check('T1 — ticking a second one makes it two blocks', two.includes(`☑ ${PAY}`) && (await js(`!!${button('Make 2 blocks')}`)), two.slice(0, 400));
    await shot('5-two-actions-ticked');
    await choose('Bramble & Co');
    await clickButton('Make 2 blocks');
    const planned = await until(store, (s) => (s.Block || []).filter((b) => b.todoTaskId === 'seed-task-domain').length === 2 && (s.Event || []).filter((e) => e.kind === 'planned' && e.taskId === 'seed-task-domain').length === 2, 8000);
    const fromActs = (planned.Block || []).filter((b) => b.todoTaskId === 'seed-task-domain');
    check(
      'T1 — two Blocks, each carrying its action, under the project picked, half an hour today',
      fromActs.map((b) => `${b.what}|${b.todoActionId}|${b.projectId}|${b.planned}|${b.date}`).sort().join(' / ') ===
        [`${PRICE}|seed-action-price|seed-bramble|0.5|${dayKey(today)}`, `${PAY}|seed-action-pay|seed-bramble|0.5|${dayKey(today)}`].sort().join(' / '),
      JSON.stringify(fromActs)
    );
    const plannedLines = (planned.Event || []).filter((e) => e.kind === 'planned' && e.taskId === 'seed-task-domain').map((e) => e.summary).sort();
    check(
      'T2 — the task’s history in the todo list says each was planned, with the project, day and hours',
      plannedLines.join(' / ') === [`Planned in Planning: ${PRICE} — Bramble & Co, ${label(today)}, 0.5 h`, `Planned in Planning: ${PAY} — Bramble & Co, ${label(today)}, 0.5 h`].sort().join(' / '),
      JSON.stringify(plannedLines)
    );
    const madeLines = (planned.PlanEvent || []).filter((h) => fromActs.some((b) => b.id === h.blockId)).map((h) => h.summary);
    check('T3 — each block starts its own history', madeLines.length === 2 && madeLines.every((m) => m === `Made from the todo list · ${label(today)} · 0.5 h`), JSON.stringify(madeLines));
    const gone = await until(text, (s) => !s.includes(LATER), 4000);
    check('T1c — every open action is a block, so the task leaves the week; its two blocks are drawn', !gone.includes(LATER) && gone.includes(PRICE) && gone.includes(PAY), gone.slice(0, 300));
    check('T1 — …and the sheet closed', !(await until(sheetOpen, (o) => !o, 2000)), 'still open');

    // T1b — finishing the Pay block ticks the action in the todo list, with the note as its answer.
    await press(await centre(`(${blockOf(PAY)}).querySelector('button')`));
    await until(sheetOpen, Boolean, 4000);
    await press(await centre(boxFinder('What you did')));
    await page.client.send('Input.insertText', { text: 'Paid, two years' });
    await wait(400);
    await clickButton('Save');
    const told = await until(store, (s) => (s.Action || []).find((a) => a.id === 'seed-action-pay')?.done === true, 8000);
    const payAction = (told.Action || []).find((a) => a.id === 'seed-action-pay');
    check('T1b — the action is ticked in the todo list, the note as its “what happened?”', !!payAction && payAction.done === true && payAction.note === 'Paid, two years', JSON.stringify(payAction));
    const doneLine = await until(store, (s) => (s.Event || []).some((e) => e.kind === 'action-done' && e.taskId === 'seed-task-domain'), 4000);
    const tickLine = (doneLine.Event || []).find((e) => e.kind === 'action-done' && e.taskId === 'seed-task-domain');
    check('T2 — …and the task’s history says it was ticked off in Planning, the note under it', !!tickLine && tickLine.summary === `Ticked off “${PAY}” in Planning · 0.5 h` && tickLine.body === 'Paid, two years', JSON.stringify(tickLine));
    check('L1 — the task itself is still open (Planning never closes a task)', (told.Task || []).find((t) => t.id === 'seed-task-domain')?.status === 'open', 'closed');
    check('T1b — the other action is untouched', (told.Action || []).find((a) => a.id === 'seed-action-price')?.done === false, 'ticked');

    // T3 — the block's history, at the bottom of its sheet.
    await until(sheetOpen, (o) => !o, 3000);
    await press(await centre(words(PAY)));
    const story = await until(text, (s) => /history/i.test(s) && s.includes('Made from the todo list'), 4000);
    check('T3 — the block sheet shows its history, newest first', /0\.5 h logged · done[\s\S]*Paid, two years[\s\S]*Made from the todo list/.test(story), story.slice(-400));
    await shot('6-block-history');
    await clickButton('✕');
    await until(sheetOpen, (o) => !o, 3000);
  }

  // ── L4 — Send to todo from Bramble & Co's card ──
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  const cardAt = await centre(`[...document.querySelectorAll('.planner-over div')].filter((d) => d.children.length && [...d.children].some((c) => (c.textContent || '').trim() === 'Bramble & Co') && d.getClientRects().length).at(0)`);
  await press(cardAt);
  await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  check('L4 — the card offers Send to todo', await js(`!!${button('Send to todo')}`), 'no button');
  const before = await store();
  const move = before.Project.find((p) => p.id === 'seed-bramble');
  await clickButton('Send to todo');
  const sentStore = await until(store, (s) => (s.Event || []).some((e) => e.summary === 'Sent from Planning'), 6000);
  const task = (sentStore.Task || []).find((t) => t.title === move.move);
  const event = (sentStore.Event || []).find((e) => e.summary === 'Sent from Planning');
  const lastOpen = Math.max(...before.Task.filter((t) => t.status === 'open').map((t) => t.position));
  check('L4 — one Task at the end of the list with the move’s words and day', !!task && task.status === 'open' && task.deadline === move.moveDue && task.position === lastOpen + 1, JSON.stringify(task));
  check('L4 — one Event saying it came from Planning, on that task', !!event && !!task && event.taskId === task.id && event.kind === 'created', JSON.stringify(event));
  const card = await until(text, (s) => s.includes('In your todo list'), 6000);
  check('L4 — the card says it is in the todo list, and the button is gone', card.includes('✓ In your todo list, due ') && !(await js(`!!${button('Send to todo')}`)), card.slice(0, 200));
  check('L4 — sent once', (sentStore.Task || []).filter((t) => t.title === move.move).length === 1, 'twice');
  await clickButton('✕');
  await until(text, (s) => !s.includes('+ New project'), 3000);
  const chipSays = await js(`(() => { const c = [...document.querySelectorAll('.planner-chip')].find((x) => x.innerText.includes('Bramble & Co')); return c ? c.innerText.replace(/\\s+/g, ' ').trim() : null; })()`);
  check('L4 — the move’s chip says it is in the todo list', !!chipSays && chipSays.includes('in todo'), String(chipSays));
  await clickButton('Projects');
  await until(text, (s) => s.includes('+ New project'));
  await press(await centre(`[...document.querySelectorAll('.planner-over div')].filter((d) => d.children.length && [...d.children].some((c) => (c.textContent || '').trim() === 'Bramble & Co') && d.getClientRects().length).at(0)`));
  await until(text, (s) => s.includes('Retainer, monthly, 14 h'));
  // T3 — the card's history: the send, and (on a weekday) the blocks made from the domain task's actions.
  const cardLog = await until(text, (s) => s.includes('Sent to the todo list'), 4000);
  check('T3 — the project card shows its history, the send first', cardLog.includes('Sent to the todo list, due '), cardLog.slice(-600));
  if (!sunday) check('T3 — …and each block’s lines, naming the block', cardLog.includes(`“${PAY}” · 0.5 h logged · done`) && cardLog.includes(`“${PRICE}” · Made from the todo list`), cardLog.slice(-600));
  await shot('3-sent-to-todo');
  await clickButton('✕');

  // ── AC6 — a late money task is the evening's first concern ──
  await withStore(`(s) => { s.Task.push({ id: 'drive-late', title: 'Invoice Uplift for the testing pass', status: 'open', deadline: ${JSON.stringify(dayKey(plus(-2)))}, position: 99 }); }`);
  await page.navigate(BASE);
  await until(text, (s) => s.includes('Invoice Uplift for the testing pass'));
  if (!sunday) {
    const overdue = await read('Invoice Uplift for the testing pass');
    check('L2 — a task past its deadline sits at the top of today and says when it was due', !!overdue && overdue.day.startsWith(label(today)) && overdue.firstWords.includes('Invoice Uplift for the testing pass') && overdue.text.includes(`was due ${label(plus(-2))}`), JSON.stringify(overdue));
  }
  await clickButton('Shut down');
  const drawer = await until(text, (s) => s.includes('money todo'), 6000);
  check('AC6 — the drawer says “One money todo is overdue” and names it', drawer.includes('One money todo is overdue: "Invoice Uplift for the testing pass"'), drawer.slice(0, 500));
  await shot('4-shutdown');

  const blocks = (await store()).Block.filter((b) => String(b.id).startsWith('todo-')).length;
  check('AC2 — no Block row was written under a task’s id', blocks === 0, String(blocks));
  const sw = await js('document.documentElement.scrollWidth');
  check('nothing scrolls sideways at 1280', sw <= 1280, String(sw));
  check('logs no console errors', page.consoleErrors.length === 0, JSON.stringify(page.consoleErrors));
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
