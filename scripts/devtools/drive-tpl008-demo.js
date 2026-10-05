/**
 * TPL-008 AC10 — the todo list demo, driven as a DEPLOYED site (a folder, or the live host).
 *
 * `packages/nodegx-backend/tests/tpl008-todo-demo-drive.test.ts` grades the project through
 * `render-from-disk`. This grades what `nodegx deploy` wrote — the production engine, the
 * `--base-url` rewrite, the host's own headers — which is the thing a visitor gets.
 *
 * Usage:
 *   node packages/noodl-preview/dist/nodegx-deploy.cjs <demo-project> <site>/templates/todo-list --base-url /templates/todo-list/
 *   node scripts/devtools/drive-tpl008-demo.js <site> --path /templates/todo-list/ [--shots <dir>]
 *   node scripts/devtools/drive-tpl008-demo.js https://nodegx.io --path /templates/todo-list/
 *
 * 🔴 Point the directory at the SITE ROOT and `--path` at the demo, as TPL-006's drive does:
 * served at `/`, a `--base-url` build asks for `/templates/<slug>/index-<hash>.js` and renders
 * blank. Every clause here needs the example list on screen, so a blank page fails all of them.
 *
 * Clicks are real CDP mouse events — the deadline is pressed out of the Date Picker's calendar. Exits 0 when every clause passed, 1 when any did.
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
  console.error('usage: drive-tpl008-demo.js <site-dir|https://origin> [--path /templates/todo-list/] [--shots <dir>]');
  process.exit(2);
}

/** `DEMO_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Demo.ts`. */
const STORAGE_KEY = 'nodegx-todo-list-demo-v1';
const SEEDED = ['Write the release notes', 'Book the van in for its MOT', 'Chase the accountant about VAT'];
const ADDED = 'Try the demo on a phone';
const LINKS = 'Check the links';
const BACKEND_SHAPE = `performance.getEntriesByType('resource').map(function (e) { return e.name; }).filter(function (n) {
  return /\\/(classes|users|login|logout|functions|__backend|parse)(\\/|\\?|$)/.test(n);
})`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${saw}`}`);
};

const LIVE = /^https?:\/\//.test(DIR);
withDeployedSite(LIVE ? { origin: DIR } : { dir: DIR, port: 0 }, async (page) => {
  const text = async () => String(await page.evaluate('document.body.innerText'));
  const store = async () => {
    const raw = await page.evaluate(`localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`);
    return typeof raw === 'string' ? JSON.parse(raw) : null;
  };
  const openTitles = async () =>
    ((await store())?.Task || [])
      .filter((t) => t.status !== 'done')
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((t) => t.title);
  const until = async (read, ok, ms = 15000) => {
    const end = Date.now() + ms;
    let last = await read();
    while (!ok(last) && Date.now() < end) {
      await wait(300);
      last = await read();
    }
    return last;
  };
  const press = async (at) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
    }
    await wait(900);
  };
  /** A button by its visible label (or its hidden name, for icon buttons), optionally inside the row that holds `within`. */
  const clickButton = async (label, within) => {
    const at = await page.evaluate(`(() => {
      const want = ${JSON.stringify(label)}, who = ${JSON.stringify(within || '')};
      const hits = [...document.querySelectorAll('button')].filter((b) => {
        if ((b.textContent || '').trim() !== want) return false;
        if (!who) return true;
        for (let el = b.parentElement; el; el = el.parentElement) {
          if ((el.innerText || '').includes(who)) return el.querySelectorAll('button').length <= 3;
        }
        return false;
      });
      const b = hits[0];
      if (!b) return null;
      b.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!at) return false;
    await press(at);
    return true;
  };
  const type = async (placeholderStart, value) => {
    const at = await page.evaluate(`(() => {
      const f = [...document.querySelectorAll('input, textarea')].find((i) => (i.getAttribute('placeholder') || '').startsWith(${JSON.stringify(placeholderStart)}));
      if (!f) return null;
      f.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = f.getBoundingClientRect();
      return { x: r.left + 20, y: r.top + r.height / 2 };
    })()`);
    if (!at) return false;
    await press(at);
    await page.client.send('Input.insertText', { text: value });
    await wait(400);
    return true;
  };
  /**
   * 2026-09-24 — the grip replaced ▲ ▼. Drag the row holding `title` (words, or a field's value) by its
   * grip until it is over the row holding `onto`, as a mouse or as a finger. `midShot` names a picture
   * taken while it is still held.
   */
  const drag = async (title, onto, how, midShot) => {
    const g = await page.evaluate(`(() => {
      const rowOf = (want) => {
        const el = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === want)
          || [...document.querySelectorAll('input, textarea')].find((i) => i.value === want);
        return el ? el.closest('.todo-drag-row') : null;
      };
      const a = rowOf(${JSON.stringify(title)}), b = rowOf(${JSON.stringify(onto)});
      const grip = a && a.querySelector('.todo-drag-handle');
      if (!grip || !b) return null;
      a.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = grip.getBoundingClientRect(), t = b.getBoundingClientRect(), f = a.getBoundingClientRect();
      const down = t.top > f.top;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, ty: t.top + t.height / 2 + (down ? 6 : -6) };
    })()`);
    if (!g) return false;
    const steps = 12;
    const at = (k) => ({ x: Math.round(g.x), y: Math.round(g.y + ((g.ty - g.y) * k) / steps) });
    if (how === 'touch') {
      await page.client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
      await page.client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at(0)] });
      for (let k = 1; k <= steps; k++) { await page.client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at(k)] }); await wait(30); }
      if (midShot) await shot(midShot);
      await page.client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      // 🔴 Off again: left on, the page is a touch screen, and the Date picker rightly hands the next
      // clause the phone's own picker instead of its calendar (measured — the calendar clause went red).
      await page.client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    } else {
      await page.client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at(0), button: 'left', buttons: 1, clickCount: 1 });
      for (let k = 1; k <= steps; k++) { await page.client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at(k), button: 'left', buttons: 1 }); await wait(30); }
      if (midShot) await shot(midShot);
      await page.client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at(steps), button: 'left', buttons: 0, clickCount: 1 });
    }
    await wait(1200);
    return true;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };

  await page.setViewport({ width: 1280, height: 1100 });
  await page.navigate(BASE);
  // A clean visitor: whatever an earlier run left in this origin's storage is not theirs.
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
  await page.navigate(BASE);

  // ── The first visit ──────────────────────────────────────────────────────
  const boot = await until(text, (s) => s.includes(SEEDED[2]));
  const at = SEEDED.map((t) => boot.indexOf(t));
  check('opens on the example list, in order', at.every((i, k) => i >= 0 && (k === 0 || at[k - 1] < i)), JSON.stringify(at));
  check('says it is a demo and offers Reset demo, with no sign in', boot.includes('This is a demo.') && boot.includes('Reset demo') && !/Sign (in|out)/.test(boot), boot.slice(0, 300));
  check('draws the overdue task in words', boot.includes('Overdue by 1 day'), boot.slice(0, 300));
  const seeded = await store();
  // TPL-008-RC: the example list also has things that repeat, with lines of their own — the task lines are 13.
  const taskLines = (s) => s.Event.filter((e) => !String(e.taskId).startsWith('seed-routine-')).length;
  check('puts the example list in this browser', !!seeded && seeded.Task.length === 4 && taskLines(seeded) === 13, JSON.stringify(seeded && [seeded.Task.length, taskLines(seeded)]));
  await shot('1-first-visit');

  // ── A change ─────────────────────────────────────────────────────────────
  const typed = await type('Add a task', ADDED);
  const added = typed && (await clickButton('Add', null)) && (await until(openTitles, (t) => t.includes(ADDED)));
  check('a task typed and added is written at the bottom', Array.isArray(added) && added[added.length - 1] === ADDED, JSON.stringify(added));
  await until(text, (s) => s.includes(ADDED));
  // 2026-09-24: dragged by its grip with a mouse, one place up (onto the task above it).
  const above = (await openTitles())[2];
  await drag(ADDED, above, 'mouse', '1b-mid-drag');
  const moved = await until(openTitles, (t) => t[2] === ADDED);
  check('dragging its grip over the task above moves it there', moved[2] === ADDED, JSON.stringify(moved));
  await wait(1200);
  const lines = ((await store())?.Event || []).filter((e) => e.kind === 'moved' && !String(e.taskId).startsWith('seed')).map((e) => e.summary);
  check('and writes the line saying so', JSON.stringify(lines) === JSON.stringify(['Moved #4 → #3']), JSON.stringify(lines));

  // ── 2026-09-24: a next action dragged by its grip, and a task by a finger on a phone ──
  // 🔴 Here, not at the end: after the theme and s8 steps a reload of this page draws NOTHING (empty
  // #root, every script 200, no error) — measured the same on the build from before the grip, so it
  // is this drive's page state, not the app. Reset demo below puts the example list back regardless.
  await page.setViewport({ width: 1280, height: 1100 });
  await page.navigate(BASE);
  await until(text, (s) => s.includes(SEEDED[0]));
  const openWords = async (words) => {
    const at = await page.evaluate(`(() => {
      const e = [...document.querySelectorAll('body *')].find((x) => x.children.length === 0 && (x.textContent || '').trim() === ${JSON.stringify(words)});
      if (!e) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = e.getBoundingClientRect();
      return { x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 };
    })()`);
    if (at) await press(at);
    return !!at;
  };
  await openWords(SEEDED[0]);
  await until(text, (s) => s.includes('Next actions'));
  await type('Add a next action', LINKS);
  // 🔴 ITS Add — the first "Add" on the page is the task list's.
  const addAction = await page.evaluate(`(() => {
    const f = [...document.querySelectorAll('input')].find((i) => (i.getAttribute('placeholder') || '').startsWith('Add a next action'));
    for (let el = f && f.parentElement; el; el = el.parentElement) {
      const b = [...el.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === 'Add');
      if (b) { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    }
    return null;
  })()`);
  if (addAction) await press(addAction);
  const notesId = ((await store())?.Task || []).find((t) => t.title === SEEDED[0])?.id;
  const openActions = async () =>
    ((await store())?.Action || []).filter((a) => a.taskId === notesId && !a.done).sort((a, b) => Number(a.position) - Number(b.position)).map((a) => a.title);
  const withLinks = await until(openActions, (a) => a[a.length - 1] === LINKS);
  await wait(800);
  await drag(LINKS, withLinks[0], 'mouse');
  const actionsAfter = await until(openActions, (a) => a[0] === LINKS);
  check('a next action dragged by its grip to the top is first', actionsAfter[0] === LINKS, JSON.stringify({ before: withLinks, after: actionsAfter }));
  await shot('2d-action-dragged');

  await page.setViewport({ width: 390, height: 844, mobile: true });
  await page.navigate(BASE);
  // The last task is dragged onto the first.
  const phoneList = await until(openTitles, (t) => t.length >= 2);
  await until(text, (s) => s.includes(phoneList[phoneList.length - 1]));
  await wait(800);
  const lastNow = phoneList[phoneList.length - 1];
  await drag(lastNow, phoneList[0], 'touch', '3-phone-mid-drag');
  const onPhone = await until(openTitles, (t) => t[0] === lastNow);
  check('on a phone a finger on the grip drags a task to the top', onPhone[0] === lastNow, JSON.stringify({ before: phoneList, after: onPhone }));
  const phoneWidth = await page.evaluate('document.documentElement.scrollWidth');
  check('and nothing scrolls sideways', phoneWidth === 390, String(phoneWidth));
  await shot('3b-phone-after');
  await page.setViewport({ width: 1280, height: 1100 });


  // ── It is still there ────────────────────────────────────────────────────
  const before = JSON.stringify(await store());
  await page.navigate(BASE);
  const again = await until(text, (s) => s.includes(ADDED));
  check('a reload keeps it', again.includes(ADDED) && JSON.stringify(await store()) === before, again.slice(0, 200));
  await shot('2-after-reload');

  // ── Reset ────────────────────────────────────────────────────────────────
  await clickButton('Reset demo', null);
  const reset = await until(openTitles, (t) => t.length === 3 && !t.includes(ADDED));
  const resetText = await until(text, (s) => !s.includes(ADDED));
  check('Reset demo puts the example list back', JSON.stringify(reset) === JSON.stringify(SEEDED) && !resetText.includes(ADDED), JSON.stringify(reset));

  // ── A deadline, from the calendar (2026-09-16: the field became the Date Picker) ─
  // Five days out: always in the future, at most one calendar page away, and inside "Due in N days".
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  const SOON = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}-${String(soon.getDate()).padStart(2, '0')}`;
  const centre = (selector) =>
    page.evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(selector)});
      if (!e) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
  const titleAt = await page.evaluate(`(() => {
    const leaf = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(SEEDED[0])});
    if (!leaf) return null;
    const r = leaf.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (titleAt) await press(titleAt);
  const fieldAt = await until(() => centre('.ndg-dp-input'), (v) => !!v, 5000);
  const inputType = await page.evaluate(`(document.querySelector('.ndg-dp-input') || {}).type || 'absent'`);
  if (fieldAt) await press(fieldAt);
  const calendar = await until(() => page.evaluate(`!!document.querySelector('.ndg-dp-pop')`), (v) => v === true, 5000);
  await shot('2b-calendar');
  for (let i = 0; calendar && i < 3; i++) {
    const day = await centre(`.ndg-dp-pop [data-day="${SOON}"]`);
    if (day) {
      await press(day);
      break;
    }
    const next = await centre('.ndg-dp-pop [data-nav="1"]');
    if (next) await press(next);
  }
  const written = await until(async () => ((await store())?.Task || []).find((t) => t.title === SEEDED[0])?.deadline, (d) => d === SOON);
  const said = await until(text, (s) => s.includes('Due in 5 days'));
  check(
    'a deadline is picked from a calendar, stored, and said in words',
    inputType === 'date' && calendar === true && written === SOON && said.includes('Due in 5 days'),
    JSON.stringify({ inputType, calendar, written, wanted: SOON, said: said.includes('Due in 5 days') })
  );
  await clickButton('Reset demo', null);
  await until(openTitles, (t) => JSON.stringify(t) === JSON.stringify(SEEDED));

  // ── Light and dark (the system decides, the switch at the top right overrides) ─
  // `THEME_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Theme.ts`; the grounds are `--background` of each palette.
  const THEME_KEY = 'nodegx-todo-list-theme';
  const TO_DARK = '☾';
  const TO_LIGHT = '☼';
  const THEME_GLYPH = /^[☾☼]$/;
  const LIGHT = 'rgb(245, 245, 243)';
  const DARK = 'rgb(22, 23, 24)';
  const system = (value) => page.client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
  const look = async () =>
    JSON.parse(
      String(
        await page.evaluate(`JSON.stringify({
          ground: getComputedStyle(document.body).backgroundColor,
          stored: localStorage.getItem(${JSON.stringify(THEME_KEY)}),
          inDom: [...document.querySelectorAll('button')].filter((b) => ${THEME_GLYPH}.test((b.textContent || '').trim())).length,
          shown: [...document.querySelectorAll('button')]
            .filter((b) => ${THEME_GLYPH}.test((b.textContent || '').trim()) && b.getBoundingClientRect().width > 0)
            .map((b) => b.textContent.trim())
        })`)
      )
    );
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`);
  await system('light');
  const light = await until(look, (l) => l.ground === LIGHT);
  check('a light system draws light, with only the moon showing', light.ground === LIGHT && light.inDom === 2 && JSON.stringify(light.shown) === JSON.stringify([TO_DARK]), JSON.stringify(light));
  await system('dark');
  const dark = await until(look, (l) => l.ground === DARK);
  check('a dark system draws dark, with only the sun showing, and nothing remembered', dark.ground === DARK && dark.inDom === 2 && JSON.stringify(dark.shown) === JSON.stringify([TO_LIGHT]) && dark.stored === null, JSON.stringify(dark));
  await clickButton(TO_LIGHT, null);
  const chosen = await until(look, (l) => l.ground === LIGHT);
  check('the switch picks light on a dark system, and remembers it', chosen.ground === LIGHT && chosen.stored === 'light', JSON.stringify(chosen));
  await page.navigate(BASE);
  await until(text, (s) => s.includes(SEEDED[2]));
  const kept = await until(look, (l) => l.ground === LIGHT, 5000);
  check('a reload keeps the choice', kept.ground === LIGHT && kept.stored === 'light', JSON.stringify(kept));
  await shot('3-light-chosen-on-dark');
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`);
  await system('light');

  // ── s8: a next action's title is a field, and Save writes AND closes the description ──
  // Richard, 2026-09-20: *"I can't edit a 'next action' title, and when I type a description
  // I can't save or exit the description input field."* Both are graded here, on the built
  // site, because both were invisible to every clause above.
  const ACT = 'Lead with the templates';
  const ACT_RENAMED = 'Lead with the templates first';
  const DESC = 'Three new ones went out this month.';
  const boxes = async () => Number(await page.evaluate(`document.querySelectorAll('textarea[placeholder="Add a description"]').length`));
  /** The nth button on the line of the action whose TITLE FIELD holds `value` — an input has no text. */
  const buttonBesideField = (value, count, index) =>
    page.evaluate(`(() => {
      const fields = [...document.querySelectorAll('input, textarea')].filter((i) => i.value === ${JSON.stringify(value)});
      for (const f of fields) {
        for (let el = f.parentElement; el; el = el.parentElement) {
          const bs = el.querySelectorAll('button');
          if (bs.length === 0) continue;
          if (bs.length !== ${count}) break;
          const b = bs[${index}];
          b.scrollIntoView({ block: 'center', behavior: 'instant' });
          const r = b.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      }
      return null;
    })()`);
  const storedAction = async () =>
    ((await store())?.Action || []).find((a) => a.title === ACT || a.title === ACT_RENAMED);

  // Open the task again: a reload closed the detail pane.
  const listTitle = await page.evaluate(`(() => {
    const leaf = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify('Write the release notes')});
    if (!leaf) return null;
    leaf.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = leaf.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (listTitle) await press(listTitle);
  // Since the grip (2026-09-24) an open action's line holds two buttons: the tick and Description.
  await until(async () => (await buttonBesideField(ACT, 2, 1)) !== null, (v) => v === true, 8000);

  const descBtn = await buttonBesideField(ACT, 2, 1);
  if (descBtn) await press(descBtn);
  const boxOpened = await until(boxes, (n) => n === 1, 6000);
  // The box opens holding what is already there, so clear it before typing.
  await page.evaluate(`(() => {
    const f = [...document.querySelectorAll('textarea')].find((i) => (i.getAttribute('placeholder') || '') === 'Add a description');
    if (f) { f.focus(); f.value = ''; }
  })()`);
  const typedDesc = await type('Add a description', DESC);
  await clickButton('Save', null);
  const describedRow = await until(storedAction, (a) => a && a.description === DESC);
  const boxAfterSave = await until(boxes, (n) => n === 0, 6000);
  check(
    's8: Description opens a box, and Save writes it and shuts it',
    boxOpened === 1 && typedDesc === true && describedRow?.description === DESC && boxAfterSave === 0,
    JSON.stringify({ boxOpened, typedDesc, wrote: describedRow?.description, boxAfterSave })
  );

  // The title is a field: type over it and press Enter, as the task's title works.
  const caret = await page.evaluate(`(() => {
    const f = [...document.querySelectorAll('input, textarea')].find((i) => i.value === ${JSON.stringify(ACT)});
    if (!f) return null;
    f.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = f.getBoundingClientRect();
    return { x: r.left + 20, y: r.top + r.height / 2 };
  })()`);
  let renamedRow = null;
  if (caret) {
    await press(caret);
    await page.evaluate(`(() => {
      const f = [...document.querySelectorAll('input, textarea')].find((i) => i.value === ${JSON.stringify(ACT)});
      if (f) { f.focus(); f.value = ''; }
    })()`);
    await page.client.send('Input.insertText', { text: ACT_RENAMED });
    await wait(400);
    for (const type of ['keyDown', 'keyUp']) {
      await page.client.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    }
    renamedRow = await until(storedAction, (a) => a && a.title === ACT_RENAMED);
  }
  check(
    's8: a next action’s title is a field — typing over it and pressing Enter renames it',
    !!caret && renamedRow?.title === ACT_RENAMED,
    JSON.stringify({ foundField: !!caret, title: renamedRow?.title })
  );
  await shot('2c-next-action');

  // ── Nothing else was asked ───────────────────────────────────────────────
  const errors = [...page.consoleErrors];
  const netErrors = [...page.networkErrors];
  check('logs no console errors', errors.length === 0, JSON.stringify(errors));
  check('no request failed', netErrors.length === 0, JSON.stringify(netErrors));
  const asked = JSON.parse(String(await page.evaluate(`JSON.stringify(${BACKEND_SHAPE})`)));
  await page.evaluate("fetch('classes/Probe').then(() => 1, () => 0)");
  await wait(1200);
  const probe = JSON.parse(String(await page.evaluate(`JSON.stringify(${BACKEND_SHAPE})`)));
  check('asks no backend anything (beside a control request the same reading sees)', asked.length === 0 && probe.some((n) => n.includes('/classes/Probe')), JSON.stringify({ asked, probe }));
  await page.evaluate(`localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`);
})
  .then(() => {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} clauses`);
    process.exit(failed === 0 && results.length > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
