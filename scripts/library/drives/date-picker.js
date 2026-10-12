#!/usr/bin/env node
/**
 * Does the Date Picker pick a date — with a real mouse and real keys?
 *
 * The prefab this replaced (2026-09-16) LOOKED like it worked in every static check: its popup
 * was removed on the field's blur, and a mouse press on a day blurs the field first, so the click
 * that picked the day never arrived. A synthetic `element.click()` skips that press entirely and
 * would have graded the broken one green. So every interaction here is `Input.dispatch*Event`.
 *
 * What it asserts, in order:
 *   1. an incoming Value shows, nothing fires at boot, and nothing is fetched from a CDN;
 *   2. a mouse press on a day picks it, closes the calendar, and `Changed` sees the NEW Value
 *      (a listener reading Value on `Changed` is how every consumer uses it);
 *   3. Escape closes without changing anything;
 *   4. the keyboard: Alt+↓ opens on the selected day, → moves into the next month, Enter picks;
 *   5. a typed change (↑ on a segment) commits on blur, not on the keystroke;
 *   6. Clear clears;
 *   7. a half-deleted date puts the last value back instead of clearing it;
 *   8. if the calendar throws on open, the field hands itself back to the system picker;
 *   9. unmounted and mounted again, it draws a fresh field holding the date it last held;
 *  10. on a touch screen the system picker is the picker from the start;
 *  11. reused for the next record (P78-D81), Reset puts that record's day over a pick, even when it
 *      is the same day the field was given before — and a pick survives any other input changing.
 *
 * Run: node scripts/library/drives/date-picker.js [--shots <dir>]
 */
const fs = require('fs');
const path = require('path');
const { buildDriveProject, makeReporter, REPO_ROOT } = require('./harness');
const { withRenderedPage } = require(path.join(REPO_ROOT, 'scripts/devtools/render-report'));

const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const READ = `JSON.stringify({
  texts: Array.from(document.querySelectorAll('*'))
    .map((e) => (e.childNodes.length === 1 && e.firstChild.nodeType === 3 ? e.textContent.trim() : ''))
    .filter((t) => /^(value=|changed=|seen=)/.test(t)),
  input: (document.querySelector('.ndg-dp-input') || {}).value,
  enhanced: !!document.querySelector('.ndg-dp--enhanced'),
  popup: !!document.querySelector('.ndg-dp-pop'),
  title: (document.querySelector('.ndg-dp-title') || {}).textContent || '',
  focusedDay: document.activeElement && document.activeElement.getAttribute ? document.activeElement.getAttribute('data-day') : null,
  focusIsInput: document.activeElement === document.querySelector('.ndg-dp-input'),
  cdn: performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /jsdelivr|unpkg|cdnjs/.test(n))
})`;

(async () => {
  const dir = buildDriveProject('date-picker', {
    subjectParameters: { Value: '2026-09-14', Label: 'Deadline', 'Show Label': true, 'First Day Of Week': 1 },
    subjectParent: 'wrap',
    nodes: [
      // A component instance has no `mounted`, so the subject sits in a Group a button unmounts.
      { id: 'wrap', type: 'Group', parameters: { sizeMode: 'contentHeight' }, onPage: true },
      { id: 'toggle', type: 'net.noodl.controls.button', parameters: { label: 'toggle' }, onPage: true },
      { id: 'shown', type: 'Switch', parameters: { onFromStart: true } },
      { id: 'valueText', type: 'Text', parameters: { text: 'value=' }, onPage: true },
      { id: 'countText', type: 'Text', parameters: { text: 'changed=0' }, onPage: true },
      { id: 'seenText', type: 'Text', parameters: { text: 'seen=' }, onPage: true },
      { id: 'counter', type: 'Counter', parameters: { startValue: 0 } },
      { id: 'fmtV', type: 'String Format', parameters: { format: 'value={v}' } },
      { id: 'fmtC', type: 'String Format', parameters: { format: 'changed={n}' } },
      // Reads Value only when Changed pulses — the way a real consumer does.
      {
        id: 'onChanged',
        type: 'JavaScriptFunction',
        parameters: { functionScript: "Outputs.seen = 'seen=' + Inputs.v;", 'runOnChange-in-v': false }
      }
    ],
    connections: [
      { sourceId: 'subject', sourcePort: 'Value', targetId: 'fmtV', targetPort: 'v' },
      { sourceId: 'fmtV', sourcePort: 'formatted', targetId: 'valueText', targetPort: 'text' },
      { sourceId: 'subject', sourcePort: 'Changed', targetId: 'counter', targetPort: 'increase' },
      { sourceId: 'counter', sourcePort: 'currentCount', targetId: 'fmtC', targetPort: 'n' },
      { sourceId: 'fmtC', sourcePort: 'formatted', targetId: 'countText', targetPort: 'text' },
      { sourceId: 'subject', sourcePort: 'Value', targetId: 'onChanged', targetPort: 'in-v' },
      { sourceId: 'subject', sourcePort: 'Changed', targetId: 'onChanged', targetPort: 'run' },
      { sourceId: 'onChanged', sourcePort: 'out-seen', targetId: 'seenText', targetPort: 'text' },
      { sourceId: 'toggle', sourcePort: 'onClick', targetId: 'shown', targetPort: 'flip' },
      { sourceId: 'shown', sourcePort: 'state', targetId: 'wrap', targetPort: 'mounted' }
    ]
  });

  const r = makeReporter();
  await withRenderedPage({ projectDir: dir }, async (s) => {
    const send = (m, p) => s.client.send(m, p);
    await s.setViewport({ width: 1280, height: 900 });
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    const read = async () => JSON.parse(await s.evaluate(READ));
    const text = (st, prefix) => (st.texts.find((t) => t.startsWith(prefix)) || prefix).slice(prefix.length);
    const center = async (selector) =>
      JSON.parse(
        await s.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return 'null';
          const b = e.getBoundingClientRect(); return JSON.stringify({ x: b.left + b.width / 2, y: b.top + b.height / 2 }); })()`)
      );
    const click = async (selector) => {
      const at = await center(selector);
      if (!at) throw new Error(`nothing to click at ${selector}`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await wait(60);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await wait(250);
    };
    const KEYS = {
      Enter: { code: 'Enter', keyCode: 13, text: '\r' },
      Escape: { code: 'Escape', keyCode: 27 },
      ArrowDown: { code: 'ArrowDown', keyCode: 40 },
      ArrowUp: { code: 'ArrowUp', keyCode: 38 },
      ArrowRight: { code: 'ArrowRight', keyCode: 39 },
      Backspace: { code: 'Backspace', keyCode: 8 },
      Tab: { code: 'Tab', keyCode: 9 }
    };
    const key = async (name, modifiers = 0) => {
      const k = KEYS[name];
      const base = { key: name, code: k.code, windowsVirtualKeyCode: k.keyCode, nativeVirtualKeyCode: k.keyCode, modifiers };
      await send('Input.dispatchKeyEvent', { type: k.text ? 'keyDown' : 'rawKeyDown', ...base, ...(k.text ? { text: k.text } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await wait(200);
    };
    const shot = async (name) => {
      if (!SHOTS) return;
      fs.mkdirSync(SHOTS, { recursive: true });
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
    };

    // 1 — at rest
    await wait(500);
    const boot = await read();
    r.check('incoming Value shows in the field', boot.input === '2026-09-14', boot.input);
    r.check('Value output mirrors it', text(boot, 'value=') === '2026-09-14', text(boot, 'value='));
    r.check('nothing fires at boot', text(boot, 'changed=') === '0', text(boot, 'changed='));
    r.check('calendar enhancement is on (mouse)', boot.enhanced);
    r.check('nothing fetched from a CDN', boot.cdn.length === 0, boot.cdn.join(', '));

    // 2 — mouse pick
    await click('.ndg-dp-input');
    const opened = await read();
    r.check('a click on the field opens the calendar', opened.popup);
    r.check('on the month of the value', /September 2026|2026/.test(opened.title), opened.title);
    await shot('01-open');
    await click('.ndg-dp-pop [data-day="2026-09-30"]');
    const picked = await read();
    r.check('a mouse press on a day picks it', picked.input === '2026-09-30', picked.input);
    r.check('and closes the calendar', !picked.popup, picked.popup ? s.consoleErrors.slice(-3).join(' | ').slice(0, 400) : '');
    r.check('Changed fired once', text(picked, 'changed=') === '1', text(picked, 'changed='));
    r.check('Changed sees the NEW Value', text(picked, 'seen=') === '2026-09-30', text(picked, 'seen='));

    // 3 — Escape
    await click('.ndg-dp-button');
    await click('.ndg-dp-pop [data-nav="1"]');
    const nextMonth = await read();
    r.check('the calendar button opens it; › shows the next month', nextMonth.popup && /October|2026-10/.test(nextMonth.title), nextMonth.title);
    await key('Escape');
    const escaped = await read();
    r.check('Escape closes without a change', !escaped.popup && text(escaped, 'changed=') === '1');

    // 4 — keyboard
    await s.evaluate(`document.querySelector('.ndg-dp-input').focus(), 1`);
    await key('ArrowDown', 1 /* Alt */);
    const kOpen = await read();
    r.check('Alt+↓ opens with focus on the selected day', kOpen.popup && kOpen.focusedDay === '2026-09-30', `focus ${kOpen.focusedDay}`);
    await key('ArrowRight');
    const kMoved = await read();
    r.check('→ crosses into the next month', kMoved.focusedDay === '2026-10-01' && /October|2026-10/.test(kMoved.title), `${kMoved.focusedDay} ${kMoved.title}`);
    await shot('02-keyboard');
    await key('Enter');
    const kPicked = await read();
    r.check('Enter picks it', kPicked.input === '2026-10-01' && text(kPicked, 'changed=') === '2', `${kPicked.input} changed=${text(kPicked, 'changed=')}`);
    r.check('focus goes back to the field', kPicked.focusIsInput && !kPicked.popup);

    // 5 — typed change waits for blur
    await key('Escape');
    await key('ArrowUp');
    const typed = await read();
    r.check('a typed change shows at once', typed.input !== '2026-10-01', typed.input);
    r.check('but does not fire on the keystroke', text(typed, 'changed=') === '2', text(typed, 'changed='));
    await s.evaluate(`document.querySelector('.ndg-dp-input').blur(), 1`);
    await wait(300);
    const blurred = await read();
    r.check('it commits on blur', text(blurred, 'changed=') === '3' && text(blurred, 'value=') === typed.input, `changed=${text(blurred, 'changed=')} value=${text(blurred, 'value=')}`);

    // 6 — Clear
    await click('.ndg-dp-input');
    await click('.ndg-dp-pop [data-pick="clear"]');
    const cleared = await read();
    r.check('Clear empties it and fires', cleared.input === '' && text(cleared, 'changed=') === '4' && text(cleared, 'seen=') === '', `"${cleared.input}" changed=${text(cleared, 'changed=')} seen="${text(cleared, 'seen=')}"`);

    // 7 — half a date restores
    await click('.ndg-dp-input');
    await click('.ndg-dp-pop [data-pick="today"]');
    const todayPicked = await read();
    await s.evaluate(`document.querySelector('.ndg-dp-input').focus(), 1`);
    await key('Escape');
    await key('Backspace');
    const half = await read();
    await s.evaluate(`document.querySelector('.ndg-dp-input').blur(), 1`);
    await wait(300);
    const restored = await read();
    r.check('a half-deleted date is put back on blur, not cleared', half.input === '' && restored.input === todayPicked.input && text(restored, 'changed=') === text(todayPicked, 'changed='),
      `during "${half.input}", after "${restored.input}", changed ${text(todayPicked, 'changed=')}→${text(restored, 'changed=')}`);

    // 8 — the calendar throws: the system picker takes over
    await s.evaluate(`(() => { const real = window.getComputedStyle; window.getComputedStyle = function () { window.getComputedStyle = real; throw new Error('drive: forced failure'); }; return 1; })()`);
    await click('.ndg-dp-input');
    const failed = await read();
    r.check('a calendar that throws hands back to the system picker', !failed.popup && !failed.enhanced, `popup=${failed.popup} enhanced=${failed.enhanced}`);
    const indicator = await s.evaluate(`getComputedStyle(document.querySelector('.ndg-dp-input'), '::-webkit-calendar-picker-indicator').display`);
    r.check('and its calendar button is visible again', indicator !== 'none', indicator);

    // 9 — remount
    const held = (await read()).input;
    await click('button:not(.ndg-dp-button):not([data-day])');
    const gone = await read();
    await click('button:not(.ndg-dp-button):not([data-day])');
    await wait(300);
    const back = await read();
    r.check('unmounting removes the field', gone.input === undefined, String(gone.input));
    r.check('a remount draws it again, enhanced, holding its last date', back.input === held && back.enhanced, `"${back.input}" (held "${held}") enhanced=${back.enhanced}`);
  });

  // 9 — touch: a fresh page with touch emulation from before the first paint
  await withRenderedPage({ projectDir: dir, chromeArgs: ['--touch-events=enabled'] }, async (s) => {
    await s.client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await s.client.send('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
    await s.evaluate('location.reload(), 1');
    await wait(2500);
    const touch = JSON.parse(await s.evaluate(READ));
    const coarse = await s.evaluate(`matchMedia('(pointer: fine)').matches`);
    r.check('touch: the system picker is the picker (no enhancement)', coarse === false && touch.input === '2026-09-14' && !touch.enhanced,
      `pointer:fine=${coarse} value=${touch.input} enhanced=${touch.enhanced}`);
  });

  // 11 — P78-D81: one field reused for the next record. Value arrives from a Variable, the way a form
  // reads a record's day. Setting it to the value it already holds re-runs nothing (DEF-046), so only
  // Reset can put the next record's day back over a pick. Relabel is the control: another input re-runs
  // the script (its aria-label moves) and a pick must survive that.
  const dir2 = buildDriveProject('date-picker', {
    subjectParameters: { 'First Day Of Week': 1 },
    nodes: [
      { id: 'day', type: 'Variable2', parameters: { name: 'dpDay' } },
      { id: 'label', type: 'Variable2', parameters: { name: 'dpLabel' } },
      { id: 'setEmpty', type: 'Set Variable', parameters: { name: 'dpDay', setWith: 'emptyString' } },
      { id: 'set14', type: 'Set Variable', parameters: { name: 'dpDay', setWith: 'string', value: '2026-09-14' } },
      { id: 'setLabel', type: 'Set Variable', parameters: { name: 'dpLabel', setWith: 'string', value: 'Ends' } },
      { id: 'next', type: 'net.noodl.controls.button', parameters: { label: 'next record' }, onPage: true },
      { id: 'open14', type: 'net.noodl.controls.button', parameters: { label: 'open the 14th' }, onPage: true },
      { id: 'relabel', type: 'net.noodl.controls.button', parameters: { label: 'relabel' }, onPage: true },
      { id: 'valueText', type: 'Text', parameters: { text: 'value=' }, onPage: true },
      { id: 'countText', type: 'Text', parameters: { text: 'changed=0' }, onPage: true },
      { id: 'counter', type: 'Counter', parameters: { startValue: 0 } },
      { id: 'fmtV', type: 'String Format', parameters: { format: 'value={v}' } },
      { id: 'fmtC', type: 'String Format', parameters: { format: 'changed={n}' } }
    ],
    connections: [
      { sourceId: 'day', sourcePort: 'value', targetId: 'subject', targetPort: 'Value' },
      { sourceId: 'label', sourcePort: 'value', targetId: 'subject', targetPort: 'Label' },
      { sourceId: 'next', sourcePort: 'onClick', targetId: 'setEmpty', targetPort: 'do' },
      { sourceId: 'next', sourcePort: 'onClick', targetId: 'subject', targetPort: 'Reset' },
      { sourceId: 'open14', sourcePort: 'onClick', targetId: 'set14', targetPort: 'do' },
      { sourceId: 'open14', sourcePort: 'onClick', targetId: 'subject', targetPort: 'Reset' },
      { sourceId: 'relabel', sourcePort: 'onClick', targetId: 'setLabel', targetPort: 'do' },
      { sourceId: 'subject', sourcePort: 'Value', targetId: 'fmtV', targetPort: 'v' },
      { sourceId: 'fmtV', sourcePort: 'formatted', targetId: 'valueText', targetPort: 'text' },
      { sourceId: 'subject', sourcePort: 'Changed', targetId: 'counter', targetPort: 'increase' },
      { sourceId: 'counter', sourcePort: 'currentCount', targetId: 'fmtC', targetPort: 'n' },
      { sourceId: 'fmtC', sourcePort: 'formatted', targetId: 'countText', targetPort: 'text' }
    ]
  });
  await withRenderedPage({ projectDir: dir2 }, async (s) => {
    const send = (m, p) => s.client.send(m, p);
    await s.setViewport({ width: 1280, height: 900 });
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    const read = async () => JSON.parse(await s.evaluate(READ));
    const aria = async () => s.evaluate(`(document.querySelector('.ndg-dp-input') || {}).getAttribute('aria-label')`);
    const text = (st, prefix) => (st.texts.find((t) => t.startsWith(prefix)) || prefix).slice(prefix.length);
    const press = async (js) => {
      const at = JSON.parse(await s.evaluate(`(() => { const e = ${js}; if (!e) return 'null';
        const b = e.getBoundingClientRect(); return JSON.stringify({ x: b.left + b.width / 2, y: b.top + b.height / 2 }); })()`));
      if (!at) throw new Error(`nothing to press at ${js}`);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await wait(60);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await wait(300);
    };
    const css = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
    const button = (label) => `Array.from(document.querySelectorAll('button')).find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;

    await wait(500);
    const boot = await read();
    r.check('D81: an empty record shows an empty field', boot.input === '', boot.input);
    await press(css('.ndg-dp-input'));
    await press(css('.ndg-dp-pop [data-day="2026-09-30"]'));
    const picked = await read();
    r.check('D81: a day picked on it shows and fires', picked.input === '2026-09-30' && text(picked, 'changed=') === '1', `${picked.input} changed=${text(picked, 'changed=')}`);
    await press(button('relabel'));
    const relabelled = await read();
    const label = await aria();
    r.check('D81 control: another input re-runs the script (the label moves) and the pick stays', label === 'Ends' && relabelled.input === '2026-09-30', `aria-label=${label} field=${relabelled.input}`);
    await press(button('next record'));
    const next = await read();
    r.check('D81: the next empty record, with Reset, shows an empty field', next.input === '' && text(next, 'value=') === '', `field="${next.input}" value="${text(next, 'value=')}"`);
    r.check('D81: Reset is not a person changing the date (Changed stays quiet)', text(next, 'changed=') === '1', text(next, 'changed='));
    await press(button('open the 14th'));
    const opened = await read();
    r.check('D81: a record with a day shows it', opened.input === '2026-09-14', opened.input);
    await press(css('.ndg-dp-input'));
    await press(css('.ndg-dp-pop [data-day="2026-09-30"]'));
    await press(button('open the 14th'));
    const again = await read();
    r.check('D81: the next record holding the same day, with Reset, shows that day over the pick', again.input === '2026-09-14' && text(again, 'value=') === '2026-09-14', `field="${again.input}" value="${text(again, 'value=')}"`);
    r.finish(s);
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
