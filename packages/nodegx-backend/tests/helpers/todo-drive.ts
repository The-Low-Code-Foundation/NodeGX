/**
 * TPL-008 — what the todo list's two drives do to a page: find a button beside some
 * words, click words, wait for a reading. One copy, for the template's drive against a
 * backend and the demo's drive against the browser alone.
 *
 * @module nodegx-backend/tests/helpers/todo-drive
 */
import { clickAt } from './members-drive';
import type { RenderedPage } from './site-drive';

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Read until `ok`, or throw with the last reading — so a step that stops says what it last saw. */
export async function until<T>(label: string, read: () => Promise<T>, ok: (v: T) => boolean, ms = 20_000): Promise<T> {
  const deadline = Date.now() + ms;
  let last: T = await read();
  while (!ok(last)) {
    if (Date.now() > deadline) throw new Error(`${label}: gave up after ${ms}ms; last reading ${JSON.stringify(last)}`);
    await wait(300);
    last = await read();
  }
  return last;
}

export const text = async (page: RenderedPage): Promise<string> => String(await page.evaluate('document.body.innerText'));
export const pathname = async (page: RenderedPage): Promise<string> => String(await page.evaluate('location.pathname'));

/**
 * The Nth button in the smallest element around a piece of text that holds
 * exactly `count` buttons — a task row holds three (up, down, close), an open next
 * action's line holds three (tick, up, down), a ticked one holds one (tick). Scrolled
 * into view, then clicked as a real pointer press.
 */
export async function clickButtonBeside(page: RenderedPage, label: string, count: number, index: number): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      var want = ${JSON.stringify(label)};
      var leaves = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === want;
      });
      for (var i = 0; i < leaves.length; i++) {
        for (var el = leaves[i].parentElement; el; el = el.parentElement) {
          var bs = el.querySelectorAll('button');
          if (bs.length === 0) continue;
          if (bs.length !== ${count}) break;
          var b = bs[${index}];
          b.scrollIntoView({ block: 'center', behavior: 'instant' });
          var r = b.getBoundingClientRect();
          return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: !!b.disabled });
        }
      }
      return 'absent:' + leaves.length;
    })()`)
  );
  if (found.startsWith('absent')) throw new Error(`no ${count}-button element around "${label}" (${found})`);
  const at = JSON.parse(found) as { x: number; y: number; disabled: boolean };
  if (at.disabled) throw new Error(`button ${index} beside "${label}" is disabled`);
  await clickAt(page, at.x, at.y);
}

/** Click the words themselves — a task title opens it, a next action's title folds out its description. */
export async function clickWords(page: RenderedPage, words: string): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      var want = ${JSON.stringify(words)};
      var el = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === want;
      })[0];
      if (!el) return 'absent';
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.left + Math.min(20, r.width / 2), y: r.top + r.height / 2 });
    })()`)
  );
  if (found === 'absent') throw new Error(`no element reads "${words}"`);
  const at = JSON.parse(found) as { x: number; y: number };
  await clickAt(page, at.x, at.y);
}

/** The button inside the smallest element that also holds the field with this placeholder. */
export async function clickButtonByField(page: RenderedPage, buttonLabel: string, placeholder: string): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      var field = Array.prototype.filter.call(document.querySelectorAll('input, textarea'), function (i) {
        return (i.getAttribute('placeholder') || '').indexOf(${JSON.stringify(placeholder)}) === 0;
      })[0];
      if (!field) return 'no field';
      for (var el = field.parentElement; el; el = el.parentElement) {
        var b = Array.prototype.filter.call(el.querySelectorAll('button'), function (x) {
          return (x.innerText || '').trim() === ${JSON.stringify(buttonLabel)};
        })[0];
        if (!b) continue;
        b.scrollIntoView({ block: 'center', behavior: 'instant' });
        var r = b.getBoundingClientRect();
        return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      return 'no button';
    })()`)
  );
  if (!found.startsWith('{')) throw new Error(`"${buttonLabel}" beside "${placeholder}": ${found}`);
  const at = JSON.parse(found) as { x: number; y: number };
  await clickAt(page, at.x, at.y);
}

export async function blur(page: RenderedPage): Promise<void> {
  await page.evaluate('(function () { if (document.activeElement) document.activeElement.blur(); return true; })()');
  await wait(800);
}

/**
 * The theme switch: how many of its two buttons are in the page, and which are drawn AND
 * on top at their own centre. The stylesheet hides one of the pair, so `inDom: 2` is the
 * known-firing half beside "only one shows".
 */
/**
 * 🔴 D77 (2026-09-21) made the two buttons a character each — ☾ and ☼ — so they no longer read "Use dark
 * theme" / "Use light theme", and this found none: every theme reading went red with "no theme switch is
 * drawn" (measured 2026-09-23, TPL-008-RC). Both spellings are matched, and a glyph is REPORTED by the name
 * it stands for, so the assertions keep saying which one shows.
 */
const THEME_BUTTON = `function themeName(b) {
  var t = (b.textContent || '').trim();
  return t === '\u263e' ? 'Use dark theme' : t === '\u263c' ? 'Use light theme' : /^Use (dark|light) theme$/.test(t) ? t : '';
}`;

export async function themeSwitches(page: RenderedPage): Promise<{ inDom: number; shown: string[] }> {
  return JSON.parse(
    String(
      await page.evaluate(`(function () {
        ${THEME_BUTTON}
        window.scrollTo(0, 0);
        var all = Array.prototype.filter.call(document.querySelectorAll('button'), function (b) {
          return themeName(b) !== '';
        });
        var shown = all.filter(function (b) {
          var r = b.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && (hit === b || b.contains(hit));
        }).map(themeName);
        return JSON.stringify({ inDom: all.length, shown: shown });
      })()`)
    )
  ) as { inDom: number; shown: string[] };
}

/** Press whichever theme switch is drawn. */
export async function clickThemeSwitch(page: RenderedPage): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      ${THEME_BUTTON}
      window.scrollTo(0, 0);
      var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) {
        return themeName(x) !== '' && x.getBoundingClientRect().width > 0;
      })[0];
      if (!b) return 'absent';
      var r = b.getBoundingClientRect();
      return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    })()`)
  );
  if (found === 'absent') throw new Error('no theme switch is drawn');
  const at = JSON.parse(found) as { x: number; y: number };
  await clickAt(page, at.x, at.y);
}

/** Whether the LAST button with this label is disabled — or `'absent'` when there is none. */
export const buttonDisabled = async (page: RenderedPage, label: string): Promise<unknown> =>
  page.evaluate(`(function () {
    var b = Array.prototype.filter.call(document.querySelectorAll('button'), function (x) {
      return (x.innerText || '').trim() === ${JSON.stringify(label)};
    });
    return b.length === 0 ? 'absent' : b[b.length - 1].disabled;
  })()`);

/** A pointer press on the centre of the first element matching `selector`, scrolled into view. */
async function pressSelector(page: RenderedPage, selector: string): Promise<boolean> {
  const at = String(
    await page.evaluate(`(function () {
      var e = document.querySelector(${JSON.stringify(selector)});
      if (!e) return 'absent';
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      var r = e.getBoundingClientRect();
      return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    })()`)
  );
  if (at === 'absent') return false;
  const { x, y } = JSON.parse(at) as { x: number; y: number };
  await clickAt(page, x, y);
  return true;
}

/**
 * Set the deadline the way a person with a mouse does (2026-09-16: the field became the Date
 * Picker): press the field, page the calendar forward until the day is there, press the day.
 * Returns what the page showed on the way, so the drive can assert it was a calendar at all.
 */
export async function pickDate(page: RenderedPage, iso: string): Promise<{ inputType: string; calendarOpened: boolean }> {
  const inputType = String(await page.evaluate(`(document.querySelector('.ndg-dp-input') || {}).type || 'absent'`));
  if (!(await pressSelector(page, '.ndg-dp-input'))) throw new Error('pickDate: no date picker field on the page');
  const calendarOpened = await until('calendar open', () => page.evaluate(`!!document.querySelector('.ndg-dp-pop')`), (v) => v === true, 5_000)
    .then(() => true)
    .catch(() => false);
  if (!calendarOpened) return { inputType, calendarOpened };
  for (let i = 0; i < 24; i++) {
    if (await pressSelector(page, `.ndg-dp-pop [data-day="${iso}"]`)) return { inputType, calendarOpened };
    if (!(await pressSelector(page, '.ndg-dp-pop [data-nav="1"]'))) break;
  }
  throw new Error(`pickDate: ${iso} never appeared in the calendar`);
}

/**
 * s8 — **a next action's title is a field now, so its row cannot be found by its words.**
 * `clickButtonBeside` walks up from a leaf whose `textContent` is the title, and an
 * `<input>` has none. This walks up from the field *holding* `value` instead, to the
 * smallest element around it with exactly `count` buttons: an open next action's line
 * holds four (tick, description, up, down) and a ticked one two (tick, description).
 */
export async function clickButtonBesideField(page: RenderedPage, value: string, count: number, index: number): Promise<void> {
  const found = String(
    await page.evaluate(`(function () {
      var want = ${JSON.stringify(value)};
      var fields = Array.prototype.filter.call(document.querySelectorAll('input, textarea'), function (i) {
        return i.value === want;
      });
      for (var i = 0; i < fields.length; i++) {
        for (var el = fields[i].parentElement; el; el = el.parentElement) {
          var bs = el.querySelectorAll('button');
          if (bs.length === 0) continue;
          if (bs.length !== ${count}) break;
          var b = bs[${index}];
          b.scrollIntoView({ block: 'center', behavior: 'instant' });
          var r = b.getBoundingClientRect();
          return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: !!b.disabled });
        }
      }
      return 'absent:' + fields.length + ':' + JSON.stringify(Array.prototype.map.call(document.querySelectorAll('input, textarea'), function (i) { return i.value; }));
    })()`)
  );
  if (found.startsWith('absent')) throw new Error(`no ${count}-button element around the field holding "${value}" (${found})`);
  const at = JSON.parse(found) as { x: number; y: number; disabled: boolean };
  if (at.disabled) throw new Error(`button ${index} beside the field holding "${value}" is disabled`);
  await clickAt(page, at.x, at.y);
}

/** Type `next` into the field that currently holds `value`, replacing it — a rename in place. */
export async function retypeField(page: RenderedPage, value: string, next: string): Promise<void> {
  const client = (page as unknown as { client: { send(m: string, p: unknown): Promise<unknown> } }).client;
  const ok = String(
    await page.evaluate(`(function () {
      var el = Array.prototype.filter.call(document.querySelectorAll('input, textarea'), function (i) {
        return i.value === ${JSON.stringify(value)};
      })[0];
      if (!el) return 'absent';
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      el.focus();
      el.value = '';
      return 'ok';
    })()`)
  );
  if (ok !== 'ok') throw new Error(`retypeField: no field holds "${value}"`);
  await client.send('Input.insertText', { text: next });
  await wait(400);
}

// ── 2026-09-24: the grip replaced ▲ ▼ ────────────────────────────────────────

/** Where a row's grip is, and the middle of another row — each row found by its words, or by the field holding them. */
async function gripAndTarget(page: RenderedPage, title: string, onto: string): Promise<{ from: { x: number; y: number }; to: { x: number; y: number }; down: boolean }> {
  const found = String(
    await page.evaluate(`(function () {
      function rowOf(want) {
        var el = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
          return e.children.length === 0 && (e.textContent || '').trim() === want;
        })[0] || Array.prototype.filter.call(document.querySelectorAll('input, textarea'), function (i) { return i.value === want; })[0];
        return el ? el.closest('.todo-drag-row') : null;
      }
      var a = rowOf(${JSON.stringify(title)}), b = rowOf(${JSON.stringify(onto)});
      if (!a || !b) return 'absent:' + !!a + ':' + !!b;
      var grip = a.querySelector('.todo-drag-handle');
      if (!grip) return 'no grip';
      a.scrollIntoView({ block: 'center', behavior: 'instant' });
      var g = grip.getBoundingClientRect(), t = b.getBoundingClientRect(), s = a.getBoundingClientRect();
      var down = t.top > s.top;
      // Past the target's middle, so the drop lands on its side of it.
      return JSON.stringify({ from: { x: g.left + g.width / 2, y: g.top + g.height / 2 }, to: { x: g.left + g.width / 2, y: t.top + t.height / 2 + (down ? 6 : -6) }, down: down });
    })()`)
  );
  if (!found.startsWith('{')) throw new Error(`drag "${title}" onto "${onto}": ${found}`);
  return JSON.parse(found);
}

/**
 * Drag the row reading `title` by its grip until it is over the row reading `onto`, then let go — as a
 * mouse does, or as a finger does (`touch`: CDP touch events, which Chrome turns into pointer events of
 * type `touch`, the phone's path). Twelve steps, so the rows it passes have time to slide.
 */
export async function dragRow(page: RenderedPage, title: string, onto: string, how: 'mouse' | 'touch' = 'mouse'): Promise<void> {
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<unknown> } }).client;
  const { from, to } = await gripAndTarget(page, title, onto);
  const steps = 12;
  const at = (k: number) => ({ x: Math.round(from.x), y: Math.round(from.y + ((to.y - from.y) * k) / steps) });
  if (how === 'mouse') {
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at(0).x, y: at(0).y, button: 'left', buttons: 1, clickCount: 1 });
    for (let k = 1; k <= steps; k++) {
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at(k), button: 'left', buttons: 1 });
      await wait(30);
    }
    await wait(150);
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at(steps), button: 'left', buttons: 0, clickCount: 1 });
  } else {
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at(0)] });
    for (let k = 1; k <= steps; k++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at(k)] });
      await wait(30);
    }
    await wait(150);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    // Off again, or the page stays a touch screen and the Date picker hands out the phone's own picker.
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  }
  await wait(1200);
}

/** Focus the grip of the row reading `title` and press an arrow key on it — the keyboard's way to move. */
export async function arrowOnGrip(page: RenderedPage, title: string, key: 'ArrowUp' | 'ArrowDown'): Promise<void> {
  const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<unknown> } }).client;
  const ok = String(
    await page.evaluate(`(function () {
      var el = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
        return e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(title)};
      })[0];
      var grip = el && el.closest('.todo-drag-row') && el.closest('.todo-drag-row').querySelector('.todo-drag-handle');
      if (!grip) return 'absent';
      grip.focus();
      return document.activeElement === grip ? 'ok' : 'not focused';
    })()`)
  );
  if (ok !== 'ok') throw new Error(`arrowOnGrip "${title}": ${ok}`);
  // Headless Chrome drops key events on an unfocused page unless focus is emulated, on this connection.
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const code = key;
  const keyCode = key === 'ArrowUp' ? 38 : 40;
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
  await wait(1200);
}
